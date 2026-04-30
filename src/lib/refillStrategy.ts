// 4-Bucket Refill-Linked Strategy — implementation of the academic paper
// "Comparing Indian Retirement Income Frameworks with a 4-Bucket, Refill-Linked Strategy"
//
// Allocation:  B1 10% liquidity / B2 35% fixed floor / B3 25% SWP source / B4 30% growth
//
// Key rules:
//   1. SWP draws from B3 (BAF / hybrid / equity-savings / dividend / REIT blend).
//   2. When B4 annual return >= HARVEST_TRIGGER_PCT, harvest HARVEST_PCT of the
//      year's B4 gain into B3 (paper's 20-30% band; we pick 25%).
//   3. Additionally, if B3 cover falls below SUFFICIENCY_YEARS of SWP, force a
//      rebalance harvest from B4 to B3 (tax-aware, LTCG).
//   4. LTCG on equity is taxed at 12.5% above the annual Rs 1.25 L exemption
//      per FY 2024-25 (Budget Jul 2024).

import type { BucketState, ReturnAssumptions, SWPYearRow } from '../types'
import {
  B4_HARVEST_TRIGGER_PCT,
  B4_HARVEST_PCT,
  B3_SUFFICIENCY_YEARS,
  LTCG_THRESHOLD,
  LTCG_RATE,
  LEGACY_YEARS,
  SWP_YEARS,
  GUARDRAIL_FREEZE_THRESHOLD,
  GUARDRAIL_CUT_THRESHOLD,
  GUARDRAIL_CUT_FACTOR,
  CRASH_TEST_YEAR,
  CRASH_TEST_B4_RETURN_PCT,
} from '../constants'
import { allocateBuckets } from './calculations'

export type ReturnShock = Partial<ReturnAssumptions>
export type ReturnShocks = Record<number, ReturnShock>

export interface HarvestDecision {
  triggered: boolean
  reason: 'return-threshold' | 'b3-sufficiency' | 'none'
  grossAmount: number
}

export function harvestDecision(params: {
  b4Value: number
  b4ReturnPct: number
  b3Value: number
  annualWithdrawal: number
  b3ReturnPct: number
  triggerPct?: number
  harvestPct?: number
  sufficiencyYears?: number
}): HarvestDecision {
  const {
    b4Value,
    b4ReturnPct,
    b3Value,
    annualWithdrawal,
    b3ReturnPct,
    triggerPct = B4_HARVEST_TRIGGER_PCT,
    harvestPct = B4_HARVEST_PCT,
    sufficiencyYears = B3_SUFFICIENCY_YEARS,
  } = params

  // Guardrail: never harvest at a loss. If B4 was negative this year, leave it alone.
  if (b4ReturnPct <= 0) {
    return { triggered: false, reason: 'none', grossAmount: 0 }
  }

  const b4Gain = b4Value * (b4ReturnPct / 100)
  const yearsOfCover = b3SufficiencyYears(b3Value, annualWithdrawal, b3ReturnPct)

  if (b4ReturnPct >= triggerPct) {
    return {
      triggered: true,
      reason: 'return-threshold',
      grossAmount: Math.max(0, b4Gain * harvestPct),
    }
  }
  if (yearsOfCover < sufficiencyYears && b4Value > 0) {
    const targetB3 = annualWithdrawal * sufficiencyYears
    const gap = Math.max(0, targetB3 - b3Value)
    const cap = b4Gain + b4Value * 0.10
    return {
      triggered: true,
      reason: 'b3-sufficiency',
      grossAmount: Math.min(gap, cap),
    }
  }
  return { triggered: false, reason: 'none', grossAmount: 0 }
}

export function b3SufficiencyYears(
  b3Value: number,
  annualWithdrawal: number,
  b3ReturnPct: number,
): number {
  if (annualWithdrawal <= 0) return Infinity
  const r = b3ReturnPct / 100
  if (r <= 0) return b3Value / annualWithdrawal
  if (annualWithdrawal <= b3Value * r) return Infinity
  const n = Math.log(annualWithdrawal / (annualWithdrawal - b3Value * r)) / Math.log(1 + r)
  return Math.max(0, n)
}

export function computeTaxAwareRedemption(params: {
  grossGain: number
  ltcgUsedThisYear?: number
}): {
  taxableGain: number
  tax: number
  netAfterTax: number
  exemptionRemaining: number
} {
  const { grossGain, ltcgUsedThisYear = 0 } = params
  const exemptionRemaining = Math.max(0, LTCG_THRESHOLD - ltcgUsedThisYear)
  const exempt = Math.min(grossGain, exemptionRemaining)
  const taxableGain = Math.max(0, grossGain - exempt)
  const tax = taxableGain * LTCG_RATE
  return {
    taxableGain,
    tax,
    netAfterTax: grossGain - tax,
    exemptionRemaining: exemptionRemaining - exempt,
  }
}

export interface RefillSimParams {
  buckets: BucketState
  monthlyWithdrawal: number
  inflationRate: number
  returnAssumptions: ReturnAssumptions
  initialCorpus?: number
  horizonYears?: number
  triggerPct?: number
  harvestPct?: number
  sufficiencyYears?: number
  shocks?: ReturnShocks
}

export function simulateRefillLinked(params: RefillSimParams): SWPYearRow[] {
  const {
    monthlyWithdrawal,
    inflationRate,
    returnAssumptions,
    horizonYears,
    triggerPct,
    harvestPct,
    sufficiencyYears,
    shocks,
    initialCorpus,
  } = params

  let b1 = params.buckets.b1
  let b2 = params.buckets.b2
  let b3 = params.buckets.b3
  let b4 = params.buckets.b4

  const inflation = 1 + inflationRate / 100
  const totalYears = horizonYears ?? SWP_YEARS
  const rows: SWPYearRow[] = []

  let annualWithdrawal = monthlyWithdrawal * 12

  for (let year = 1; year <= totalYears; year++) {
    const shock = shocks?.[year]
    const b1ReturnPct = shock?.b1 ?? returnAssumptions.b1
    const b2ReturnPct = shock?.b2 ?? returnAssumptions.b2
    const b3ReturnPct = shock?.b3 ?? returnAssumptions.b3
    const b4ReturnPct = shock?.b4 ?? returnAssumptions.b4

    const b1Growth = b1 * (b1ReturnPct / 100)
    const b2Growth = b2 * (b2ReturnPct / 100)
    const b3Growth = b3 * (b3ReturnPct / 100)
    const b4Growth = b4 * (b4ReturnPct / 100)
    b1 += b1Growth
    b2 += b2Growth
    b3 += b3Growth
    b4 += b4Growth

    // Guardrail: if corpus is hurting, freeze inflation and (deeper down) cut the draw.
    const totalAfterGrowth = b1 + b2 + b3 + b4
    let effectiveAnnualDraw = annualWithdrawal
    let freezeInflation = false
    if (initialCorpus != null && initialCorpus > 0) {
      if (totalAfterGrowth < initialCorpus * GUARDRAIL_CUT_THRESHOLD) {
        effectiveAnnualDraw = annualWithdrawal * GUARDRAIL_CUT_FACTOR
        freezeInflation = true
      } else if (totalAfterGrowth < initialCorpus * GUARDRAIL_FREEZE_THRESHOLD) {
        freezeInflation = true
      }
    }

    // Draw priority: B1 → B3 → B4. B2 is held-to-maturity (5-yr ladder); never drawn.
    // In a B4-crash year (return ≤ 0), skip drawing from B4 too — don't sell at a loss.
    let draw = effectiveAnnualDraw
    const fromB1 = Math.min(draw, b1)
    b1 -= fromB1
    draw -= fromB1

    let fromB3 = 0
    if (draw > 0) {
      fromB3 = Math.min(draw, b3)
      b3 -= fromB3
      draw -= fromB3
    }

    let fromB4 = 0
    if (draw > 0 && b4ReturnPct > 0) {
      fromB4 = Math.min(draw, b4)
      b4 -= fromB4
      draw -= fromB4
    }

    const shortfall = draw

    // Refill B1 from B3 — top up B1 to a 2-year liquidity buffer.
    const b1Target = effectiveAnnualDraw * 2
    const b1Gap = Math.max(0, b1Target - b1)
    const b1RefillFromB3 = Math.min(b1Gap, Math.max(0, b3))
    b3 -= b1RefillFromB3
    b1 += b1RefillFromB3

    // B2 is a fixed-tenor ladder (SCSS/FD style) — no mid-cycle refill in or out.
    // Its constant return assumption already reflects automatic 5-year renewal.

    const decision = harvestDecision({
      b4Value: b4,
      b4ReturnPct,
      b3Value: b3,
      annualWithdrawal: effectiveAnnualDraw,
      b3ReturnPct,
      triggerPct,
      harvestPct,
      sufficiencyYears,
    })

    let b4Harvest = 0
    if (decision.triggered && b4 > 0) {
      const gross = Math.min(decision.grossAmount, b4)
      const tax = computeTaxAwareRedemption({ grossGain: gross })
      b4 -= gross
      b3 += tax.netAfterTax
      b4Harvest = tax.netAfterTax
    }

    const total = b1 + b2 + b3 + b4
    const returnsEarned = b1Growth + b2Growth + b3Growth + b4Growth

    rows.push({
      year,
      annualWithdrawal: Math.round(effectiveAnnualDraw - shortfall),
      b1: Math.round(b1),
      b2: Math.round(b2),
      b3: Math.round(b3),
      b4: Math.round(b4),
      b4Harvested: Math.round(b4Harvest),
      b1GrowthEarned: Math.round(b1Growth),
      b2GrowthEarned: Math.round(b2Growth),
      b3GrowthEarned: Math.round(b3Growth),
      b1RefillFromB2: 0,
      b2RefillFromB3: 0,
      b3HarvestFromB4: Math.round(b4Harvest),
      b4EmergencyToB3: 0,
      b2EmergencyToB1: 0,
      totalCorpus: Math.round(total),
      isLegacyYear: LEGACY_YEARS.includes(year),
      corpusBelowInitial: initialCorpus != null ? total < initialCorpus : false,
      totalReturnsEarned: Math.round(returnsEarned),
      shortfall: Math.round(shortfall),
      b1RefillFromB3: Math.round(b1RefillFromB3),
    })

    if (!freezeInflation) {
      annualWithdrawal = annualWithdrawal * inflation
    }

    if (total <= 0) break
  }

  return rows
}

// ── Verdict helpers ────────────────────────────────────────────────

const SEARCH_ITERATIONS = 50
const ROUND_MONTHLY = 500
const ROUND_CORPUS = 100_000
const MAX_CORPUS_DOUBLINGS = 8

export function projectionSucceeds(rows: SWPYearRow[], horizon: number): boolean {
  if (rows.length < horizon) return false
  return rows.every((r) => (r.shortfall ?? 0) === 0 && r.totalCorpus > 0)
}

export interface SearchParams {
  allocation: { b1: number; b2: number; b3: number; b4: number }
  returnAssumptions: ReturnAssumptions
  inflationRate: number
  horizonYears?: number
}

export function findMaxSustainableMonthly(
  params: SearchParams & { corpus: number },
): number {
  const horizon = params.horizonYears ?? SWP_YEARS
  let lo = 0
  let hi = params.corpus / 12
  for (let i = 0; i < SEARCH_ITERATIONS; i++) {
    const mid = (lo + hi) / 2
    const buckets = allocateBuckets(params.corpus, params.allocation)
    const proj = simulateRefillLinked({
      buckets,
      monthlyWithdrawal: mid,
      inflationRate: params.inflationRate,
      returnAssumptions: params.returnAssumptions,
      initialCorpus: params.corpus,
      horizonYears: horizon,
    })
    if (projectionSucceeds(proj, horizon)) lo = mid
    else hi = mid
  }
  return Math.max(0, Math.floor(lo / ROUND_MONTHLY) * ROUND_MONTHLY)
}

export function findMinViableCorpus(
  params: SearchParams & { monthlyWithdrawal: number; startCorpus: number },
): number {
  const horizon = params.horizonYears ?? SWP_YEARS
  const trial = (corpus: number) =>
    projectionSucceeds(
      simulateRefillLinked({
        buckets: allocateBuckets(corpus, params.allocation),
        monthlyWithdrawal: params.monthlyWithdrawal,
        inflationRate: params.inflationRate,
        returnAssumptions: params.returnAssumptions,
        initialCorpus: corpus,
        horizonYears: horizon,
      }),
      horizon,
    )

  let lo = params.startCorpus
  let hi = params.startCorpus * 2
  let viable = false
  for (let i = 0; i < MAX_CORPUS_DOUBLINGS; i++) {
    if (trial(hi)) { viable = true; break }
    lo = hi
    hi *= 2
  }
  if (!viable) return Number.POSITIVE_INFINITY

  for (let i = 0; i < SEARCH_ITERATIONS; i++) {
    const mid = (lo + hi) / 2
    if (trial(mid)) hi = mid
    else lo = mid
  }
  return Math.ceil(hi / ROUND_CORPUS) * ROUND_CORPUS
}

// ── Stress test: 30-40% equity crash early in retirement ──────────────────────
// Sequence-of-returns risk is worst when a crash hits soon after retirement starts.
// We replay the simulation with a one-time -35% B4 shock in year 5 (default).

export interface StressTestResult {
  resilient: boolean
  finalCorpus: number
  brokeAtYear: number | null
  scenarioLabel: string
  projection: SWPYearRow[]
}

export function runCrashStressTest(params: {
  corpus: number
  monthlyWithdrawal: number
  allocation: { b1: number; b2: number; b3: number; b4: number }
  returnAssumptions: ReturnAssumptions
  inflationRate: number
  horizonYears?: number
  crashYear?: number
  crashB4ReturnPct?: number
}): StressTestResult {
  const horizon = params.horizonYears ?? SWP_YEARS
  const crashYear = params.crashYear ?? CRASH_TEST_YEAR
  const crashB4 = params.crashB4ReturnPct ?? CRASH_TEST_B4_RETURN_PCT

  const projection = simulateRefillLinked({
    buckets: allocateBuckets(params.corpus, params.allocation),
    monthlyWithdrawal: params.monthlyWithdrawal,
    inflationRate: params.inflationRate,
    returnAssumptions: params.returnAssumptions,
    initialCorpus: params.corpus,
    horizonYears: horizon,
    shocks: { [crashYear]: { b4: crashB4 } },
  })

  const resilient = projectionSucceeds(projection, horizon)
  const finalCorpus = projection[projection.length - 1]?.totalCorpus ?? 0
  const brokeAtYear = resilient
    ? null
    : projection.length < horizon
      ? projection.length + 1
      : (projection.find((r) => (r.shortfall ?? 0) > 0)?.year ?? null)

  return {
    resilient,
    finalCorpus,
    brokeAtYear,
    scenarioLabel: `${Math.abs(crashB4)}% equity crash in year ${crashYear}`,
    projection,
  }
}
