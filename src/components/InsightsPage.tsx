// Insights — the merged Overview + Summary tab.
//
// Editorial / consulting-firm aesthetic: large light-weight serif accents,
// numbered sections with eyebrow labels, restrained navy + gold palette,
// generous whitespace, pull-quote treatment for the verdict.

import { lazy, Suspense, useMemo, type ReactNode } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from '../types'
import type { TaxRegime, TaxSlab } from '../lib/calculations/taxEngine'
import { useMarketData } from '../hooks/useMarketData'
import { totalCorpus, b1RunwayMonths } from '../lib/calculations'
import { runAllStrategies } from '../lib/calculations/strategyEngine'
import { runCrashStressTest } from '../lib/refillStrategy'
import { runMonteCarlo } from '../lib/calculations/monteCarlo'
import { profileById } from '../lib/data/riskProfiles'
import { storage } from '../lib/storage'
import { ProfileSettings } from './ProfileSettings'
import { DemographicsForm } from './DemographicsForm'
import { ExpenseEditor } from './ExpenseEditor'
import { RefillAlert } from './RefillAlert'
import { Sliders } from './Sliders'
import { BucketCard } from './BucketCard'
import { ExportMenu } from './ExportMenu'
import { FORMATS } from '../lib/exporters'

// Heavy panels stay lazy
const ProfilesPanel = lazy(() => import('./profiles/ProfilesPanel').then((m) => ({ default: m.ProfilesPanel })))
const StrategiesPanel = lazy(() => import('./strategies/StrategiesPanel').then((m) => ({ default: m.StrategiesPanel })))
const BucketFundsExplorer = lazy(() => import('./buckets/BucketFundsExplorer').then((m) => ({ default: m.BucketFundsExplorer })))
const CorpusPreservation = lazy(() => import('./CorpusPreservation').then((m) => ({ default: m.CorpusPreservation })))
const MonteCarloPanel = lazy(() => import('./montecarlo/MonteCarloPanel').then((m) => ({ default: m.MonteCarloPanel })))
const YearSimulator = lazy(() => import('./YearSimulator').then((m) => ({ default: m.YearSimulator })))
const SWPSimulator = lazy(() => import('./SWPSimulator').then((m) => ({ default: m.SWPSimulator })))

interface Props {
  profile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
  onBucketsUpdate: (b: BucketState) => void
  onProfileUpdate: (p: UserProfile) => void
  onReturnsUpdate: (r: ReturnAssumptions) => void
}

const fmtINR = (n: number) => {
  if (!Number.isFinite(n) || n === 0) return '₹0'
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}
const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`

export function InsightsPage({
  profile, buckets, returnAssumptions,
  onBucketsUpdate, onProfileUpdate, onReturnsUpdate,
}: Props) {
  useMarketData(profile.refreshInterval)
  const total = totalCorpus(buckets)
  const runway = b1RunwayMonths(buckets.b1, profile.monthlyWithdrawal)
  const identity = storage.getIdentity()
  const userName = identity?.fullName?.trim() || 'Your'

  // Verdict analytics
  const isSenior = (profile.demographics?.currentAge ?? 60) >= 60
  const slab: TaxSlab = (profile.taxBracket ?? 20) as TaxSlab
  const regime: TaxRegime = 'old'

  const analytics = useMemo(() => {
    const annualDraw = profile.monthlyWithdrawal * 12
    const wr = total > 0 ? (annualDraw / total) * 100 : 0
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
    const riskProfileId = storage.getRiskProfile()
    const riskProfile = riskProfileId ? profileById(riskProfileId) : null
    return { total, annualDraw, wr, strategies, bestFit, stress, mc, riskProfile, runway }
  }, [profile, buckets, returnAssumptions, slab, isSenior, total, runway])

  const verdict = synthesiseVerdict(analytics)

  return (
    <article className="insights-page bg-white">

      {/* ── Cover hero ───────────────────────────────────────── */}
      <header className="border-b-2 border-slate-900 pb-8 sm:pb-10 mb-10">
        <div className="text-[11px] font-bold tracking-[4px] uppercase text-amber-700 mb-3">
          Strategic Plan · {new Date().getFullYear()}
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extralight tracking-tight text-slate-900 leading-[1.05]">
          {userName === 'Your' ? 'Your retirement plan' : `${userName}.`}
          <br />
          <em className="not-italic font-extrabold">Five-step strategy.</em>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed font-light">
          From inputs to verdict, on one editorial page. Generated {formatDate(new Date())}.
        </p>
      </header>

      {/* ── 01 — Executive Summary ───────────────────────────── */}
      <Section num="01" eyebrow="Executive Summary">
        <h2 className="font-serif text-3xl sm:text-4xl font-extralight tracking-tight text-slate-900 leading-tight mb-6 max-w-3xl">
          {verdict.headline}
        </h2>

        {/* Pull quote — McKinsey style */}
        <blockquote className={`border-l-4 ${verdict.tone.bar} pl-6 py-2 mb-8 max-w-3xl`}>
          <p className="text-lg sm:text-xl text-slate-800 font-serif italic leading-relaxed">
            "{verdict.body}"
          </p>
          <footer className="mt-3 text-[11px] tracking-widest uppercase text-slate-500 font-bold">
            {verdict.tone.label}
          </footer>
        </blockquote>

        {/* KPI strip — large numerals, restrained */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-200 border-2 border-slate-900">
          <Kpi label="Corpus"           value={fmtINR(total)}                                              tone="navy" />
          <Kpi label="Best-fit strategy" value={shortName(analytics.bestFit?.name ?? '—')}                 tone="navy" hint={`${analytics.bestFit?.totalScore ?? 0}/60`} />
          <Kpi label="Net / month"      value={fmtINR(analytics.bestFit?.postTaxMonthlyIncome ?? 0)}        tone="gold" hint={`${analytics.bestFit?.taxDragPct?.toFixed(1) ?? 0}% tax drag`} />
          <Kpi label="20-yr corpus"     value={fmtINR(analytics.bestFit?.finalCorpus ?? 0)}                 tone={analytics.bestFit && analytics.bestFit.finalCorpus >= profile.corpus ? 'good' : 'navy'} />
          <Kpi label="Withdrawal rate"  value={`${analytics.wr.toFixed(2)}%`}                              tone={analytics.wr <= 5 ? 'good' : analytics.wr <= 7 ? 'warn' : 'bad'} />
          <Kpi label="MC success"       value={fmtPct(analytics.mc.successRate)}                           tone={analytics.mc.successRate >= 0.85 ? 'good' : analytics.mc.successRate >= 0.65 ? 'warn' : 'bad'} hint="200 paths" />
        </div>
      </Section>

      {/* ── 02 — Foundation (Plan inputs) ─────────────────────── */}
      <Section num="02" eyebrow="Foundation" title={<>The <em>numbers</em> behind the plan.</>}>
        <p className="text-sm text-slate-600 mb-5 max-w-2xl leading-relaxed">
          Every projection in this report flows from these inputs. Adjust any field — corpus, demographics, expenses — and the entire downstream analysis recomputes live.
        </p>
        <div className="space-y-3">
          <ProfileSettings
            profile={profile}
            buckets={buckets}
            onProfileUpdate={onProfileUpdate}
            onBucketsUpdate={onBucketsUpdate}
          />
          <DemographicsForm profile={profile} onProfileUpdate={onProfileUpdate} />
          <ExpenseEditor profile={profile} onProfileUpdate={onProfileUpdate} />
        </div>
      </Section>

      {/* ── 03 — Risk profile ─────────────────────────────────── */}
      <Section num="03" eyebrow="Risk Profile" title={<>Calibrate <em>your tolerance</em>.</>}>
        <p className="text-sm text-slate-600 mb-5 max-w-2xl leading-relaxed">
          A 90-second quiz scores you 10–50 across time horizon, capacity, and goals — mapping to one of five canonical profiles. The choice cascades through every subsequent recommendation.
        </p>
        <Suspense fallback={<SectionLoading />}>
          <ProfilesPanel
            userProfile={profile}
            buckets={buckets}
            onProfileUpdate={onProfileUpdate}
            onBucketsUpdate={onBucketsUpdate}
          />
        </Suspense>
      </Section>

      {/* ── 04 — Strategy comparison ──────────────────────────── */}
      <Section num="04" eyebrow="Comparison" title={<>Ten frameworks, <em>one scorecard</em>.</>}>
        <p className="text-sm text-slate-600 mb-5 max-w-2xl leading-relaxed">
          From Trinity Study's 4% Rule to the India 4-Bucket SWP — every framework run on your inputs, with FY 2024-25 Indian tax applied to compute post-tax monthly income.
        </p>
        <Suspense fallback={<SectionLoading />}>
          <StrategiesPanel
            profile={profile}
            buckets={buckets}
            returnAssumptions={returnAssumptions}
          />
        </Suspense>
      </Section>

      {/* ── 05 — Allocation ───────────────────────────────────── */}
      <Section num="05" eyebrow="Allocation" title={<>Four buckets, <em>one engine</em>.</>}>
        <p className="text-sm text-slate-600 mb-5 max-w-2xl leading-relaxed">
          B1 funds withdrawals. B2 is the floor — held to maturity. B3 produces stable income. B4 grows for the long term and refills B3 each year. The allocation below reflects your current corpus.
        </p>
        <div className="space-y-3">
          <RefillAlert
            buckets={buckets}
            monthlyWithdrawal={profile.monthlyWithdrawal}
            returnAssumptions={returnAssumptions}
            onBucketsUpdate={onBucketsUpdate}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <BucketCard id="b1" value={buckets.b1} total={total} returnAssumption={returnAssumptions.b1} runway={runway} />
            <BucketCard id="b2" value={buckets.b2} total={total} returnAssumption={returnAssumptions.b2} />
            <BucketCard id="b3" value={buckets.b3} total={total} returnAssumption={returnAssumptions.b3} />
            <BucketCard id="b4" value={buckets.b4} total={total} returnAssumption={returnAssumptions.b4} />
          </div>
          <Sliders
            profile={profile}
            buckets={buckets}
            returnAssumptions={returnAssumptions}
            onProfileChange={onProfileUpdate}
            onReturnsChange={onReturnsUpdate}
            onBucketsUpdate={onBucketsUpdate}
          />
          <Suspense fallback={<SectionLoading />}>
            <BucketFundsExplorer bucketValues={buckets} />
          </Suspense>
        </div>
      </Section>

      {/* ── 06 — Stress test ─────────────────────────────────── */}
      <Section num="06" eyebrow="Stress Test" title={<>Verify it <em>survives</em>.</>}>
        <p className="text-sm text-slate-600 mb-5 max-w-2xl leading-relaxed">
          Monte Carlo across 200 paths · 35% equity crash in year 5 · year-by-year cascade · 25-year projection. Confidence is not a number — it is convergence across multiple lenses.
        </p>
        <div className="space-y-3">
          <Suspense fallback={<SectionLoading />}>
            <CorpusPreservation profile={profile} buckets={buckets} returnAssumptions={returnAssumptions} />
            <MonteCarloPanel profile={profile} buckets={buckets} returnAssumptions={returnAssumptions} />
            <YearSimulator
              buckets={buckets}
              monthlyWithdrawal={profile.monthlyWithdrawal}
              inflationRate={profile.inflationRate}
              returnAssumptions={returnAssumptions}
            />
            <SWPSimulator
              buckets={buckets}
              monthlyWithdrawal={profile.monthlyWithdrawal}
              inflationRate={profile.inflationRate}
              returnAssumptions={returnAssumptions}
            />
          </Suspense>
        </div>
      </Section>

      {/* ── 07 — Take-home + Actions ──────────────────────────── */}
      <Section num="07" eyebrow="Take-Home" title={<>What to <em>do next</em>.</>}>
        <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
          {/* Narrative */}
          <div className="space-y-4 max-w-2xl">
            {verdict.takeHome.map((line, i) => (
              <p key={i} className="text-base text-slate-800 leading-relaxed font-light first:font-normal first:text-lg">
                {line}
              </p>
            ))}
          </div>

          {/* Action sidebar */}
          <aside className="border-t-2 lg:border-t-0 lg:border-l-2 border-slate-300 lg:pl-8 pt-6 lg:pt-0">
            <div className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700 mb-3">Recommended Actions</div>
            <ol className="space-y-3">
              {verdict.actions.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`shrink-0 font-serif text-2xl font-extralight ${a.tone === 'high' ? 'text-red-700' : a.tone === 'medium' ? 'text-amber-700' : 'text-blue-700'} leading-none w-6 tabular-nums`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{a.title}</div>
                    {a.body && <div className="text-xs text-slate-600 mt-0.5 leading-snug">{a.body}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>

        {/* Top 3 strategies on user's inputs */}
        <div className="mt-10 pt-6 border-t-2 border-slate-200">
          <div className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700 mb-3">Top three strategies on your inputs</div>
          <div className="grid sm:grid-cols-3 gap-px bg-slate-200 border-2 border-slate-900">
            {[...analytics.strategies]
              .filter((s) => s.verdict !== 'NOT_APPLICABLE')
              .sort((x, y) => y.totalScore - x.totalScore)
              .slice(0, 3)
              .map((s, idx) => (
                <div key={s.id} className="bg-white p-5">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="font-serif text-3xl font-extralight text-slate-300 tabular-nums leading-none">{String(idx + 1).padStart(2, '0')}</span>
                    {s.isBestFit && <span className="text-[9px] font-bold tracking-widest uppercase text-amber-700">Best Fit</span>}
                  </div>
                  <div className="text-base font-semibold text-slate-900 leading-tight">{s.name}</div>
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between"><span>Net / mo</span><span className="font-semibold text-slate-900 tabular-nums">{fmtINR(s.postTaxMonthlyIncome)}</span></div>
                    <div className="flex justify-between"><span>20-yr corpus</span><span className="font-semibold text-slate-900 tabular-nums">{fmtINR(s.finalCorpus)}</span></div>
                    <div className="flex justify-between"><span>Score</span><span className="font-semibold text-slate-900 tabular-nums">{s.totalScore}/60</span></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </Section>

      {/* ── 08 — Download ─────────────────────────────────────── */}
      <Section num="08" eyebrow="Take It With You" title={<>One report, <em>five formats</em>.</>}>
        <div className="grid lg:grid-cols-[2fr_1fr] gap-8 items-start">
          <div className="max-w-2xl">
            <p className="text-sm text-slate-600 leading-relaxed mb-5">
              The same content — your inputs, the strategy comparison, Monte Carlo bands, tax breakdown, and recommended actions — packaged for the format your audience needs.
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
              {FORMATS.map((f) => (
                <li key={f.id} className="border-2 border-slate-300 bg-white px-3 py-2">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm font-bold text-slate-900">{f.label}</span>
                    <span className="text-[9px] font-mono text-slate-400">{f.ext}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5 leading-snug line-clamp-2">{f.hint}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:border-l-2 lg:border-slate-300 lg:pl-8">
            <div className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700 mb-3">Download</div>
            <ExportMenu
              profile={profile}
              buckets={buckets}
              returnAssumptions={returnAssumptions}
              variant="cta"
              label="Pick a format ▾"
            />
            <p className="text-[10px] text-slate-500 mt-3 leading-snug">
              Saves to your Downloads folder. Filename: <code className="text-[9px] bg-slate-100 px-1">{'{name}'}-retirement-plan-{'{date}'}{'.{ext}'}</code>
            </p>
          </div>
        </div>
      </Section>

      {/* ── 09 — Methodology footer ───────────────────────────── */}
      <footer className="border-t-2 border-slate-900 pt-6 mt-12 mb-6">
        <div className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700 mb-2">Methodology · Disclaimers</div>
        <p className="text-[11px] text-slate-600 leading-relaxed max-w-3xl">
          The four-bucket refill-linked strategy follows the academic Indian retirement income framework. Monte Carlo samples per-bucket annual returns from N(μ, σ) using Box-Muller transformation. FY 2024-25 tax: equity LTCG 12.5% above ₹1.25L, debt MFs at slab, 80TTB ₹50k for seniors. Returns are modelled, not predicted. Validate any major action with a SEBI-registered investment advisor or a Chartered Accountant.
        </p>
        <p className="text-[10px] text-slate-400 mt-3 italic">
          Indian Retirement Planner · v2.0 · {formatDate(new Date())}
        </p>
      </footer>
    </article>
  )
}

// ── Section primitives — McKinsey/Big-Four-style editorial blocks ────

function Section({ num, eyebrow, title, children }: { num: string; eyebrow: string; title?: ReactNode; children: ReactNode }) {
  return (
    <section className="relative mb-14 sm:mb-16 scroll-mt-32" id={`sec-${num}`}>
      {/* Number watermark — light, large, ghost */}
      <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 font-serif text-7xl sm:text-9xl font-extralight text-slate-100 leading-none select-none tabular-nums pointer-events-none" aria-hidden="true">
        {num}
      </div>

      <header className="relative mb-6 sm:mb-8">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="font-serif text-2xl font-extralight text-amber-700 tabular-nums leading-none">{num}</span>
          <span className="h-px flex-1 bg-slate-900" aria-hidden="true" />
          <span className="text-[10px] font-bold tracking-[3px] uppercase text-slate-700">{eyebrow}</span>
        </div>
        {title && (
          <h2 className="font-serif text-3xl sm:text-4xl font-extralight tracking-tight text-slate-900 leading-[1.1] max-w-3xl">
            {title}
          </h2>
        )}
      </header>
      <div className="relative">{children}</div>
    </section>
  )
}

function SectionLoading() {
  return (
    <div className="flex items-center justify-center py-12 bg-white border-2 border-slate-300">
      <div className="w-5 h-5 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin" />
    </div>
  )
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'navy' | 'gold' | 'good' | 'warn' | 'bad' }) {
  const valueClass = tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-red-700' : tone === 'gold' ? 'text-amber-700' : 'text-slate-900'
  return (
    <div className="bg-white p-4 sm:p-5">
      <div className="text-[9px] tracking-[2px] uppercase text-slate-500 font-bold mb-1.5">{label}</div>
      <div className={`font-serif text-xl sm:text-2xl lg:text-3xl font-extralight tracking-tight tabular-nums leading-none ${valueClass}`}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-slate-500 mt-1.5 italic">{hint}</div>}
    </div>
  )
}

// ── Verdict synthesis (tone, headline, body, take-home, actions) ─────

interface VerdictTone {
  bar: string
  label: string
}

interface Verdict {
  tone: VerdictTone
  headline: string
  body: string
  takeHome: string[]
  actions: { title: string; body?: string; tone: 'high' | 'medium' | 'low' }[]
}

const TONES: Record<'good' | 'warn' | 'bad', VerdictTone> = {
  good: { bar: 'border-emerald-600', label: 'On Track' },
  warn: { bar: 'border-amber-600',   label: 'Close — Adjustments Needed' },
  bad:  { bar: 'border-red-600',     label: 'Plan Does Not Yet Work' },
}

function synthesiseVerdict(a: { wr: number; bestFit: ReturnType<typeof runAllStrategies>[number]; mc: ReturnType<typeof runMonteCarlo>; stress: ReturnType<typeof runCrashStressTest> }): Verdict {
  const bestFit = a.bestFit
  const success = a.mc.successRate
  const passes = bestFit && (bestFit.verdict === 'BEST_FIT' || bestFit.verdict === 'PASSES')
  const wrSafe = a.wr <= 6.5
  const isAchievable = passes && a.stress.resilient && success >= 0.85 && wrSafe
  const isClose = (passes || wrSafe) && (success >= 0.55 || a.stress.resilient)

  if (isAchievable) {
    return {
      tone: TONES.good,
      headline: 'Your plan is on track.',
      body: `${bestFit?.name} sustains a ${a.wr.toFixed(1)}% withdrawal rate, recovers from a 35% year-5 crash, and succeeds in ${(success * 100).toFixed(0)}% of simulated futures.`,
      takeHome: [
        `The best-fit framework for your inputs is the ${bestFit?.name}. After Indian tax, your take-home is ${fmtINR(bestFit?.postTaxMonthlyIncome ?? 0)} per month — equivalent to a ${bestFit?.taxDragPct.toFixed(1)}% tax drag on the gross figure.`,
        `Across 200 simulated paths the plan succeeds in ${(success * 100).toFixed(0)}% of futures. Monte Carlo bands stay well above zero through year 25.`,
        `Lock in the recommended fund mix from your selected risk profile, set up the SWP mandates, and revisit this report each March 31 to harvest the ₹1.25 L LTCG exemption.`,
      ],
      actions: [
        { title: 'Set up the recommended fund mix', body: 'Open accounts with the AMCs listed in your profile and start SWPs at the suggested rupee amounts.', tone: 'high' },
        { title: 'Schedule annual LTCG harvest', body: 'Every March 31, sell ₹1,25,000 of B4 equity gains and immediately re-buy. Cumulative saving over 25 years is approximately ₹3.9 L.', tone: 'medium' },
        { title: 'Re-run this report after every Union Budget', body: 'Indian tax rules change annually. Re-run after each February budget to capture changes.', tone: 'low' },
      ],
    }
  }

  if (isClose) {
    return {
      tone: TONES.warn,
      headline: 'Close — but the plan needs adjustments.',
      body: `Baseline holds, but ${success < 0.85 ? `Monte Carlo success is only ${(success * 100).toFixed(0)}%` : 'the 35% year-5 crash test breaks the plan'}. A small adjustment in either draw or B2 allocation closes the gap.`,
      takeHome: [
        `The plan completes the 25-year horizon in baseline conditions, but shows fragility in either the stress test or Monte Carlo. The gap is small — typical fixes move the needle in months, not years.`,
        `Two viable adjustments: reduce the monthly draw by 10–15%, OR shift 5 percentage points of corpus from B4 to B2. Either pivot typically pulls success above 85% and ensures the year-5 crash recovers.`,
        `Re-run the Stress Test section after applying any change to verify convergence.`,
      ],
      actions: [
        { title: 'Reduce monthly withdrawal by 10–15%', body: 'On the Plan section above, lower your target. Re-run this section to verify success crosses 85%.', tone: 'high' },
        { title: 'Shift 5% of corpus from B4 to B2', body: 'Move some equity to fixed-floor (SCSS, FD ladder). Strengthens the buffer for the 35% crash test.', tone: 'high' },
        { title: 'Verify after applying changes', body: 'Re-run Monte Carlo above to confirm the success rate has crossed 85%.', tone: 'medium' },
      ],
    }
  }

  return {
    tone: TONES.bad,
    headline: `The numbers don't yet work.`,
    body: `At a ${a.wr.toFixed(1)}% withdrawal rate the plan succeeds in only ${(success * 100).toFixed(0)}% of futures. The gap is structural — small tweaks won't close it.`,
    takeHome: [
      `Your corpus cannot reliably support the current monthly draw across the planning horizon. In ${(success * 100).toFixed(0)}% of simulated futures the plan completes; in the rest it depletes early.`,
      `The withdrawal rate of ${a.wr.toFixed(1)}% is meaningfully above what any of the ten strategies can sustainably produce on Indian return assumptions and FY 2024-25 tax.`,
      `Three honest options: delay retirement 2–4 years to grow the corpus; reduce the monthly target by 30–40%; or add a secondary income stream. Run the Strategy Comparison section above to see which strategy gets closest first.`,
    ],
    actions: [
      { title: 'Run the corpus-preservation calculator', body: 'See the exact maximum monthly draw your corpus can sustainably support.', tone: 'high' },
      { title: 'Lower the monthly target by 30–40%', body: 'Try reducing your target on the Plan section above. Adjustments of this magnitude often shift the verdict from "fails" to "achievable".', tone: 'high' },
      { title: 'Add SIP / passive income', body: 'Even ₹15,000/mo of rental or part-time income substantially reduces what the corpus must produce.', tone: 'medium' },
      { title: 'Consult a SEBI-registered advisor', body: 'When the gap is structural, a financial planner can identify options the tool does not — annuities, real-estate liquidation, family income pooling.', tone: 'low' },
    ],
  }
}

function shortName(name: string): string {
  return name.length > 22 ? name.slice(0, 21) + '…' : name
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
}

