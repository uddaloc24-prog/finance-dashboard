import type { BucketState, SWPYearRow, ReturnAssumptions, Demographics, ExpenseProfile } from '../types'
import { BUCKET_ALLOCATION, LEGACY_YEARS, SWP_YEARS, PRESERVATION_YEARS, LTCG_THRESHOLD, LTCG_RATE, DEFAULT_DEMOGRAPHICS, DEFAULT_EXPENSES } from '../constants'

export function allocateBuckets(
  corpus: number,
  allocation: { b1: number; b2: number; b3: number; b4: number } = BUCKET_ALLOCATION
): BucketState {
  return {
    b1: Math.round(corpus * allocation.b1),
    b2: Math.round(corpus * allocation.b2),
    b3: Math.round(corpus * allocation.b3),
    b4: Math.round(corpus * allocation.b4),
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

export interface GoalEvent {
  year: number
  amount: number
}

export interface SWPSimParams {
  buckets: BucketState
  monthlyWithdrawal: number
  inflationRate: number
  returnAssumptions: ReturnAssumptions
  initialCorpus?: number
  withdrawalSchedule?: number[]       // per-year monthly withdrawal override
  allowDrawdownAfterYear?: number     // after this year, B3 then B4 principal may be tapped
  goalEvents?: GoalEvent[]            // lump-sum outflows: B1 → B2 → B3 → B4
  horizonYears?: number               // override SWP_YEARS
}

export function simulateSWP(params: SWPSimParams): SWPYearRow[] {
  const { monthlyWithdrawal, inflationRate, returnAssumptions, withdrawalSchedule, allowDrawdownAfterYear, goalEvents, horizonYears } = params
  const rows: SWPYearRow[] = []

  let b4Current = params.buckets.b4
  let b3Current = params.buckets.b3
  let b2Current = params.buckets.b2
  let b1Pool = params.buckets.b1

  const rate1 = returnAssumptions.b1 / 100
  const rate2 = returnAssumptions.b2 / 100
  const rate3 = returnAssumptions.b3 / 100
  const rate4 = returnAssumptions.b4 / 100
  const inflation = 1 + inflationRate / 100

  const totalYears = horizonYears ?? SWP_YEARS
  const goalsByYear = new Map<number, number>()
  if (goalEvents) {
    for (const g of goalEvents) {
      goalsByYear.set(g.year, (goalsByYear.get(g.year) ?? 0) + g.amount)
    }
  }

  let annualWithdrawal = monthlyWithdrawal * 12

  for (let year = 1; year <= totalYears; year++) {
    if (withdrawalSchedule && withdrawalSchedule[year - 1] != null) {
      annualWithdrawal = withdrawalSchedule[year - 1] * 12
    }

    const b4Interest = b4Current * rate4
    const b3Interest = b3Current * rate3
    const b2Interest = b2Current * rate2
    const b1InterestEarned = b1Pool * rate1

    const b4ToB3 = b4Interest
    const b3ToB2 = b3Interest + b4ToB3
    const b2ToB1 = b2Interest + b3ToB2

    b1Pool += b1InterestEarned + b2ToB1

    const actualWithdrawal = Math.min(b1Pool, annualWithdrawal)
    b1Pool -= actualWithdrawal

    let b2EmergencyToB1 = 0
    if (b1Pool < annualWithdrawal * 0.5 && b2Current > 0) {
      const needed = Math.min(annualWithdrawal * 2, b2Current)
      b1Pool += needed
      b2Current -= needed
      b2EmergencyToB1 = needed
    }

    // Drawdown mode (v2 strategies): after threshold, tap B3 then B4 principals
    const drawdownActive = allowDrawdownAfterYear != null && year > allowDrawdownAfterYear
    if (drawdownActive) {
      let shortfall = Math.max(0, annualWithdrawal - actualWithdrawal - b2EmergencyToB1)
      if (shortfall > 0 && b3Current > 0) {
        const take = Math.min(shortfall, b3Current)
        b3Current -= take
        b1Pool += take
        shortfall -= take
      }
      if (shortfall > 0 && b4Current > 0) {
        const take = Math.min(shortfall, b4Current)
        b4Current -= take
        b1Pool += take
      }
    }

    // Goal events: lump-sum outflows
    const goalAmount = goalsByYear.get(year) ?? 0
    if (goalAmount > 0) {
      let remaining = goalAmount
      const fromB1 = Math.min(remaining, b1Pool); b1Pool -= fromB1; remaining -= fromB1
      if (remaining > 0) { const fromB2 = Math.min(remaining, b2Current); b2Current -= fromB2; remaining -= fromB2 }
      if (remaining > 0) { const fromB3 = Math.min(remaining, b3Current); b3Current -= fromB3; remaining -= fromB3 }
      if (remaining > 0) { const fromB4 = Math.min(remaining, b4Current); b4Current -= fromB4 }
    }

    const total = b1Pool + b2Current + b3Current + b4Current
    const totalReturnsEarned = b4Interest + b3Interest + b2Interest + b1InterestEarned

    rows.push({
      year,
      annualWithdrawal: Math.round(actualWithdrawal),
      b1: Math.round(b1Pool),
      b2: Math.round(b2Current),
      b3: Math.round(b3Current),
      b4: Math.round(b4Current),
      b4Harvested: Math.round(b4ToB3),
      b1GrowthEarned: Math.round(b1InterestEarned),
      b2GrowthEarned: Math.round(b2Interest),
      b3GrowthEarned: Math.round(b3Interest),
      b1RefillFromB2: Math.round(b2ToB1),
      b2RefillFromB3: Math.round(b3ToB2),
      b3HarvestFromB4: Math.round(b4ToB3),
      b4EmergencyToB3: 0,
      b2EmergencyToB1: Math.round(b2EmergencyToB1),
      totalCorpus: Math.round(total),
      isLegacyYear: LEGACY_YEARS.includes(year),
      corpusBelowInitial: params.initialCorpus != null ? total < params.initialCorpus : false,
      totalReturnsEarned: Math.round(totalReturnsEarned),
    })

    if (!withdrawalSchedule || withdrawalSchedule[year] == null) {
      annualWithdrawal = annualWithdrawal * inflation
    }
  }

  return rows
}

// ── Corpus Preservation ──────────────────────────────────────────
// Binary-searches for the highest monthly withdrawal where corpus stays >= initialCorpus
// for every year in the PRESERVATION_YEARS window (default 20 years).

export function computeMaxSustainableWithdrawal(
  corpus: number,
  returnAssumptions: ReturnAssumptions,
  inflationRate: number,
  allocation: { b1: number; b2: number; b3: number; b4: number } = BUCKET_ALLOCATION,
): number {
  const buckets = allocateBuckets(corpus, allocation)
  let lo = 0
  let hi = corpus / 60   // upper bound: 1/60 of corpus per month (very aggressive)
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const rows = simulateSWP({ buckets, monthlyWithdrawal: mid, inflationRate, returnAssumptions, initialCorpus: corpus })
    const breached = rows.slice(0, PRESERVATION_YEARS).some(r => r.corpusBelowInitial)
    if (breached) hi = mid
    else lo = mid
  }
  return Math.floor(lo / 500) * 500  // round down to nearest ₹500
}

// ── Demographics & Expense Projections ────────────────────────────

export function retirementHorizonYears(demo: Demographics = DEFAULT_DEMOGRAPHICS): number {
  return Math.max(0, demo.lifeExpectancy - demo.currentAge)
}

export function yearsToRetirement(demo: Demographics = DEFAULT_DEMOGRAPHICS): number {
  return Math.max(0, demo.retirementAge - demo.currentAge)
}

export function isRetired(demo: Demographics = DEFAULT_DEMOGRAPHICS): boolean {
  return demo.currentAge >= demo.retirementAge
}

/** Project total monthly expenses at a future year using dual inflation rates. */
export function projectExpensesAtYear(
  expenses: ExpenseProfile = DEFAULT_EXPENSES,
  years: number,
): number {
  const gen = 1 + expenses.generalInflation / 100
  const hc = 1 + expenses.healthcareInflation / 100
  const ed = 1 + expenses.educationInflation / 100
  return (
    expenses.essential * Math.pow(gen, years) +
    expenses.lifestyle * Math.pow(gen, years) +
    expenses.healthcare * Math.pow(hc, years) +
    expenses.education * Math.pow(ed, years)
  )
}

/** Annual expenses over the full retirement horizon. */
export function projectAnnualExpenses(
  expenses: ExpenseProfile = DEFAULT_EXPENSES,
  horizonYears: number,
): Array<{ year: number; monthly: number; annual: number }> {
  const rows: Array<{ year: number; monthly: number; annual: number }> = []
  for (let y = 1; y <= horizonYears; y++) {
    const monthly = projectExpensesAtYear(expenses, y)
    rows.push({ year: y, monthly: Math.round(monthly), annual: Math.round(monthly * 12) })
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
