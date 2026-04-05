import type { BucketState, SWPYearRow, ReturnAssumptions } from '../types'
import { BUCKET_ALLOCATION, LEGACY_YEARS, SWP_YEARS, LTCG_THRESHOLD, LTCG_RATE } from '../constants'

export function allocateBuckets(corpus: number): BucketState {
  return {
    b1: Math.round(corpus * BUCKET_ALLOCATION.b1),
    b2: Math.round(corpus * BUCKET_ALLOCATION.b2),
    b3: Math.round(corpus * BUCKET_ALLOCATION.b3),
    b4: Math.round(corpus * BUCKET_ALLOCATION.b4),
  }
}

export function totalCorpus(buckets: BucketState): number {
  return buckets.b1 + buckets.b2 + buckets.b3 + buckets.b4
}

export function b1RunwayMonths(b1Value: number, monthlyWithdrawal: number): number {
  if (monthlyWithdrawal <= 0) return Infinity
  return Math.floor(b1Value / monthlyWithdrawal)
}

// Alert when B1 has less than 12 months remaining
export function shouldRefillB1(runway: number, thresholdMonths: number = 12): boolean {
  return runway < thresholdMonths
}

export function refillB1Amount(
  b1Value: number,
  monthlyWithdrawal: number,
  targetMonths: number = 24
): number {
  const target = monthlyWithdrawal * targetMonths
  return Math.max(0, target - b1Value)
}

// B2 emergency: critically low (< 6 months expenses). Normal flow is B3 → B2.
export function shouldRefillB2Emergency(b2Value: number, monthlyWithdrawal: number): boolean {
  return b2Value < monthlyWithdrawal * 6
}

export function refillB2EmergencyAmount(b2Value: number, corpus: number): number {
  const target = corpus * BUCKET_ALLOCATION.b2
  return Math.max(0, target - b2Value)
}

// ── B4 profit harvesting ──────────────────────────────────────────
// B4 (equity) compounding is preserved unless B3 needs replenishment.
// When harvested, only gains above original B4 principal move to B3.

export function b4ProfitHarvest(b4Value: number, annualReturnPct: number): number {
  return Math.round(b4Value * (annualReturnPct / 100))
}

// Move B4 annual profit to B3 (manual harvest). B4 principal stays intact.
export function harvestB4ToB3(buckets: BucketState, b4ReturnPct: number): BucketState {
  const profit = b4ProfitHarvest(buckets.b4, b4ReturnPct)
  return {
    ...buckets,
    b3: buckets.b3 + profit,
    // b4 unchanged — principal preserved
  }
}

// Transfer from one bucket to another (immutable). Used for manual refills.
export function transferBucket(
  buckets: BucketState,
  from: 'b2' | 'b3' | 'b4',
  to: 'b1' | 'b2' | 'b3',
  amount: number
): BucketState {
  const actualAmount = Math.min(amount, buckets[from])
  return {
    ...buckets,
    [from]: buckets[from] - actualAmount,
    [to]: buckets[to] + actualAmount,
  }
}

// ── SWP Simulation (4-Bucket Cascade) ────────────────────────────
//
// HDFC 4-bucket strategy cascade each year:
//   1. B4 (equity) compounds at full rate — no forced annual harvest
//   2. B3 (hybrid/BAF) compounds at its rate
//   3. B2 (short debt) earns its return
//   4. B1 (liquid) earns its return
//   5. Withdraw from B1
//   6. If B1 < 1yr expenses → top up from B2 (target 2yr buffer)
//   7. If B2 < 1yr expenses → top up from B3 (target 2yr buffer)
//   8. If B3 < 1yr expenses AND B4 has gains above principal → harvest B4 gains → B3
//   9. Emergency: if B3 still critically low → liquidate B4 principal into B3

export interface SWPSimParams {
  buckets: BucketState
  monthlyWithdrawal: number
  inflationRate: number
  returnAssumptions: ReturnAssumptions
}

export function simulateSWP(params: SWPSimParams): SWPYearRow[] {
  const { monthlyWithdrawal, inflationRate, returnAssumptions } = params
  const rows: SWPYearRow[] = []

  let b1 = params.buckets.b1
  let b2 = params.buckets.b2
  let b3 = params.buckets.b3
  let b4 = params.buckets.b4
  const b4Principal = params.buckets.b4   // original principal — only gains above this are harvested

  let annualWithdrawal = monthlyWithdrawal * 12

  const r1 = 1 + returnAssumptions.b1 / 100
  const r2 = 1 + returnAssumptions.b2 / 100
  const r3 = 1 + returnAssumptions.b3 / 100
  const r4 = 1 + returnAssumptions.b4 / 100
  const inflation = 1 + inflationRate / 100

  for (let year = 1; year <= SWP_YEARS; year++) {
    // Step 1 — B4 compounds at full rate (equity — not harvested unless B3 needs it)
    b4 = b4 * r4

    // Step 2 — B3 (hybrid/BAF) earns its return
    const b3Before = b3
    b3 = b3 * r3
    const b3GrowthEarned = b3 - b3Before

    // Step 3 — B2 earns its return
    const b2Before = b2
    b2 = b2 * r2
    const b2GrowthEarned = b2 - b2Before

    // Step 4 — B1 earns its return
    const b1Before = b1
    b1 = b1 * r1
    const b1GrowthEarned = b1 - b1Before

    // Step 5 — Withdraw from B1
    b1 = Math.max(0, b1 - annualWithdrawal)

    // Step 6 — Refill B1 from B2 if B1 < 1yr expenses
    let b1RefillFromB2 = 0
    if (b1 < annualWithdrawal && b2 > 0) {
      const target = annualWithdrawal * 2
      const needed = Math.min(Math.max(0, target - b1), b2)
      b1 += needed
      b2 -= needed
      b1RefillFromB2 = needed
    }

    // Step 7 — Refill B2 from B3 if B2 < 1yr expenses
    let b2RefillFromB3 = 0
    if (b2 < annualWithdrawal && b3 > 0) {
      const target = annualWithdrawal * 2
      const needed = Math.min(Math.max(0, target - b2), b3)
      b2 += needed
      b3 -= needed
      b2RefillFromB3 = needed
    }

    // Step 8 — Harvest B4 accumulated gains into B3 when B3 needs replenishment
    // (B3 has dropped below 1 year of expenses AND B4 has gains above original principal)
    let b4Harvested = 0
    let b3HarvestFromB4 = 0
    const b4Gain = b4 - b4Principal
    if (b3 < annualWithdrawal && b4Gain > 0) {
      b3 += b4Gain
      b4 = b4Principal   // reset to principal; gains moved to B3
      b4Harvested = b4Gain
      b3HarvestFromB4 = b4Gain
    }

    // Step 9 — Emergency: B3 still critically low → liquidate B4 principal into B3
    let b4EmergencyToB3 = 0
    if (b3 < annualWithdrawal * 0.5 && b4 > 0) {
      const needed = Math.min(annualWithdrawal * 4, b4)
      b3 += needed
      b4 -= needed
      b4EmergencyToB3 = needed
    }

    const total = b1 + b2 + b3 + b4

    rows.push({
      year,
      annualWithdrawal,
      b1: Math.round(b1),
      b2: Math.round(b2),
      b3: Math.round(b3),
      b4: Math.round(b4),
      b4Harvested: Math.round(b4Harvested),
      b1GrowthEarned: Math.round(b1GrowthEarned),
      b2GrowthEarned: Math.round(b2GrowthEarned),
      b3GrowthEarned: Math.round(b3GrowthEarned),
      b1RefillFromB2: Math.round(b1RefillFromB2),
      b2RefillFromB3: Math.round(b2RefillFromB3),
      b3HarvestFromB4: Math.round(b3HarvestFromB4),
      b4EmergencyToB3: Math.round(b4EmergencyToB3),
      totalCorpus: Math.round(total),
      isLegacyYear: LEGACY_YEARS.includes(year),
    })

    annualWithdrawal = annualWithdrawal * inflation
  }

  return rows
}

// ── Tax calculations ──────────────────────────────────────────────

export interface TaxRow {
  instrument: string
  bucket: string
  preTaxReturn: number
  taxRate: number
  postTaxReturn: number
  notes: string
}

export function computeTaxRows(
  returnAssumptions: ReturnAssumptions,
  taxBracket: number,
  scssRate: number,
  fdRates: { SBI: number; HDFC: number; ICICI: number },
  annualB4Gains: number
): TaxRow[] {
  const fd = (fdRates.SBI + fdRates.HDFC + fdRates.ICICI) / 3

  const ltcgTaxableGains = Math.max(0, annualB4Gains - LTCG_THRESHOLD)
  const ltcgTaxAmount = ltcgTaxableGains * LTCG_RATE
  const effectiveLtcgRate = annualB4Gains > 0 ? (ltcgTaxAmount / annualB4Gains) * 100 : 0

  return [
    {
      instrument: 'SCSS',
      bucket: 'B1',
      preTaxReturn: scssRate,
      taxRate: taxBracket,
      postTaxReturn: parseFloat((scssRate * (1 - taxBracket / 100)).toFixed(2)),
      notes: 'Interest fully taxable at slab rate',
    },
    {
      instrument: 'Bank FD (avg)',
      bucket: 'B1',
      preTaxReturn: fd,
      taxRate: taxBracket,
      postTaxReturn: parseFloat((fd * (1 - taxBracket / 100)).toFixed(2)),
      notes: 'TDS @ 10% if interest > ₹50k/yr (senior); slab applies',
    },
    {
      instrument: 'Short Debt MF',
      bucket: 'B2',
      preTaxReturn: returnAssumptions.b2,
      taxRate: taxBracket,
      postTaxReturn: parseFloat((returnAssumptions.b2 * (1 - taxBracket / 100)).toFixed(2)),
      notes: 'Gains taxed at income slab (Budget 2023)',
    },
    {
      instrument: 'BAF / Hybrid MF',
      bucket: 'B3',
      preTaxReturn: returnAssumptions.b3,
      taxRate: taxBracket,
      postTaxReturn: parseFloat((returnAssumptions.b3 * (1 - taxBracket / 100)).toFixed(2)),
      notes: 'Debt-oriented gains taxed at slab; equity portion: 12.5% LTCG',
    },
    {
      instrument: 'Equity MF',
      bucket: 'B4',
      preTaxReturn: returnAssumptions.b4,
      taxRate: parseFloat(effectiveLtcgRate.toFixed(1)),
      postTaxReturn: parseFloat((returnAssumptions.b4 - effectiveLtcgRate).toFixed(2)),
      notes: `LTCG 12.5% above ₹1.25L. Effective rate on your gains: ${effectiveLtcgRate.toFixed(1)}%`,
    },
    {
      instrument: 'Gold ETF',
      bucket: 'B4',
      preTaxReturn: 8.0,
      taxRate: taxBracket,
      postTaxReturn: parseFloat((8.0 * (1 - taxBracket / 100)).toFixed(2)),
      notes: 'Taxed as non-equity MF at income slab',
    },
  ]
}
