// CSV exporter — opens directly in Excel / Google Sheets / Numbers.
// Multi-sheet pattern: each table is written as its own block separated
// by blank lines and a section heading row, so a single .csv file can be
// imported and the user manually splits sheets if needed.

import type { ExportContext } from './index'
import { buildAnalytics, fileSlugFor, dateStamp, downloadBlob } from './analytics'

function csvEscape(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(...cells: unknown[]): string {
  return cells.map(csvEscape).join(',')
}

export async function exportCsv(ctx: ExportContext): Promise<void> {
  const a = buildAnalytics(ctx)
  const id = ctx.identity
  const userName = id?.fullName?.trim() || 'Personal'
  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })

  const lines: string[] = []
  const w = (s: string = '') => lines.push(s)

  // Header block
  w(row('Indian Retirement Plan'))
  w(row('Generated for', userName))
  w(row('Date', today))
  w()

  // Sheet 1 — At a Glance
  w(row('=== AT A GLANCE ==='))
  w(row('Metric', 'Value'))
  w(row('Total corpus', a.total))
  w(row('Monthly withdrawal', a.monthly))
  w(row('Annual draw', a.annual))
  w(row('Withdrawal rate (%)', a.wr.toFixed(2)))
  w(row('Best-fit strategy', a.bestFit?.name ?? '—'))
  w(row('Best-fit score', a.bestFit?.totalScore ?? 0))
  w(row('Post-tax monthly', a.bestFit?.postTaxMonthlyIncome ?? 0))
  w(row('Tax drag (%)', a.bestFit?.taxDragPct.toFixed(1) ?? 0))
  w(row('20-year corpus', a.bestFit?.finalCorpus ?? 0))
  w(row('Monte Carlo success rate', `${(a.mc.successRate * 100).toFixed(1)}%`))
  w(row('Median final corpus', a.mc.medianFinalCorpus))
  w(row('p10 final corpus', a.mc.p10FinalCorpus))
  w(row('p90 final corpus', a.mc.p90FinalCorpus))
  w(row('Stress test (35% crash yr 5)', a.stress.resilient ? 'Plan recovers' : `Breaks at year ${a.stress.brokeAtYear ?? '?'}`))
  w()

  // Sheet 2 — Bucket Allocation
  w(row('=== BUCKET ALLOCATION ==='))
  w(row('Bucket', 'Value (INR)', '% of Corpus', 'Expected return %'))
  w(row('B1 — Liquidity',   ctx.buckets.b1, pctOf(ctx.buckets.b1, a.total), ctx.returnAssumptions.b1))
  w(row('B2 — Fixed Floor', ctx.buckets.b2, pctOf(ctx.buckets.b2, a.total), ctx.returnAssumptions.b2))
  w(row('B3 — Stability',   ctx.buckets.b3, pctOf(ctx.buckets.b3, a.total), ctx.returnAssumptions.b3))
  w(row('B4 — Growth',      ctx.buckets.b4, pctOf(ctx.buckets.b4, a.total), ctx.returnAssumptions.b4))
  w()

  // Sheet 3 — Strategy Comparison
  w(row('=== STRATEGY COMPARISON ==='))
  w(row('Rank', 'Strategy', 'Net/mo', '20-yr Corpus', 'Score /60', 'Verdict', 'Tax drag %'))
  const sorted = [...a.strategies].sort((x, y) => y.totalScore - x.totalScore)
  sorted.forEach((s, i) => {
    w(row(i + 1, (s.isBestFit ? '⭐ ' : '') + s.name, s.postTaxMonthlyIncome, s.finalCorpus, s.totalScore, s.verdict, s.taxDragPct))
  })
  w()

  // Sheet 4 — Risk Profile Instruments
  if (a.riskProfile) {
    w(row('=== INSTRUMENT MIX ==='))
    w(row('Profile', a.riskProfile.name))
    w(row('Bucket', 'Instrument', 'Allocation (INR)', 'Income/mo (INR)', 'Tax treatment'))
    const scale = ctx.profile.corpus / 1_00_00_000
    a.riskProfile.instruments.forEach((inst) => {
      w(row(
        inst.bucket,
        inst.name,
        Math.round(inst.allocationOn1CrCorpus * scale),
        inst.monthlyIncomeOn1Cr ? Math.round(inst.monthlyIncomeOn1Cr * scale) : '',
        inst.taxTreatment,
      ))
    })
    w()
  }

  // Sheet 5 — 25-Year Projection
  w(row('=== 25-YEAR PROJECTION ==='))
  w(row('Year', 'Annual draw', 'B1', 'B2', 'B3', 'B4', 'Total corpus', 'Below initial?'))
  a.projection25.slice(0, 25).forEach((p) => {
    w(row(p.year, p.annualWithdrawal, p.b1, p.b2, p.b3, p.b4, p.totalCorpus, p.corpusBelowInitial ? 'Y' : 'N'))
  })
  w()

  // Sheet 6 — Monte Carlo Percentiles
  w(row('=== MONTE CARLO PERCENTILES ==='))
  w(row('Year', 'p10', 'p25', 'Median', 'p75', 'p90'))
  a.mc.yearlyPercentiles.forEach((p) => {
    w(row(p.year, p.p10, p.p25, p.median, p.p75, p.p90))
  })
  w()

  // Sheet 7 — Tax Breakdown
  if (a.postTax) {
    w(row('=== TAX BREAKDOWN (ANNUAL) ==='))
    w(row('Tax class', 'Gross (INR)', 'Tax (INR)', 'Net (INR)', 'Note'))
    a.postTax.breakdown.forEach((b) => {
      w(row(b.taxClass, b.grossAnnual, b.tax, b.netAnnual, b.note))
    })
    w(row('Total', a.postTax.grossMonthly * 12, a.postTax.annualTax, a.postTax.netMonthly * 12, `${(a.postTax.effectiveTaxRate * 100).toFixed(1)}% effective`))
    w()
  }

  // BOM for Excel UTF-8 detection
  const csv = '﻿' + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `${fileSlugFor(ctx)}-retirement-plan-${dateStamp()}.csv`)
}

function pctOf(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 100)
}
