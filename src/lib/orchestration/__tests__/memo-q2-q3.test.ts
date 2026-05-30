// memo-q2-q3.test.ts — locks the §11 Q2 + Q3 resolutions.

import { describe, it, expect } from 'vitest'
import {
  preempt,
  DEFAULT_TERM_LIFE_FLOOR_X_ANNUAL_BURN,
  DEFAULT_TERM_LIFE_AGE_CUTOFF,
  DEFAULT_HEALTH_BASE_BENCHMARK_INR,
  DEFAULT_EMERGENCY_MONTHS_OF_BURN,
  DEFAULT_HIGH_RATE_DEBT_RATE_THRESHOLD,
} from '../preempt'
import { rankGoals, getReservations, getUserGoals } from '../rankGoals'
import { plan50, planUnderProtected, prefP5 } from './__fixtures__'
import type { EngineInput, RawGoal } from '../../../types/orchestration'

const FIXED_NOW = new Date('2026-05-29T00:00:00Z')

const goal: RawGoal = {
  id: 'g-user', label: 'Build corpus', kind: 'corpus-build',
  amount: 1_00_00_000, startYear: 2046, priority: 'must-have',
  inflationCategory: 'general', source: 'manual',
}

// ─── Q2 — exported defaults match the historical hardcoded values ────

describe('§11 Q2 — pre-emption defaults locked', () => {
  it('term-life: floor = 5 × annualBurn, cut-off age 70', () => {
    expect(DEFAULT_TERM_LIFE_FLOOR_X_ANNUAL_BURN).toBe(5)
    expect(DEFAULT_TERM_LIFE_AGE_CUTOFF).toBe(70)
  })
  it('health: base = ₹15 L', () => {
    expect(DEFAULT_HEALTH_BASE_BENCHMARK_INR).toBe(15_00_000)
  })
  it('emergency: 6 months of burn', () => {
    expect(DEFAULT_EMERGENCY_MONTHS_OF_BURN).toBe(6)
  })
  it('high-rate debt threshold: 15 % p.a.', () => {
    expect(DEFAULT_HIGH_RATE_DEBT_RATE_THRESHOLD).toBe(15)
  })
})

// ─── Q2 — new §7 high-rate-debt rule (deferred item shipped 2026-05-30) ─

describe('§11 Q2 — high-rate-debt rule', () => {
  // Build a planUnderProtected variant with two high-rate loans.
  const planWithHrDebt = {
    ...planUnderProtected,
    loans: [
      { outstanding: 5_00_000,  interestRate: 22, emi: 12_000 },  // credit card
      { outstanding: 2_50_000,  interestRate: 16, emi:  6_500 },  // personal loan
      { outstanding: 30_00_000, interestRate:  8, emi: 25_000 },  // home loan (below threshold)
    ],
  }

  it('fires one sys-high-rate-debt goal for loans ≥ 15 %', () => {
    const out = preempt(planWithHrDebt)
    const hr = out.find((g) => g.id === 'sys-high-rate-debt')
    expect(hr).toBeDefined()
  })

  it('amount = sum of outstanding across loans above the threshold', () => {
    const out = preempt(planWithHrDebt)
    const hr = out.find((g) => g.id === 'sys-high-rate-debt')!
    expect(hr.amount).toBe(5_00_000 + 2_50_000)         // home loan @ 8 % excluded
  })

  it('label cites the worst rate when multiple loans qualify', () => {
    const out = preempt(planWithHrDebt)
    const hr = out.find((g) => g.id === 'sys-high-rate-debt')!
    expect(hr.label).toMatch(/22/)                       // 22 % is the worst
  })

  it('does NOT fire when every loan is below the threshold', () => {
    const safePlan = {
      ...planUnderProtected,
      loans: [{ outstanding: 30_00_000, interestRate: 8, emi: 25_000 }],
    }
    const out = preempt(safePlan)
    expect(out.find((g) => g.id === 'sys-high-rate-debt')).toBeUndefined()
  })

  it('does NOT fire when loans[] is empty', () => {
    const out = preempt({ ...planUnderProtected, loans: [] })
    expect(out.find((g) => g.id === 'sys-high-rate-debt')).toBeUndefined()
  })

  it('threshold is tunable — lowering it captures more loans', () => {
    const out = preempt(planWithHrDebt, { highRateDebtRateThreshold: 10 })
    const hr = out.find((g) => g.id === 'sys-high-rate-debt')!
    // Now the 8 % home loan is still excluded, 16 % + 22 % included
    expect(hr.amount).toBe(5_00_000 + 2_50_000)
  })

  it('threshold is tunable — raising it can disable the rule', () => {
    const out = preempt(planWithHrDebt, { highRateDebtRateThreshold: 25 })
    expect(out.find((g) => g.id === 'sys-high-rate-debt')).toBeUndefined()
  })

  it('lowering threshold to 7 % captures the home loan too', () => {
    const out = preempt(planWithHrDebt, { highRateDebtRateThreshold: 7 })
    const hr = out.find((g) => g.id === 'sys-high-rate-debt')!
    expect(hr.amount).toBe(5_00_000 + 2_50_000 + 30_00_000)
  })
})

// ─── Q2 — overrides path actually takes effect ───────────────────────

describe('§11 Q2 — preempt accepts overrides', () => {
  it('with no overrides, behaviour matches defaults', () => {
    const out = preempt(planUnderProtected)
    // planUnderProtected has lifeCover 20L vs floor 5×180k×12 = 1.08Cr → fires
    expect(out.find((g) => g.id === 'sys-term-life')).toBeDefined()
  })

  it('raising termLifeFloorXAnnualBurn increases the gap', () => {
    const a = preempt(planUnderProtected)
    const aTerm = a.find((g) => g.id === 'sys-term-life')!
    const b = preempt(planUnderProtected, { termLifeFloorXAnnualBurn: 10 })
    const bTerm = b.find((g) => g.id === 'sys-term-life')!
    expect(bTerm.amount).toBeGreaterThan(aTerm.amount)
  })

  it('lowering termLifeAgeCutoff can disable the rule', () => {
    // planUnderProtected.currentAge = 50; cut-off 40 disables term-life
    const out = preempt(planUnderProtected, { termLifeAgeCutoff: 40 })
    expect(out.find((g) => g.id === 'sys-term-life')).toBeUndefined()
  })

  it('raising emergency floor increases the emergency-fund gap', () => {
    const a = preempt(planUnderProtected)
    const aEm = a.find((g) => g.id === 'sys-emergency-fund')
    const b = preempt(planUnderProtected, { emergencyMonthsOfBurn: 12 })
    const bEm = b.find((g) => g.id === 'sys-emergency-fund')!
    expect(bEm.amount).toBeGreaterThan(aEm?.amount ?? 0)
  })
})

// ─── Q3 — getReservations / getUserGoals helpers ────────────────────

describe('§11 Q3 — reservations + user goals helpers', () => {
  const input: EngineInput = { plan: planUnderProtected, preferences: prefP5, goals: [goal] }
  const out = rankGoals(input, FIXED_NOW)

  it('getReservations returns only system-sourced goals', () => {
    const r = getReservations(out)
    expect(r.length).toBeGreaterThan(0)
    for (const item of r) {
      expect(item.goal.source).toBe('system')
    }
  })

  it('getUserGoals returns only non-system goals', () => {
    const u = getUserGoals(out)
    expect(u.length).toBeGreaterThan(0)
    for (const item of u) {
      expect(item.goal.source).not.toBe('system')
    }
  })

  it('the union equals output.ranked (partition)', () => {
    const r = getReservations(out).length
    const u = getUserGoals(out).length
    expect(r + u).toBe(out.ranked.length)
  })

  it('no overlap between reservations and user goals', () => {
    const rIds = new Set(getReservations(out).map((x) => x.goal.id))
    const uIds = new Set(getUserGoals(out).map((x) => x.goal.id))
    for (const id of rIds) expect(uIds.has(id)).toBe(false)
  })

  it('plan with no pre-emption triggers → getReservations is empty', () => {
    const input2: EngineInput = { plan: plan50, preferences: prefP5, goals: [goal] }
    const out2 = rankGoals(input2, FIXED_NOW)
    expect(getReservations(out2)).toEqual([])
    expect(getUserGoals(out2).length).toBe(out2.ranked.length)
  })
})
