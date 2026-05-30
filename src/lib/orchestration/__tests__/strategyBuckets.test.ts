// strategyBuckets.test.ts — Phase 5 contract.

import { describe, it, expect } from 'vitest'
import { strategyAwareBuckets } from '../strategyBuckets'
import { selectStrategies } from '../strategySelector'
import { plan50, plan65, prefP1, prefP5, prefP7 } from './__fixtures__'
import type { EngineInput, RawGoal } from '../../../types/orchestration'

const FIXED_NOW = new Date('2026-05-29T00:00:00Z')

function buildInput(plan: typeof plan50, prefs: typeof prefP1, goal: RawGoal): EngineInput {
  return { plan, preferences: prefs, goals: [goal] }
}

const corpusGoal: RawGoal = {
  id: 'g', label: 'Corpus', kind: 'corpus-build',
  amount: 1_00_00_000, startYear: 2046, priority: 'must-have',
  inflationCategory: 'general', source: 'manual',
}

// ─── Shape & invariants ───────────────────────────────────────────────

describe('strategyAwareBuckets — shape', () => {
  const input = buildInput(plan50, prefP5, corpusGoal)
  const sel = selectStrategies(input, FIXED_NOW)
  const goalStrategy = sel.byGoal[0]
  const blend = strategyAwareBuckets(corpusGoal, input, goalStrategy)

  it('returns a 4-component bucket vector', () => {
    expect(blend.buckets).toHaveProperty('b1')
    expect(blend.buckets).toHaveProperty('b2')
    expect(blend.buckets).toHaveProperty('b3')
    expect(blend.buckets).toHaveProperty('b4')
  })

  it('buckets sum to ≈ 1.0', () => {
    const { b1, b2, b3, b4 } = blend.buckets
    expect(b1 + b2 + b3 + b4).toBeCloseTo(1, 3)
  })

  it('records the strategy id used', () => {
    expect(blend.strategyId).toBeTruthy()
    expect(blend.strategyId).toBe(goalStrategy.recommended)
  })

  it('records the three mix weights summing to 1', () => {
    const { strategy, horizon, riskTilt } = blend.mixWeights
    expect(strategy + horizon + riskTilt).toBeCloseTo(1, 3)
  })
})

// ─── Risk-tilt sign ───────────────────────────────────────────────────

describe('strategyAwareBuckets — risk tilt direction', () => {
  it('low fusedRisk lifts B1+B2 vs high fusedRisk', () => {
    const lowRiskInput = buildInput(plan50, prefP1, corpusGoal)   // prefP1.fusedRisk.score = 25
    const hiRiskInput  = buildInput(plan50, prefP7, corpusGoal)   // prefP7.fusedRisk.score = 75

    const lowSel = selectStrategies(lowRiskInput, FIXED_NOW)
    const hiSel  = selectStrategies(hiRiskInput,  FIXED_NOW)

    const lowBlend = strategyAwareBuckets(corpusGoal, lowRiskInput, lowSel.byGoal[0])
    const hiBlend  = strategyAwareBuckets(corpusGoal, hiRiskInput,  hiSel.byGoal[0])

    const lowDefensive = lowBlend.buckets.b1 + lowBlend.buckets.b2
    const hiDefensive  = hiBlend.buckets.b1  + hiBlend.buckets.b2

    expect(lowDefensive).toBeGreaterThan(hiDefensive)
  })
})

// ─── Safety floor ─────────────────────────────────────────────────────

describe('strategyAwareBuckets — high-severity guardrail safety floor', () => {
  it('lifts B1 to ≥ 10% when a high-severity guardrail is present', () => {
    const prefWithGuardrail = {
      ...prefP7,
      bias: {
        ...prefP7.bias,
        guardrails: [{
          id: 'cooling-off', category: 'commitment' as const,
          trigger: 'test', action: 'test', severity: 'high' as const,
        }],
      },
    }
    const input = buildInput(plan50, prefWithGuardrail, corpusGoal)
    const sel = selectStrategies(input, FIXED_NOW)
    const blend = strategyAwareBuckets(corpusGoal, input, sel.byGoal[0])
    expect(blend.buckets.b1).toBeGreaterThanOrEqual(0.10 - 1e-6)
  })

  it('does NOT lift B1 when only low / med severity guardrails are present', () => {
    const prefMedOnly = {
      ...prefP7,
      bias: {
        ...prefP7.bias,
        guardrails: [{
          id: 'review-cadence', category: 'review-cadence' as const,
          trigger: 't', action: 'a', severity: 'med' as const,
        }],
      },
    }
    const input = buildInput(plan50, prefMedOnly, corpusGoal)
    const sel = selectStrategies(input, FIXED_NOW)
    const blend = strategyAwareBuckets(corpusGoal, input, sel.byGoal[0])
    expect(blend.safetyFloorApplied).toBe(false)
  })
})

// ─── Falls back gracefully when no strategy is supplied ──────────────

describe('strategyAwareBuckets — fallback', () => {
  it('uses horizon-only buckets when goalStrategy is undefined', () => {
    const input = buildInput(plan50, prefP5, corpusGoal)
    const blend = strategyAwareBuckets(corpusGoal, input, undefined)
    expect(blend.strategyId).toBe('')
    expect(blend.mixWeights.strategy).toBe(0)
    const sum = blend.buckets.b1 + blend.buckets.b2 + blend.buckets.b3 + blend.buckets.b4
    expect(sum).toBeCloseTo(1, 3)
  })
})

// ─── Income-goal short horizon ────────────────────────────────────────

describe('strategyAwareBuckets — short-horizon income goal', () => {
  const incomeGoal: RawGoal = {
    id: 'g-inc', label: 'Income', kind: 'income',
    amount: 1_00_000, startYear: 2028, priority: 'must-have',
    inflationCategory: 'general', source: 'manual',
  }
  it('produces a more defensive blend than long-horizon corpus-build', () => {
    const incomeInput = buildInput(plan65, prefP1, incomeGoal)
    const incomeSel = selectStrategies(incomeInput, FIXED_NOW)
    const incomeBlend = strategyAwareBuckets(incomeGoal, incomeInput, incomeSel.byGoal[0])

    const corpusInput = buildInput(plan65, prefP1, corpusGoal)
    const corpusSel = selectStrategies(corpusInput, FIXED_NOW)
    const corpusBlend = strategyAwareBuckets(corpusGoal, corpusInput, corpusSel.byGoal[0])

    expect(incomeBlend.buckets.b1 + incomeBlend.buckets.b2)
      .toBeGreaterThan(corpusBlend.buckets.b1 + corpusBlend.buckets.b2)
  })
})
