import type { ExportContext } from './index'
import { buildAnalytics, fmtINR, fmtPct, fileSlugFor, dateStamp, downloadBlob } from './analytics'

export async function exportMarkdown(ctx: ExportContext): Promise<void> {
  const a = buildAnalytics(ctx)
  const id = ctx.identity
  const userName = id?.fullName?.trim() || 'Personal'
  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })

  const lines: string[] = []
  const w = (s: string = '') => lines.push(s)

  // Header
  w(`# Indian Retirement Plan — ${userName}`)
  w()
  w(`> Generated **${today}** · Version 2.0`)
  w()
  w('---')
  w()

  // Headline
  w('## At a Glance')
  w()
  w(`| Metric | Value |`)
  w(`|---|---|`)
  w(`| Total corpus | **${fmtINR(a.total)}** |`)
  w(`| Monthly withdrawal | **${fmtINR(a.monthly)}** |`)
  w(`| Withdrawal rate | **${a.wr.toFixed(2)}%** per year |`)
  w(`| Best-fit strategy | **${a.bestFit?.name ?? '—'}** (score ${a.bestFit?.totalScore ?? '—'}/60) |`)
  w(`| Post-tax monthly | **${fmtINR(a.bestFit?.postTaxMonthlyIncome ?? 0)}** (${a.bestFit?.taxDragPct.toFixed(1) ?? 0}% tax drag) |`)
  w(`| 20-year corpus | **${fmtINR(a.bestFit?.finalCorpus ?? 0)}** |`)
  w(`| Monte Carlo success | **${(a.mc.successRate * 100).toFixed(0)}%** (${a.mc.runs} paths) |`)
  w(`| 35% crash stress | ${a.stress.resilient ? '✓ Plan recovers' : `✗ Breaks at year ${a.stress.brokeAtYear ?? '?'}`} |`)
  w()
  w('---')
  w()

  // 1. Personal Details
  w('## 1. Personal Details')
  w()
  if (id) {
    w('### 1.1 Identity')
    w()
    w(`- **Full name:** ${id.fullName || '—'}`)
    w(`- **Email:** ${id.email || '—'}`)
    w(`- **Phone:** ${id.phone || '—'}`)
    w(`- **Date of birth:** ${id.dateOfBirth || '—'}`)
    w(`- **Marital status:** ${id.maritalStatus ?? '—'}`)
    if (id.spouseName) w(`- **Spouse name:** ${id.spouseName}`)
    w(`- **Occupation:** ${id.occupation || '—'}`)
    w(`- **PAN:** ${id.panCard || '—'}`)
    w()
    if (id.address && (id.address.line1 || id.address.city)) {
      w('### 1.2 Address')
      w()
      const addrLines = [id.address.line1, id.address.line2, [id.address.city, id.address.state, id.address.pincode].filter(Boolean).join(', ')].filter(Boolean)
      addrLines.forEach((l) => w(l))
      w()
    }
  }
  const dem = ctx.profile.demographics
  if (dem) {
    w('### 1.3 Demographics for Planning')
    w()
    w(`- Current age: ${dem.currentAge}`)
    w(`- Retirement age: ${dem.retirementAge}`)
    w(`- Life expectancy: ${dem.lifeExpectancy}`)
    w(`- City tier: ${dem.city}`)
    if (dem.spouseAge) w(`- Spouse age: ${dem.spouseAge}`)
    w()
  }

  // 2. Inputs
  w('## 2. Inputs and Assumptions')
  w()
  w(`- **Corpus:** ${fmtINR(ctx.profile.corpus)}`)
  w(`- **Monthly withdrawal:** ${fmtINR(ctx.profile.monthlyWithdrawal)}`)
  w(`- **Inflation rate:** ${ctx.profile.inflationRate}% per year`)
  w(`- **Tax slab:** ${ctx.profile.taxBracket}% (${a.regime} regime)`)
  w()
  w('### 2.4 Bucket Allocation')
  w()
  w(`| Bucket | Value | % of corpus |`)
  w(`|---|---:|---:|`)
  w(`| B1 — Liquidity | ${fmtINR(ctx.buckets.b1)} | ${pctOf(ctx.buckets.b1, a.total)}% |`)
  w(`| B2 — Fixed Floor | ${fmtINR(ctx.buckets.b2)} | ${pctOf(ctx.buckets.b2, a.total)}% |`)
  w(`| B3 — Stability | ${fmtINR(ctx.buckets.b3)} | ${pctOf(ctx.buckets.b3, a.total)}% |`)
  w(`| B4 — Growth | ${fmtINR(ctx.buckets.b4)} | ${pctOf(ctx.buckets.b4, a.total)}% |`)
  w()

  // 3. Risk Profile
  if (a.riskProfile) {
    w('## 3. Risk Profile')
    w()
    w(`### 3.1 ${a.riskProfile.name}`)
    w()
    w(`> ${a.riskProfile.tagline}`)
    w()
    w(a.riskProfile.description)
    w()
    w('### 3.2 Recommended Instruments')
    w()
    w(`| Bucket | Instrument | ₹ allocated | Income/mo |`)
    w(`|---|---|---:|---:|`)
    const scale = ctx.profile.corpus / 1_00_00_000
    a.riskProfile.instruments.forEach((inst) => {
      w(`| ${inst.bucket} | ${inst.name} | ${fmtINR(inst.allocationOn1CrCorpus * scale)} | ${inst.monthlyIncomeOn1Cr ? fmtINR(inst.monthlyIncomeOn1Cr * scale) : '—'} |`)
    })
    w()
  }

  // 4. Strategy Comparison
  w('## 4. Strategy Comparison')
  w()
  w(`| # | Strategy | Net/mo | 20-yr Corpus | Score | Verdict |`)
  w(`|---:|---|---:|---:|---:|---|`)
  const sorted = [...a.strategies].sort((x, y) => y.totalScore - x.totalScore)
  sorted.forEach((s, i) => {
    const star = s.isBestFit ? '⭐ ' : ''
    w(`| ${i + 1} | ${star}${s.name} | ${fmtINR(s.postTaxMonthlyIncome)} | ${fmtINR(s.finalCorpus)} | ${s.totalScore}/60 | ${verdictLabel(s.verdict)} |`)
  })
  w()

  // 5. Monte Carlo
  w('## 5. Monte Carlo Simulation')
  w()
  w(`- **Success rate:** ${(a.mc.successRate * 100).toFixed(1)}%`)
  w(`- **Median final corpus:** ${fmtINR(a.mc.medianFinalCorpus)}`)
  w(`- **10th percentile:** ${fmtINR(a.mc.p10FinalCorpus)}`)
  w(`- **90th percentile:** ${fmtINR(a.mc.p90FinalCorpus)}`)
  w(`- **Earliest depletion:** ${a.mc.worstDepletionYear ? `Year ${a.mc.worstDepletionYear}` : 'Never'}`)
  w()
  w('### 5.2 Percentile Bands at Key Years')
  w()
  w(`| Year | p10 | p25 | Median | p75 | p90 |`)
  w(`|---:|---:|---:|---:|---:|---:|`)
  ;[1, 5, 10, 15, 20, 25].forEach((yr) => {
    const p = a.mc.yearlyPercentiles[yr]
    if (p) w(`| ${p.year} | ${fmtINR(p.p10)} | ${fmtINR(p.p25)} | ${fmtINR(p.median)} | ${fmtINR(p.p75)} | ${fmtINR(p.p90)} |`)
  })
  w()
  w(`### 5.3 Stress Test`)
  w()
  w(`> ${a.stress.scenarioLabel}: ${a.stress.resilient ? `**Plan recovers**, finishing at ${fmtINR(a.stress.finalCorpus)}.` : `**Plan breaks** at year ${a.stress.brokeAtYear ?? '?'}.`}`)
  w()

  // 6. Tax
  if (a.postTax) {
    w('## 6. Tax Analysis (FY 2024-25)')
    w()
    w(`- Gross monthly: **${fmtINR(a.postTax.grossMonthly)}**`)
    w(`- Annual tax: **${fmtINR(a.postTax.annualTax)}**`)
    w(`- Net monthly: **${fmtINR(a.postTax.netMonthly)}**`)
    w(`- Effective tax rate: **${fmtPct(a.postTax.effectiveTaxRate)}**`)
    w()
    w('### 6.2 Per-Tax-Class Breakdown (Annual)')
    w()
    w(`| Class | Gross | Tax | Net |`)
    w(`|---|---:|---:|---:|`)
    a.postTax.breakdown.forEach((b) => {
      w(`| ${classLabel(b.taxClass)} | ${fmtINR(b.grossAnnual)} | ${fmtINR(b.tax)} | ${fmtINR(b.netAnnual)} |`)
    })
    w()
  }

  // 7. 25-year projection
  w('## 7. 25-Year Projection')
  w()
  w(`| Year | Annual Draw | B1 | B2 | B3 | B4 | Total |`)
  w(`|---:|---:|---:|---:|---:|---:|---:|`)
  a.projection25.slice(0, 25).forEach((row) => {
    w(`| ${row.year} | ${fmtINR(row.annualWithdrawal)} | ${fmtINR(row.b1)} | ${fmtINR(row.b2)} | ${fmtINR(row.b3)} | ${fmtINR(row.b4)} | ${fmtINR(row.totalCorpus)} |`)
  })
  w()

  // 9. Disclaimers
  w('## 9. Methodology and Disclaimers')
  w()
  w('This is an analytical aid, not financial advice or tax preparation. Returns are modelled, not predicted. Validate any major action with a SEBI-registered investment advisor or a Chartered Accountant.')
  w()
  w('---')
  w()
  w(`*Generated by the Indian Retirement Planner v2.0 on ${today}*`)

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
  downloadBlob(blob, `${fileSlugFor(ctx)}-retirement-plan-${dateStamp()}.md`)
}

function pctOf(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 100)
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

function classLabel(c: string): string {
  return c.replace(/-/g, ' ').replace(/(?:^|\s)\S/g, (m) => m.toUpperCase())
}
