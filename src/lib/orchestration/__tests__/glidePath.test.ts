// glidePath.test.ts — Phase 6 convex-glide contract.

import { describe, it, expect } from 'vitest'
import { buildGlidePath } from '../glidePath'
import { strategyById } from '../strategyCatalogue'
import { plan50, prefP5 } from './__fixtures__'
import type { EngineInput, RawGoal } from '../../../types/orchestration'

const corpusGoal: RawGoal = {
  id: 'g', label: 'Build corpus', kind: 'corpus-build',
  amount: 1_00_00_000, startYear: 2046, priority: 'must-have',
  inflationCategory: 'general', source: 'manual',
}

const input: EngineInput = { plan: plan50, preferences: prefP5, goals: [corpusGoal] }
// plan50.currentYear = 2026; goal target = 2046 → T = 20 y.

// Strategy with glideDown true — pick 'glide' from the catalogue.
const glideStrategy = strategyById('glide')!
// Strategy with glideDown false — pick 'strategic'.
const staticStrategy = strategyById('strategic')!

const initialBuckets = { b1: 0.05, b2: 0.20, b3: 0.30, b4: 0.45 }   // matches glide strategy

// ─── Static strategy ──────────────────────────────────────────────────

describe('buildGlidePath — static strategies', () => {
  it('returns empty array when strategy.glideDown is false', () => {
    const path = buildGlidePath({
      goal: corpusGoal, input, strategy: staticStrategy, initialBuckets,
    })
    expect(path).toEqual([])
  })

  it('returns empty array when no strategy passed', () => {
    const path = buildGlidePath({
      goal: corpusGoal, input, strategy: undefined, initialBuckets,
    })
    expect(path).toEqual([])
  })
})

// ─── Glide-down strategy — shape ──────────────────────────────────────

describe('buildGlidePath — glide-down shape', () => {
  const path = buildGlidePath({
    goal: corpusGoal, input, strategy: glideStrategy, initialBuckets,
  })

  it('produces a non-empty series', () => {
    expect(path.length).toBeGreaterThan(0)
  })

  it('first point is today (currentYear, yearsToTarget=T)', () => {
    expect(path[0].year).toBe(plan50.currentYear)
    expect(path[0].yearsToTarget).toBeCloseTo(20, 1)
  })

  it('last point is the target year (yearsToTarget=0)', () => {
    const last = path[path.length - 1]
    expect(last.year).toBe(corpusGoal.startYear)
    expect(last.yearsToTarget).toBeCloseTo(0, 1)
  })

  it('buckets sum to ≈ 1.0 at every sample', () => {
    for (const p of path) {
      const { b1, b2, b3, b4 } = p.buckets
      expect(b1 + b2 + b3 + b4).toBeCloseTo(1, 3)
    }
  })

  it('equity share monotonically decreases (or stays equal) from today → target', () => {
    for (let i = 1; i < path.length; i++) {
      expect(path[i].equityShare).toBeLessThanOrEqual(path[i - 1].equityShare + 1e-6)
    }
  })

  it('first equity share equals b3 + b4 of initial buckets', () => {
    expect(path[0].equityShare).toBeCloseTo(initialBuckets.b3 + initialBuckets.b4, 3)
  })

  it('last equity share equals the corpus-build floor 0.35', () => {
    expect(path[path.length - 1].equityShare).toBeCloseTo(0.35, 2)
  })
})

// ─── PDF examples — 20 y → 70 % · 10 y → 50 % · 5 y → 30 % ────────────
//
// The PDF's numbers describe a corpus-build / event glide from ~70 %
// equity at 20 y down to ~10 % at the target. Our default uses
// `E_floor = 0.35` for corpus-build; we calibrate the test against
// `E_init = 0.70` and the same convex exponent 0.7 explicitly to lock
// the curve shape.

describe('buildGlidePath — PDF curve shape (E_init=0.70, T=20)', () => {
  const longGoal: RawGoal = {
    ...corpusGoal,
    startYear: plan50.currentYear + 20,    // exactly 20-y horizon
  }
  // Construct an initialBuckets vector with equity=0.70 (b3=0.30, b4=0.40).
  const init = { b1: 0.05, b2: 0.25, b3: 0.30, b4: 0.40 }
  const longInput: EngineInput = { ...input, goals: [longGoal] }
  const path = buildGlidePath({
    goal: longGoal, input: longInput, strategy: glideStrategy, initialBuckets: init,
  })

  function equityAt(y: number): number {
    return path.find((p) => p.year === y)?.equityShare ?? -1
  }

  it('today equity ≈ 0.70', () => {
    expect(equityAt(plan50.currentYear)).toBeCloseTo(0.70, 2)
  })

  it('at 10y remaining, equity ≈ 0.57 (convex with E_floor 0.35 → matches power-curve)', () => {
    // E(10) = 0.35 + (0.70 - 0.35) × (10/20)^0.7 = 0.35 + 0.35 × 0.616 = 0.566
    const e10 = equityAt(plan50.currentYear + 10)
    expect(e10).toBeGreaterThan(0.50)
    expect(e10).toBeLessThan(0.62)
  })

  it('at 6y remaining, equity ≈ 0.50 (sample step is 2y for T=20)', () => {
    // E(6) = 0.35 + 0.35 × (6/20)^0.7 = 0.35 + 0.35 × 0.430 = 0.500
    const e6 = equityAt(plan50.currentYear + 14)   // 6 y remaining (sampled)
    expect(e6).toBeGreaterThan(0.42)
    expect(e6).toBeLessThan(0.55)
  })
})

// ─── Goal-kind floors ────────────────────────────────────────────────

describe('buildGlidePath — kind-dependent floor', () => {
  it.each([
    ['income',        0.15],
    ['event',         0.25],
    ['corpus-build',  0.35],
    ['legacy',        0.40],
  ] as const)('%s goal ends at equity = %f', (kind, expected) => {
    const goal: RawGoal = { ...corpusGoal, kind, startYear: plan50.currentYear + 15 }
    const path = buildGlidePath({
      goal, input, strategy: glideStrategy, initialBuckets,
    })
    expect(path[path.length - 1].equityShare).toBeCloseTo(expected, 2)
  })
})

// ─── Defensive starting point ─────────────────────────────────────────

describe('buildGlidePath — already-defensive input', () => {
  it('returns a single-point series when initial equity is at or below floor', () => {
    const defensiveInit = { b1: 0.30, b2: 0.40, b3: 0.15, b4: 0.15 }   // equity = 0.30
    const path = buildGlidePath({
      goal: corpusGoal, input, strategy: glideStrategy, initialBuckets: defensiveInit,
    })
    expect(path).toHaveLength(1)
    expect(path[0].year).toBe(plan50.currentYear)
  })
})

// ─── Determinism ──────────────────────────────────────────────────────

describe('buildGlidePath — determinism', () => {
  it('same input → byte-identical output', () => {
    const a = buildGlidePath({ goal: corpusGoal, input, strategy: glideStrategy, initialBuckets })
    const b = buildGlidePath({ goal: corpusGoal, input, strategy: glideStrategy, initialBuckets })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
