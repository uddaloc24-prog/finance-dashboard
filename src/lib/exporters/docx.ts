// DOCX exporter using the `docx` npm package. Editable Word document
// with proper headings, paragraphs, tables, and section numbering.

import type { ExportContext } from './index'
import { buildAnalytics, fmtINR, fmtPct, fileSlugFor, dateStamp, downloadBlob } from './analytics'

export async function exportDocx(ctx: ExportContext): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } = await import('docx')
  const a = buildAnalytics(ctx)
  const id = ctx.identity
  const userName = id?.fullName?.trim() || 'Personal'
  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })

  const NAVY = '1B2951'
  const GOLD = 'B8956A'
  const SLATE = '475569'

  // Helpers
  const para = (text: string, opts: { bold?: boolean; size?: number; color?: string; align?: 'left'|'center'|'right'|'justify'; spacing?: number } = {}) =>
    new Paragraph({
      alignment: opts.align === 'justify' ? AlignmentType.JUSTIFIED : opts.align === 'center' ? AlignmentType.CENTER : opts.align === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT,
      spacing: { after: opts.spacing ?? 100 },
      children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 22, color: opts.color ?? SLATE })],
    })

  // Cambria (serif) for major headings — McKinsey / Big-Four editorial feel
  const heading1 = (num: string, title: string) => new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 140 },
    children: [
      new TextRun({ text: `${num}.  `, bold: false, color: GOLD, size: 36, font: 'Cambria' }),
      new TextRun({ text: title, bold: false, color: NAVY, size: 36, font: 'Cambria' }),
    ],
  })

  const heading2 = (num: string, title: string) => new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 90 },
    children: [
      new TextRun({ text: `${num}  `, bold: true, color: GOLD, size: 24, font: 'Cambria' }),
      new TextRun({ text: title, bold: true, color: NAVY, size: 24, font: 'Cambria' }),
    ],
  })

  const cell = (text: string, opts: { header?: boolean; bold?: boolean; align?: 'left'|'center'|'right' } = {}) => new TableCell({
    shading: opts.header ? { type: ShadingType.SOLID, color: 'F1F5F9', fill: 'F1F5F9' } : undefined,
    children: [new Paragraph({
      alignment: opts.align === 'right' ? AlignmentType.RIGHT : opts.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, bold: opts.bold ?? opts.header, size: 18, color: opts.header ? NAVY : SLATE })],
    })],
  })

  const tableBorder = { top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' }, insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } }

  const table = (headers: string[], rows: string[][]) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorder,
    rows: [
      new TableRow({ children: headers.map((h, i) => cell(h, { header: true, align: i === 0 ? 'left' : 'right' })) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, { align: i === 0 ? 'left' : 'right' })) })),
    ],
  })

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = []

  // ── Cover block ─────────────────────────────────────────────
  children.push(
    para('INDIAN RETIREMENT PLAN', { bold: true, size: 20, color: GOLD, align: 'center', spacing: 120 }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 120 },
      children: [new TextRun({ text: userName, bold: false, size: 64, color: NAVY, font: 'Cambria' })],
    }),
    para(`Generated ${today}  ·  Version 2.0`, { size: 18, color: SLATE, align: 'center', spacing: 360 }),
  )

  // ── At a glance ────────────────────────────────────────────
  children.push(heading1('1', 'At a Glance'))
  children.push(
    para(`A personalised retirement plan for ${userName} based on a ${fmtINR(ctx.profile.corpus)} corpus and a ${fmtINR(ctx.profile.monthlyWithdrawal)} monthly withdrawal target. Run against ten retirement income strategies, stress-tested with a 35% equity crash in year 5, and Monte-Carlo simulated across 200 random portfolio paths.`, { align: 'justify', size: 20 }),
    table(
      ['Metric', 'Value'],
      [
        ['Total corpus',          fmtINR(a.total)],
        ['Monthly withdrawal',    fmtINR(a.monthly)],
        ['Withdrawal rate',       `${a.wr.toFixed(2)}%`],
        ['Best-fit strategy',     a.bestFit?.name ?? '—'],
        ['Post-tax monthly',      fmtINR(a.bestFit?.postTaxMonthlyIncome ?? 0)],
        ['20-year corpus',        fmtINR(a.bestFit?.finalCorpus ?? 0)],
        ['Monte Carlo success',   `${(a.mc.successRate * 100).toFixed(0)}%`],
        ['Crash stress test',     a.stress.resilient ? 'Plan recovers' : `Breaks at year ${a.stress.brokeAtYear ?? '?'}`],
      ],
    ),
  )

  // ── Personal Details ───────────────────────────────────────
  children.push(heading1('2', 'Personal Details'))
  if (id) {
    children.push(heading2('2.1', 'Identity'))
    children.push(table(
      ['Field', 'Value'],
      [
        ['Full name',     id.fullName || '—'],
        ['Email',         id.email || '—'],
        ['Phone',         id.phone || '—'],
        ['Date of birth', id.dateOfBirth || '—'],
        ['Marital status', id.maritalStatus || '—'],
        ['Spouse name',   id.spouseName || '—'],
        ['Occupation',    id.occupation || '—'],
        ['PAN',           id.panCard || '—'],
      ],
    ))
    if (id.address && (id.address.line1 || id.address.city)) {
      children.push(heading2('2.2', 'Address'))
      const addr = [id.address.line1, id.address.line2, [id.address.city, id.address.state, id.address.pincode].filter(Boolean).join(', ')].filter(Boolean).join('\n')
      children.push(para(addr, { size: 20 }))
    }
  }

  // ── Inputs ─────────────────────────────────────────────────
  children.push(heading1('3', 'Inputs and Assumptions'))
  children.push(table(
    ['Field', 'Value'],
    [
      ['Total corpus',         fmtINR(ctx.profile.corpus)],
      ['Monthly draw',         fmtINR(ctx.profile.monthlyWithdrawal)],
      ['Annual draw',          fmtINR(ctx.profile.monthlyWithdrawal * 12)],
      ['Inflation rate',       `${ctx.profile.inflationRate}% per year`],
      ['Tax slab',             `${ctx.profile.taxBracket}% (${a.regime} regime)`],
      ['B1 — Liquidity',       `${fmtINR(ctx.buckets.b1)} (${pctOf(ctx.buckets.b1, a.total)}% of corpus)`],
      ['B2 — Fixed Floor',     `${fmtINR(ctx.buckets.b2)} (${pctOf(ctx.buckets.b2, a.total)}% of corpus)`],
      ['B3 — Stability',       `${fmtINR(ctx.buckets.b3)} (${pctOf(ctx.buckets.b3, a.total)}% of corpus)`],
      ['B4 — Growth',          `${fmtINR(ctx.buckets.b4)} (${pctOf(ctx.buckets.b4, a.total)}% of corpus)`],
    ],
  ))

  // ── Risk Profile ───────────────────────────────────────────
  if (a.riskProfile) {
    children.push(heading1('4', 'Risk Profile'))
    children.push(heading2('4.1', a.riskProfile.name))
    children.push(para(a.riskProfile.tagline, { bold: true, size: 22 }))
    children.push(para(a.riskProfile.description, { align: 'justify', size: 20 }))
    children.push(heading2('4.2', 'Recommended Instruments'))
    const scale = ctx.profile.corpus / 1_00_00_000
    children.push(table(
      ['Bucket', 'Instrument', '₹ allocated', 'Income / mo'],
      a.riskProfile.instruments.map((inst) => [
        inst.bucket,
        inst.name,
        fmtINR(inst.allocationOn1CrCorpus * scale),
        inst.monthlyIncomeOn1Cr ? fmtINR(inst.monthlyIncomeOn1Cr * scale) : '—',
      ]),
    ))
  }

  // ── Strategy Comparison ────────────────────────────────────
  children.push(heading1('5', 'Strategy Comparison'))
  children.push(para(`All ten retirement income strategies scored against your corpus and target at a ${a.slab}% tax slab. The best-fit strategy is starred.`, { align: 'justify', size: 20 }))
  const sorted = [...a.strategies].sort((x, y) => y.totalScore - x.totalScore)
  children.push(table(
    ['Strategy', 'Net/mo', '20-yr Corpus', 'Score', 'Verdict'],
    sorted.map((s) => [
      (s.isBestFit ? '★ ' : '') + s.name,
      fmtINR(s.postTaxMonthlyIncome),
      fmtINR(s.finalCorpus),
      `${s.totalScore}/60`,
      verdictLabel(s.verdict),
    ]),
  ))

  // ── Monte Carlo ────────────────────────────────────────────
  children.push(heading1('6', 'Monte Carlo Simulation'))
  children.push(heading2('6.1', 'Headline Results'))
  children.push(table(
    ['Metric', 'Value'],
    [
      ['Success rate',         `${(a.mc.successRate * 100).toFixed(1)}%`],
      ['Median final corpus',  fmtINR(a.mc.medianFinalCorpus)],
      ['p10 (worst case)',     fmtINR(a.mc.p10FinalCorpus)],
      ['p90 (best case)',      fmtINR(a.mc.p90FinalCorpus)],
      ['Earliest depletion',   a.mc.worstDepletionYear ? `Year ${a.mc.worstDepletionYear}` : 'Never'],
    ],
  ))
  children.push(heading2('6.2', 'Percentile Bands at Key Years'))
  children.push(table(
    ['Year', 'p10', 'p25', 'Median', 'p75', 'p90'],
    [1, 5, 10, 15, 20, 25].map((yr) => {
      const p = a.mc.yearlyPercentiles[yr]
      return p ? [String(p.year), fmtINR(p.p10), fmtINR(p.p25), fmtINR(p.median), fmtINR(p.p75), fmtINR(p.p90)] : []
    }).filter((r) => r.length > 0),
  ))
  children.push(heading2('6.3', 'Stress Test'))
  children.push(para(a.stress.resilient
    ? `${a.stress.scenarioLabel}: plan recovers, finishing at ${fmtINR(a.stress.finalCorpus)}.`
    : `${a.stress.scenarioLabel}: plan breaks at year ${a.stress.brokeAtYear ?? '?'}.`,
    { align: 'justify', size: 20 }))

  // ── Tax ────────────────────────────────────────────────────
  if (a.postTax) {
    children.push(heading1('7', 'Tax Analysis (FY 2024-25)'))
    children.push(table(
      ['Metric', 'Value'],
      [
        ['Gross monthly income',  fmtINR(a.postTax.grossMonthly)],
        ['Annual tax',            fmtINR(a.postTax.annualTax)],
        ['Net monthly income',    fmtINR(a.postTax.netMonthly)],
        ['Effective tax rate',    fmtPct(a.postTax.effectiveTaxRate)],
      ],
    ))
    children.push(heading2('7.1', 'Per-Tax-Class Breakdown'))
    children.push(table(
      ['Class', 'Gross', 'Tax', 'Net'],
      a.postTax.breakdown.map((b) => [
        classLabel(b.taxClass),
        fmtINR(b.grossAnnual),
        fmtINR(b.tax),
        fmtINR(b.netAnnual),
      ]),
    ))
  }

  // ── 25-Year Projection ─────────────────────────────────────
  children.push(heading1('8', '25-Year Projection'))
  children.push(table(
    ['Year', 'Annual Draw', 'B1', 'B2', 'B3', 'B4', 'Total'],
    a.projection25.slice(0, 25).map((row) => [
      String(row.year),
      fmtINR(row.annualWithdrawal),
      fmtINR(row.b1), fmtINR(row.b2), fmtINR(row.b3), fmtINR(row.b4),
      fmtINR(row.totalCorpus),
    ]),
  ))

  // ── Methodology ────────────────────────────────────────────
  children.push(heading1('9', 'Methodology and Disclaimers'))
  const disclaimers: Array<[string, string]> = [
    ['Methodology', 'The four-bucket refill-linked strategy implements the academic Indian retirement income framework. Withdrawals draw from B1 cash first, then B3 stability, then B4 growth (skipped in losing years). B2 is a 5-year fixed-deposit ladder, held to maturity and renewed, never drawn or refilled.'],
    ['Tax engine', 'FY 2024-25 rules: equity LTCG 12.5% above ₹1,25,000 annual exemption; debt MF gains taxed at slab (post-Apr 2023); FD/SCSS/PMVVY interest at slab; 80TTB ₹50k exemption for seniors; PPF tax-free.'],
    ['Monte Carlo', 'Per-bucket annual returns sampled from N(μ, σ) using Box-Muller transformation. Each path runs through the full guardrail-aware simulator. Success rate is the fraction of paths where corpus stays positive through the full horizon.'],
    ['Limitations', 'This is an analytical aid, not financial advice or tax preparation. Returns are modelled, not predicted — real markets have fat tails the normal distribution does not capture. Validate any major action with a SEBI-registered advisor or a Chartered Accountant.'],
  ]
  for (const [t, b] of disclaimers) {
    children.push(para(t, { bold: true, size: 22, color: NAVY }))
    children.push(para(b, { align: 'justify', size: 20 }))
  }

  const doc = new Document({
    creator: 'Indian Retirement Planner',
    title: `Retirement Plan — ${userName}`,
    description: `Personalised retirement plan generated ${today}`,
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22, color: SLATE } },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }, // narrower 1.5cm margins
        },
      },
      children,
    }],
  })

  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, `${fileSlugFor(ctx)}-retirement-plan-${dateStamp()}.docx`)
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
