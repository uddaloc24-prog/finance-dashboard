// Per-criterion scorers for the Goal Ranking Engine. Each returns 0..100.
// Pure functions — deterministic given inputs.
// Memo reference: §6 algorithm.

import type { RawGoal, PlanFacts, Preferences, CriterionScores } from '../../types/orchestration'

/** ── 1. IMPORTANCE ────────────────────────────────────────────────────
 *  Base 40 (any listed goal carries some weight) + bumps:
 *    must-have:         +30
 *    income kind:       +20  (retirement income is foundational)
 *    legacy kind:       +10  (bequest matters)
 *    corpus-build kind: +5
 *    system source:     +20  (mandatory reserves outrank discretionary goals)
 *  Capped at 100.                                                       */
export function scoreImportance(g: RawGoal): number {
  let s = 40
  if (g.priority === 'must-have') s += 30
  if (g.kind === 'income')        s += 20
  else if (g.kind === 'legacy')   s += 10
  else if (g.kind === 'corpus-build') s += 5
  if (g.source === 'system')      s += 20
  return Math.min(100, s)
}

/** ── 2. URGENCY ──────────────────────────────────────────────────────
 *  Years to target year drives base; must-have adds a small bump.
 *    overdue (yearsOut <= 0):   100
 *    3y or less:                ~80-100
 *    10y:                       ~65
 *    20y:                       ~30
 *    30y+:                      ~0
 *  Formula: 100 - min(100, yearsOut * 3.5)  + (must-have ? +10 : 0)    */
export function scoreUrgency(g: RawGoal, plan: PlanFacts): number {
  const targetYear = g.startYear ?? plan.currentYear + 5
  const yearsOut = targetYear - plan.currentYear
  if (yearsOut <= 0) return 100
  const base = 100 - Math.min(100, yearsOut * 3.5)
  const bonus = g.priority === 'must-have' ? 10 : 0
  return Math.max(0, Math.min(100, Math.round(base + bonus)))
}

/** ── 3. AFFORDABILITY ────────────────────────────────────────────────
 *  How fundable is this goal from current SIP + surplus capacity?
 *
 *    monthlyCapacity = monthlySIP + max(0, passive − burn − EMI)
 *    requiredSip     = PMT( inflated goal FV, months, blendedReturn/12 )
 *    shareNeeded     = requiredSip / monthlyCapacity
 *    score           = 100 - min(100, shareNeeded * 80)
 *
 *  Long-horizon goals score higher (compounding helps); short-horizon
 *  goals with large amounts score lower. Zero-capacity edge case → 0. */
export function scoreAffordability(g: RawGoal, plan: PlanFacts): number {
  const monthlyCapacity = plan.monthlySIP + Math.max(0, plan.passiveIncome - plan.monthlyBurn - plan.monthlyEMI)
  if (monthlyCapacity <= 0) return 0

  const targetYear = g.startYear ?? plan.currentYear + 5
  const yearsOut = Math.max(0.5, targetYear - plan.currentYear)
  const months = yearsOut * 12

  // Inflate by category-specific rate
  const inflRate = (g.inflationCategory === 'healthcare' ? plan.inflation.healthcare
                  : g.inflationCategory === 'education'  ? plan.inflation.education
                  :                                         plan.inflation.general) / 100
  const inflatedFV = g.amount * Math.pow(1 + inflRate, yearsOut)

  // PMT formula for SIP needed to hit FV
  const monthlyRate = plan.blendedReturn / 100 / 12
  let requiredSip: number
  if (Math.abs(monthlyRate) < 1e-9) {
    requiredSip = inflatedFV / months
  } else {
    requiredSip = inflatedFV * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1)
  }

  const shareNeeded = requiredSip / monthlyCapacity
  const score = 100 - Math.min(100, shareNeeded * 80)
  return Math.max(0, Math.round(score))
}

/** ── 4. RISK-FIT ─────────────────────────────────────────────────────
 *  Alignment of goal horizon with user risk appetite.
 *  Each goal has a "horizon-implied appetite" 1..5 (short → low, long → high):
 *      < 3y    → 1
 *      3-7y    → 2
 *      7-15y   → 3
 *      15-25y  → 4
 *      25y+    → 5
 *  User appetite comes from Preferences.riskProfile (0-100 → 1-5) if
 *  available, else Plan.riskAppetite.
 *  Score = 100 - |goalAppetite − userAppetite| × 22                    */
export function scoreRiskFit(g: RawGoal, plan: PlanFacts, preferences: Preferences): number {
  const targetYear = g.startYear ?? plan.currentYear + 5
  const yearsOut = Math.max(0, targetYear - plan.currentYear)
  const goalAppetite = yearsOut < 3 ? 1
                     : yearsOut < 7 ? 2
                     : yearsOut < 15 ? 3
                     : yearsOut < 25 ? 4
                     : 5

  // Map riskProfile 0-100 to a 1-5 appetite, else fall back to plan.riskAppetite
  const userAppetite: number = preferences.riskProfile != null
    ? Math.max(1, Math.min(5, Math.round((preferences.riskProfile / 100) * 4 + 1)))
    : plan.riskAppetite

  const distance = Math.abs(goalAppetite - userAppetite)
  return Math.max(0, 100 - distance * 22)
}

/** All four scorers in one call. */
export function scoreAll(g: RawGoal, plan: PlanFacts, preferences: Preferences): CriterionScores {
  return {
    importance:    scoreImportance(g),
    urgency:       scoreUrgency(g, plan),
    affordability: scoreAffordability(g, plan),
    riskFit:       scoreRiskFit(g, plan, preferences),
  }
}
