// strategySelector.test.ts — TOPSIS recommended-strategy contract.

import { describe, it, expect } from 'vitest'
import { selectStrategies } from '../strategySelector'
import { plan50, plan65, prefP1, prefP5, prefP7, prefDefault } from './__fixtures__'
import type { EngineInput, RawGoal } from '../../../types/orchestration'

const FIXED_NOW = new Date('2026-05-29T00:00:00Z')

function buildInput(plan: typeof plan50, prefs: typeof prefP1, goals: RawGoal[]): EngineInput {
  return { plan, preferences: prefs, goals }
}

// ─── Output shape ─────────────────────────────────────────────────────

describe('selectStrategies — shape', () => {
  const goals: RawGoal[] = [
    { id: 'g1', label: 'Retirement income', kind: 'income', amount: 1_00_000,
      startYear: 2030, priority: 'must-have', inflationCategory: 'general', source: 'manual' },
  ]
  const sel = selectStrategies(buildInput(plan50, prefP5, goals), FIXED_NOW)

  it('returns one GoalStrategy entry per goal', () => {
    expect(sel.byGoal).toHaveLength(1)
    expect(sel.byGoal[0].goalId).toBe('g1')
  })

  it('ranks all 12 catalogue strategies per goal', () => {
    expect(sel.byGoal[0].ranked).toHaveLength(12)
  })

  it('every rank position is unique 1..12', () => {
    const ranks = new Set(sel.byGoal[0].ranked.map((r) => r.rank))
    expect(ranks.size).toBe(12)
  })

  it('topsisScore is in [0, 1]', () => {
    for (const r of sel.byGoal[0].ranked) {
      expect(r.topsisScore).toBeGreaterThanOrEqual(0)
      expect(r.topsisScore).toBeLessThanOrEqual(1)
    }
  })

  it('recommended === ranked[0].strategyId', () => {
    expect(sel.byGoal[0].recommended).toBe(sel.byGoal[0].ranked[0].strategyId)
  })

  it('ranked array is sorted by topsisScore desc', () => {
    const scores = sel.byGoal[0].ranked.map((r) => r.topsisScore)
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i])
    }
  })
})

// ─── Behavioural assertions ───────────────────────────────────────────

describe('selectStrategies — behavioural', () => {
  it('income goal at low risk → recommends an income / liability-matched strategy', () => {
    const incomeGoal: RawGoal = {
      id: 'g-inc', label: 'Monthly retirement income', kind: 'income',
      amount: 1_00_000, startYear: 2027, priority: 'must-have',
      inflationCategory: 'general', source: 'manual',
    }
    const sel = selectStrategies(buildInput(plan65, prefP1, [incomeGoal]), FIXED_NOW)
    const top = sel.byGoal[0].recommended
    expect(['lda', 'retire-income', 'bucket', 'dynamic']).toContain(top)
  })

  it('long-horizon corpus-build at moderate risk → recommends a growth strategy', () => {
    const corpusGoal: RawGoal = {
      id: 'g-corpus', label: 'Build retirement corpus', kind: 'corpus-build',
      amount: 5_00_00_000, startYear: 2046, priority: 'must-have',
      inflationCategory: 'general', source: 'manual',
    }
    const sel = selectStrategies(buildInput(plan50, prefP5, [corpusGoal]), FIXED_NOW)
    const top = sel.byGoal[0].recommended
    // Expect long-horizon growth biased: bucket, strategic, index, core-sat
    expect(['bucket', 'strategic', 'index', 'core-sat', 'glide']).toContain(top)
  })

  it('education event goal → education strategy ranks high', () => {
    const eduGoal: RawGoal = {
      id: 'g-edu', label: 'Grandchild college', kind: 'event',
      amount: 50_00_000, startYear: 2034, priority: 'must-have',
      inflationCategory: 'education', source: 'manual',
    }
    const sel = selectStrategies(buildInput(plan50, prefP5, [eduGoal]), FIXED_NOW)
    const eduRank = sel.byGoal[0].ranked.find((r) => r.strategyId === 'education')!
    expect(eduRank.rank).toBeLessThanOrEqual(5)   // top-5
  })

  it('default persona (no v10) still produces a ranked list', () => {
    const goal: RawGoal = {
      id: 'g', label: 'X', kind: 'corpus-build', amount: 1_00_00_000,
      startYear: 2040, priority: 'nice-to-have', inflationCategory: 'general', source: 'manual',
    }
    const sel = selectStrategies(buildInput(plan50, prefDefault, [goal]), FIXED_NOW)
    expect(sel.byGoal[0].ranked).toHaveLength(12)
  })

  it('different goals on the same input can get different recommendations', () => {
    const income: RawGoal = { id: 'g1', label: 'Income', kind: 'income', amount: 1_00_000,
      startYear: 2027, priority: 'must-have', inflationCategory: 'general', source: 'manual' }
    const corpus: RawGoal = { id: 'g2', label: 'Corpus', kind: 'corpus-build', amount: 1_00_00_000,
      startYear: 2046, priority: 'nice-to-have', inflationCategory: 'general', source: 'manual' }
    const sel = selectStrategies(buildInput(plan50, prefP7, [income, corpus]), FIXED_NOW)
    // Not guaranteed to differ, but they should be evaluated independently —
    // each goal has its own ranked list.
    expect(sel.byGoal).toHaveLength(2)
    expect(sel.byGoal[0].goalId).toBe('g1')
    expect(sel.byGoal[1].goalId).toBe('g2')
  })
})

// ─── Determinism ──────────────────────────────────────────────────────

describe('selectStrategies — determinism', () => {
  const goals: RawGoal[] = [
    { id: 'g', label: 'X', kind: 'corpus-build', amount: 1_00_00_000,
      startYear: 2040, priority: 'must-have', inflationCategory: 'general', source: 'manual' },
  ]
  it('same input → byte-identical output', () => {
    const a = selectStrategies(buildInput(plan50, prefP5, goals), FIXED_NOW)
    const b = selectStrategies(buildInput(plan50, prefP5, goals), FIXED_NOW)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
