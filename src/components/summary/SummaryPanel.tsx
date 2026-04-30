import { useMemo } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from '../../types'
import type { TaxSlab } from '../../lib/calculations/taxEngine'
import { runAllStrategies } from '../../lib/calculations/strategyEngine'
import { runCrashStressTest } from '../../lib/refillStrategy'
import { runMonteCarlo } from '../../lib/calculations/monteCarlo'
import { profileById } from '../../lib/data/riskProfiles'
import { storage } from '../../lib/storage'
import { totalCorpus, b1RunwayMonths } from '../../lib/calculations'
import { computeSlabTax, type TaxRegime } from '../../lib/calculations/taxEngine'

interface Props {
  profile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
  onChangeTab: (tab: string) => void
}

const fmtINR = (n: number) => {
  if (!Number.isFinite(n) || n === 0) return '₹0'
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}
const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`

export function SummaryPanel({ profile, buckets, returnAssumptions, onChangeTab }: Props) {
  const isSenior = (profile.demographics?.currentAge ?? 60) >= 60
  const slab: TaxSlab = (profile.taxBracket ?? 20) as TaxSlab
  const regime: TaxRegime = 'old'

  // ── Run the analytics (memoised on inputs) ────────────────────────
  const analytics = useMemo(() => {
    const total = totalCorpus(buckets)
    const annualDraw = profile.monthlyWithdrawal * 12
    const wr = total > 0 ? (annualDraw / total) * 100 : 0
    const runway = b1RunwayMonths(buckets.b1, profile.monthlyWithdrawal)

    const strategies = runAllStrategies({
      corpus: profile.corpus,
      monthlyWithdrawal: profile.monthlyWithdrawal,
      inflationRate: profile.inflationRate,
      returnAssumptions,
      buckets,
      taxSlab: slab,
      taxRegime: regime,
      isSenior,
    })
    const bestFit = strategies.find((s) => s.isBestFit) ?? strategies[0]

    const stress = runCrashStressTest({
      corpus: profile.corpus,
      monthlyWithdrawal: profile.monthlyWithdrawal,
      allocation: profile.bucketAllocation ?? { b1: 0.10, b2: 0.20, b3: 0.25, b4: 0.45 },
      returnAssumptions,
      inflationRate: profile.inflationRate,
    })

    const mc = runMonteCarlo({
      corpus: profile.corpus,
      monthlyWithdrawal: profile.monthlyWithdrawal,
      inflationRate: profile.inflationRate,
      returnAssumptions,
      buckets,
      runs: 200,
    })

    // Approximate annual income tax (slab on the interest portion + LTCG above exemption)
    const taxableIncome = annualDraw * 0.7  // crude — assumes 70% surfaces as taxable income
    const annualTax = computeSlabTax(taxableIncome, regime, isSenior)

    // Risk profile (if user has chosen one)
    const riskProfileId = storage.getRiskProfile()
    const riskProfile = riskProfileId ? profileById(riskProfileId) : null

    return { total, annualDraw, wr, runway, strategies, bestFit, stress, mc, annualTax, riskProfile }
  }, [profile, buckets, returnAssumptions, slab, isSenior])

  // ── Verdict synthesis ─────────────────────────────────────────────
  const verdict = synthesiseVerdict(analytics)

  return (
    <div className="space-y-4">
      {/* Verdict banner */}
      <section
        className={`rounded-xl border-2 p-5 sm:p-6 ${verdict.tone.banner}`}
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${verdict.tone.icon}`}>
            {verdict.tone.symbol}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-[11px] font-semibold uppercase tracking-[2px] ${verdict.tone.label}`}>
              {verdict.tone.kicker}
            </div>
            <h2 className={`text-lg sm:text-xl font-bold mt-0.5 leading-tight ${verdict.tone.heading}`}>
              {verdict.headline}
            </h2>
            <p className={`text-sm mt-2 leading-relaxed ${verdict.tone.body}`}>
              {verdict.body}
            </p>
          </div>
        </div>
      </section>

      {/* Headline KPIs — 6 metrics that update with every input change */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KPI
          label="Best-fit strategy"
          value={analytics.bestFit?.name ?? '—'}
          hint={analytics.bestFit ? `Score ${analytics.bestFit.totalScore}/60` : undefined}
          small
        />
        <KPI
          label="Post-tax monthly"
          value={fmtINR(analytics.bestFit?.postTaxMonthlyIncome ?? 0)}
          hint={analytics.bestFit ? `${analytics.bestFit.taxDragPct.toFixed(1)}% tax drag` : undefined}
        />
        <KPI
          label="Year-20 corpus"
          value={fmtINR(analytics.bestFit?.finalCorpus ?? 0)}
          hint={analytics.bestFit ? `${(analytics.bestFit.finalCorpus / Math.max(1, profile.corpus)).toFixed(2)}× starting` : undefined}
          tone={analytics.bestFit && analytics.bestFit.finalCorpus >= profile.corpus ? 'good' : 'neutral'}
        />
        <KPI
          label="Withdrawal rate"
          value={`${analytics.wr.toFixed(2)}%`}
          hint="annual draw / corpus"
          tone={analytics.wr <= 5 ? 'good' : analytics.wr <= 7 ? 'warn' : 'bad'}
        />
        <KPI
          label="Crash test (35% in yr 5)"
          value={analytics.stress.resilient ? 'Recovers' : `Fails yr ${analytics.stress.brokeAtYear ?? '?'}`}
          hint={analytics.stress.resilient ? `Final ${fmtINR(analytics.stress.finalCorpus)}` : 'Plan breaks under shock'}
          tone={analytics.stress.resilient ? 'good' : 'bad'}
          small
        />
        <KPI
          label="Monte Carlo success"
          value={fmtPct(analytics.mc.successRate)}
          hint={`${analytics.mc.runs} simulated paths`}
          tone={analytics.mc.successRate >= 0.85 ? 'good' : analytics.mc.successRate >= 0.65 ? 'warn' : 'bad'}
        />
      </section>

      {/* Take-home — synthesised paragraph */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[2px] text-slate-500 mb-2">
          The take-home
        </div>
        <div className="text-sm sm:text-base text-slate-800 leading-relaxed space-y-3">
          {verdict.takeHome.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </section>

      {/* What you've configured + Action items, side by side on desktop */}
      <section className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">What you've configured</h3>
          <dl className="text-xs space-y-2">
            <Row label="Total corpus" value={fmtINR(analytics.total)} />
            <Row label="Monthly draw" value={fmtINR(profile.monthlyWithdrawal)} />
            <Row label="Inflation rate" value={`${profile.inflationRate}% p.a.`} />
            <Row label="Current age" value={`${profile.demographics?.currentAge ?? '—'} yrs`} />
            <Row label="Life expectancy" value={`${profile.demographics?.lifeExpectancy ?? '—'} yrs`} />
            <Row label="Tax slab / regime" value={`${slab}% · ${regime} regime${isSenior ? ' · senior' : ''}`} />
            <Row label="Risk profile" value={analytics.riskProfile?.name ?? 'Not selected'} />
            <Row label="B1 runway" value={`${analytics.runway} months`} />
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Recommended next actions</h3>
          <ol className="text-sm text-slate-700 space-y-2.5 list-none">
            {verdict.actions.map((a, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${a.tone === 'high' ? 'bg-red-100 text-red-700' : a.tone === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{a.title}</div>
                  {a.body && <div className="text-xs text-slate-600 mt-0.5">{a.body}</div>}
                  {a.tab && (
                    <button
                      type="button"
                      onClick={() => onChangeTab(a.tab!)}
                      className="text-xs text-blue-700 hover:text-blue-900 font-medium mt-1"
                    >
                      Open {a.tabLabel} →
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Strategy comparison shortlist */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Top 3 strategies on your inputs</h3>
          <button
            type="button"
            onClick={() => onChangeTab('strategies')}
            className="text-xs text-blue-700 hover:text-blue-900 font-medium"
          >
            See all 10 →
          </button>
        </div>
        <div className="space-y-2">
          {[...analytics.strategies]
            .filter((s) => s.verdict !== 'NOT_APPLICABLE')
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 3)
            .map((s, idx) => (
              <div
                key={s.id}
                className={`rounded-lg p-3 flex items-center gap-3 ${idx === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-slate-200'}`}
              >
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>{s.name}</span>
                    {s.isBestFit && <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">BEST FIT</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Net {fmtINR(s.postTaxMonthlyIncome)}/mo · 20-yr corpus {fmtINR(s.finalCorpus)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-slate-900 tabular-nums">{s.totalScore}<span className="text-slate-400 text-xs">/60</span></div>
                  <div className="text-[10px] text-slate-500 uppercase">Score</div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-[11px] text-slate-600 leading-relaxed">
        This summary updates live as you change any input on the Plan, Buckets, or Tax tabs. Figures are projections based on stated assumptions — not guarantees. The Monte Carlo success rate samples 200 random paths each time you visit this tab; small variations between visits are normal.
        Always validate any major action with a SEBI-registered investment advisor or a Chartered Accountant.
      </section>
    </div>
  )
}

// ── Verdict synthesis ─────────────────────────────────────────────────

interface VerdictTone {
  banner: string
  icon: string
  kicker: string
  label: string
  heading: string
  body: string
  symbol: string
}

interface Verdict {
  tone: VerdictTone
  headline: string
  body: string
  takeHome: string[]
  actions: { title: string; body?: string; tab?: string; tabLabel?: string; tone: 'high' | 'medium' | 'low' }[]
}

const TONES: Record<'good' | 'warn' | 'bad', VerdictTone> = {
  good: {
    banner:  'border-green-300 bg-green-50',
    icon:    'bg-green-600 text-white',
    kicker:  'text-green-700',
    label:   'text-green-700',
    heading: 'text-green-900',
    body:    'text-green-800',
    symbol:  '✓',
  },
  warn: {
    banner:  'border-amber-300 bg-amber-50',
    icon:    'bg-amber-600 text-white',
    kicker:  'text-amber-700',
    label:   'text-amber-700',
    heading: 'text-amber-900',
    body:    'text-amber-800',
    symbol:  '!',
  },
  bad: {
    banner:  'border-red-300 bg-red-50',
    icon:    'bg-red-600 text-white',
    kicker:  'text-red-700',
    label:   'text-red-700',
    heading: 'text-red-900',
    body:    'text-red-800',
    symbol:  '×',
  },
}

function synthesiseVerdict(a: ReturnType<typeof useMemo<{ total: number; annualDraw: number; wr: number; runway: number; strategies: ReturnType<typeof runAllStrategies>; bestFit: ReturnType<typeof runAllStrategies>[number]; stress: ReturnType<typeof runCrashStressTest>; mc: ReturnType<typeof runMonteCarlo>; annualTax: number; riskProfile: ReturnType<typeof profileById> | null }>>): Verdict {
  const bestFit = a.bestFit
  const success = a.mc.successRate
  const stressOk = a.stress.resilient
  const corpusGrows = bestFit ? bestFit.finalCorpus >= bestFit.yearlyCorpus[0] : false
  const wrSafe = a.wr <= 6.5
  const passes = bestFit && (bestFit.verdict === 'BEST_FIT' || bestFit.verdict === 'PASSES')

  // Three-state verdict
  const isAchievable = passes && stressOk && success >= 0.85 && wrSafe
  const isClose = (passes || wrSafe) && (success >= 0.55 || stressOk)

  if (isAchievable) {
    return {
      tone: TONES.good,
      headline: `Your plan is on track.`,
      body: `${bestFit?.name ?? 'The chosen strategy'} sustains your ${fmtINR(a.annualDraw / 12)}/month draw at a ${a.wr.toFixed(1)}% withdrawal rate, with ${fmtPct(success)} Monte Carlo success and a recovery from a 35% equity crash in year 5.`,
      takeHome: [
        `Based on your ${fmtINR(a.total)} corpus and a ${fmtINR(a.annualDraw / 12)} monthly target, the **${bestFit?.name}** comes out as the best fit. After Indian tax, you'll receive ${fmtINR(bestFit?.postTaxMonthlyIncome ?? 0)} per month — the equivalent of a ${bestFit?.taxDragPct.toFixed(1)}% tax drag on the gross figure.`,
        `Across 200 simulated paths the plan succeeds in ${fmtPct(success)} of futures. The corpus is projected to ${corpusGrows ? `grow to ${fmtINR(bestFit?.finalCorpus ?? 0)}` : `end at ${fmtINR(bestFit?.finalCorpus ?? 0)}`} by year 20${corpusGrows ? ` — ${(bestFit!.finalCorpus / Math.max(1, bestFit!.yearlyCorpus[0])).toFixed(2)}× your starting amount` : ''}. The 35% crash stress test in year 5 leaves the plan recovered by year-end horizon.`,
        `**Next:** lock in the recommended fund mix from your ${a.riskProfile?.name ?? 'risk'} profile, set up the SWP mandates, and revisit this summary every March 31 to harvest LTCG within the ₹1.25L exemption.`,
      ],
      actions: [
        { title: 'Set up the recommended fund mix', body: 'Open accounts with the AMCs listed in your profile and start SWPs at the suggested rupee amounts.', tab: 'profiles', tabLabel: 'Profile', tone: 'high' },
        { title: 'Schedule annual LTCG harvest', body: 'Every March 31, sell ₹1.25L of B4 equity gains and re-buy. The Tax tab shows the exact schedule.', tab: 'tax', tabLabel: 'Tax', tone: 'medium' },
        { title: 'Review the full strategy comparison', body: 'See how the next-best strategies score, in case you want a backup plan.', tab: 'strategies', tabLabel: 'Compare', tone: 'low' },
      ],
    }
  }

  if (isClose) {
    return {
      tone: TONES.warn,
      headline: `Close — but the plan needs adjustments.`,
      body: `Your draw is ${a.wr.toFixed(1)}% of corpus annually${a.wr > 6.5 ? ', above the 6.5% safe threshold' : ''}. Monte Carlo success is ${fmtPct(success)}${success < 0.85 ? ', below the 85% comfort level' : ''}${stressOk ? '' : ', and a year-5 crash breaks the plan'}.`,
      takeHome: [
        `Based on your ${fmtINR(a.total)} corpus and a ${fmtINR(a.annualDraw / 12)} monthly target, the best-fit strategy (**${bestFit?.name ?? '—'}**) holds in baseline conditions but shows fragility in the stress test or Monte Carlo simulation.`,
        success >= 0.85
          ? `Monte Carlo gives ${fmtPct(success)} success across 200 paths — solid, but the 35% year-5 crash stress test ${stressOk ? 'recovers' : 'breaks the plan around year ' + (a.stress.brokeAtYear ?? '?')}.`
          : `Across 200 simulated paths the plan succeeds in only ${fmtPct(success)} of futures. The corpus does not always survive the 25-year horizon under realistic market volatility.`,
        `**Two viable adjustments:** reduce the monthly draw by 10–15%, OR raise your B2 fixed-floor allocation by ~5 percentage points to thicken the buffer. Either pivot typically pulls the success rate above 85%.`,
      ],
      actions: [
        { title: 'Reduce monthly withdrawal', body: 'On the Plan tab, lower your target. The Compare tab will recompute and show the gap closing.', tab: 'plan', tabLabel: 'Plan', tone: 'high' },
        { title: 'Shift 5% from B4 to B2', body: 'Move some equity to fixed-floor (SCSS, FD ladder). Strengthens the buffer for the 35% crash test.', tab: 'assets', tabLabel: 'Buckets', tone: 'high' },
        { title: 'Re-run Monte Carlo after the change', body: 'Verify the success rate has crossed 85%.', tab: 'simulate', tabLabel: 'Simulate', tone: 'medium' },
      ],
    }
  }

  // Not achievable
  return {
    tone: TONES.bad,
    headline: `The numbers don't work yet.`,
    body: `${bestFit?.name ?? 'No strategy'} fails the baseline at a ${a.wr.toFixed(1)}% withdrawal rate. Monte Carlo success is only ${fmtPct(success)}. The plan needs a fundamental rethink.`,
    takeHome: [
      `Your ${fmtINR(a.total)} corpus cannot reliably support a ${fmtINR(a.annualDraw / 12)}/month draw across the planning horizon. Across 200 simulated paths the plan succeeds in only ${fmtPct(success)} of futures.`,
      `The withdrawal rate of ${a.wr.toFixed(1)}% is ${a.wr > 8 ? 'far' : 'meaningfully'} above what any of the ten strategies can sustainably produce on Indian return assumptions and tax. ${a.stress.brokeAtYear ? `Even without a market shock, depletion shows up around year ${a.stress.brokeAtYear}.` : ''}`,
      `**The honest options:** boost the corpus before retirement (delay it 2–4 years), reduce the monthly target to a sustainable level, OR add a secondary income stream (rental, part-time, spousal) that cuts what you draw from this corpus.`,
    ],
    actions: [
      { title: 'Run the corpus-preservation calculator', body: 'See the exact maximum monthly draw your corpus can sustain.', tab: 'simulate', tabLabel: 'Simulate', tone: 'high' },
      { title: 'Lower the monthly target on the Plan tab', body: 'Try 60–70% of your current figure and re-check this Summary.', tab: 'plan', tabLabel: 'Plan', tone: 'high' },
      { title: 'Add SIP / passive income on the Plan tab', body: 'Even ₹15,000/mo of rental or part-time work substantially reduces what the corpus must produce.', tab: 'plan', tabLabel: 'Plan', tone: 'medium' },
      { title: 'Re-evaluate when you have more corpus', body: 'If retirement is 2–4 years away, the buffer of additional savings + market growth often closes the gap.', tone: 'low' },
    ],
  }
}

// ── Tiny components ───────────────────────────────────────────────────

function KPI({ label, value, hint, tone, small }: { label: string; value: string; hint?: string; tone?: 'good' | 'warn' | 'bad' | 'neutral'; small?: boolean }) {
  const c = tone === 'good' ? 'text-green-700' : tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-red-700' : 'text-slate-900'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`${small ? 'text-sm sm:text-base' : 'text-lg sm:text-xl'} font-bold mt-1 tabular-nums leading-tight truncate ${c}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900 tabular-nums truncate">{value}</dd>
    </div>
  )
}
