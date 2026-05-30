// spouseProfileMetric — deterministic measure of whether the user has
// supplied enough spousal data to enable Nash-bargaining decisions in
// a hypothetical v2.
//
// Memo §2.3 gating: ship spousal mode only when > 30 % of active users
// have a *complete* profile. We emit the metric here so any future
// telemetry layer can collect it without changing the engine API.
//
// Pure function · deterministic — same inputs → identical output.

import type { UserIdentity } from '../../types/identity'
import type { Demographics } from '../../types'
import type { SpouseProfileMetric } from '../../types/orchestration'

const SPOUSE_FIELDS = 3   // name + age + lifeExpectancy

export function computeSpouseProfileMetric(
  identity: UserIdentity | null,
  demographics: Demographics | null | undefined,
  now: Date = new Date(),
): SpouseProfileMetric {
  const maritalStatus = identity?.maritalStatus
  const isPartnered = maritalStatus === 'married'

  const hasName    = !!identity?.spouseName?.trim()
  const hasAge     = typeof demographics?.spouseAge === 'number' && demographics.spouseAge > 0
  const hasLifeExp = typeof demographics?.spouseLifeExpectancy === 'number' && demographics.spouseLifeExpectancy > 0

  const filled = (hasName ? 1 : 0) + (hasAge ? 1 : 0) + (hasLifeExp ? 1 : 0)
  const completeness = filled / SPOUSE_FIELDS

  // hasCompleteSpouseProfile requires BOTH "married" status AND all 3 fields.
  // Unmarried users with stray spouse data don't count as "complete" for
  // the Nash-gating threshold.
  const hasCompleteSpouseProfile = isPartnered && completeness === 1

  return {
    maritalStatus,
    isPartnered,
    hasCompleteSpouseProfile,
    completeness: Math.round(completeness * 1000) / 1000,
    emittedAt: now.toISOString(),
  }
}
