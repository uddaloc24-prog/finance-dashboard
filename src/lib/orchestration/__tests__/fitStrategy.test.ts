import { describe, expect, it } from 'vitest'
import { fitStrategy, bucketSplitFor } from '../fitStrategy'
import { rankGoals } from '../rankGoals'
import { buildInput, plan50, prefP5, FIXED_NOW } from './__fixtures__'

describe('bucketSplitFor', () => {
  it.each([
    [0.5,  { b1: 1, b2: 0, b3: 0, b4: 0 }],
    [2.5,  { b1: 0.30, b2: 0.70, b3: 0, b4: 0 }],
    [5,    { b1: 0.10, b2: 0.40, b3: 0.40, b4: 0.10 }],
    [10,   { b1: 0.05, b2: 0.20, b3: 0.40, b4: 0.35 }],
    [18,   { b1: 0.05, b2: 0.10, b3: 0.30, b4: 0.55 }],
    [30,   { b1: 0.05, b2: 0.05, b3: 0.20, b4: 0.70 }],
  ])('horizon %s years → %o', (yrs, expected) => {
    expect(bucketSplitFor(yrs)).toEqual(expected)
  })

  it('every split sums to 1.0', () => {
    for (const yrs of [1, 3, 5, 10, 18, 30, 50]) {
      const s = bucketSplitFor(yrs)
      expect(Math.abs(s.b1 + s.b2 + s.b3 + s.b4 - 1)).toBeLessThan(0.001)
    }
  })
})

describe('fitStrategy', () => {
  it('emits one fitted goal per ranked goal, in same order', () => {
    const input = buildInput()
    const ranked = rankGoals(input, FIXED_NOW)
    const fit = fitStrategy(input, ranked, FIXED_NOW)
    expect(fit.goals).toHaveLength(ranked.ranked.length)
    fit.goals.forEach((g, i) => {
      expect(g.goalId).toBe(ranked.ranked[i].goal.id)
      expect(g.rank).toBe(i + 1)
    })
  })

  it('totals.corpusUsed never exceeds totals.corpus', () => {
    const input = buildInput()
    const ranked = rankGoals(input, FIXED_NOW)
    const fit = fitStrategy(input, ranked, FIXED_NOW)
    expect(fit.totals.corpusUsed).toBeLessThanOrEqual(fit.totals.corpus)
    expect(fit.totals.corpusFree).toBe(Math.max(0, fit.totals.corpus - fit.totals.corpusUsed))
  })

  it('totals.sipUsed never exceeds sipCapacity', () => {
    const input = buildInput()
    const ranked = rankGoals(input, FIXED_NOW)
    const fit = fitStrategy(input, ranked, FIXED_NOW)
    expect(fit.totals.sipUsed).toBeLessThanOrEqual(fit.totals.sipCapacity + 1) // ±1 rounding
  })

  it('every per-goal bucketSplit sums to 1.0', () => {
    const input = buildInput()
    const ranked = rankGoals(input, FIXED_NOW)
    const fit = fitStrategy(input, ranked, FIXED_NOW)
    for (const g of fit.goals) {
      const sum = g.bucketSplit.b1 + g.bucketSplit.b2 + g.bucketSplit.b3 + g.bucketSplit.b4
      expect(Math.abs(sum - 1)).toBeLessThan(0.001)
    }
  })

  it('aggregate bucket pcts sum to 1.0 when any corpus is used', () => {
    const input = buildInput()
    const ranked = rankGoals(input, FIXED_NOW)
    const fit = fitStrategy(input, ranked, FIXED_NOW)
    if (fit.totals.corpusUsed > 0) {
      const sum = fit.bucketTargets.b1Pct + fit.bucketTargets.b2Pct + fit.bucketTargets.b3Pct + fit.bucketTargets.b4Pct
      expect(Math.abs(sum - 1)).toBeLessThan(0.005)
    }
  })

  it('status thresholds — funded / partial / unfunded', () => {
    const input = buildInput()
    const ranked = rankGoals(input, FIXED_NOW)
    const fit = fitStrategy(input, ranked, FIXED_NOW)
    for (const g of fit.goals) {
      const ratio = g.inflatedCost > 0 ? g.shortfall / g.inflatedCost : 0
      if (g.status === 'funded')   expect(ratio).toBeLessThan(0.05)
      if (g.status === 'partial')  { expect(ratio).toBeGreaterThanOrEqual(0.05); expect(ratio).toBeLessThan(0.50) }
      if (g.status === 'unfunded') expect(ratio).toBeGreaterThanOrEqual(0.50)
    }
  })

  it('emits at least one action when goals exist', () => {
    const input = buildInput()
    const ranked = rankGoals(input, FIXED_NOW)
    const fit = fitStrategy(input, ranked, FIXED_NOW)
    expect(fit.actions.length).toBeGreaterThan(0)
  })

  it('no goals → empty fit, totals reflect zero usage', () => {
    const input = buildInput(plan50, prefP5, [])
    const ranked = rankGoals(input, FIXED_NOW)
    const fit = fitStrategy(input, ranked, FIXED_NOW)
    expect(fit.goals).toEqual([])
    expect(fit.totals.corpusUsed).toBe(0)
    expect(fit.totals.sipUsed).toBe(0)
  })
})
