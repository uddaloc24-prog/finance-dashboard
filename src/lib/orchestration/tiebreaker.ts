// Deterministic ordering for ranked goals.
// Sort key: composite desc → must-have first → id asc.
// Memo reference: §6 step 4, §2.4 determinism contract.

import type { RankedGoal } from '../../types/orchestration'

export function stableCompare(a: RankedGoal, b: RankedGoal): number {
  // 1. Higher composite first
  if (b.composite !== a.composite) return b.composite - a.composite

  // 2. must-have goals beat nice-to-have at equal composite
  const aMust = a.goal.priority === 'must-have' ? 0 : 1
  const bMust = b.goal.priority === 'must-have' ? 0 : 1
  if (aMust !== bMust) return aMust - bMust

  // 3. Lex order on id as final tiebreaker (stable across runs)
  return a.goal.id < b.goal.id ? -1 : a.goal.id > b.goal.id ? 1 : 0
}
