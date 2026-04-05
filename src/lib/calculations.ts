import type { BucketState, SWPYearRow, ReturnAssumptions } from '../types'
import { BUCKET_ALLOCATION, LEGACY_YEARS, SWP_YEARS, LTCG_THRESHOLD, LTCG_RATE } from '../constants'

export function allocateBuckets(corpus: number): BucketState {
  return {
    b1: Math.round(corpus * BUCKET_ALLOCATION.b1),
    b2: Math.round(corpus * BUCKET_ALLOCATION.b2),
    b3: Math.round(corpus * BUCKET_ALLOCATION.b3),
  }
}

export function totalCorpus(buckets: BucketState): number {
  return buckets.b1 + buckets.b2 + buckets.b3
}

export function b1RunwayMonths(b1Value: number, monthlyWithdrawal: number): number {
  if (monthlyWithdrawal <= 0) return Infinity
  return Math.floor(b1Value / monthlyWithdrawal)
}

// Alert when B1 has less than 12 months of expenses remaining
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

// Emergency only: B2 critically low (< 6 months of expenses). Normal flow is B3 profits → B2.
export function shouldRefillB2Emergency(b2Value: number, monthlyWithdrawal: number): boolean {
  return b2Value < monthlyWithdrawal * 6
}

export function refillB2EmergencyAmount(b2Value: number, corpus: number): number {
  const target = corpus * BUCKET_ALLOCATION.b2
  return Math.max(0, target - b2Value)
}

// ── B3 profit harvesting ──────────────────────────────────────────
// B3 principal is never touched in normal operation.
// Only the annual investment gain is harvested and banked into B2.

export function b3ProfitHarvest(b3Value: number, annualReturnPct: number): number {
  return Math.round(b3Value * (annualReturnPct / 100))
}

// Move B3 annual profit to B2. B3 principal stays intact.
export function harvestB3ToB2(buckets: BucketState, b3ReturnPct: number): BucketState {
  const profit = b3ProfitHarvest(buckets.b3, b3ReturnPct)
  return {
    ...buckets,
    b2: buckets.b2 + profit,
    // b3 unchanged — principal preserved
  }
}

// Transfer from one bucket to another (immutable). Used for manual refills.
export function transferBucket(
  buckets: BucketState,
  from: 'b2' | 'b3',
  to: 'b1' | 'b2',
  amount: number
): BucketState {
  const actualAmount = Math.min(amount, buckets[from])
  return {
    ...buckets,
    [from]: buckets[from] - actualAmount,
    [to]: buckets[to] + actualAmount,
  }
}

// ── SWP Simulation ────────────────────────────────────────────────
//
// B3 principal is preserved throughout. Each year:
//   1. Harvest B3 profit → add to B2
//   2. B2 earns its own return on its full balance (principal + accumulated profits)
//   3. B1 earns its return
//   4. Withdraw from B1
//   5. If B1 < 1yr of expenses → top up from B2 (target: 2yr buffer)
//   6. Emergency: if B2 < 6mo expenses → liquidate B3 principal into B2

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
  let b3 = params.buckets.b3   // principal only — stays flat unless emergency
  let annualWithdrawal = monthlyWithdrawal * 12

  const r1 = 1 + returnAssumptions.b1 / 100
  const r2 = 1 + returnAssumptions.b2 / 100
  const b3ReturnPct = returnAssumptions.b3
  const inflation = 1 + inflationRate / 100

  for (let year = 1; year <= SWP_YEARS; year++) {
    // Step 1 — Harvest B3 profits into B2 (principal untouched)
    const b3Harvested = b3ProfitHarvest(b3, b3ReturnPct)
    b2 += b3Harvested

    // Step 2 — B2 earns its own return on current balance
    const b2Before = b2
    b2 = b2 * r2
    const b2GrowthEarned = b2 - b2Before

    // Step 3 — B1 earns its return
    const b1Before = b1
    b1 = b1 * r1
    const b1GrowthEarned = b1 - b1Before

    // Step 4 — Withdraw from B1
    b1 = Math.max(0, b1 - annualWithdrawal)

    // Step 5 — Refill B1 from B2 if B1 < 1yr of expenses
    let b1RefillFromB2 = 0
    if (b1 < annualWithdrawal && b2 > 0) {
      const target = annualWithdrawal * 2   // top up to 2yr buffer
      const needed = Math.min(Math.max(0, target - b1), b2)
      b1 += needed
      b2 -= needed
      b1RefillFromB2 = needed
    }

    // Step 6 — Emergency: B2 critically low → liquidate B3 principal
    let b2EmergencyFromB3 = 0
    if (b2 < annualWithdrawal * 0.5 && b3 > 0) {
      const needed = Math.min(annualWithdrawal * 4, b3)
      b2 += needed
      b3 -= needed
      b2EmergencyFromB3 = needed
    }

    const total = b1 + b2 + b3

    rows.push({
      year,
      annualWithdrawal,
      b1: Math.round(b1),
      b2: Math.round(b2),
      b3: Math.round(b3),
      b3Harvested: Math.round(b3Harvested),
      b1GrowthEarned: Math.round(b1GrowthEarned),
      b2GrowthEarned: Math.round(b2GrowthEarned),
      b1RefillFromB2: Math.round(b1RefillFromB2),
      b2EmergencyFromB3: Math.round(b2EmergencyFromB3),
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
  annualB3Gains: number
): TaxRow[] {
  const fd = (fdRates.SBI + fdRates.HDFC + fdRates.ICICI) / 3

  const ltcgTaxableGains = Math.max(0, annualB3Gains - LTCG_THRESHOLD)
  const ltcgTaxAmount = ltcgTaxableGains * LTCG_RATE
  const effectiveLtcgRate = annualB3Gains > 0 ? (ltcgTaxAmount / annualB3Gains) * 100 : 0

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
      instrument: 'Debt MF / BAF',
      bucket: 'B2',
      preTaxReturn: returnAssumptions.b2,
      taxRate: taxBracket,
      postTaxReturn: parseFloat((returnAssumptions.b2 * (1 - taxBracket / 100)).toFixed(2)),
      notes: 'Gains taxed at income slab (Budget 2023)',
    },
    {
      instrument: 'Equity MF',
      bucket: 'B3',
      preTaxReturn: returnAssumptions.b3,
      taxRate: parseFloat(effectiveLtcgRate.toFixed(1)),
      postTaxReturn: parseFloat((returnAssumptions.b3 - effectiveLtcgRate).toFixed(2)),
      notes: `LTCG 12.5% above ₹1.25L. Effective rate on your gains: ${effectiveLtcgRate.toFixed(1)}%`,
    },
    {
      instrument: 'Gold ETF',
      bucket: 'B3',
      preTaxReturn: 8.0,
      taxRate: taxBracket,
      postTaxReturn: parseFloat((8.0 * (1 - taxBracket / 100)).toFixed(2)),
      notes: 'Taxed as non-equity MF at income slab',
    },
  ]
}
