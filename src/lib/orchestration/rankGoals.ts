// rankGoals — the Goal Ranking Engine itself.
// Pure function: same input → byte-for-byte identical output.
// Memo reference: §6 (algorithm), §2.4 (determinism contract).

import type {
  EngineInput, EngineOutput, RankedGoal, RawGoal, CriterionScores,
} from '../../types/orchestration'
import { resolveWeights } from './personaWeights'
import { scoreAll } from './scorers'
import { preempt } from './preempt'
import { stableCompare } from './tiebreaker'
import { hashInput } from './hash'

/** Run the engine. `now` is optional — pass it for deterministic tests;
 *  omit for live use (UI hook supplies `new Date()`). */
export function rankGoals(input: EngineInput, now: Date = new Date()): EngineOutput {
  // 1. Resolve weights from persona + optional user overrides
  const { weights, derivation } = resolveWeights(
    input.preferences.personaPrimary,
    input.preferences.weightOverrides,
  )

  // 2. Mandatory pre-emption — system goals prepended to the user pile
  const systemGoals = preempt(input.plan)
  const allGoals: RawGoal[] = [...systemGoals, ...input.goals]

  // 3. Score every goal on every criterion (0..100)
  const scored = allGoals.map((g) => {
    const scores: CriterionScores = scoreAll(g, input.plan, input.preferences)
    const composite =
      scores.importance    * weights.importance +
      scores.urgency       * weights.urgency +
      scores.affordability * weights.affordability +
      scores.riskFit       * weights.riskFit
    return { goal: g, scores, composite, priorityWeight: 0, disputed: false as const }
  })

  // 4. Stable sort by composite desc → must-have → id
  scored.sort(stableCompare)

  // 5. Normalise composites to priority weights summing to 1.0
  const sum = scored.reduce((s, r) => s + r.composite, 0)
  const ranked: RankedGoal[] = scored.map((r) => ({
    ...r,
    priorityWeight: sum > 0 ? r.composite / sum : 0,
  }))

  // 6. Build trace — per-goal rationale bullets
  const goalRationale: Record<string, string[]> = {}
  ranked.forEach((r) => { goalRationale[r.goal.id] = explain(r) })

  return {
    ranked,
    weightsUsed: weights,
    trace: {
      personaUsed: input.preferences.personaPrimary ?? 'default',
      weightDerivation: derivation,
      goalRationale,
    },
    emittedAt: now.toISOString(),
    inputsHash: hashInput(input),
  }
}

// ─── Trace helpers ────────────────────────────────────────────────────

function explain(r: RankedGoal): string[] {
  const bullets: string[] = []
  const s = r.scores

  // Highlight the dominant criterion
  const ordered = (Object.entries(s) as Array<[keyof CriterionScores, number]>)
    .sort((a, b) => b[1] - a[1])
  bullets.push(`Top driver: ${labelFor(ordered[0][0])} (${Math.round(ordered[0][1])}/100)`)

  // Flag weak spots
  ordered
    .filter(([, v]) => v < 40)
    .forEach(([k, v]) => bullets.push(`Weak ${labelFor(k)} (${Math.round(v)}/100)`))

  // Tag if must-have or system
  if (r.goal.source === 'system') bullets.push('System-pre-empted (mandatory reserve)')
  else if (r.goal.priority === 'must-have') bullets.push('User-marked must-have')

  // Goal cost context
  bullets.push(`Target ₹${(r.goal.amount).toLocaleString('en-IN')} by FY ${r.goal.startYear ?? '—'}`)

  return bullets
}

function labelFor(k: keyof CriterionScores): string {
  switch (k) {
    case 'importance':    return 'Importance'
    case 'urgency':       return 'Urgency'
    case 'affordability': return 'Affordability'
    case 'riskFit':       return 'Risk-fit'
  }
}
