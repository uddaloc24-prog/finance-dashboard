// Mandatory pre-emption rules — system goals injected BEFORE the MCDA
// pass. These represent non-negotiable financial floors: term cover,
// health cover, emergency fund, high-rate debt clearance.
// Memo reference: §7.
//
// All emitted goals carry `source: 'system'`, `priority: 'must-have'`,
// `kind: 'corpus-build'`, target year = currentYear (urgent now). The
// `amount` is the GAP (target − current), not the target itself.

import type { PlanFacts, RawGoal } from '../../types/orchestration'

/** Annual burn — used by multiple rules. */
function annualBurn(plan: PlanFacts): number {
  return plan.monthlyBurn * 12
}

/** 1. Term-life floor — < 70y old AND lifeCover < 5 × annualBurn. */
function termLifeRule(plan: PlanFacts): RawGoal | null {
  if (plan.currentAge >= 70) return null
  const floor = 5 * annualBurn(plan)        // memo cites "5×" minimum
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

/** 2. Health cover floor — benchmark by age × city tier (we don't carry
 *  city today; use a flat ₹15L base × age multiplier). */
function healthCoverRule(plan: PlanFacts): RawGoal | null {
  const baseBench = 1_500_000
  const ageUplift = plan.currentAge < 50 ? 1.0
                  : plan.currentAge < 60 ? 1.4
                  : plan.currentAge < 70 ? 1.8
                  :                         2.2
  const bench = Math.round(baseBench * ageUplift)
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

/** 3. Emergency fund — liquidCorpus must cover 6 × monthlyBurn. */
function emergencyFundRule(plan: PlanFacts): RawGoal | null {
  if (plan.monthlyBurn <= 0) return null
  const floor = 6 * plan.monthlyBurn
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

/** Run every pre-emption rule, return the system goals it produces.
 *  Order matters only for human-readability; engine sorts by composite. */
export function preempt(plan: PlanFacts): RawGoal[] {
  const out: RawGoal[] = []
  const t = termLifeRule(plan);    if (t) out.push(t)
  const h = healthCoverRule(plan); if (h) out.push(h)
  const e = emergencyFundRule(plan); if (e) out.push(e)
  return out
}
