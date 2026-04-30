import { useMemo, useState } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from '../../types'
import type { TaxSlab, TaxRegime, TaxClass, PostTaxResult } from '../../lib/calculations/taxEngine'
import {
  computePostTax,
  computeSlabTax,
  classifyInstrument,
  LTCG_THRESHOLD,
  LTCG_RATE,
  SECTION_80TTB,
  STD_DEDUCTION_NEW,
} from '../../lib/calculations/taxEngine'
import { simulateRefillLinked } from '../../lib/refillStrategy'
import { profileById } from '../../lib/data/riskProfiles'
import { storage } from '../../lib/storage'

interface Props {
  profile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
}

const fmtINR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`

const taxClassLabel: Record<TaxClass, string> = {
  'equity-ltcg':    'Equity LTCG',
  'debt-slab':      'Debt MF (slab)',
  'interest-slab':  'Interest (slab)',
  'interest-80ttb': 'Bank int. (80TTB)',
  'tax-free':       'Tax-free (PPF)',
  'reit-mixed':     'REIT (mixed)',
  'nps-annuity':    'NPS annuity',
}

export function TaxPanel({ profile, buckets, returnAssumptions }: Props) {
  const [slab, setSlab] = useState<TaxSlab>((profile.taxBracket ?? 20) as TaxSlab)
  const [regime, setRegime] = useState<TaxRegime>('old')
  const isSenior = (profile.demographics?.currentAge ?? 60) >= 60
  const [view, setView] = useState<'breakdown' | 'optimizer' | 'reshuffle'>('breakdown')

  // ── Build instrument mix from the user's chosen risk profile (or default to Moderate)
  const profileId = storage.getRiskProfile() ?? 'moderate'
  const riskProfile = profileById(profileId)
  const scale = profile.corpus / 1_00_00_000

  const mix = useMemo(() => {
    return riskProfile.instruments
      .filter((i) => i.monthlyIncomeOn1Cr && i.monthlyIncomeOn1Cr > 0)
      .map((i) => ({
        name: i.name,
        bucket: i.bucket,
        category: i.category,
        monthly: (i.monthlyIncomeOn1Cr ?? 0) * scale,
        taxClass: classifyInstrument(i.category, i.bucket),
      }))
  }, [riskProfile, scale])

  const postTax: PostTaxResult = useMemo(
    () => computePostTax(mix.map((m) => ({ monthly: m.monthly, taxClass: m.taxClass })), {
      slab,
      regime,
      isSenior,
      ltcgUsedThisYear: 0,
    }),
    [mix, slab, regime, isSenior],
  )

  // 25-year tax projection for current strategy
  const projection = useMemo(() => {
    const rows = simulateRefillLinked({
      buckets,
      monthlyWithdrawal: profile.monthlyWithdrawal,
      inflationRate: profile.inflationRate,
      returnAssumptions,
      initialCorpus: profile.corpus,
      horizonYears: 25,
    })
    return rows.map((r) => {
      // Approximate yearly tax: equity LTCG on b4 harvests (already netted in simulator), plus
      // slab on debt/SCSS interest income approximated as an "income" portion.
      const harvestGains = r.b4Harvested  // already post-tax in the simulator
      const grossInterestIncome = r.b2GrowthEarned * 0.6  // assume 60% of B2 growth surfaces as taxable interest
      const slabTax = grossInterestIncome * (slab / 100)
      const ltcgGross = harvestGains * (1 / (1 - LTCG_RATE)) - harvestGains  // back-solved gross gain
      const ltcgTax = Math.max(0, (ltcgGross - LTCG_THRESHOLD) * LTCG_RATE)
      return {
        year: r.year,
        annualWithdrawal: r.annualWithdrawal,
        slabTax: Math.round(slabTax),
        ltcgTax: Math.round(ltcgTax),
        totalTax: Math.round(slabTax + ltcgTax),
      }
    })
  }, [buckets, profile.monthlyWithdrawal, profile.inflationRate, profile.corpus, returnAssumptions, slab])

  const totalLifetimeTax = projection.reduce((a, b) => a + b.totalTax, 0)

  // ── Reshuffle suggestions based on current slab
  const reshuffleAdvice = buildReshuffleAdvice(slab, isSenior)

  return (
    <div className="space-y-4">
      {/* Tax settings strip */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Indian tax calculator</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              FY 2024-25 rules · {isSenior ? 'Senior citizen (60+)' : 'Regular individual'} · profile <strong>{riskProfile.name}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Selector
              label="Slab"
              value={slab.toString()}
              options={[
                { v: '0', l: 'NIL' },
                { v: '5', l: '5%' },
                { v: '10', l: '10%' },
                { v: '20', l: '20%' },
                { v: '30', l: '30%' },
              ]}
              onChange={(v) => setSlab(Number(v) as TaxSlab)}
            />
            <Selector
              label="Regime"
              value={regime}
              options={[
                { v: 'old', l: 'Old' },
                { v: 'new', l: 'New' },
              ]}
              onChange={(v) => setRegime(v as TaxRegime)}
            />
          </div>
        </div>
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Gross monthly" value={fmtINR(postTax.grossMonthly)} hint="from current profile" />
        <KPI label="Net monthly" value={fmtINR(postTax.netMonthly)} hint="after Indian tax" tone="good" />
        <KPI label="Effective tax" value={fmtPct(postTax.effectiveTaxRate)} hint="weighted avg" tone={postTax.effectiveTaxRate < 0.05 ? 'good' : postTax.effectiveTaxRate < 0.15 ? 'warn' : 'bad'} />
        <KPI label="25-yr tax" value={fmtINR(totalLifetimeTax)} hint="cumulative on 4-Bucket" />
      </div>

      {/* Sub-tab switcher */}
      <div className="bg-white border border-gray-200 rounded-lg p-1.5 inline-flex gap-1">
        <SubTab id="breakdown" label="Year-by-year" active={view === 'breakdown'} onClick={() => setView('breakdown')} />
        <SubTab id="optimizer" label="LTCG optimizer" active={view === 'optimizer'} onClick={() => setView('optimizer')} />
        <SubTab id="reshuffle" label="Reshuffle advice" active={view === 'reshuffle'} onClick={() => setView('reshuffle')} />
      </div>

      {view === 'breakdown' && (
        <div className="space-y-4">
          {/* Tax-class breakdown of current mix */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <header className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
              <h4 className="text-xs font-semibold text-gray-900">Per-tax-class breakdown · annual</h4>
              <p className="text-[10px] text-gray-500 mt-0.5">Shows where your tax actually comes from. Hovering reveals exemption math.</p>
            </header>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Class</th>
                  <th className="text-right px-3 py-2 font-medium">Gross / yr</th>
                  <th className="text-right px-3 py-2 font-medium">Tax</th>
                  <th className="text-right px-3 py-2 font-medium">Net / yr</th>
                  <th className="text-left px-3 py-2 font-medium">Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {postTax.breakdown.map((b) => (
                  <tr key={b.taxClass}>
                    <td className="px-4 py-2 font-medium text-gray-800">{taxClassLabel[b.taxClass]}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">{fmtINR(b.grossAnnual)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-600">−{fmtINR(b.tax)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtINR(b.netAnnual)}</td>
                    <td className="px-3 py-2 text-[10px] text-gray-500">{b.note}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-2 text-gray-900">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtINR(postTax.grossMonthly * 12)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-700">−{fmtINR(postTax.annualTax)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-green-700">{fmtINR(postTax.netMonthly * 12)}</td>
                  <td className="px-3 py-2 text-[10px] text-gray-500">{fmtPct(postTax.effectiveTaxRate)} effective</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 25-year projection */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <header className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
              <h4 className="text-xs font-semibold text-gray-900">25-year tax projection · 4-Bucket strategy</h4>
              <p className="text-[10px] text-gray-500 mt-0.5">Approximate annual tax on the year's withdrawals + B4 harvests, after LTCG ₹1.25L exemption.</p>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Year</th>
                    <th className="text-right px-3 py-2 font-medium">Annual draw</th>
                    <th className="text-right px-3 py-2 font-medium">Slab tax</th>
                    <th className="text-right px-3 py-2 font-medium">LTCG tax</th>
                    <th className="text-right px-3 py-2 font-medium">Total tax</th>
                    <th className="text-right px-3 py-2 font-medium">Eff. rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projection.map((r) => (
                    <tr key={r.year}>
                      <td className="px-4 py-1.5 text-gray-700 tabular-nums">{r.year}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">{fmtINR(r.annualWithdrawal)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">{fmtINR(r.slabTax)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">{fmtINR(r.ltcgTax)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-red-600 font-medium">{fmtINR(r.totalTax)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-gray-500">
                        {r.annualWithdrawal > 0 ? fmtPct(r.totalTax / r.annualWithdrawal) : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-2 text-gray-900">25-yr total</td>
                    <td colSpan={3}></td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-700">{fmtINR(totalLifetimeTax)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Old vs New regime comparison */}
          <RegimeCompare income={postTax.grossMonthly * 12} isSenior={isSenior} />
        </div>
      )}

      {view === 'optimizer' && (
        <LTCGOptimizer profile={profile} buckets={buckets} returnAssumptions={returnAssumptions} />
      )}

      {view === 'reshuffle' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Tax-aware reshuffle suggestions for {slab}% slab</h4>
          <ul className="space-y-3">
            {reshuffleAdvice.map((a, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  a.priority === 'high'   ? 'bg-red-100 text-red-700' :
                  a.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                            'bg-blue-100 text-blue-700'
                }`}>{i + 1}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{a.title}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{a.body}</div>
                  {a.savings && (
                    <div className="text-[11px] text-green-700 mt-1 font-medium">
                      Estimated savings: {a.savings}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-500">
            Suggestions auto-update with your slab. Verify any major action with a CA — tax law changes annually.
          </div>
        </div>
      )}
    </div>
  )
}

function LTCGOptimizer({ profile, buckets, returnAssumptions }: { profile: UserProfile; buckets: BucketState; returnAssumptions: ReturnAssumptions }) {
  // Project unrealized B4 gains over time, suggest annual harvest equal to ₹1.25L exemption
  const projection = simulateRefillLinked({
    buckets,
    monthlyWithdrawal: profile.monthlyWithdrawal,
    inflationRate: profile.inflationRate,
    returnAssumptions,
    initialCorpus: profile.corpus,
    horizonYears: 10,
  })

  const harvestRows = projection.map((r) => {
    const recommendedHarvest = LTCG_THRESHOLD  // exempt amount
    const optimalHarvest = recommendedHarvest
    return {
      year: r.year,
      b4Value: r.b4,
      autoHarvested: r.b4Harvested,
      optimalHarvest,
      taxIfNoHarvest: 0,           // baseline — defer
      taxIfOptimalHarvest: 0,      // exempt at LTCG_THRESHOLD
      taxSaved: optimalHarvest * LTCG_RATE,  // approximate — gains compounded into bigger LTCG bill later
    }
  })

  const totalSaved = harvestRows.reduce((a, b) => a + b.taxSaved, 0)

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-1">LTCG harvesting optimizer</h4>
        <p className="text-xs text-gray-600 leading-relaxed">
          Indian tax law gives you a <strong>₹{(LTCG_THRESHOLD / 1000).toFixed(0)}k</strong> annual LTCG exemption on equity gains.
          Realize this much B4 gain every March 31 — even if you don't need the cash — to step up your cost basis. Compounded over decades, this is one of the biggest tax savings available.
        </p>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Mini label="Annual exemption" value={fmtINR(LTCG_THRESHOLD)} />
          <Mini label="LTCG rate above" value={`${(LTCG_RATE * 100).toFixed(1)}%`} />
          <Mini label="10-yr est. savings" value={fmtINR(totalSaved)} tone="good" />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <header className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
          <h5 className="text-xs font-semibold text-gray-900">Year-by-year harvest schedule</h5>
        </header>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2 font-medium">FY end</th>
              <th className="text-right px-3 py-2 font-medium">B4 value</th>
              <th className="text-right px-3 py-2 font-medium">Auto-harvest</th>
              <th className="text-right px-3 py-2 font-medium">Recommend harvest</th>
              <th className="text-right px-3 py-2 font-medium">Tax saved (est.)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {harvestRows.map((r) => (
              <tr key={r.year}>
                <td className="px-4 py-1.5 text-gray-700 tabular-nums">Year {r.year}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">{fmtINR(r.b4Value)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">{fmtINR(r.autoHarvested)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums font-medium text-gray-900">{fmtINR(r.optimalHarvest)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-green-700">{fmtINR(r.taxSaved)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
        <strong>Action:</strong> Every <strong>March 31</strong>, sell ₹1.25L worth of B4 equity MF units (whichever has the highest unrealized gain) and immediately re-buy similar units. Zero tax. Cost basis steps up. Repeat annually.
      </div>
    </div>
  )
}

function RegimeCompare({ income, isSenior }: { income: number; isSenior: boolean }) {
  const oldTax = computeSlabTax(income, 'old', isSenior)
  const newTax = computeSlabTax(Math.max(0, income - STD_DEDUCTION_NEW), 'new', isSenior)
  const better = oldTax < newTax ? 'old' : 'new'
  const savings = Math.abs(oldTax - newTax)
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="text-xs font-semibold text-gray-900 mb-3">Old vs New regime · on your annual taxable income</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-lg border p-3 ${better === 'old' ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-700">Old regime</span>
            {better === 'old' && <span className="text-[10px] font-semibold text-green-700">BETTER</span>}
          </div>
          <div className="text-lg font-semibold text-gray-900 tabular-nums mt-1">{fmtINR(oldTax)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Includes 4% cess; no std deduction. 80TTB ₹{SECTION_80TTB / 1000}k available {isSenior ? '(applied)' : '(only for seniors)'}.</div>
        </div>
        <div className={`rounded-lg border p-3 ${better === 'new' ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-700">New regime</span>
            {better === 'new' && <span className="text-[10px] font-semibold text-green-700">BETTER</span>}
          </div>
          <div className="text-lg font-semibold text-gray-900 tabular-nums mt-1">{fmtINR(newTax)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">₹{STD_DEDUCTION_NEW / 1000}k std deduction. No 80C / 80D / 80TTB. Lower rates.</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-600">
        <strong>Bottom line:</strong> {better === 'old' ? 'Old' : 'New'} regime saves you about {fmtINR(savings)} per year on this income level.
      </div>
    </div>
  )
}

interface ReshuffleAdvice { title: string; body: string; priority: 'high' | 'medium' | 'low'; savings?: string }

function buildReshuffleAdvice(slab: TaxSlab, isSenior: boolean): ReshuffleAdvice[] {
  const advice: ReshuffleAdvice[] = []

  if (slab >= 20) {
    advice.push({
      title: 'Switch debt MF SWP to equity arbitrage / equity savings funds',
      body: 'Debt mutual funds bought after 1-Apr-2023 are taxed entirely at slab rate — so 30% slab keeps only 70% of the gain. Equity arbitrage funds (>65% equity) qualify for LTCG (12.5% above ₹1.25L). For the same ~7% pre-tax return, a 30% slab investor nets 4.9% from debt MF vs 6.1% from arbitrage.',
      priority: 'high',
      savings: '~120bps post-tax yield improvement',
    })
  }

  if (slab >= 10) {
    advice.push({
      title: 'Realize ₹1.25L of LTCG every March 31',
      body: 'The ₹1.25L LTCG exemption is use-it-or-lose-it annual. Sell exactly that much B4 equity MF gain each year-end and re-buy similar units — your cost basis steps up tax-free. Over 25 years this saves around 12.5% on ₹31L of compounded gains.',
      priority: 'high',
      savings: `~₹${(LTCG_THRESHOLD * LTCG_RATE * 25 / 1_00_000).toFixed(1)}L over 25 years`,
    })
  }

  if (isSenior) {
    advice.push({
      title: 'Park ₹6.25L+ of debt allocation in SCSS, not bank FD',
      body: 'SCSS pays 8.2% (vs senior FD ~7.9%) AND qualifies for 80C deduction (₹1.5L). Bank FD interest >₹50k attracts TDS @ 10%; SCSS interest is paid quarterly without TDS up to limit. SCSS limit raised to ₹30L per individual.',
      priority: 'high',
      savings: '~30bps yield + 80C deduction',
    })
  }

  advice.push({
    title: 'Use 80TTB to keep ₹50k of bank/post office interest tax-free',
    body: 'Senior citizens (60+) get a flat ₹50k deduction on bank, post office, and co-op bank interest. Allocate enough to FDs/savings to fully use this — it converts ₹50k of slab-taxed income into tax-free.',
    priority: isSenior ? 'medium' : 'low',
    savings: isSenior ? `~₹${Math.round(SECTION_80TTB * (slab / 100)).toLocaleString('en-IN')} / year at ${slab}% slab` : undefined,
  })

  if (slab >= 30) {
    advice.push({
      title: 'Avoid PMVVY for big amounts; use SCSS + RBI bonds instead',
      body: 'PMVVY and FD interest are fully slab-taxed. RBI Floating Rate Bonds also slab-taxed but pay 8.05% (typically 30bps higher). At 30% slab, every ₹1L of interest costs you ₹31k in tax. Equity LTCG-eligible products carry far less tax drag.',
      priority: 'medium',
    })
  }

  advice.push({
    title: 'Hold international funds in spouse\'s account if they are in a lower slab',
    body: 'International FoFs are now treated as debt MFs (slab rate). If your spouse is in a lower slab (or 0%), holding the international allocation in their PAN saves the differential. Watch out for clubbing rules — only works if the principal is gifted from spouse\'s own funds.',
    priority: 'low',
  })

  advice.push({
    title: 'Use March 31 to harvest both LTCG (gains) and offset debt-MF losses',
    body: 'If your debt MF holdings are showing capital losses, you can offset those against equity LTCG (or carry losses forward 8 years). Run an annual P&L on units across both equity and debt MFs in March, sell selectively to net out gains.',
    priority: 'medium',
  })

  return advice
}

// ── Tiny components ─────────────────────────────────────────────────

function KPI({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const c = tone === 'good' ? 'text-green-700' : tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-red-700' : 'text-gray-900'
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-base sm:text-lg font-semibold mt-1 tabular-nums ${c}`}>{value}</div>
      {hint && <div className="text-[10px] text-gray-400 mt-0.5">{hint}</div>}
    </div>
  )
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: 'good' }) {
  const c = tone === 'good' ? 'text-green-700' : 'text-gray-900'
  return (
    <div className="rounded bg-gray-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-sm font-semibold tabular-nums mt-0.5 ${c}`}>{value}</div>
    </div>
  )
}

function Selector<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="border border-gray-300 rounded px-2 py-1 bg-white text-xs"
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  )
}

function SubTab({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      key={id}
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  )
}
