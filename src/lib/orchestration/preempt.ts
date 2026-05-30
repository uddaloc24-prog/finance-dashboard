// Mandatory pre-emption rules — system goals injected BEFORE the MCDA
// pass. These represent non-negotiable financial floors: term cover,
// health cover, emergency fund.
// Memo reference: §7 + Q2 (sign-off 2026-05-30).
//
// All emitted goals carry `source: 'system'`, `priority: 'must-have'`,
// `kind: 'corpus-build'`, target year = currentYear (urgent now). The
// `amount` is the GAP (target − current), not the target itself.
//
// Q2 resolution (2026-05-30): the four hardcoded multipliers below are
// promoted to NAMED EXPORTS and accept an optional `overrides` argument
// — keeping the defaults intact for every existing caller while making
// the engine tunable for future product needs (e.g., regional
// benchmarks, employer-policy floors).
//
// Deferred: the §7 high-rate-debt rule is omitted because PlanFacts
// does not currently expose per-loan interest rates (only aggregate
// monthlyEMI). Tracked separately — when PlanFacts grows a
// `highRateDebt?: { outstanding, interestRate }` field, the rule lands
// in this file behind an optional flag.

import type { PlanFacts, RawGoal } from '../../types/orchestration'

// ─── Default thresholds (memo §7 — signed off 2026-05-30) ─────────────

/** Below this multiple of annual burn → fire term-life pre-emption. */
export const DEFAULT_TERM_LIFE_FLOOR_X_ANNUAL_BURN = 5
/** Pre-emption only fires below this age. Over 70, term cover is rarely cost-effective. */
export const DEFAULT_TERM_LIFE_AGE_CUTOFF = 70
/** Base health cover benchmark in INR; multiplied by age uplift. */
export const DEFAULT_HEALTH_BASE_BENCHMARK_INR = 1_500_000
/** Age-band → multiplier on the health base benchmark. */
export const DEFAULT_HEALTH_AGE_UPLIFT: ReadonlyArray<{ maxAge: number; uplift: number }> = [
  { maxAge: 50, uplift: 1.0 },
  { maxAge: 60, uplift: 1.4 },
  { maxAge: 70, uplift: 1.8 },
  { maxAge: Number.POSITIVE_INFINITY, uplift: 2.2 },
]
/** Emergency-fund floor: months of monthlyBurn that liquidCorpus must cover. */
export const DEFAULT_EMERGENCY_MONTHS_OF_BURN = 6

/** Optional per-call overrides — every field is independently optional. */
export interface PreemptOverrides {
  termLifeFloorXAnnualBurn?: number
  termLifeAgeCutoff?: number
  healthBaseBenchmarkINR?: number
  healthAgeUplift?: ReadonlyArray<{ maxAge: number; uplift: number }>
  emergencyMonthsOfBurn?: number
}

// ─── Per-rule implementations (now overrides-aware) ───────────────────

function annualBurn(plan: PlanFacts): number {
  return plan.monthlyBurn * 12
}

function termLifeRule(plan: PlanFacts, o: Required<PreemptOverrides>): RawGoal | null {
  if (plan.currentAge >= o.termLifeAgeCutoff) return null
  const floor = o.termLifeFloorXAnnualBurn * annualBurn(plan)
  if (plan.insurance.lifeCover >= floor) return null
  const gap = floor - plan.insurance.lifeCover
  return {
    id: 'sys-term-life',
    label: 'Pure-protection term cover (MWP-tagged)',
    kind: 'corpus-build',
    amount: gap,
    startYear: plan.currentYear,
    priority: 'must-have',
    inflationCategory: 'general',
    source: 'system',
  }
}

function healthCoverRule(plan: PlanFacts, o: Required<PreemptOverrides>): RawGoal | null {
  const tier = o.healthAgeUplift.find((band) => plan.currentAge < band.maxAge)
  const uplift = tier?.uplift ?? 1.0
  const bench = Math.round(o.healthBaseBenchmarkINR * uplift)
  if (plan.insurance.healthCover >= bench) return null
  const gap = bench - plan.insurance.healthCover
  return {
    id: 'sys-health-cover',
    label: 'Health cover top-up to age-appropriate floor',
    kind: 'corpus-build',
    amount: gap,
    startYear: plan.currentYear,
    priority: 'must-have',
    inflationCategory: 'healthcare',
    source: 'system',
  }
}

function emergencyFundRule(plan: PlanFacts, o: Required<PreemptOverrides>): RawGoal | null {
  if (plan.monthlyBurn <= 0) return null
  const floor = o.emergencyMonthsOfBurn * plan.monthlyBurn
  if (plan.liquidCorpus >= floor) return null
  const gap = floor - plan.liquidCorpus
  return {
    id: 'sys-emergency-fund',
    label: 'Emergency fund — 6 months of monthly burn',
    kind: 'corpus-build',
    amount: gap,
    startYear: plan.currentYear,
    priority: 'must-have',
    inflationCategory: 'general',
    source: 'system',
  }
}

// ─── Main entry ───────────────────────────────────────────────────────

/** Run every pre-emption rule, return the system goals it produces.
 *  Order is deterministic but engine sorts by composite. */
export function preempt(plan: PlanFacts, overrides?: PreemptOverrides): RawGoal[] {
  const o: Required<PreemptOverrides> = {
    termLifeFloorXAnnualBurn: overrides?.termLifeFloorXAnnualBurn ?? DEFAULT_TERM_LIFE_FLOOR_X_ANNUAL_BURN,
    termLifeAgeCutoff:        overrides?.termLifeAgeCutoff        ?? DEFAULT_TERM_LIFE_AGE_CUTOFF,
    healthBaseBenchmarkINR:   overrides?.healthBaseBenchmarkINR   ?? DEFAULT_HEALTH_BASE_BENCHMARK_INR,
    healthAgeUplift:          overrides?.healthAgeUplift          ?? DEFAULT_HEALTH_AGE_UPLIFT,
    emergencyMonthsOfBurn:    overrides?.emergencyMonthsOfBurn    ?? DEFAULT_EMERGENCY_MONTHS_OF_BURN,
  }
  const out: RawGoal[] = []
  const t = termLifeRule(plan, o);      if (t) out.push(t)
  const h = healthCoverRule(plan, o);   if (h) out.push(h)
  const e = emergencyFundRule(plan, o); if (e) out.push(e)
  return out
}
