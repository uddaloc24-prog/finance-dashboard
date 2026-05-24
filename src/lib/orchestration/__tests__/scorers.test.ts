import { describe, expect, it } from 'vitest'
import { scoreImportance, scoreUrgency, scoreAffordability, scoreRiskFit } from '../scorers'
import { plan50, prefP5, prefDefault } from './__fixtures__'
import type { RawGoal } from '../../../types/orchestration'

const baseGoal: RawGoal = {
  id: 'g', label: 'g', kind: 'event', amount: 10_00_000,
  startYear: 2031, priority: 'nice-to-have',
  inflationCategory: 'general', source: 'manual',
}

describe('scoreImportance', () => {
  it('plain event/nice-to-have/manual = 40 base', () => {
    expect(scoreImportance(baseGoal)).toBe(40)
  })

  it('must-have adds +30', () => {
    expect(scoreImportance({ ...baseGoal, priority: 'must-have' })).toBe(70)
  })

  it('income kind adds +20', () => {
    expect(scoreImportance({ ...baseGoal, kind: 'income' })).toBe(60)
  })

  it('legacy kind adds +10', () => {
    expect(scoreImportance({ ...baseGoal, kind: 'legacy' })).toBe(50)
  })

  it('corpus-build adds +5', () => {
    expect(scoreImportance({ ...baseGoal, kind: 'corpus-build' })).toBe(45)
  })

  it('system source adds +20', () => {
    expect(scoreImportance({ ...baseGoal, source: 'system' })).toBe(60)
  })

  it('caps at 100 — system + must-have + income = 110 → 100', () => {
    expect(scoreImportance({ ...baseGoal, source: 'system', priority: 'must-have', kind: 'income' })).toBe(100)
  })
})

describe('scoreUrgency', () => {
  it('overdue (yearsOut <= 0) → 100', () => {
    expect(scoreUrgency({ ...baseGoal, startYear: 2025 }, plan50)).toBe(100)
    expect(scoreUrgency({ ...baseGoal, startYear: 2026 }, plan50)).toBe(100)
  })

  it('3y out ≈ 89 (100 − 3*3.5)', () => {
    const s = scoreUrgency({ ...baseGoal, startYear: 2029 }, plan50)
    expect(s).toBeGreaterThanOrEqual(85)
    expect(s).toBeLessThanOrEqual(92)
  })

  it('20y out ≈ 30', () => {
    const s = scoreUrgency({ ...baseGoal, startYear: 2046 }, plan50)
    expect(s).toBeGreaterThanOrEqual(28)
    expect(s).toBeLessThanOrEqual(32)
  })

  it('30y+ → ~0', () => {
    const s = scoreUrgency({ ...baseGoal, startYear: 2060 }, plan50)
    expect(s).toBeLessThanOrEqual(5)
  })

  it('must-have bonus is +10', () => {
    const base = scoreUrgency({ ...baseGoal, startYear: 2035 }, plan50)
    const must = scoreUrgency({ ...baseGoal, startYear: 2035, priority: 'must-have' }, plan50)
    expect(must - base).toBe(10)
  })

  it('clamps to [0, 100]', () => {
    expect(scoreUrgency({ ...baseGoal, startYear: 2999 }, plan50)).toBeGreaterThanOrEqual(0)
    expect(scoreUrgency({ ...baseGoal, startYear: 2025, priority: 'must-have' }, plan50)).toBe(100)
  })

  it('uses currentYear + 5 default when startYear is undefined', () => {
    const { startYear: _, ...noYear } = baseGoal
    void _
    const s = scoreUrgency(noYear as RawGoal, plan50)
    // 5y out → 100 - 5*3.5 = 82.5 → 83
    expect(s).toBeGreaterThanOrEqual(80)
    expect(s).toBeLessThanOrEqual(85)
  })
})

describe('scoreAffordability', () => {
  it('zero capacity → 0', () => {
    const zero = { ...plan50, monthlySIP: 0, passiveIncome: 0, monthlyBurn: 0, monthlyEMI: 0 }
    expect(scoreAffordability(baseGoal, zero)).toBe(0)
  })

  it('tiny amount + long horizon → high score', () => {
    const tiny: RawGoal = { ...baseGoal, amount: 1_00_000, startYear: 2050 }
    expect(scoreAffordability(tiny, plan50)).toBeGreaterThan(95)
  })

  it('huge amount + short horizon → low score', () => {
    const huge: RawGoal = { ...baseGoal, amount: 10_00_00_000, startYear: 2028 }
    expect(scoreAffordability(huge, plan50)).toBeLessThan(50)
  })

  it('healthcare category uses higher inflation than general', () => {
    const a = scoreAffordability({ ...baseGoal, inflationCategory: 'general' }, plan50)
    const b = scoreAffordability({ ...baseGoal, inflationCategory: 'healthcare' }, plan50)
    // Healthcare inflates faster → requires more SIP → lower affordability
    expect(b).toBeLessThanOrEqual(a)
  })
})

describe('scoreRiskFit', () => {
  // Using prefDefault (riskProfile=null) so plan.riskAppetite drives.
  it('long-horizon goal + high appetite user → high score', () => {
    const longGoal: RawGoal = { ...baseGoal, startYear: 2056 }
    const highPlan = { ...plan50, riskAppetite: 5 as const }
    expect(scoreRiskFit(longGoal, highPlan, prefDefault)).toBeGreaterThan(70)
  })

  it('short-horizon goal + low appetite user → high score', () => {
    const shortGoal: RawGoal = { ...baseGoal, startYear: 2027 }
    const lowPlan = { ...plan50, riskAppetite: 1 as const }
    expect(scoreRiskFit(shortGoal, lowPlan, prefDefault)).toBeGreaterThan(70)
  })

  it('long horizon + low appetite → mismatch, lower score', () => {
    const longGoal: RawGoal = { ...baseGoal, startYear: 2056 }
    const lowPlan = { ...plan50, riskAppetite: 1 as const }
    expect(scoreRiskFit(longGoal, lowPlan, prefDefault)).toBeLessThan(40)
  })

  it('prefers riskProfile (0-100) over plan.riskAppetite when present', () => {
    const longGoal: RawGoal = { ...baseGoal, startYear: 2056 }
    const lowAppetitePlan = { ...plan50, riskAppetite: 1 as const }
    const highRiskPref = { ...prefP5, riskProfile: 100 }
    // riskProfile=100 → maps to user appetite 5 → matches long-horizon goal
    expect(scoreRiskFit(longGoal, lowAppetitePlan, highRiskPref)).toBeGreaterThan(70)
  })

  it('returns 0..100 range', () => {
    for (const yr of [2026, 2030, 2040, 2055]) {
      for (const ra of [1, 3, 5] as const) {
        const s = scoreRiskFit({ ...baseGoal, startYear: yr }, { ...plan50, riskAppetite: ra }, prefP5)
        expect(s).toBeGreaterThanOrEqual(0)
        expect(s).toBeLessThanOrEqual(100)
      }
    }
  })
})
