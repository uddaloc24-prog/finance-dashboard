// strategySelector — per-goal recommended strategy(ies) via TOPSIS.
//
// TOPSIS (Hwang & Yoon 1981) — Technique for Order of Preference by
// Similarity to Ideal Solution. Each candidate strategy is scored on
// five criteria; the recommended strategy is the one closest to the
// ideal point and farthest from the anti-ideal point in normalised
// criterion-space.
//
// Algorithm
//   1. For each (goal, strategy) pair, compute the 5 raw criterion scores
//      v_ij ∈ [0..100].
//   2. Vector-normalise each column: r_ij = v_ij / sqrt(Σ_i v_ij²).
//   3. Weight: w_ij = w_j × r_ij (criterion weights derived from
//      goal-kind + bias guardrail count).
//   4. Ideal A⁺ = max_i w_ij; anti-ideal A⁻ = min_i w_ij.
//   5. Distance D⁺_i = sqrt(Σ_j (w_ij − A⁺_j)²)  (same for D⁻).
//   6. Closeness C_i = D⁻_i / (D⁺_i + D⁻_i)   ∈ [0,1].
//   7. Rank by C_i descending.
//
// Pure function; deterministic.

import type {
  EngineInput, RawGoal, GoalStrategy, RankedStrategy, CriterionScores5,
  StrategySelection,
} from '../../types/orchestration'
import { STRATEGY_CATALOGUE, type Strategy, type HorizonBand } from './strategyCatalogue'
import { hashInput } from './hash'

// ─── Criterion-weight derivation ───────────────────────────────────────
//
// The 5 criteria are weighted by goal kind. Income goals lean on
// riskFit and horizonFit; corpus-build leans on classification +
// horizonFit; behavioural-guardrail count adds weight to biasFit.

interface CritWeights {
  riskFit: number
  biasFit: number
  horizonFit: number
  classification: number
  complexity: number
}

function weightsFor(goal: RawGoal, biasGuardrailCount: number): CritWeights {
  // Start from a flat prior, tilt per goal kind.
  const w: CritWeights = { riskFit: 0.20, biasFit: 0.20, horizonFit: 0.20, classification: 0.20, complexity: 0.20 }
  switch (goal.kind) {
    case 'income':       w.riskFit += 0.10; w.horizonFit += 0.05; w.classification += 0.05; break
    case 'event':        w.horizonFit += 0.10; w.classification += 0.10; break
    case 'legacy':       w.classification += 0.10; w.riskFit += 0.05; w.complexity += 0.05; break
    case 'corpus-build': w.horizonFit += 0.05; w.classification += 0.10; w.riskFit += 0.05; break
  }
  // Bias guardrails — more behavioural risk in the user → biasFit matters more.
  const biasBoost = Math.min(0.15, biasGuardrailCount * 0.04)
  if (biasBoost > 0) {
    w.biasFit += biasBoost
    // Spread the cost evenly across the others
    const ded = biasBoost / 4
    w.riskFit -= ded; w.horizonFit -= ded; w.classification -= ded; w.complexity -= ded
  }
  // Renormalise to be safe
  const sum = w.riskFit + w.biasFit + w.horizonFit + w.classification + w.complexity
  if (sum > 0) {
    w.riskFit /= sum; w.biasFit /= sum; w.horizonFit /= sum
    w.classification /= sum; w.complexity /= sum
  }
  return w
}

// ─── Per-criterion scorers ────────────────────────────────────────────

/** Trapezoidal membership in the strategy's risk band; users at the
 *  midpoint get 100, edges get 80, just-outside 50. */
function scoreRiskFit(strategy: Strategy, fusedRisk: number): number {
  const { min, max } = strategy.riskBand
  if (fusedRisk >= min && fusedRisk <= max) {
    const mid = (min + max) / 2
    const half = (max - min) / 2
    if (half === 0) return 100
    const dist = Math.abs(fusedRisk - mid) / half      // 0..1
    return Math.round(100 - 20 * dist)                 // 100 at centre → 80 at edge
  }
  const dist = fusedRisk < min ? (min - fusedRisk) : (fusedRisk - max)
  return Math.max(0, Math.round(80 - dist * 2))        // -2 points per 1pt outside band
}

/** Squared-error fit between the strategy's bias-tolerance vector and
 *  the user's bias signal vector. 100 = no bias the strategy doesn't
 *  tolerate. */
function scoreBiasFit(strategy: Strategy, biasSignals: { lossAversion: number; presentBias: number; statusSeeking: number; herding: number; overconfidence: number }): number {
  const dims: Array<keyof typeof biasSignals> = ['lossAversion', 'presentBias', 'statusSeeking', 'herding', 'overconfidence']
  let penalty = 0
  for (const d of dims) {
    const tolerance = strategy.biasCompat[d]       // 0..100, higher = more robust
    const userBias  = biasSignals[d]               // 0..100
    // Penalty when user-bias exceeds tolerance; max gap = 100 - 0 = 100.
    const gap = Math.max(0, userBias - tolerance)
    penalty += (gap * gap)
  }
  // Normalise: max possible Σgap² = 5 × 100² = 50_000.
  const norm = penalty / 50_000
  return Math.max(0, Math.round(100 * (1 - norm)))
}

/** Goal years-out vs strategy horizon band. */
function scoreHorizonFit(strategy: Strategy, yearsOut: number): number {
  const band: HorizonBand = strategy.horizon
  if (band === 'any') return 90
  if (band === 'short' && yearsOut <= 5)        return 100
  if (band === 'mid'   && yearsOut >= 5 && yearsOut <= 10) return 100
  if (band === 'long'  && yearsOut >= 10)       return 100
  // Adjacent bands score 60, far 30.
  if ((band === 'short' && yearsOut <= 10) ||
      (band === 'mid'   && (yearsOut <= 5 || yearsOut <= 15)) ||
      (band === 'long'  && yearsOut >= 5)) return 60
  return 30
}

/** Strategy classification × goal-kind match score. Returns 100 if the
 *  strategy's primary classification "feels native" to the goal kind. */
function scoreClassification(strategy: Strategy, goal: RawGoal): number {
  // Goal-kind preferences for classifications (decision-theoretic).
  const pref: Record<RawGoal['kind'], string[]> = {
    income:        ['income-generation', 'liability-matching', 'capital-preservation'],
    event:         ['liability-matching', 'inflation-protection', 'capital-preservation'],
    legacy:        ['multi-generational', 'capital-appreciation', 'tax-optimization'],
    'corpus-build':['capital-appreciation', 'liability-matching', 'tax-optimization'],
  }
  const preferred = pref[goal.kind] ?? []
  const matches = strategy.classifications.filter((c) => preferred.includes(c)).length
  if (matches >= 2) return 100
  if (matches === 1) return 80
  // Strategy with no primary fit but goalKinds match still scores 40.
  return strategy.goalKinds.includes(goal.kind) ? 40 : 20
}

/** Complexity penalty — fewer classifications + no glide-path = simpler =
 *  higher score. Caps at 100. */
function scoreComplexity(strategy: Strategy): number {
  let score = 100
  score -= (strategy.classifications.length - 1) * 8
  if (strategy.allocation.glideDown) score -= 10
  if (strategy.signature && strategy.signature.length > 80) score -= 5
  return Math.max(0, score)
}

// ─── TOPSIS core ──────────────────────────────────────────────────────

/** Vector-normalise a column (matrix M[i][j] → M[i][j] / sqrt(Σ_i M[i][j]²)). */
function vectorNormaliseColumn(col: number[]): number[] {
  const ss = col.reduce((s, v) => s + v * v, 0)
  if (ss <= 0) return col.map(() => 0)
  const denom = Math.sqrt(ss)
  return col.map((v) => v / denom)
}

interface MatrixRow {
  strategy: Strategy
  raw: CriterionScores5
}

function topsis(rows: MatrixRow[], w: CritWeights): { strategyId: string; score: number; raw: CriterionScores5 }[] {
  if (rows.length === 0) return []

  // Build columns
  const colNames: Array<keyof CriterionScores5> = ['riskFit', 'biasFit', 'horizonFit', 'classification', 'complexity']
  const weightsByCol: Record<keyof CriterionScores5, number> = {
    riskFit: w.riskFit, biasFit: w.biasFit, horizonFit: w.horizonFit,
    classification: w.classification, complexity: w.complexity,
  }

  const normalised: Record<keyof CriterionScores5, number[]> = {
    riskFit: [], biasFit: [], horizonFit: [], classification: [], complexity: [],
  }
  for (const k of colNames) {
    const col = rows.map((r) => r.raw[k])
    normalised[k] = vectorNormaliseColumn(col)
  }

  // Weighted normalised matrix
  const weighted: Record<keyof CriterionScores5, number[]> = {
    riskFit: [], biasFit: [], horizonFit: [], classification: [], complexity: [],
  }
  for (const k of colNames) {
    weighted[k] = normalised[k].map((v) => v * weightsByCol[k])
  }

  // Ideal & anti-ideal — all criteria are benefit-direction (higher = better)
  const ideal:    Record<keyof CriterionScores5, number> = {} as never
  const antiIdeal:Record<keyof CriterionScores5, number> = {} as never
  for (const k of colNames) {
    ideal[k]     = Math.max(...weighted[k])
    antiIdeal[k] = Math.min(...weighted[k])
  }

  // Distance + closeness
  return rows.map((r, i) => {
    let dPlus = 0, dMinus = 0
    for (const k of colNames) {
      const wv = weighted[k][i]
      dPlus  += (wv - ideal[k])     ** 2
      dMinus += (wv - antiIdeal[k]) ** 2
    }
    dPlus  = Math.sqrt(dPlus)
    dMinus = Math.sqrt(dMinus)
    const score = (dPlus + dMinus) === 0 ? 0 : dMinus / (dPlus + dMinus)
    return { strategyId: r.strategy.id, score: round(score, 4), raw: r.raw }
  })
}

// ─── Main entry ───────────────────────────────────────────────────────

export function selectStrategies(input: EngineInput, now: Date = new Date()): StrategySelection {
  const { plan, preferences, goals } = input
  const fusedRisk = preferences.fusedRisk.score
  const biasSignals = preferences.bias.signals
  const guardrailCount = preferences.bias.guardrails.length

  const byGoal: GoalStrategy[] = goals.map((g) => {
    const yearsOut = Math.max(0.5, (g.startYear ?? plan.currentYear + 5) - plan.currentYear)

    // 1. Score every catalogue strategy on the 5 criteria.
    const rows: MatrixRow[] = STRATEGY_CATALOGUE.map((s) => ({
      strategy: s,
      raw: {
        riskFit:        scoreRiskFit(s, fusedRisk),
        biasFit:        scoreBiasFit(s, biasSignals),
        horizonFit:     scoreHorizonFit(s, yearsOut),
        classification: scoreClassification(s, g),
        complexity:     scoreComplexity(s),
      },
    }))

    // 2. Derive weights for this goal.
    const w = weightsFor(g, guardrailCount)

    // 3. Run TOPSIS.
    const closenesses = topsis(rows, w)

    // 4. Sort by score desc, then by stable strategy id for ties.
    closenesses.sort((a, b) =>
      b.score - a.score
      || a.strategyId.localeCompare(b.strategyId)
    )

    const ranked: RankedStrategy[] = closenesses.map((c, idx) => ({
      strategyId: c.strategyId,
      rank: idx + 1,
      topsisScore: c.score,
      criterionScores: c.raw,
    }))

    return {
      goalId: g.id,
      ranked,
      recommended: ranked[0]?.strategyId ?? '',
    }
  })

  return {
    byGoal,
    emittedAt: now.toISOString(),
    inputsHash: hashInput({ engineHash: hashInput(input), selectorVersion: 1 }),
  }
}

function round(v: number, d: number): number {
  const f = Math.pow(10, d); return Math.round(v * f) / f
}
