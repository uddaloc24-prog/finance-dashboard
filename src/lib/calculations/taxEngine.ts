// Indian Tax Engine — FY 2024-25 (post Jul 2024 budget)
//
// Rules encoded:
//   Equity MF / shares (>65% equity per SEBI):
//     LTCG (>12 mo): 12.5% on gains above ₹1.25L/year exemption
//     STCG (<12 mo): 20%
//   Debt MF (units bought after 1-Apr-2023): all gains at slab rate, no indexation
//   FD / SCSS / POMIS / PMVVY / RBI bonds: interest at slab rate
//   Section 80TTB (senior citizens 60+): ₹50k deduction on bank / post-office interest
//   PPF: EEE — fully tax-exempt
//   NPS: 60% tax-free lump sum + 40% annuity at slab
//   REITs: complex (slab interest portion + LTCG/STCG on gains) — simplified to half-slab/half-LTCG
//   International FoF: treated as debt MF post-2023 → slab rate

export type TaxSlab = 0 | 5 | 10 | 20 | 30  // marginal rate %
export type TaxRegime = 'old' | 'new'

export const LTCG_THRESHOLD = 1_25_000
export const LTCG_RATE = 0.125
export const STCG_RATE_EQUITY = 0.20
export const SECTION_80TTB = 50_000  // senior citizen interest exemption
export const CESS = 0.04             // health & education cess on tax

// Old regime slabs (FY 24-25, individual <60)
export const SLABS_OLD = [
  { upTo: 2_50_000, rate: 0 },
  { upTo: 5_00_000, rate: 0.05 },
  { upTo: 10_00_000, rate: 0.20 },
  { upTo: Infinity, rate: 0.30 },
]
// Old regime slabs for senior citizens (60-79)
export const SLABS_OLD_SENIOR = [
  { upTo: 3_00_000, rate: 0 },
  { upTo: 5_00_000, rate: 0.05 },
  { upTo: 10_00_000, rate: 0.20 },
  { upTo: Infinity, rate: 0.30 },
]
// New regime slabs (FY 24-25, post Jul 2024 budget)
export const SLABS_NEW = [
  { upTo: 3_00_000, rate: 0 },
  { upTo: 7_00_000, rate: 0.05 },
  { upTo: 10_00_000, rate: 0.10 },
  { upTo: 12_00_000, rate: 0.15 },
  { upTo: 15_00_000, rate: 0.20 },
  { upTo: Infinity, rate: 0.30 },
]
export const STD_DEDUCTION_NEW = 75_000

// ── Slab tax computation ───────────────────────────────────────────

export function computeSlabTax(
  taxableIncome: number,
  regime: TaxRegime,
  isSenior: boolean,
): number {
  if (taxableIncome <= 0) return 0
  const slabs = regime === 'new' ? SLABS_NEW : (isSenior ? SLABS_OLD_SENIOR : SLABS_OLD)
  let tax = 0
  let prev = 0
  for (const s of slabs) {
    if (taxableIncome <= prev) break
    const slice = Math.min(taxableIncome, s.upTo) - prev
    tax += slice * s.rate
    prev = s.upTo
  }
  return tax * (1 + CESS)
}

// ── Per-instrument tax classifier ──────────────────────────────────

export type TaxClass =
  | 'equity-ltcg'      // equity MF / shares — LTCG ₹1.25L exemption + 12.5%
  | 'debt-slab'        // debt MF post-2023 — slab rate on gains
  | 'interest-slab'    // FD/SCSS/PMVVY/RBI bonds — slab rate on interest
  | 'interest-80ttb'   // senior citizen bank interest — slab with ₹50k exemption
  | 'tax-free'         // PPF
  | 'reit-mixed'       // REITs — half slab, half LTCG (rough proxy)
  | 'nps-annuity'      // NPS annuity portion — slab

export function classifyInstrument(
  category: string,
  bucket: 'B1' | 'B2' | 'B3' | 'B4',
): TaxClass {
  const cat = category.toLowerCase()
  if (cat.includes('ppf')) return 'tax-free'
  if (cat.includes('reit')) return 'reit-mixed'
  if (cat.includes('annuity') || cat.includes('pension scheme')) return 'interest-slab'
  if (cat.includes('fixed deposit') || cat.includes('fd')) return 'interest-80ttb'
  if (cat.includes('govt scheme') || cat.includes('govt bond') || cat.includes('postal scheme')) return 'interest-slab'
  if (cat.includes('liquid') || cat.includes('overnight') || cat.includes('arbitrage')) return 'debt-slab'
  if (cat.includes('corporate bond') || cat.includes('short duration') || cat.includes('banking & psu') || cat.includes('debt')) return 'debt-slab'
  if (cat.includes('international')) return 'debt-slab'
  // Equity-oriented: bucket B3 + B4 are equity-heavy by design
  if (bucket === 'B3' || bucket === 'B4') return 'equity-ltcg'
  return 'debt-slab'
}

// ── Per-class effective tax rate ────────────────────────────────────

export interface TaxContext {
  slab: TaxSlab           // user's marginal slab rate
  regime: TaxRegime
  isSenior: boolean
  ltcgUsedThisYear: number // gains already harvested this year
}

// Given an annual income/gain amount of a given tax class, returns the tax owed.
export function taxOnIncome(
  amount: number,
  taxClass: TaxClass,
  ctx: TaxContext,
): { tax: number; effectiveRate: number; note: string } {
  if (amount <= 0) return { tax: 0, effectiveRate: 0, note: '—' }
  const slabFrac = ctx.slab / 100

  switch (taxClass) {
    case 'tax-free':
      return { tax: 0, effectiveRate: 0, note: 'PPF / EEE — fully exempt' }

    case 'equity-ltcg': {
      const remaining = Math.max(0, LTCG_THRESHOLD - ctx.ltcgUsedThisYear)
      const exempt = Math.min(amount, remaining)
      const taxable = Math.max(0, amount - exempt)
      const tax = taxable * LTCG_RATE
      return {
        tax,
        effectiveRate: amount > 0 ? tax / amount : 0,
        note: `LTCG: ${formatINR(exempt)} exempt, ${formatINR(taxable)} @ 12.5%`,
      }
    }

    case 'interest-80ttb': {
      const exempt = ctx.isSenior ? Math.min(amount, SECTION_80TTB) : 0
      const taxable = amount - exempt
      const tax = taxable * slabFrac
      return {
        tax,
        effectiveRate: amount > 0 ? tax / amount : 0,
        note: ctx.isSenior
          ? `Bank interest: ${formatINR(exempt)} exempt under 80TTB, rest @ ${ctx.slab}%`
          : `Bank interest @ ${ctx.slab}% slab`,
      }
    }

    case 'interest-slab':
    case 'debt-slab':
    case 'nps-annuity': {
      const tax = amount * slabFrac
      return {
        tax,
        effectiveRate: slabFrac,
        note: `${taxClass === 'debt-slab' ? 'Debt MF gains' : taxClass === 'nps-annuity' ? 'NPS annuity' : 'Interest'} @ ${ctx.slab}% slab`,
      }
    }

    case 'reit-mixed': {
      // Rough proxy: half treated as LTCG, half at slab
      const halfLtcg = amount / 2
      const halfSlab = amount / 2
      const remaining = Math.max(0, LTCG_THRESHOLD - ctx.ltcgUsedThisYear)
      const exempt = Math.min(halfLtcg, remaining)
      const taxableLtcg = Math.max(0, halfLtcg - exempt)
      const tax = taxableLtcg * LTCG_RATE + halfSlab * slabFrac
      return {
        tax,
        effectiveRate: amount > 0 ? tax / amount : 0,
        note: 'REIT: ~50% slab + 50% LTCG (verify with CA)',
      }
    }
  }
}

// ── Aggregate post-tax monthly income for a mix ────────────────────

export interface InstrumentMix {
  monthly: number      // gross monthly income from this instrument
  taxClass: TaxClass
}

export interface PostTaxResult {
  grossMonthly: number
  netMonthly: number
  annualTax: number
  effectiveTaxRate: number  // 0..1
  breakdown: { taxClass: TaxClass; grossAnnual: number; tax: number; netAnnual: number; note: string }[]
}

export function computePostTax(
  mix: InstrumentMix[],
  ctx: TaxContext,
): PostTaxResult {
  const grossMonthly = mix.reduce((a, b) => a + b.monthly, 0)
  // Sum monthlies by tax class, then compute tax once per class to apply exemptions correctly
  const byClass = new Map<TaxClass, number>()
  for (const item of mix) {
    byClass.set(item.taxClass, (byClass.get(item.taxClass) ?? 0) + item.monthly * 12)
  }
  let runningCtx = { ...ctx }
  let totalTax = 0
  const breakdown: PostTaxResult['breakdown'] = []
  for (const [taxClass, grossAnnual] of byClass) {
    const r = taxOnIncome(grossAnnual, taxClass, runningCtx)
    totalTax += r.tax
    breakdown.push({ taxClass, grossAnnual, tax: r.tax, netAnnual: grossAnnual - r.tax, note: r.note })
    if (taxClass === 'equity-ltcg') {
      runningCtx = { ...runningCtx, ltcgUsedThisYear: runningCtx.ltcgUsedThisYear + grossAnnual }
    }
  }
  const grossAnnual = grossMonthly * 12
  const netAnnual = grossAnnual - totalTax
  return {
    grossMonthly,
    netMonthly: netAnnual / 12,
    annualTax: totalTax,
    effectiveTaxRate: grossAnnual > 0 ? totalTax / grossAnnual : 0,
    breakdown,
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatINR(n: number): string {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

// ── Strategy-level tax efficiency factor ───────────────────────────
//
// Used by the comparison engine to estimate post-tax monthly income per strategy.
// Returns a factor 0..1 — multiply gross monthly by this to get net.

export function strategyTaxFactor(
  strategyId: string,
  ctx: TaxContext,
  monthlyGross: number,
): { factor: number; mix: { taxClass: TaxClass; share: number }[] } {
  // Define a representative instrument mix per strategy
  const mixes: Record<string, { taxClass: TaxClass; share: number }[]> = {
    rule4pct:     [{ taxClass: 'equity-ltcg', share: 0.6 }, { taxClass: 'debt-slab', share: 0.4 }],
    guardrails:   [{ taxClass: 'equity-ltcg', share: 0.55 }, { taxClass: 'debt-slab', share: 0.35 }, { taxClass: 'interest-80ttb', share: 0.10 }],
    vanguard:     [{ taxClass: 'equity-ltcg', share: 0.55 }, { taxClass: 'debt-slab', share: 0.45 }],
    bucket3:      [{ taxClass: 'equity-ltcg', share: 0.40 }, { taxClass: 'interest-80ttb', share: 0.30 }, { taxClass: 'debt-slab', share: 0.30 }],
    bucket4india: [{ taxClass: 'equity-ltcg', share: 0.50 }, { taxClass: 'interest-slab', share: 0.30 }, { taxClass: 'debt-slab', share: 0.20 }],
    npsHybrid:    [{ taxClass: 'tax-free', share: 0.40 }, { taxClass: 'nps-annuity', share: 0.30 }, { taxClass: 'equity-ltcg', share: 0.30 }],
    scssPmvvy:    [{ taxClass: 'interest-slab', share: 0.70 }, { taxClass: 'interest-80ttb', share: 0.30 }],
    rmdBased:     [{ taxClass: 'equity-ltcg', share: 0.5 }, { taxClass: 'debt-slab', share: 0.5 }],
    tipsLadder:   [{ taxClass: 'interest-slab', share: 1.0 }],
    constantPct:  [{ taxClass: 'equity-ltcg', share: 0.6 }, { taxClass: 'debt-slab', share: 0.4 }],
  }
  const mix = mixes[strategyId] ?? mixes.bucket4india
  const instMix: InstrumentMix[] = mix.map((m) => ({
    monthly: monthlyGross * m.share,
    taxClass: m.taxClass,
  }))
  const post = computePostTax(instMix, ctx)
  return {
    factor: post.grossMonthly > 0 ? post.netMonthly / post.grossMonthly : 1,
    mix,
  }
}
