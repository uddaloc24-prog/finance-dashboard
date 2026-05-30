// riskFusion.test.ts — Bayesian risk-profile fusion contract.
//
// Each test pins one mathematical property of the precision-weighted
// posterior. Together they form the executable spec for the fusion.

import { describe, it, expect } from 'vitest'
import { fuseRisk } from '../riskFusion'

describe('fuseRisk — Plan-only fallback', () => {
  it.each([
    [1 as const, 0],
    [2 as const, 25],
    [3 as const, 50],
    [4 as const, 75],
    [5 as const, 100],
  ])('maps planRiskAppetite=%i → score=%i with derivation=plan-only', (r, expected) => {
    const out = fuseRisk({ planRiskAppetite: r })
    expect(out.score).toBe(expected)
    expect(out.derivation).toBe('plan-only')
    expect(out.sources).toHaveLength(1)
    expect(out.sources[0].name).toBe('plan')
    expect(out.sources[0].weight).toBe(1)
  })

  it('confidence is low (< 0.3) with only Plan signal', () => {
    const out = fuseRisk({ planRiskAppetite: 3 })
    expect(out.confidence).toBeGreaterThan(0)
    expect(out.confidence).toBeLessThan(0.3)
  })
})

describe('fuseRisk — Plan + v10 fusion', () => {
  it('v10 dominates plan because τ_v10 (4) > τ_plan (1)', () => {
    // Plan=3 → 50; v10=80. Fused = (1×50 + 4×80) / 5 = 74
    const out = fuseRisk({ planRiskAppetite: 3, v10RiskProfile: 80 })
    expect(out.derivation).toBe('fused-2')
    expect(out.score).toBeCloseTo(74, 0)
    const v10src = out.sources.find((s) => s.name === 'v10')!
    expect(v10src.weight).toBe(0.8)        // 4 / (1+4)
  })

  it('fused score lies on the segment between plan and v10', () => {
    const out = fuseRisk({ planRiskAppetite: 1, v10RiskProfile: 100 })
    expect(out.score).toBeGreaterThan(0)
    expect(out.score).toBeLessThan(100)
  })
})

describe('fuseRisk — Plan + v10 + Deep + Quick', () => {
  it('weights sum to 1.0 across all four sources', () => {
    const out = fuseRisk({
      planRiskAppetite: 3,
      v10RiskProfile:   60,
      deepRiskPercent:  70,
      quickQuizScore:   30,   // 30 raw → ((30-10)/40)*100 = 50
    })
    expect(out.derivation).toBe('fused-4')
    const sumW = out.sources.reduce((s, x) => s + x.weight, 0)
    expect(sumW).toBeCloseTo(1, 3)
  })

  it('quick-quiz totalScore is normalised (10 → 0, 50 → 100)', () => {
    const out = fuseRisk({ planRiskAppetite: 3, quickQuizScore: 10 })
    const quick = out.sources.find((s) => s.name === 'quick')!
    expect(quick.value).toBe(0)
  })

  it('fused score = precision-weighted mean of all sources', () => {
    // Plan=3 → 50 (τ=1); v10=80 (τ=4); deep=60 (τ=3); quick=50 (τ=2, from 30)
    // Σ τ = 10; Σ τ·µ = 50 + 320 + 180 + 100 = 650; mean = 65
    const out = fuseRisk({
      planRiskAppetite: 3,
      v10RiskProfile:   80,
      deepRiskPercent:  60,
      quickQuizScore:   30,
    })
    expect(out.score).toBeCloseTo(65, 1)
  })

  it('confidence rises monotonically with each added source', () => {
    const a = fuseRisk({ planRiskAppetite: 3 })
    const b = fuseRisk({ planRiskAppetite: 3, v10RiskProfile: 50 })
    const c = fuseRisk({ planRiskAppetite: 3, v10RiskProfile: 50, deepRiskPercent: 50 })
    const d = fuseRisk({ planRiskAppetite: 3, v10RiskProfile: 50, deepRiskPercent: 50, quickQuizScore: 30 })
    expect(a.confidence).toBeLessThan(b.confidence)
    expect(b.confidence).toBeLessThan(c.confidence)
    expect(c.confidence).toBeLessThan(d.confidence)
    expect(d.confidence).toBeLessThan(1)
  })
})

describe('fuseRisk — edge cases', () => {
  it('ignores null / undefined optional signals', () => {
    const out = fuseRisk({
      planRiskAppetite: 3,
      v10RiskProfile:   null,
      deepRiskPercent:  undefined,
      quickQuizScore:   null,
    })
    expect(out.derivation).toBe('plan-only')
  })

  it('clamps out-of-range v10 (negative)', () => {
    const out = fuseRisk({ planRiskAppetite: 3, v10RiskProfile: -50 })
    const v10src = out.sources.find((s) => s.name === 'v10')!
    expect(v10src.value).toBe(0)
  })

  it('clamps out-of-range deep (over 100)', () => {
    const out = fuseRisk({ planRiskAppetite: 3, deepRiskPercent: 250 })
    const deepSrc = out.sources.find((s) => s.name === 'deep')!
    expect(deepSrc.value).toBe(100)
  })

  it('ignores NaN signals', () => {
    const out = fuseRisk({ planRiskAppetite: 3, v10RiskProfile: NaN })
    expect(out.derivation).toBe('plan-only')
  })

  it('is deterministic — same inputs → byte-identical outputs', () => {
    const args = { planRiskAppetite: 4 as const, v10RiskProfile: 65, deepRiskPercent: 70 }
    const a = fuseRisk(args)
    const b = fuseRisk(args)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
