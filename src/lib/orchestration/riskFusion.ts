// Bayesian risk-profile fusion.
//
// Three (sometimes four) independent estimators of the user's true risk
// profile are produced by different sections of the app:
//
//   • Plan tab → `profile.riskAppetite` (1..5 ordinal, always present)
//   • Risk-Assessment Deep quiz → `deepRiskPercent` (0..100)
//   • Quick 10-Q quiz → `quickQuizScore` (10..50 raw → 0..100 normalised)
//   • Psychometric v10 → `v10.composites.riskProfile` (0..100)
//
// We combine them using inverse-variance weighting (a.k.a. precision-
// weighted mean), the closed-form Bayesian posterior when each estimator
// is treated as a normal observation with known precision τᵢ.
//
//      posterior μ  =  Σ(τᵢ × μᵢ) / Σ τᵢ
//      posterior τ  =  Σ τᵢ
//
// Confidence is mapped from total precision via a saturating function
//   c = 1 − exp(−Στ / k)
// so a richer instrument set lifts confidence without ever reaching 1.
//
// Calibrated precisions reflect each instrument's information content:
//   - Plan ordinal:        τ = 1.0  (5 buckets, coarsely informative)
//   - Quick 10-Q quiz:     τ = 2.0  (10 items × 5 options)
//   - Deep 15-Q quiz:      τ = 3.0  (richer, normalised already)
//   - v10 composite:       τ = 4.0  (16-construct 74-item battery)
//
// Pure function — same inputs → same outputs; no I/O, no Date.now, no
// random. Engine determinism contract (memo §2.4) preserved.

import type { FusedRiskProfile, RiskSource, RiskSourceName } from '../../types/orchestration'

const PRECISION: Record<RiskSourceName, number> = {
  plan:  1.0,
  quick: 2.0,
  deep:  3.0,
  v10:   4.0,
}

/** Saturating denominator for the precision → confidence map. */
const CONF_SATURATION = 4

export interface FuseRiskArgs {
  /** Plan-tab `profile.riskAppetite` (1..5). Always available. */
  planRiskAppetite: 1 | 2 | 3 | 4 | 5
  /** Psychometric v10 composite `riskProfile` (0..100). Null if not taken. */
  v10RiskProfile?: number | null
  /** Risk Profile & Assessment Deep quiz percent (0..100). Null if not taken. */
  deepRiskPercent?: number | null
  /** Quick 10-Q quiz `totalScore` (10..50). Null if not taken. */
  quickQuizScore?: number | null
}

/** Combine every available risk estimator into one posterior.
 *  Falls back to the Plan-only estimate when no other sources exist —
 *  never throws and never produces NaN. */
export function fuseRisk(args: FuseRiskArgs): FusedRiskProfile {
  type Raw = { name: RiskSourceName; value: number; tau: number }
  const raw: Raw[] = []

  // Plan is always present.
  raw.push({ name: 'plan', value: normalisePlan(args.planRiskAppetite), tau: PRECISION.plan })

  if (args.v10RiskProfile != null && Number.isFinite(args.v10RiskProfile)) {
    raw.push({ name: 'v10', value: clamp01x100(args.v10RiskProfile), tau: PRECISION.v10 })
  }
  if (args.deepRiskPercent != null && Number.isFinite(args.deepRiskPercent)) {
    raw.push({ name: 'deep', value: clamp01x100(args.deepRiskPercent), tau: PRECISION.deep })
  }
  if (args.quickQuizScore != null && Number.isFinite(args.quickQuizScore)) {
    raw.push({ name: 'quick', value: normaliseQuick(args.quickQuizScore), tau: PRECISION.quick })
  }

  const sumTau = raw.reduce((s, r) => s + r.tau, 0)
  const sumWeighted = raw.reduce((s, r) => s + r.tau * r.value, 0)
  const fusedScore = sumTau > 0 ? sumWeighted / sumTau : normalisePlan(args.planRiskAppetite)

  const confidence = 1 - Math.exp(-sumTau / CONF_SATURATION)

  const sources: RiskSource[] = raw.map((r) => ({
    name: r.name,
    value: round(r.value, 1),
    weight: round(r.tau / sumTau, 3),
  }))

  const derivation: FusedRiskProfile['derivation'] =
    raw.length === 1 ? 'plan-only' :
    raw.length === 2 ? 'fused-2'   :
    raw.length === 3 ? 'fused-3'   :
                       'fused-4'

  return {
    score: round(fusedScore, 1),
    confidence: round(confidence, 3),
    sources,
    derivation,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

/** {1,2,3,4,5} → {0, 25, 50, 75, 100} */
function normalisePlan(r: 1 | 2 | 3 | 4 | 5): number {
  return ((r - 1) / 4) * 100
}

/** Quick quiz `totalScore` lives on [10..50] (10 Q × 1..5). Map → 0..100. */
function normaliseQuick(score: number): number {
  return clamp01x100(((score - 10) / 40) * 100)
}

function clamp01x100(v: number): number {
  return Math.min(100, Math.max(0, v))
}

function round(v: number, d: number): number {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}
