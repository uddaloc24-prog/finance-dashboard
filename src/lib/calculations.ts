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

export function shouldRefillB1(runway: number, thresholdMonths: number = 6): boolean {
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

export function shouldRefillB2(
  b2Value: number,
  corpus: number,
  thresholdRatio: number = 0.15
): boolean {
  return b2Value < corpus * thresholdRatio
}

export function refillB2Amount(b2Value: number, corpus: number): number {
  const target = corpus * BUCKET_ALLOCATION.b2
  return Math.max(0, target - b2Value)
}

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

export interface SWPSimParams {
  buckets: BucketState
  monthlyWithdrawal: number
  inflationRate: number          // percent
  returnAssumptions: ReturnAssumptions  // percent
}

export function simulateSWP(params: SWPSimParams): SWPYearRow[] {
  const { monthlyWithdrawal, inflationRate, returnAssumptions } = params
  const rows: SWPYearRow[] = []

  let b1 = params.buckets.b1
  let b2 = params.buckets.b2
  let b3 = params.buckets.b3
  let annualWithdrawal = monthlyWithdrawal * 12

  const r1 = 1 + returnAssumptions.b1 / 100
  const r2 = 1 + returnAssumptions.b2 / 100
  const r3 = 1 + returnAssumptions.b3 / 100
  const inflation = 1 + inflationRate / 100

  for (let year = 1; year <= SWP_YEARS; year++) {
    // Grow buckets at their assumed returns first
    b1 = b1 * r1
    b2 = b2 * r2
    b3 = b3 * r3

    // Withdraw from B1
    b1 = Math.max(0, b1 - annualWithdrawal)

    // Refill B1 from B2 if needed
    const b1Target = annualWithdrawal * 2  // keep ~2yr buffer
    if (b1 < annualWithdrawal && b2 > 0) {
      const needed = Math.min(b1Target - b1, b2)
      b1 += needed
      b2 -= needed
    }

    // Refill B2 from B3 if B2 falls below 12mo of original withdrawal
    if (b2 < annualWithdrawal * 2 && b3 > 0) {
      const needed = Math.min(annualWithdrawal * 4, b3)
      b2 += needed
      b3 -= needed
    }

    const total = b1 + b2 + b3

    rows.push({
      year,
      annualWithdrawal,
      b1: Math.round(b1),
      b2: Math.round(b2),
      b3: Math.round(b3),
      totalCorpus: Math.round(total),
      isLegacyYear: LEGACY_YEARS.includes(year),
    })

    // Step up withdrawal by inflation
    annualWithdrawal = annualWithdrawal * inflation
  }

  return rows
}

// ── Tax calculations ──────────────────────────────────────────────

export interface TaxRow {
  instrument: string
  bucket: string
  preTaxReturn: number   // percent
  taxRate: number        // percent
  postTaxReturn: number  // percent
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
