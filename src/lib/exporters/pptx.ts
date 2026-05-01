// PPTX exporter using `pptxgenjs`. Generates a 16:9 slide deck with one
// slide per major section — corporate navy + gold theme, table data
// where appropriate.

import type { ExportContext } from './index'
import { buildAnalytics, fmtINR, fmtPct, fileSlugFor, dateStamp } from './analytics'

const NAVY = '1B2951'
const GOLD = 'B8956A'
const SLATE = '475569'
const GRAY = '94A3B8'
const SOFT = 'F8FAFC'

export async function exportPptx(ctx: ExportContext): Promise<void> {
  const PptxGenJSImport = await import('pptxgenjs')
  const PptxGenJS = (PptxGenJSImport as unknown as { default: new () => unknown }).default
  // pptxgenjs ships as ESM with default export; cast through unknown to bypass typing variance
  const pptx = new (PptxGenJS as new () => {
    layout: string
    title: string
    author: string
    company: string
    addSlide(): { background: { color: string }; addText: (t: unknown, o: unknown) => void; addShape: (s: string, o: unknown) => void; addTable: (rows: unknown, o: unknown) => void }
    writeFile(opts: { fileName: string }): Promise<string>
  })()

  const a = buildAnalytics(ctx)
  const id = ctx.identity
  const userName = id?.fullName?.trim() || 'Personal'
  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })

  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = `Retirement Plan — ${userName}`
  pptx.author = 'Indian Retirement Planner'
  pptx.company = 'IRP v2.0'

  // ── Slide 1 — Cover ──────────────────────────────────────
  const cover = pptx.addSlide()
  cover.background = { color: NAVY }
  cover.addText('INDIAN RETIREMENT PLAN', {
    x: 0.6, y: 0.6, w: 12, h: 0.4, fontSize: 14, color: GOLD, bold: true, fontFace: 'Calibri',
  })
  cover.addText(userName, {
    x: 0.6, y: 1.4, w: 12, h: 1.2, fontSize: 56, color: 'FFFFFF', bold: true, fontFace: 'Calibri Light',
  })
  cover.addText(`Generated ${today}  ·  Version 2.0`, {
    x: 0.6, y: 2.7, w: 12, h: 0.4, fontSize: 16, color: 'CBD5E1', fontFace: 'Calibri',
  })
  cover.addShape('line', {
    x: 0.6, y: 3.4, w: 2.0, h: 0, line: { color: GOLD, width: 2 },
  })
  cover.addText('Personalised plan · 10-strategy comparison · Monte Carlo · Indian tax engine · Stress-tested', {
    x: 0.6, y: 6.5, w: 12, h: 0.4, fontSize: 13, color: 'CBD5E1', italic: true, fontFace: 'Calibri',
  })

  // ── Slide 2 — At a glance ────────────────────────────────
  const glance = pptx.addSlide()
  decorateSlide(glance, '01 · At a Glance', userName)
  const glanceRows = [
    [{ text: 'Metric', options: { bold: true, color: NAVY, fill: { color: SOFT } } }, { text: 'Value', options: { bold: true, color: NAVY, fill: { color: SOFT } } }],
    ['Total corpus',          fmtINR(a.total)],
    ['Monthly withdrawal',    fmtINR(a.monthly)],
    ['Withdrawal rate',       `${a.wr.toFixed(2)}%`],
    ['Best-fit strategy',     a.bestFit?.name ?? '—'],
    ['Post-tax monthly',      fmtINR(a.bestFit?.postTaxMonthlyIncome ?? 0)],
    ['20-year corpus',        fmtINR(a.bestFit?.finalCorpus ?? 0)],
    ['Monte Carlo success',   `${(a.mc.successRate * 100).toFixed(0)}%`],
    ['Stress test',           a.stress.resilient ? 'Plan recovers' : `Breaks at year ${a.stress.brokeAtYear ?? '?'}`],
  ]
  glance.addTable(glanceRows, {
    x: 0.6, y: 1.4, w: 12, fontSize: 14, fontFace: 'Calibri', color: SLATE,
    border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
    rowH: 0.4,
  })

  // ── Slide 3 — Inputs ─────────────────────────────────────
  const inputs = pptx.addSlide()
  decorateSlide(inputs, '02 · Inputs and Assumptions', userName)
  inputs.addTable([
    [{ text: 'Field', options: { bold: true, color: NAVY, fill: { color: SOFT } } }, { text: 'Value', options: { bold: true, color: NAVY, fill: { color: SOFT } } }],
    ['Total corpus',         fmtINR(ctx.profile.corpus)],
    ['Monthly draw',         fmtINR(ctx.profile.monthlyWithdrawal)],
    ['Inflation rate',       `${ctx.profile.inflationRate}% per year`],
    ['Tax slab',             `${ctx.profile.taxBracket}% (${a.regime} regime)`],
    [`B1 — Liquidity (${pctOf(ctx.buckets.b1, a.total)}%)`, fmtINR(ctx.buckets.b1)],
    [`B2 — Fixed Floor (${pctOf(ctx.buckets.b2, a.total)}%)`, fmtINR(ctx.buckets.b2)],
    [`B3 — Stability (${pctOf(ctx.buckets.b3, a.total)}%)`, fmtINR(ctx.buckets.b3)],
    [`B4 — Growth (${pctOf(ctx.buckets.b4, a.total)}%)`, fmtINR(ctx.buckets.b4)],
  ], {
    x: 0.6, y: 1.4, w: 12, fontSize: 13, fontFace: 'Calibri', color: SLATE,
    border: { type: 'solid', pt: 0.5, color: 'E2E8F0' }, rowH: 0.4,
  })

  // ── Slide 4 — Risk Profile ───────────────────────────────
  if (a.riskProfile) {
    const rp = pptx.addSlide()
    decorateSlide(rp, `03 · Risk Profile — ${a.riskProfile.name}`, userName)
    rp.addText(a.riskProfile.tagline, { x: 0.6, y: 1.4, w: 12, h: 0.4, fontSize: 16, italic: true, color: NAVY, fontFace: 'Calibri' })
    rp.addText(a.riskProfile.description, { x: 0.6, y: 2, w: 12, h: 1.5, fontSize: 12, color: SLATE, fontFace: 'Calibri', valign: 'top' })
    const scale = ctx.profile.corpus / 1_00_00_000
    rp.addTable([
      ['Bucket', 'Instrument', '₹ allocated', 'Income/mo'].map((h) => ({ text: h, options: { bold: true, color: NAVY, fill: { color: SOFT } } })),
      ...a.riskProfile.instruments.slice(0, 8).map((inst) => [
        inst.bucket,
        inst.name,
        fmtINR(inst.allocationOn1CrCorpus * scale),
        inst.monthlyIncomeOn1Cr ? fmtINR(inst.monthlyIncomeOn1Cr * scale) : '—',
      ]),
    ], {
      x: 0.6, y: 3.6, w: 12, fontSize: 11, fontFace: 'Calibri', color: SLATE,
      border: { type: 'solid', pt: 0.5, color: 'E2E8F0' }, rowH: 0.32,
    })
  }

  // ── Slide 5 — Strategy Comparison (top 6) ───────────────
  const comp = pptx.addSlide()
  decorateSlide(comp, '04 · Strategy Comparison', userName)
  const sorted = [...a.strategies].sort((x, y) => y.totalScore - x.totalScore).slice(0, 8)
  comp.addTable([
    ['Rank', 'Strategy', 'Net/mo', '20-yr Corpus', 'Score', 'Verdict'].map((h) => ({ text: h, options: { bold: true, color: NAVY, fill: { color: SOFT } } })),
    ...sorted.map((s, i) => [
      String(i + 1),
      (s.isBestFit ? '★ ' : '') + s.name,
      fmtINR(s.postTaxMonthlyIncome),
      fmtINR(s.finalCorpus),
      `${s.totalScore}/60`,
      verdictLabel(s.verdict),
    ]),
  ], {
    x: 0.6, y: 1.4, w: 12, fontSize: 12, fontFace: 'Calibri', color: SLATE,
    border: { type: 'solid', pt: 0.5, color: 'E2E8F0' }, rowH: 0.34,
  })

  // ── Slide 6 — Monte Carlo ───────────────────────────────
  const mc = pptx.addSlide()
  decorateSlide(mc, '05 · Monte Carlo Simulation', userName)
  mc.addText(`${a.mc.runs} portfolio paths sampled with realistic per-bucket volatility. Success rate is the fraction of paths where corpus stays positive through year 25.`, {
    x: 0.6, y: 1.4, w: 12, h: 0.7, fontSize: 13, color: SLATE, fontFace: 'Calibri',
  })
  mc.addTable([
    ['Year', 'p10', 'p25', 'Median', 'p75', 'p90'].map((h) => ({ text: h, options: { bold: true, color: NAVY, fill: { color: SOFT } } })),
    ...[1, 5, 10, 15, 20, 25].map((yr) => {
      const p = a.mc.yearlyPercentiles[yr]
      return p ? [String(p.year), fmtINR(p.p10), fmtINR(p.p25), fmtINR(p.median), fmtINR(p.p75), fmtINR(p.p90)] : []
    }).filter((r) => r.length > 0),
  ], {
    x: 0.6, y: 2.5, w: 12, fontSize: 13, fontFace: 'Calibri', color: SLATE,
    border: { type: 'solid', pt: 0.5, color: 'E2E8F0' }, rowH: 0.42,
  })
  mc.addText(`Success rate: ${(a.mc.successRate * 100).toFixed(1)}% · Median final corpus: ${fmtINR(a.mc.medianFinalCorpus)} · Stress test (${a.stress.scenarioLabel}): ${a.stress.resilient ? 'plan recovers' : `breaks at year ${a.stress.brokeAtYear ?? '?'}`}.`, {
    x: 0.6, y: 6.0, w: 12, h: 0.6, fontSize: 12, italic: true, color: NAVY, fontFace: 'Calibri',
  })

  // ── Slide 7 — Tax ───────────────────────────────────────
  if (a.postTax) {
    const tax = pptx.addSlide()
    decorateSlide(tax, '06 · Tax Analysis (FY 2024-25)', userName)
    tax.addTable([
      ['Class', 'Gross / yr', 'Tax / yr', 'Net / yr'].map((h) => ({ text: h, options: { bold: true, color: NAVY, fill: { color: SOFT } } })),
      ...a.postTax.breakdown.map((b) => [
        classLabel(b.taxClass),
        fmtINR(b.grossAnnual),
        fmtINR(b.tax),
        fmtINR(b.netAnnual),
      ]),
    ], {
      x: 0.6, y: 1.4, w: 12, fontSize: 13, fontFace: 'Calibri', color: SLATE,
      border: { type: 'solid', pt: 0.5, color: 'E2E8F0' }, rowH: 0.42,
    })
    tax.addText(`Effective tax rate: ${fmtPct(a.postTax.effectiveTaxRate)} on ${fmtINR(a.postTax.grossMonthly)} gross monthly income, ${a.slab}% slab, ${a.regime} regime${a.isSenior ? ', senior citizen' : ''}.`, {
      x: 0.6, y: 5.6, w: 12, h: 0.6, fontSize: 12, italic: true, color: NAVY, fontFace: 'Calibri',
    })
  }

  // ── Slide 8 — Closing ───────────────────────────────────
  const close = pptx.addSlide()
  close.background = { color: NAVY }
  close.addText('Thank you.', {
    x: 0.6, y: 2.5, w: 12, h: 1.2, fontSize: 60, bold: true, color: 'FFFFFF', fontFace: 'Calibri Light',
  })
  close.addText(`Validate any major action with a SEBI-registered advisor or CA.\nGenerated ${today} · Indian Retirement Planner v2.0`, {
    x: 0.6, y: 4, w: 12, h: 1, fontSize: 14, color: 'CBD5E1', fontFace: 'Calibri', italic: true,
  })

  await pptx.writeFile({ fileName: `${fileSlugFor(ctx)}-retirement-plan-${dateStamp()}.pptx` })
}

// ── Helpers ───────────────────────────────────────────────────────

function decorateSlide(slide: { background: { color: string }; addText: (t: unknown, o: unknown) => void; addShape: (s: string, o: unknown) => void }, title: string, userName: string) {
  slide.background = { color: 'FFFFFF' }
  // Top navy strip
  slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.6, fill: { color: NAVY } })
  // Page title in navy strip
  slide.addText(title.toUpperCase(), {
    x: 0.6, y: 0.1, w: 8, h: 0.4, fontSize: 14, color: 'FFFFFF', bold: true, fontFace: 'Calibri', valign: 'middle',
  })
  // User name on the right of strip
  slide.addText(userName, {
    x: 8.6, y: 0.1, w: 4, h: 0.4, fontSize: 11, color: 'CBD5E1', fontFace: 'Calibri', valign: 'middle', align: 'right',
  })
  // Gold accent bar below
  slide.addShape('rect', { x: 0, y: 0.6, w: 13.33, h: 0.04, fill: { color: GOLD } })
  // Footer hairline
  slide.addShape('line', { x: 0.6, y: 7.0, w: 12.13, h: 0, line: { color: GRAY, width: 0.5 } })
  slide.addText('Indian Retirement Planner · v2.0', {
    x: 0.6, y: 7.05, w: 6, h: 0.3, fontSize: 9, color: GRAY, fontFace: 'Calibri',
  })
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
