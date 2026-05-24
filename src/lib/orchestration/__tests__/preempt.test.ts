import { describe, expect, it } from 'vitest'
import { preempt } from '../preempt'
import { plan50, planUnderProtected } from './__fixtures__'

describe('preempt', () => {
  it('healthy plan → no system goals', () => {
    expect(preempt(plan50)).toEqual([])
  })

  it('under-protected plan → all 3 rules fire', () => {
    const goals = preempt(planUnderProtected)
    const ids = goals.map((g) => g.id).sort()
    expect(ids).toEqual(['sys-emergency-fund', 'sys-health-cover', 'sys-term-life'])
  })

  it('term-life rule skipped for age 70+', () => {
    const old = { ...planUnderProtected, currentAge: 75 }
    const goals = preempt(old)
    expect(goals.find((g) => g.id === 'sys-term-life')).toBeUndefined()
  })

  it('every system goal is must-have, corpus-build kind, source=system', () => {
    const goals = preempt(planUnderProtected)
    for (const g of goals) {
      expect(g.priority).toBe('must-have')
      expect(g.kind).toBe('corpus-build')
      expect(g.source).toBe('system')
      expect(g.startYear).toBe(planUnderProtected.currentYear)
    }
  })

  it('amount = the gap, not the floor itself', () => {
    const goals = preempt(planUnderProtected)
    const term = goals.find((g) => g.id === 'sys-term-life')!
    // gap = 5 × annualBurn − lifeCover = 5 × 1.5L × 12 − 20L = 90L − 20L = 70L
    expect(term.amount).toBe(70_00_000)
  })

  it('emergency fund skipped when monthlyBurn = 0', () => {
    const noBurn = { ...planUnderProtected, monthlyBurn: 0 }
    const goals = preempt(noBurn)
    expect(goals.find((g) => g.id === 'sys-emergency-fund')).toBeUndefined()
  })

  it('age uplift on health cover — older age = higher floor', () => {
    const young = { ...planUnderProtected, currentAge: 45, insurance: { ...planUnderProtected.insurance, healthCover: 0 } }
    const old   = { ...planUnderProtected, currentAge: 65, insurance: { ...planUnderProtected.insurance, healthCover: 0 } }
    const youngGap = preempt(young).find((g) => g.id === 'sys-health-cover')!.amount
    const oldGap   = preempt(old).find((g) => g.id === 'sys-health-cover')!.amount
    expect(oldGap).toBeGreaterThan(youngGap)
  })
})
