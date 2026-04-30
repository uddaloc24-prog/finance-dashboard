// Strategy comparison engine — runs all 10 strategies on the user's actual
// corpus, monthly target, and horizon. Produces a unified StrategyResult
// per strategy with projection, score, verdict, and best-fit flag.

import type {
  StrategyDefinition,
  StrategyResult,
  StrategyId,
  ScoreDimensions,
  Verdict,
} from '../../types/strategies'
import type { BucketState, ReturnAssumptions } from '../../types'
import { allocateBuckets } from '../calculations'
import { simulateRefillLinked } from '../refillStrategy'
import { simulateSWP } from '../calculations'
import { STRATEGY_DEFINITIONS } from '../data/strategies'
import { BUCKET_ALLOCATION, DEFAULT_RETURN_ASSUMPTIONS, SWP_YEARS } from '../../constants'
import { strategyTaxFactor, type TaxContext, type TaxSlab, type TaxRegime } from './taxEngine'

const HORIZON = 20  // PDF anchor — 20-year corpus comparison

export interface RunStrategiesParams {
  corpus: number
  monthlyWithdrawal: number
  inflationRate: number  // percent e.g. 6.5
  returnAssumptions: ReturnAssumptions
  buckets?: BucketState  // current 4-bucket state for bucket strategies
  taxSlab?: TaxSlab      // user's marginal slab — defaults to 20%
  taxRegime?: TaxRegime  // 'old' | 'new' — defaults to 'old'
  isSenior?: boolean     // 60+ for 80TTB benefit
}

export function runAllStrategies(params: RunStrategiesParams): StrategyResult[] {
  const results = STRATEGY_DEFINITIONS.map((def) => simulateOne(def, params))

  // Pick best fit — highest score among strategies that PASS
  let bestId: StrategyId | null = null
  let bestScore = -1
  for (const r of results) {
    if (r.verdict === 'PASSES' && r.totalScore > bestScore) {
      bestScore = r.totalScore
      bestId = r.id
    }
  }
  for (const r of results) {
    if (r.id === bestId) {
      r.isBestFit = true
      r.verdict = 'BEST_FIT'
    }
  }
  return results
}

// ── Per-strategy simulator dispatcher ──

function simulateOne(def: StrategyDefinition, p: RunStrategiesParams): StrategyResult {
  const annual = p.monthlyWithdrawal * 12
  const effectiveWR = (annual / p.corpus) * 100
  const safeWRmid = (def.safeWRrange[0] + def.safeWRrange[1]) / 2
  const projection = projectStrategy(def.id, p)
  const finalCorpus = projection[projection.length - 1] ?? 0
  const depletionYear = projection.findIndex((v, i) => i > 0 && v <= 0)
  const monthlyOnSafe = (p.corpus * (safeWRmid / 100)) / 12

  // Indian tax treatment — net the gross monthly income for slab + LTCG impact
  const taxCtx: TaxContext = {
    slab: p.taxSlab ?? 20,
    regime: p.taxRegime ?? 'old',
    isSenior: p.isSenior ?? true,
    ltcgUsedThisYear: 0,
  }
  const taxFactor = strategyTaxFactor(def.id, taxCtx, monthlyOnSafe)
  const postTaxMonthly = monthlyOnSafe * taxFactor.factor
  const taxDragPct = (1 - taxFactor.factor) * 100

  // Tax efficiency dimension feeds back into the scorecard
  const adjusted = adjustScores(def, effectiveWR, finalCorpus, p.corpus)
  // Re-bias taxEfficiency dimension on actual computed factor (1.0 → 10/10, 0.7 → 5/10, 0.5 → 2/10)
  adjusted.taxEfficiency = clampScore(Math.round(taxFactor.factor * 10 + (def.scoreDimensions.taxEfficiency - 7)))
  const totalScore = sumScores(adjusted)
  const { verdict, reason } = computeVerdict(def, totalScore, effectiveWR)

  return {
    id: def.id,
    name: def.name,
    flag: def.flag,
    yearlyCorpus: projection,
    monthlyIncomeOnCorpus: Math.round(monthlyOnSafe),
    postTaxMonthlyIncome: Math.round(postTaxMonthly),
    taxDragPct: Number(taxDragPct.toFixed(1)),
    finalCorpus: Math.round(finalCorpus),
    depletionYear: depletionYear > 0 ? depletionYear : null,
    effectiveWR: Number(effectiveWR.toFixed(2)),
    safeWRmid,
    totalScore,
    scoreDimensions: adjusted,
    verdict,
    verdictReason: reason,
    isBestFit: false,
  }
}

function clampScore(n: number): number {
  return Math.max(1, Math.min(10, n))
}

// ── Per-strategy projection logic ──

function projectStrategy(id: StrategyId, p: RunStrategiesParams): number[] {
  switch (id) {
    case 'rule4pct':
      return simulate4PctRule(p)
    case 'guardrails':
      return simulateGuardrails(p)
    case 'vanguard':
      return simulateVanguardDynamic(p)
    case 'bucket3':
      return simulate3BucketClassic(p)
    case 'bucket4india':
      return simulate4BucketIndia(p)
    case 'npsHybrid':
      return simulateNPSHybrid(p)
    case 'scssPmvvy':
      return simulateSCSSPMVVY(p)
    case 'rmdBased':
      return simulateRMD(p)
    case 'tipsLadder':
      return simulateTIPSLadder(p)
    case 'constantPct':
      return simulateConstantPct(p)
  }
}

// Simple US-style 4% — assume 60/40 portfolio at 7% nominal
function simulate4PctRule(p: RunStrategiesParams): number[] {
  let value = p.corpus
  const out = [value]
  let withdraw = p.corpus * 0.04
  const inflation = 1 + p.inflationRate / 100
  for (let y = 1; y <= HORIZON; y++) {
    value = value * 1.07 - withdraw
    if (value < 0) value = 0
    out.push(value)
    if (value <= 0) break
    withdraw *= inflation
  }
  while (out.length <= HORIZON) out.push(0)
  return out
}

// Constant % — 4.5% of current balance, never depletes
function simulateConstantPct(p: RunStrategiesParams): number[] {
  let value = p.corpus
  const out = [value]
  for (let y = 1; y <= HORIZON; y++) {
    value = value * 1.07 * 0.955  // 7% growth, 4.5% withdrawal
    out.push(Math.max(0, value))
  }
  return out
}

// Vanguard Dynamic — 4.5% target with floor/ceiling rails (proxy: like 4% rule
// but with adaptive WR — gentler decay)
function simulateVanguardDynamic(p: RunStrategiesParams): number[] {
  let value = p.corpus
  const out = [value]
  let withdraw = p.corpus * 0.045
  const inflation = 1 + p.inflationRate / 100
  for (let y = 1; y <= HORIZON; y++) {
    const growth = value * 0.075
    value = value + growth - withdraw
    if (value < 0) value = 0
    out.push(value)
    if (value <= 0) break
    // Adaptive: cap withdraw growth at 1% of corpus to mimic ceiling rail
    const targetWithdraw = withdraw * inflation
    withdraw = Math.min(targetWithdraw, value * 0.05)
  }
  while (out.length <= HORIZON) out.push(0)
  return out
}

// 3-Bucket Classic — use V1's simulateSWP cascade
function simulate3BucketClassic(p: RunStrategiesParams): number[] {
  // V1 cascade simulator returns rows with totalCorpus per year
  const buckets = p.buckets ?? allocateBuckets(p.corpus, BUCKET_ALLOCATION)
  const rows = simulateSWP({
    buckets,
    monthlyWithdrawal: p.monthlyWithdrawal,
    inflationRate: p.inflationRate,
    returnAssumptions: p.returnAssumptions,
  })
  const out = [p.corpus]
  for (let y = 1; y <= HORIZON; y++) {
    const row = rows[y - 1]
    out.push(row?.totalCorpus ?? 0)
  }
  return out
}

// India 4-Bucket SWP — V2 refill-linked simulator with guardrails
function simulate4BucketIndia(p: RunStrategiesParams): number[] {
  const buckets = p.buckets ?? allocateBuckets(p.corpus, BUCKET_ALLOCATION)
  const rows = simulateRefillLinked({
    buckets,
    monthlyWithdrawal: p.monthlyWithdrawal,
    inflationRate: p.inflationRate,
    returnAssumptions: p.returnAssumptions,
    initialCorpus: p.corpus,
    horizonYears: HORIZON,
  })
  const out = [p.corpus]
  for (let y = 1; y <= HORIZON; y++) {
    const row = rows[y - 1]
    out.push(row?.totalCorpus ?? 0)
  }
  return out
}

// Guyton-Klinger Guardrails — same simulator with stricter starting WR
function simulateGuardrails(p: RunStrategiesParams): number[] {
  // Apply G-K to a 60/40 conceptual portfolio: 60% B4 equity / 40% B2 debt-floor
  const buckets: BucketState = {
    b1: p.corpus * 0.05,
    b2: p.corpus * 0.40,
    b3: p.corpus * 0.10,
    b4: p.corpus * 0.45,
  }
  const rows = simulateRefillLinked({
    buckets,
    monthlyWithdrawal: p.monthlyWithdrawal,
    inflationRate: p.inflationRate,
    returnAssumptions: p.returnAssumptions,
    initialCorpus: p.corpus,
    horizonYears: HORIZON,
  })
  const out = [p.corpus]
  for (let y = 1; y <= HORIZON; y++) {
    const row = rows[y - 1]
    out.push(row?.totalCorpus ?? 0)
  }
  return out
}

// NPS Hybrid — 60% lump sum invested at 9% blend, 40% locked in 6.5% annuity
function simulateNPSHybrid(p: RunStrategiesParams): number[] {
  const lumpsum = p.corpus * 0.6
  const annuityCorpus = p.corpus * 0.4
  const annuityYearlyIncome = annuityCorpus * 0.065
  let value = lumpsum
  const out = [p.corpus]
  let withdraw = p.monthlyWithdrawal * 12 - annuityYearlyIncome  // remaining draw from lumpsum
  withdraw = Math.max(0, withdraw)
  const inflation = 1 + p.inflationRate / 100
  for (let y = 1; y <= HORIZON; y++) {
    value = value * 1.09 - withdraw
    if (value < 0) value = 0
    // The annuity corpus is locked but we "represent" it as a fixed asset
    out.push(Math.max(0, value) + annuityCorpus)
    if (value <= 0) {
      // After lumpsum depleted, only annuity remains as locked asset
      while (out.length <= HORIZON) out.push(annuityCorpus)
      break
    }
    withdraw *= inflation
  }
  return out
}

// SCSS+PMVVY+FD ladder — 7.8% blended debt, no equity
function simulateSCSSPMVVY(p: RunStrategiesParams): number[] {
  let value = p.corpus
  const out = [value]
  let withdraw = p.monthlyWithdrawal * 12
  const inflation = 1 + p.inflationRate / 100
  for (let y = 1; y <= HORIZON; y++) {
    value = value * 1.078 - withdraw
    if (value < 0) value = 0
    out.push(value)
    if (value <= 0) break
    withdraw *= inflation
  }
  while (out.length <= HORIZON) out.push(0)
  return out
}

// RMD — N/A in India; show flat-line (won't render meaningfully)
function simulateRMD(p: RunStrategiesParams): number[] {
  return Array(HORIZON + 1).fill(p.corpus)
}

// TIPS Ladder — N/A in India
function simulateTIPSLadder(p: RunStrategiesParams): number[] {
  return Array(HORIZON + 1).fill(p.corpus)
}

// ── Score adjustment ──

function adjustScores(
  def: StrategyDefinition,
  effectiveWR: number,
  finalCorpus: number,
  startCorpus: number,
): ScoreDimensions {
  const base = { ...def.scoreDimensions }
  // Adjust achievesTarget: does the strategy actually keep up with user's WR?
  const safeMid = (def.safeWRrange[0] + def.safeWRrange[1]) / 2
  if (effectiveWR <= safeMid) base.achievesTarget = Math.min(10, base.achievesTarget + 2)
  else if (effectiveWR > def.safeWRrange[1] + 1) base.achievesTarget = Math.max(1, base.achievesTarget - 3)
  // Adjust principalAfter20yr based on actual final corpus ratio
  const ratio = finalCorpus / startCorpus
  if (ratio >= 1.5) base.principalAfter20yr = 10
  else if (ratio >= 1.0) base.principalAfter20yr = Math.max(8, base.principalAfter20yr)
  else if (ratio >= 0.6) base.principalAfter20yr = Math.max(5, Math.min(7, base.principalAfter20yr))
  else if (ratio >= 0.2) base.principalAfter20yr = Math.max(3, Math.min(5, base.principalAfter20yr))
  else base.principalAfter20yr = 1
  return base
}

function sumScores(s: ScoreDimensions): number {
  return s.achievesTarget + s.principalAfter20yr + s.inflationProtection + s.taxEfficiency + s.indiaFeasibility + s.simplicity
}

function computeVerdict(
  def: StrategyDefinition,
  score: number,
  effectiveWR: number,
): { verdict: Verdict; reason: string } {
  if (def.indiaFeasibility === 'na') {
    return { verdict: 'NOT_APPLICABLE', reason: 'Required instruments not available in India.' }
  }
  if (effectiveWR > def.safeWRrange[1] + 2) {
    return {
      verdict: 'FAILS',
      reason: `Your WR (${effectiveWR.toFixed(1)}%) far exceeds this strategy's safe range (${def.safeWRrange[0]}–${def.safeWRrange[1]}%).`,
    }
  }
  if (score >= 40 && effectiveWR <= def.safeWRrange[1]) {
    return { verdict: 'PASSES', reason: 'Score and withdrawal rate both within safe parameters.' }
  }
  if (score >= 25) {
    return {
      verdict: 'PARTIAL',
      reason: `Score ${score}/60 — viable but compromises elsewhere${effectiveWR > def.safeWRrange[1] ? ` or WR slightly above ${def.safeWRrange[1]}%` : ''}.`,
    }
  }
  return {
    verdict: 'FAILS',
    reason: `Score ${score}/60 below the 25-point threshold.`,
  }
}

// Lazy export to avoid unused-import warnings
export { SWP_YEARS, DEFAULT_RETURN_ASSUMPTIONS }
