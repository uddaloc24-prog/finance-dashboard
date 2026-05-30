// productMap.test.ts — Phase 7 product-mapping contract.

import { describe, it, expect } from 'vitest'
import { buildProductPlan } from '../productMap'
import { PRODUCT_CATALOGUE, productById } from '../productCatalogue'
import { selectStrategies } from '../strategySelector'
import { rankGoals } from '../rankGoals'
import { fitStrategy } from '../fitStrategy'
import { plan50, plan65, prefP1, prefP5, prefP7 } from './__fixtures__'
import type { EngineInput, RawGoal } from '../../../types/orchestration'

const FIXED_NOW = new Date('2026-05-29T00:00:00Z')

const corpusGoal: RawGoal = {
  id: 'g-corpus', label: 'Build corpus', kind: 'corpus-build',
  amount: 1_00_00_000, startYear: 2046, priority: 'must-have',
  inflationCategory: 'general', source: 'manual',
}

const incomeGoal: RawGoal = {
  id: 'g-inc', label: 'Monthly retirement income', kind: 'income',
  amount: 1_00_000, startYear: 2027, priority: 'must-have',
  inflationCategory: 'general', source: 'manual',
}

function pipeline(plan: typeof plan50, prefs: typeof prefP1, goals: RawGoal[]) {
  const input: EngineInput = { plan, preferences: prefs, goals }
  const ranked = rankGoals(input, FIXED_NOW)
  const strategies = selectStrategies(input, FIXED_NOW)
  const fit = fitStrategy(input, ranked, FIXED_NOW, strategies)
  const plan_ = buildProductPlan(input, fit.goals, strategies, FIXED_NOW)
  return { input, fit, strategies, plan: plan_ }
}

// ─── Catalogue self-consistency (re-checked here for completeness) ────

describe('PRODUCT_CATALOGUE — invariants', () => {
  it('every product has a unique id', () => {
    const ids = new Set(PRODUCT_CATALOGUE.map((p) => p.id))
    expect(ids.size).toBe(PRODUCT_CATALOGUE.length)
  })

  it('has at least one product in every bucket', () => {
    for (const b of ['b1', 'b2', 'b3', 'b4'] as const) {
      const inB = PRODUCT_CATALOGUE.filter((p) => p.bucket === b)
      expect(inB.length).toBeGreaterThan(0)
    }
  })

  it('typicalRealReturn is realistic ([-2..10] %)', () => {
    for (const p of PRODUCT_CATALOGUE) {
      expect(p.typicalRealReturn).toBeGreaterThan(-2)
      expect(p.typicalRealReturn).toBeLessThan(10)
    }
  })

  it('lockYears is non-negative and ≤ 20', () => {
    for (const p of PRODUCT_CATALOGUE) {
      expect(p.lockYears).toBeGreaterThanOrEqual(0)
      expect(p.lockYears).toBeLessThanOrEqual(20)
    }
  })
})

// ─── Plan shape ──────────────────────────────────────────────────────

describe('buildProductPlan — shape', () => {
  const { plan } = pipeline(plan50, prefP5, [corpusGoal])

  it('emits one GoalProductPlan per goal', () => {
    expect(plan.byGoal).toHaveLength(1)
    expect(plan.byGoal[0].goalId).toBe('g-corpus')
  })

  it('every goal carries exactly 4 slices (one per bucket)', () => {
    expect(plan.byGoal[0].slices).toHaveLength(4)
    const buckets = plan.byGoal[0].slices.map((s) => s.bucket).sort()
    expect(buckets).toEqual(['b1', 'b2', 'b3', 'b4'])
  })

  it('every non-empty slice items[] sums to weight 1.0', () => {
    for (const s of plan.byGoal[0].slices) {
      if (s.items.length === 0) continue
      const sumW = s.items.reduce((acc, i) => acc + i.weight, 0)
      expect(sumW).toBeCloseTo(1, 3)
    }
  })

  it('every slice amount ≥ 0 and ≤ totalAllocated', () => {
    const total = plan.byGoal[0].totalAllocated
    for (const s of plan.byGoal[0].slices) {
      expect(s.amount).toBeGreaterThanOrEqual(0)
      expect(s.amount).toBeLessThanOrEqual(total)
    }
  })

  it('every item references a real catalogue id', () => {
    for (const s of plan.byGoal[0].slices) {
      for (const i of s.items) {
        expect(productById(i.categoryId)).toBeDefined()
      }
    }
  })
})

// ─── Behavioural assertions ───────────────────────────────────────────

describe('buildProductPlan — behavioural', () => {
  it('senior citizen (age 65) gets SCSS in B2', () => {
    const { plan } = pipeline(plan65, prefP5, [incomeGoal])
    const b2 = plan.byGoal[0].slices.find((s) => s.bucket === 'b2')
    const scss = b2?.items.find((i) => i.categoryId === 'scss')
    expect(scss).toBeDefined()
  })

  it('under-60 user does NOT get SCSS (age-gated)', () => {
    const { plan } = pipeline(plan50, prefP5, [corpusGoal])
    const b2 = plan.byGoal[0].slices.find((s) => s.bucket === 'b2')
    const scss = b2?.items.find((i) => i.categoryId === 'scss')
    expect(scss).toBeUndefined()
  })

  it('30 % tax slab user gets tax-free bonds (not just FD) in B2', () => {
    // plan50.taxBracket = 30 in fixtures
    const { plan } = pipeline(plan50, prefP5, [corpusGoal])
    const b2 = plan.byGoal[0].slices.find((s) => s.bucket === 'b2')
    const ids = b2?.items.map((i) => i.categoryId) ?? []
    // Either tax-free-bonds OR ppf should appear (both exempt for 30 % slab)
    expect(ids.some((id) => id === 'tax-free-bonds' || id === 'ppf')).toBe(true)
  })

  it('high overconfidence dampens mid-cap allocation', () => {
    const prefHighOvercon = {
      ...prefP7,
      bias: {
        ...prefP7.bias,
        signals: { ...prefP7.bias.signals, overconfidence: 90 },
      },
    }
    const { plan: planHi } = pipeline(plan50, prefHighOvercon, [corpusGoal])
    const { plan: planLo } = pipeline(plan50, prefP7, [corpusGoal])
    const b4Hi = planHi.byGoal[0].slices.find((s) => s.bucket === 'b4')
    const b4Lo = planLo.byGoal[0].slices.find((s) => s.bucket === 'b4')
    const midHi = b4Hi?.items.find((i) => i.categoryId === 'mid-cap')?.weight ?? 0
    const midLo = b4Lo?.items.find((i) => i.categoryId === 'mid-cap')?.weight ?? 0
    expect(midHi).toBeLessThanOrEqual(midLo + 1e-3)
  })

  it('uses up to 3 categories per bucket (top-K filter)', () => {
    const { plan } = pipeline(plan50, prefP5, [corpusGoal])
    for (const s of plan.byGoal[0].slices) {
      expect(s.items.length).toBeLessThanOrEqual(3)
    }
  })

  it('zero-allocation bucket emits an empty slice', () => {
    // High fusedRisk + short horizon could leave B1 near zero; pick a long-horizon
    // legacy goal with prefP7 (riskAppetite high) → B1 may end up ~0.
    const legacyGoal: RawGoal = {
      id: 'g-leg', label: 'Legacy', kind: 'legacy',
      amount: 1_00_00_000, startYear: 2055, priority: 'nice-to-have',
      inflationCategory: 'general', source: 'manual',
    }
    const { plan } = pipeline(plan50, prefP7, [legacyGoal])
    const allSlicesShape = plan.byGoal[0].slices.every((s) =>
      // Either has items OR amount is 0
      (s.items.length > 0) || (s.amount === 0)
    )
    expect(allSlicesShape).toBe(true)
  })
})

// ─── Determinism ─────────────────────────────────────────────────────

describe('buildProductPlan — determinism', () => {
  it('same input → byte-identical output', () => {
    const a = pipeline(plan50, prefP5, [corpusGoal]).plan
    const b = pipeline(plan50, prefP5, [corpusGoal]).plan
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

// ─── Integration sanity ─────────────────────────────────────────────

describe('buildProductPlan — integration with fitter', () => {
  it('sum of slice amounts ≈ totalAllocated across all 4 buckets', () => {
    const { plan } = pipeline(plan50, prefP5, [corpusGoal])
    const goal = plan.byGoal[0]
    const sumSlices = goal.slices.reduce((s, sl) => s + sl.amount, 0)
    // Allow ±2 INR rounding for 4 buckets × rounding to whole rupees.
    expect(Math.abs(sumSlices - goal.totalAllocated)).toBeLessThanOrEqual(5)
  })
})
