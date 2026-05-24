import { describe, expect, it } from 'vitest'
import { stableCompare } from '../tiebreaker'
import type { RankedGoal, RawGoal } from '../../../types/orchestration'

function mkGoal(id: string, priority: 'must-have' | 'nice-to-have' = 'nice-to-have'): RawGoal {
  return { id, label: id, kind: 'event', amount: 1, startYear: 2030, priority, inflationCategory: 'general', source: 'manual' }
}

function mkRanked(id: string, composite: number, priority?: 'must-have' | 'nice-to-have'): RankedGoal {
  return {
    goal: mkGoal(id, priority),
    scores: { importance: 50, urgency: 50, affordability: 50, riskFit: 50 },
    composite, priorityWeight: 0, disputed: false,
  }
}

describe('stableCompare', () => {
  it('orders by composite descending', () => {
    const items = [mkRanked('a', 30), mkRanked('b', 90), mkRanked('c', 60)]
    items.sort(stableCompare)
    expect(items.map((r) => r.goal.id)).toEqual(['b', 'c', 'a'])
  })

  it('must-have wins on equal composite', () => {
    const items = [
      mkRanked('aaa', 50, 'nice-to-have'),
      mkRanked('bbb', 50, 'must-have'),
    ]
    items.sort(stableCompare)
    expect(items[0].goal.id).toBe('bbb')
  })

  it('id ascending breaks ties when composite + priority equal', () => {
    const items = [mkRanked('zzz', 50), mkRanked('aaa', 50), mkRanked('mmm', 50)]
    items.sort(stableCompare)
    expect(items.map((r) => r.goal.id)).toEqual(['aaa', 'mmm', 'zzz'])
  })

  it('is stable across repeated sorts (idempotent)', () => {
    const items = [mkRanked('z', 50), mkRanked('a', 50), mkRanked('m', 50)]
    items.sort(stableCompare)
    const first = items.map((r) => r.goal.id).join(',')
    items.sort(stableCompare)
    const second = items.map((r) => r.goal.id).join(',')
    expect(first).toBe(second)
  })
})
