// Comprehensive personalised retirement plan PDF.
//
// Generated entirely client-side via jsPDF. Pure programmatic draws — no
// html2canvas screenshots — so output is crisp, multi-page, printable, and
// stamped with the user's name in every header and the filename.

import type { UserProfile, BucketState, ReturnAssumptions, FrequencySchedule } from '../types'
import type { UserIdentity } from '../types/identity'
import type { StrategyResult } from '../types/strategies'
import type { PercentileBand, MonteCarloResult } from './calculations/monteCarlo'
import { fileSlug, ageFromDOB } from '../types/identity'
import { totalCorpus } from './calculations'
import { simulateRefillLinked, runCrashStressTest } from './refillStrategy'
import { runAllStrategies } from './calculations/strategyEngine'
import { runMonteCarlo } from './calculations/monteCarlo'
import { profileById } from './data/riskProfiles'
import { storage } from './storage'
import { computePostTax, classifyInstrument, type TaxSlab, type TaxRegime } from './calculations/taxEngine'

const fmtINR = (n: number) => {
  if (!Number.isFinite(n) || n === 0) return '₹0'
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`

const NAVY = [27, 41, 81] as const     // #1B2951
const GOLD = [184, 149, 106] as const  // #B8956A
const SLATE = [71, 85, 105] as const   // #475569
const GRAY = [148, 163, 184] as const  // #94A3B8

interface ExportContext {
  identity: UserIdentity | null
  profile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
}

export async function exportComprehensiveReport(ctx: ExportContext): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Pre-compute analytics
  const total = totalCorpus(ctx.buckets)
  const monthly = ctx.profile.monthlyWithdrawal
  const annual = monthly * 12
  const wr = total > 0 ? (annual / total) * 100 : 0
  const isSenior = (ctx.profile.demographics?.currentAge ?? ageFromDOB(ctx.identity?.dateOfBirth) ?? 60) >= 60
  const slab: TaxSlab = (ctx.profile.taxBracket ?? 20) as TaxSlab
  const regime: TaxRegime = 'old'

  const strategies = runAllStrategies({
    corpus: ctx.profile.corpus,
    monthlyWithdrawal: monthly,
    inflationRate: ctx.profile.inflationRate,
    returnAssumptions: ctx.returnAssumptions,
    buckets: ctx.buckets,
    taxSlab: slab,
    taxRegime: regime,
    isSenior,
  })
  const bestFit = strategies.find((s) => s.isBestFit) ?? strategies[0]

  const stress = runCrashStressTest({
    corpus: ctx.profile.corpus,
    monthlyWithdrawal: monthly,
    allocation: ctx.profile.bucketAllocation ?? { b1: 0.10, b2: 0.20, b3: 0.25, b4: 0.45 },
    returnAssumptions: ctx.returnAssumptions,
    inflationRate: ctx.profile.inflationRate,
  })

  const mc = runMonteCarlo({
    corpus: ctx.profile.corpus,
    monthlyWithdrawal: monthly,
    inflationRate: ctx.profile.inflationRate,
    returnAssumptions: ctx.returnAssumptions,
    buckets: ctx.buckets,
    runs: 200,
  })

  const projection25 = simulateRefillLinked({
    buckets: ctx.buckets,
    monthlyWithdrawal: monthly,
    inflationRate: ctx.profile.inflationRate,
    returnAssumptions: ctx.returnAssumptions,
    initialCorpus: ctx.profile.corpus,
    horizonYears: 25,
  })

  const riskProfileId = storage.getRiskProfile()
  const riskProfile = riskProfileId ? profileById(riskProfileId) : null
  const scale = ctx.profile.corpus / 1_00_00_000
  const incomeMix = (riskProfile?.instruments ?? [])
    .filter((i) => i.monthlyIncomeOn1Cr && i.monthlyIncomeOn1Cr > 0)
    .map((i) => ({
      monthly: (i.monthlyIncomeOn1Cr ?? 0) * scale,
      taxClass: classifyInstrument(i.category, i.bucket),
    }))
  const postTax = incomeMix.length > 0
    ? computePostTax(incomeMix, { slab, regime, isSenior, ltcgUsedThisYear: 0 })
    : null

  const report = {
    ctx,
    total, monthly, annual, wr, isSenior, slab, regime,
    strategies, bestFit, stress, mc, projection25,
    riskProfile, postTax,
  }

  // ── Render pages ────────────────────────────────────────────────────
  renderCoverPage(doc, report)
  doc.addPage(); renderPersonalDetails(doc, report)
  doc.addPage(); renderInputsAndAssumptions(doc, report)
  doc.addPage(); renderRiskProfile(doc, report)
  doc.addPage(); renderStrategyComparison(doc, report)
  doc.addPage(); renderMonteCarlo(doc, report)
  doc.addPage(); renderTaxAnalysis(doc, report)
  doc.addPage(); renderProjectionTable(doc, report)
  doc.addPage(); renderActions(doc, report)
  doc.addPage(); renderDisclaimers(doc, report)

  // ── Apply running headers/footers on every page (after all content drawn)
  const pageCount = doc.getNumberOfPages()
  const userName = ctx.identity?.fullName?.trim() || 'Personal'
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    drawHeader(doc, userName)
    drawFooter(doc, p, pageCount)
  }

  const slug = fileSlug(ctx.identity)
  const dateStr = new Date().toISOString().slice(0, 10)
  doc.save(`${slug}-retirement-plan-${dateStr}.pdf`)
}

// ── Page renderers ────────────────────────────────────────────────────

type Report = {
  ctx: ExportContext
  total: number; monthly: number; annual: number; wr: number
  isSenior: boolean; slab: TaxSlab; regime: TaxRegime
  strategies: StrategyResult[]; bestFit: StrategyResult
  stress: ReturnType<typeof runCrashStressTest>
  mc: MonteCarloResult
  projection25: ReturnType<typeof simulateRefillLinked>
  riskProfile: ReturnType<typeof profileById> | null
  postTax: ReturnType<typeof computePostTax> | null
}

function renderCoverPage(doc: import('jspdf').jsPDF, r: Report) {
  // Tall navy block at top
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, 210, 70, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 70, 210, 1, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('INDIAN RETIREMENT PLAN', 20, 22)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  const name = r.ctx.identity?.fullName?.trim() || 'Personalised Plan'
  doc.text(name, 20, 38)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(220, 220, 220)
  doc.text(`Generated ${formatDate(new Date())} · Version 2.0`, 20, 48)

  if (r.ctx.identity?.email) {
    doc.text(r.ctx.identity.email, 20, 56)
  }

  // Headline KPIs
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('At a glance', 20, 92)

  let y = 104
  drawKVBlock(doc, 20, y, [
    ['Total corpus',          fmtINR(r.total)],
    ['Monthly withdrawal',    fmtINR(r.monthly)],
    ['Withdrawal rate',       `${r.wr.toFixed(2)}% per year`],
    ['Best-fit strategy',     r.bestFit?.name ?? '—'],
    ['Post-tax monthly',      fmtINR(r.bestFit?.postTaxMonthlyIncome ?? 0)],
    ['20-year corpus (proj)', fmtINR(r.bestFit?.finalCorpus ?? 0)],
    ['Monte Carlo success',   `${(r.mc.successRate * 100).toFixed(0)}%`],
    ['35% crash stress',      r.stress.resilient ? 'Plan recovers' : `Breaks at year ${r.stress.brokeAtYear ?? '?'}`],
  ])
  y += 80

  // Verdict block
  doc.setFillColor(247, 250, 252)
  doc.roundedRect(15, y, 180, 38, 3, 3, 'F')
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.8)
  doc.line(15, y, 15, y + 38)

  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Headline verdict', 22, y + 9)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...SLATE)
  const verdictText = synthesiseHeadline(r)
  const wrapped = doc.splitTextToSize(verdictText, 170)
  doc.text(wrapped, 22, y + 18)

  y += 50
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  doc.text(
    'This report is a personalised projection based on the inputs you provided and the simulation rules described inside. Validate any major action with a SEBI-registered advisor or CA before transacting.',
    105, 280, { align: 'center', maxWidth: 180 },
  )
}

function renderPersonalDetails(doc: import('jspdf').jsPDF, r: Report) {
  pageTitle(doc, '1. Personal details')
  let y = 40
  const id = r.ctx.identity
  if (!id) {
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...GRAY)
    doc.text('No personal details captured.', 20, y)
    return
  }
  const dem = r.ctx.profile.demographics
  const age = ageFromDOB(id.dateOfBirth) ?? dem?.currentAge ?? null
  const rows: Array<[string, string]> = [
    ['Full name',        id.fullName || '—'],
    ['Email',            id.email || '—'],
    ['Phone',            id.phone || '—'],
    ['Date of birth',    id.dateOfBirth ? formatDate(new Date(id.dateOfBirth)) : '—'],
    ['Age',              age != null ? `${age} years` : '—'],
    ['Marital status',   id.maritalStatus ? capitalise(id.maritalStatus) : '—'],
    ['Spouse name',      id.spouseName || '—'],
    ['Occupation',       id.occupation || '—'],
    ['PAN',              id.panCard || '—'],
  ]
  drawKVBlock(doc, 20, y, rows)
  y += rows.length * 9 + 8

  if (id.address && (id.address.line1 || id.address.city)) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NAVY)
    doc.text('Address', 20, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...SLATE)
    if (id.address.line1) { doc.text(id.address.line1, 20, y); y += 5 }
    if (id.address.line2) { doc.text(id.address.line2, 20, y); y += 5 }
    const cityLine = [id.address.city, id.address.state, id.address.pincode].filter(Boolean).join(', ')
    if (cityLine) { doc.text(cityLine, 20, y); y += 5 }
  }

  // Demographics from profile
  y += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('Demographics for planning', 20, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...SLATE)
  drawKVBlock(doc, 20, y, [
    ['Current age',          dem?.currentAge != null ? `${dem.currentAge}` : '—'],
    ['Retirement age',       dem?.retirementAge != null ? `${dem.retirementAge}` : '—'],
    ['Life expectancy',      dem?.lifeExpectancy != null ? `${dem.lifeExpectancy}` : '—'],
    ['City tier',            dem?.city ? capitalise(dem.city) : '—'],
    ['Spouse age',           dem?.spouseAge != null ? `${dem.spouseAge}` : '—'],
    ['Spouse life exp.',     dem?.spouseLifeExpectancy != null ? `${dem.spouseLifeExpectancy}` : '—'],
  ])
}

function renderInputsAndAssumptions(doc: import('jspdf').jsPDF, r: Report) {
  pageTitle(doc, '2. Inputs and assumptions')
  let y = 40
  const p = r.ctx.profile

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('Corpus and withdrawal', 20, y)
  y += 6
  drawKVBlock(doc, 20, y, [
    ['Total corpus',          fmtINR(p.corpus)],
    ['Monthly draw target',   fmtINR(p.monthlyWithdrawal)],
    ['Annualised draw',       fmtINR(p.monthlyWithdrawal * 12)],
    ['Inflation rate (gen.)', `${p.inflationRate}% per year`],
    ['Tax slab',              `${p.taxBracket}% (${r.regime} regime)`],
  ])
  y += 5 * 9 + 8

  // Withdrawal schedule (if user used the multi-frequency editor)
  if (p.withdrawalSchedule && hasAny(p.withdrawalSchedule)) {
    y = renderSchedule(doc, y, 'Withdrawal schedule', p.withdrawalSchedule)
  }
  if (p.sipSchedule && hasAny(p.sipSchedule)) {
    y = renderSchedule(doc, y, 'SIP / passive income', p.sipSchedule)
  }

  // Bucket allocation
  if (y > 230) { doc.addPage(); y = 40 }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('Bucket allocation', 20, y)
  y += 6
  drawKVBlock(doc, 20, y, [
    [`B1 — Liquidity (${pctOf(r.ctx.buckets.b1, r.total)}%)`,    fmtINR(r.ctx.buckets.b1)],
    [`B2 — Fixed Floor (${pctOf(r.ctx.buckets.b2, r.total)}%)`,  fmtINR(r.ctx.buckets.b2)],
    [`B3 — Stability (${pctOf(r.ctx.buckets.b3, r.total)}%)`,    fmtINR(r.ctx.buckets.b3)],
    [`B4 — Growth (${pctOf(r.ctx.buckets.b4, r.total)}%)`,       fmtINR(r.ctx.buckets.b4)],
  ])
  y += 4 * 9 + 6

  // Return assumptions
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('Expected returns (nominal CAGR)', 20, y)
  y += 6
  drawKVBlock(doc, 20, y, [
    ['B1 liquid',     `${r.ctx.returnAssumptions.b1}%`],
    ['B2 fixed',      `${r.ctx.returnAssumptions.b2}%`],
    ['B3 hybrid',     `${r.ctx.returnAssumptions.b3}%`],
    ['B4 equity',     `${r.ctx.returnAssumptions.b4}%`],
  ])
}

function renderSchedule(doc: import('jspdf').jsPDF, y: number, label: string, s: FrequencySchedule): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text(label, 20, y)
  y += 6
  const monthlyEq = s.monthly + s.quarterly / 3 + s.halfYearly / 6 + s.yearly / 12
  drawKVBlock(doc, 20, y, [
    ['Monthly slot',     fmtINR(s.monthly)],
    ['Quarterly slot',   fmtINR(s.quarterly)],
    ['Half-yearly slot', fmtINR(s.halfYearly)],
    ['Yearly slot',      fmtINR(s.yearly)],
    ['Combined monthly', fmtINR(monthlyEq)],
  ])
  return y + 5 * 9 + 6
}

function renderRiskProfile(doc: import('jspdf').jsPDF, r: Report) {
  pageTitle(doc, '3. Risk profile and instrument mix')
  let y = 40

  if (!r.riskProfile) {
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...GRAY)
    doc.text('No risk profile selected. Take the quiz on the Profile tab for instrument-level recommendations.', 20, y, { maxWidth: 170 })
    return
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...NAVY)
  doc.text(r.riskProfile.name, 20, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...SLATE)
  doc.text(r.riskProfile.tagline, 20, y + 6)

  y += 14
  const wrap = doc.splitTextToSize(r.riskProfile.description, 170)
  doc.text(wrap, 20, y)
  y += wrap.length * 5 + 4

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9.5)
  doc.setTextColor(...GRAY)
  doc.text(`Best for: ${r.riskProfile.bestFor}`, 20, y, { maxWidth: 170 })
  y += 10

  // Instruments table
  const scale = r.ctx.profile.corpus / 1_00_00_000
  const headers = ['Bucket', 'Instrument', '₹ allocated', 'Income/mo']
  const rows = r.riskProfile.instruments.map((inst) => [
    inst.bucket,
    truncate(inst.name, 38),
    fmtINR(inst.allocationOn1CrCorpus * scale),
    inst.monthlyIncomeOn1Cr ? fmtINR(inst.monthlyIncomeOn1Cr * scale) : '—',
  ])
  drawTable(doc, 20, y, [38, 80, 32, 30], headers, rows)
}

function renderStrategyComparison(doc: import('jspdf').jsPDF, r: Report) {
  pageTitle(doc, '4. Strategy comparison')
  let y = 40

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...SLATE)
  doc.text(
    `All 10 retirement income strategies scored against your corpus, monthly target, and ${r.slab}% tax slab. The best-fit strategy is starred.`,
    20, y, { maxWidth: 170 },
  )
  y += 12

  const sorted = [...r.strategies].sort((a, b) => b.totalScore - a.totalScore)
  const headers = ['Strategy', 'Net/mo', '20-yr corpus', 'Score', 'Verdict']
  const rows = sorted.map((s) => [
    truncate((s.isBestFit ? '★ ' : '') + s.name, 40),
    fmtINR(s.postTaxMonthlyIncome),
    fmtINR(s.finalCorpus),
    `${s.totalScore}/60`,
    verdictLabel(s.verdict),
  ])
  drawTable(doc, 15, y, [60, 30, 35, 22, 33], headers, rows)
}

function renderMonteCarlo(doc: import('jspdf').jsPDF, r: Report) {
  pageTitle(doc, '5. Monte Carlo simulation')
  let y = 40

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...SLATE)
  doc.text(
    `${r.mc.runs} random portfolio paths. Per-bucket annual returns sampled from a normal distribution; full guardrail-aware simulator applied to each path.`,
    20, y, { maxWidth: 170 },
  )
  y += 12

  drawKVBlock(doc, 20, y, [
    ['Success rate',         `${(r.mc.successRate * 100).toFixed(1)}%`],
    ['Median final corpus',  fmtINR(r.mc.medianFinalCorpus)],
    ['10th percentile',      fmtINR(r.mc.p10FinalCorpus)],
    ['90th percentile',      fmtINR(r.mc.p90FinalCorpus)],
    ['Earliest depletion',   r.mc.worstDepletionYear ? `Year ${r.mc.worstDepletionYear}` : 'Never'],
  ])
  y += 5 * 9 + 8

  // Year-by-year percentile bands (every 5 years)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('Percentile bands at key years', 20, y)
  y += 6
  const headers = ['Year', 'p10', 'p25', 'Median', 'p75', 'p90']
  const milestones = [1, 5, 10, 15, 20, 25].map((yr) => r.mc.yearlyPercentiles[yr] as PercentileBand | undefined).filter(Boolean) as PercentileBand[]
  const rows = milestones.map((p) => [
    `Year ${p.year}`,
    fmtINR(p.p10), fmtINR(p.p25), fmtINR(p.median), fmtINR(p.p75), fmtINR(p.p90),
  ])
  drawTable(doc, 15, y, [22, 32, 32, 32, 32, 32], headers, rows)
  y += rows.length * 8 + 12

  // Stress test
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('Stress test', 20, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...SLATE)
  const stressLine = r.stress.resilient
    ? `${r.stress.scenarioLabel}: plan recovers, finishing at ${fmtINR(r.stress.finalCorpus)}.`
    : `${r.stress.scenarioLabel}: plan breaks at year ${r.stress.brokeAtYear ?? '?'}.`
  doc.text(stressLine, 20, y, { maxWidth: 170 })
}

function renderTaxAnalysis(doc: import('jspdf').jsPDF, r: Report) {
  pageTitle(doc, '6. Tax analysis (FY 2024-25)')
  let y = 40

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...SLATE)
  doc.text(`Indian tax rules at ${r.slab}% slab, ${r.regime} regime${r.isSenior ? ', senior citizen' : ''}.`, 20, y, { maxWidth: 170 })
  y += 10

  if (!r.postTax) {
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...GRAY)
    doc.text('Detailed tax breakdown unavailable — select a risk profile on the Profile tab to populate the instrument-level mix.', 20, y, { maxWidth: 170 })
    return
  }

  drawKVBlock(doc, 20, y, [
    ['Gross monthly income',   fmtINR(r.postTax.grossMonthly)],
    ['Annual tax owed',        fmtINR(r.postTax.annualTax)],
    ['Net monthly income',     fmtINR(r.postTax.netMonthly)],
    ['Effective tax rate',     fmtPct(r.postTax.effectiveTaxRate)],
  ])
  y += 4 * 9 + 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('Per-tax-class breakdown (annual)', 20, y)
  y += 6
  const headers = ['Class', 'Gross', 'Tax', 'Net']
  const rows = r.postTax.breakdown.map((b) => [
    classLabel(b.taxClass),
    fmtINR(b.grossAnnual),
    fmtINR(b.tax),
    fmtINR(b.netAnnual),
  ])
  drawTable(doc, 20, y, [50, 35, 35, 35], headers, rows)
}

function renderProjectionTable(doc: import('jspdf').jsPDF, r: Report) {
  pageTitle(doc, '7. 25-year projection — 4-Bucket')
  let y = 40

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...SLATE)
  doc.text('Year-by-year projection of corpus, withdrawal, and bucket balances under the recommended four-bucket strategy.', 20, y, { maxWidth: 170 })
  y += 10

  const headers = ['Yr', 'Annual draw', 'B1', 'B2', 'B3', 'B4', 'Total']
  const rows = r.projection25.slice(0, 25).map((row) => [
    String(row.year),
    fmtINR(row.annualWithdrawal),
    fmtINR(row.b1),
    fmtINR(row.b2),
    fmtINR(row.b3),
    fmtINR(row.b4),
    fmtINR(row.totalCorpus),
  ])
  drawTable(doc, 13, y, [13, 30, 26, 26, 26, 26, 35], headers, rows, 6.5)
}

function renderActions(doc: import('jspdf').jsPDF, r: Report) {
  pageTitle(doc, '8. Recommended next actions')
  let y = 40
  const actions = synthesiseActions(r)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  for (const [i, a] of actions.entries()) {
    if (y > 260) { doc.addPage(); y = 40 }
    // Number circle
    doc.setFillColor(...NAVY)
    doc.circle(22, y - 2, 4, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(String(i + 1), 22, y - 0.2, { align: 'center' })

    doc.setTextColor(...NAVY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(a.title, 30, y, { maxWidth: 170 })
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...SLATE)
    const wrapped = doc.splitTextToSize(a.body, 165)
    doc.text(wrapped, 30, y)
    y += wrapped.length * 5 + 6
  }
}

function renderDisclaimers(doc: import('jspdf').jsPDF, _r: Report) {
  pageTitle(doc, '9. Methodology and disclaimers')
  let y = 40

  const sections: Array<[string, string]> = [
    ['Methodology', 'The four-bucket refill-linked strategy implements the academic Indian retirement income framework. Withdrawals draw from B1 cash first, then B3 stability, then B4 growth (skipped in losing years). B2 is a 5-year fixed-deposit ladder, held to maturity and renewed, never drawn or refilled. Refills cascade B4 → B3 (interest-harvest above 12% return or B3 cover < 6 yrs) and B3 → B1 (top up to a 2-year buffer). Guardrails freeze inflation when corpus drops below 85% of starting and cut withdrawals 10% below 70%.'],
    ['Tax engine', 'FY 2024-25 rules: equity LTCG 12.5% above ₹1,25,000 annual exemption; debt MF gains taxed at slab (post-Apr 2023); FD/SCSS/PMVVY interest at slab; 80TTB ₹50k exemption for seniors; PPF tax-free. Cumulative LTCG exemption tracked across all equity holdings.'],
    ['Monte Carlo', 'Per-bucket annual returns sampled from N(μ, σ) using Box-Muller transformation. Volatility: B1 0.5%, B2 1.5%, B3 8%, B4 18%. Each path runs through the full guardrail-aware simulator. Success rate is the fraction of paths where corpus stays positive through the full horizon.'],
    ['Limitations', 'This is an analytical aid, not financial advice or tax preparation. Returns are modelled, not predicted — real markets have fat tails the normal distribution does not capture. Personal deductions (full 80C, 80D, HRA, foreign assets) are not modelled. Joint retirement is partially modelled — survivor benefits need a CA review. The fund recommendations are starting points; verify NAV, AUM, and expense ratios at the time of investment.'],
    ['Privacy', 'All computation runs in your browser. Personal details, inputs, and results are stored only in your browser\'s localStorage. Nothing is transmitted off your device. Clearing browser data resets everything.'],
    ['Validation', 'Always validate any major action with a SEBI-registered investment advisor or a Chartered Accountant before transacting. Tax law changes annually after the Union Budget — re-run this report after every Budget.'],
  ]

  for (const [title, body] of sections) {
    if (y > 250) { doc.addPage(); y = 40 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NAVY)
    doc.text(title, 20, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...SLATE)
    const wrapped = doc.splitTextToSize(body, 170)
    doc.text(wrapped, 20, y)
    y += wrapped.length * 4.5 + 6
  }
}

// ── Drawing primitives ──────────────────────────────────────────────

function drawHeader(doc: import('jspdf').jsPDF, userName: string) {
  if (doc.getCurrentPageInfo().pageNumber === 1) return  // skip cover
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  doc.text(`${userName} · Indian Retirement Plan`, 20, 12)
  doc.text(formatDate(new Date()), 190, 12, { align: 'right' })
  doc.setDrawColor(...GRAY)
  doc.setLineWidth(0.2)
  doc.line(20, 14, 190, 14)
}

function drawFooter(doc: import('jspdf').jsPDF, page: number, total: number) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  doc.text(`Page ${page} of ${total}`, 190, 290, { align: 'right' })
  doc.text('Generated by Indian Retirement Planner v2.0', 20, 290)
}

function pageTitle(doc: import('jspdf').jsPDF, title: string) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...NAVY)
  doc.text(title, 20, 28)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.6)
  doc.line(20, 32, 60, 32)
}

function drawKVBlock(doc: import('jspdf').jsPDF, x: number, y: number, rows: Array<[string, string]>) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  rows.forEach(([k, v], i) => {
    const yi = y + i * 9
    doc.setTextColor(...GRAY)
    doc.text(k, x, yi)
    doc.setTextColor(...NAVY)
    doc.setFont('helvetica', 'bold')
    doc.text(v, x + 70, yi)
    doc.setFont('helvetica', 'normal')
  })
}

function drawTable(
  doc: import('jspdf').jsPDF,
  x: number,
  y: number,
  widths: number[],
  headers: string[],
  rows: string[][],
  rowHeight = 7,
) {
  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...NAVY)
  doc.setFillColor(247, 250, 252)
  const totalWidth = widths.reduce((a, b) => a + b, 0)
  doc.rect(x, y - 4.5, totalWidth, 6.5, 'F')
  let cx = x
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], cx + 2, y)
    cx += widths[i]
  }
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.3)
  doc.line(x, y + 2.2, x + totalWidth, y + 2.2)

  // Rows
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...SLATE)
  let ry = y + rowHeight
  for (const row of rows) {
    if (ry > 280) { doc.addPage(); ry = 40 }
    let rx = x
    for (let i = 0; i < row.length; i++) {
      doc.text(row[i], rx + 2, ry)
      rx += widths[i]
    }
    doc.setDrawColor(232, 236, 240)
    doc.setLineWidth(0.1)
    doc.line(x, ry + 1.5, x + totalWidth, ry + 1.5)
    ry += rowHeight
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function synthesiseHeadline(r: Report): string {
  const success = r.mc.successRate
  const baselinePass = r.bestFit && (r.bestFit.verdict === 'BEST_FIT' || r.bestFit.verdict === 'PASSES')
  if (baselinePass && r.stress.resilient && success >= 0.85) {
    return `Your plan is on track. The ${r.bestFit.name} sustains your ${fmtINR(r.monthly)}/month draw at a ${r.wr.toFixed(1)}% withdrawal rate, with ${(success * 100).toFixed(0)}% Monte Carlo success and a recovery from a 35% equity crash in year 5. After Indian tax, take-home is ${fmtINR(r.bestFit.postTaxMonthlyIncome)} per month.`
  }
  if (baselinePass && (success >= 0.55 || r.stress.resilient)) {
    return `Close — but the plan needs adjustments. Baseline holds, but ${success < 0.85 ? `Monte Carlo success is ${(success * 100).toFixed(0)}% (below 85% comfort)` : 'the 35% year-5 crash test breaks the plan'}. Consider reducing the monthly draw by 10-15% or shifting 5% of corpus from B4 to B2.`
  }
  return `The numbers don't work yet. At a ${r.wr.toFixed(1)}% withdrawal rate, the plan succeeds in only ${(success * 100).toFixed(0)}% of simulated futures. Either delay retirement to grow the corpus, reduce the monthly target, or add a secondary income stream.`
}

function synthesiseActions(r: Report): Array<{ title: string; body: string }> {
  const success = r.mc.successRate
  const baselinePass = r.bestFit && (r.bestFit.verdict === 'BEST_FIT' || r.bestFit.verdict === 'PASSES')

  if (baselinePass && r.stress.resilient && success >= 0.85) {
    return [
      { title: 'Set up the recommended fund mix', body: 'Open accounts with the AMCs listed in your selected risk profile. Start systematic withdrawal plans (SWPs) at the rupee amounts shown on the instrument table. Use direct plans for lower expense ratios.' },
      { title: 'Schedule annual LTCG harvest', body: 'Every March 31, sell ₹1,25,000 of B4 equity-MF gains and immediately re-buy similar units to step up cost basis. Compounded over 25 years this saves approximately ₹3.9 L on a ₹1 Cr starting corpus.' },
      { title: 'Review and rebalance annually in April', body: 'Once a year, recompute bucket balances against target allocation. Rebalance via fresh SIP allocations rather than redemptions where possible (no tax event). Re-run this report to capture updated tax law and market conditions.' },
      { title: 'Document a contingency plan', body: 'Write down how you would respond to a 30%+ market crash, an early death of either spouse, a major medical event, or a 9%+ inflation spike. This tool flags these stress scenarios but the human response is yours.' },
    ]
  }
  if (baselinePass && (success >= 0.55 || r.stress.resilient)) {
    return [
      { title: 'Reduce monthly withdrawal by 10-15%', body: 'On the Plan tab, lower your target. Re-run the Compare and Simulate tabs to verify Monte Carlo success crosses 85% and the stress test recovers.' },
      { title: 'Shift 5% of corpus from B4 to B2', body: 'Move some equity allocation to the fixed-floor bucket (SCSS, FD ladder, RBI bonds). Strengthens the buffer for the 35% year-5 crash test. Trade-off: slightly lower year-20 corpus.' },
      { title: 'Consider working 1-2 years longer', body: 'An extra year of contribution + market growth often closes the gap entirely. The Plan tab will show whether adjusted figures pass once you update them.' },
      { title: 'Re-validate after each market correction', body: 'Drawdowns of more than 20% materially shift the success probability. Re-run this report after any major market move.' },
    ]
  }
  return [
    { title: 'Run the corpus-preservation calculator', body: 'On the Simulate tab, see the maximum monthly draw your corpus can sustainably support. Set your target at or below this number.' },
    { title: 'Lower the monthly target by 30-40%', body: 'Try reducing your monthly target on the Plan tab and re-running the Summary tab. Adjustments of this magnitude often move the plan from "not achievable" to "close" or "achievable".' },
    { title: 'Add a secondary income stream', body: 'Even ₹15,000-25,000/month of rental or part-time income substantially reduces what the corpus must produce. Enter this on the Plan tab\'s SIP / passive income section.' },
    { title: 'Delay retirement by 2-4 years', body: 'Additional accumulation + market growth + reduced retirement horizon often closes the gap. Re-evaluate annually with this report.' },
    { title: 'Consult a financial planner', body: 'When the gap is structural rather than tactical, a SEBI-registered investment advisor can identify options the tool does not — annuities, real-estate liquidation, reverse mortgage, family income pooling.' },
  ]
}

function classLabel(c: string): string {
  return c.replace(/-/g, ' ').replace(/(?:^|\s)\S/g, (m) => m.toUpperCase())
}

function verdictLabel(v: string): string {
  switch (v) {
    case 'BEST_FIT': return 'Best Fit'
    case 'PASSES': return 'Passes'
    case 'PARTIAL': return 'Partial'
    case 'FAILS': return 'Fails'
    case 'NOT_APPLICABLE': return 'N/A'
    default: return v
  }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function pctOf(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 100)
}

function hasAny(s: FrequencySchedule): boolean {
  return s.monthly > 0 || s.quarterly > 0 || s.halfYearly > 0 || s.yearly > 0
}
