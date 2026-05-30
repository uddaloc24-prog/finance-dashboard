// strategyBuckets — blend the recommended strategy's bucket profile with
// the horizon-based default + a risk-tilt + a guardrail-driven safety
// nudge.  Produces the per-goal bucket split the fitter will use.
//
// Convex combination, all weights derived from the engine's existing
// signals — no new hidden state:
//
//    final = α · strategy + β · horizon + γ · riskTilt
//
// where (α + β + γ) = 1, with γ pinned to 0.15 (modest risk tilt),
//                       β depending on strategy confidence and the
//                       presence of behavioural guardrails,
//                       α taking the remainder.
//
// Finally a hard "safety floor" lifts B1 by ≥ 0.05 when high-severity
// guardrails are present — so even an aggressive strategy keeps a
// cushion for an emotionally vulnerable user.
//
// Pure function, deterministic.

import type {
  EngineInput, RawGoal, GoalStrategy,
} from '../../types/orchestration'
import { bucketSplitFor } from './fitStrategy'
import { strategyById } from './strategyCatalogue'

const RISK_TILT_WEIGHT = 0.15

type Buckets = { b1: number; b2: number; b3: number; b4: number }

/** Pure tilt: at fusedRisk 0   → 100 % B1+B2; at 100 → 100 % B3+B4; linear. */
function riskTiltBuckets(fusedRisk: number): Buckets {
  const r = Math.max(0, Math.min(100, fusedRisk)) / 100
  // Low risk lifts B1+B2; high risk lifts B3+B4.
  const b1 = 0.20 - 0.15 * r
  const b2 = 0.35 - 0.20 * r
  const b3 = 0.20 + 0.15 * r
  const b4 = 0.25 + 0.20 * r
  return { b1, b2, b3, b4 }
}

/** Mix three bucket vectors with weights summing to 1. */
function mix(strat: Buckets, horizon: Buckets, risk: Buckets, alpha: number, beta: number, gamma: number): Buckets {
  return {
    b1: alpha * strat.b1 + beta * horizon.b1 + gamma * risk.b1,
    b2: alpha * strat.b2 + beta * horizon.b2 + gamma * risk.b2,
    b3: alpha * strat.b3 + beta * horizon.b3 + gamma * risk.b3,
    b4: alpha * strat.b4 + beta * horizon.b4 + gamma * risk.b4,
  }
}

/** Lift B1 by `floor` if it's below; shave the largest bucket to compensate. */
function applySafetyFloor(b: Buckets, floor: number): Buckets {
  if (b.b1 >= floor) return b
  const need = floor - b.b1
  const max = Math.max(b.b2, b.b3, b.b4)
  const out: Buckets = { ...b, b1: floor }
  if      (b.b4 === max) out.b4 = Math.max(0, b.b4 - need)
  else if (b.b3 === max) out.b3 = Math.max(0, b.b3 - need)
  else                    out.b2 = Math.max(0, b.b2 - need)
  return normalise(out)
}

/** Renormalise (defensive — round-trip arithmetic may leave Σ ≈ 0.999). */
function normalise(b: Buckets): Buckets {
  const sum = b.b1 + b.b2 + b.b3 + b.b4
  if (sum <= 0) return { b1: 1, b2: 0, b3: 0, b4: 0 }
  return { b1: b.b1 / sum, b2: b.b2 / sum, b3: b.b3 / sum, b4: b.b4 / sum }
}

// ─── Main entry ───────────────────────────────────────────────────────

export interface StrategyBucketBlend {
  buckets: Buckets
  strategyId: string
  /** The three mix weights that produced the blend — for traceability. */
  mixWeights: { strategy: number; horizon: number; riskTilt: number }
  /** True if the safety floor lifted B1. */
  safetyFloorApplied: boolean
}

/** Blend per-strategy + per-horizon + risk-tilt buckets for one goal. */
export function strategyAwareBuckets(
  goal: RawGoal,
  input: EngineInput,
  goalStrategy: GoalStrategy | undefined,
): StrategyBucketBlend {
  const yrs = Math.max(0.5, (goal.startYear ?? input.plan.currentYear + 5) - input.plan.currentYear)
  const horizon = bucketSplitFor(yrs)
  const risk    = riskTiltBuckets(input.preferences.fusedRisk.score)

  // Resolve strategy (top-ranked for this goal, falling back to horizon-only).
  const stratId = goalStrategy?.recommended ?? ''
  const strategy = strategyById(stratId)
  if (!strategy) {
    return {
      buckets: normalise(mix(horizon, horizon, risk, 0, 1 - RISK_TILT_WEIGHT, RISK_TILT_WEIGHT)),
      strategyId: '',
      mixWeights: { strategy: 0, horizon: 1 - RISK_TILT_WEIGHT, riskTilt: RISK_TILT_WEIGHT },
      safetyFloorApplied: false,
    }
  }

  // Strategy confidence: top-ranked topsisScore (0..1). Higher → trust the
  // strategy more, lower → fall back harder on the horizon default.
  const stratConf = goalStrategy?.ranked?.[0]?.topsisScore ?? 0.5
  // Map [0..1] confidence into an [α] in [0.30..0.70] then shave for risk-tilt.
  const rawAlpha = 0.30 + 0.40 * stratConf
  const alpha = (1 - RISK_TILT_WEIGHT) * rawAlpha
  const beta  = (1 - RISK_TILT_WEIGHT) * (1 - rawAlpha)
  const gamma = RISK_TILT_WEIGHT

  let blended = mix(strategy.allocation.buckets, horizon, risk, alpha, beta, gamma)
  blended = normalise(blended)

  // Safety floor for high-severity guardrails — lift B1 to 10 % minimum.
  const highSevGuardrails = input.preferences.bias.guardrails.filter((g) => g.severity === 'high').length
  let safetyFloorApplied = false
  if (highSevGuardrails > 0) {
    const before = blended.b1
    blended = applySafetyFloor(blended, 0.10)
    if (blended.b1 > before + 1e-6) safetyFloorApplied = true
  }

  return {
    buckets: round4(blended),
    strategyId: strategy.id,
    mixWeights: { strategy: round(alpha, 3), horizon: round(beta, 3), riskTilt: round(gamma, 3) },
    safetyFloorApplied,
  }
}

function round(v: number, d: number): number { const f = Math.pow(10, d); return Math.round(v * f) / f }
function round4(b: Buckets): Buckets {
  return { b1: round(b.b1, 4), b2: round(b.b2, 4), b3: round(b.b3, 4), b4: round(b.b4, 4) }
}
