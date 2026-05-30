// strategyCatalogue.test.ts — declarative-correctness tests over the
// PDF's 12 MVP strategies (§IV). Catches any drift in the catalogue
// shape, classification coverage, or value ranges.

import { describe, it, expect } from 'vitest'
import {
  STRATEGY_CATALOGUE, strategyById, strategiesByClassification,
  type StrategyClassification,
} from '../strategyCatalogue'

describe('STRATEGY_CATALOGUE — shape', () => {
  it('contains exactly the 12 MVP strategies from PDF §IV', () => {
    expect(STRATEGY_CATALOGUE).toHaveLength(12)
  })

  it('every strategy has a unique id', () => {
    const ids = new Set(STRATEGY_CATALOGUE.map((s) => s.id))
    expect(ids.size).toBe(STRATEGY_CATALOGUE.length)
  })

  it('every strategy carries a PDF reference', () => {
    for (const s of STRATEGY_CATALOGUE) {
      expect(s.ref).toMatch(/^[IV]+\.[A-Z]\.\d+$/)
    }
  })

  it('every strategy carries at least one classification and one goalKind', () => {
    for (const s of STRATEGY_CATALOGUE) {
      expect(s.classifications.length).toBeGreaterThan(0)
      expect(s.goalKinds.length).toBeGreaterThan(0)
    }
  })
})

describe('STRATEGY_CATALOGUE — value ranges', () => {
  it('every riskBand is within [0, 100] and min ≤ max', () => {
    for (const s of STRATEGY_CATALOGUE) {
      expect(s.riskBand.min).toBeGreaterThanOrEqual(0)
      expect(s.riskBand.max).toBeLessThanOrEqual(100)
      expect(s.riskBand.min).toBeLessThanOrEqual(s.riskBand.max)
    }
  })

  it('every biasCompat dimension is within [0, 100]', () => {
    for (const s of STRATEGY_CATALOGUE) {
      for (const k of ['lossAversion', 'presentBias', 'statusSeeking', 'herding', 'overconfidence'] as const) {
        expect(s.biasCompat[k]).toBeGreaterThanOrEqual(0)
        expect(s.biasCompat[k]).toBeLessThanOrEqual(100)
      }
    }
  })

  it('every allocation buckets vector sums to ≈ 1.0', () => {
    for (const s of STRATEGY_CATALOGUE) {
      const { b1, b2, b3, b4 } = s.allocation.buckets
      expect(b1 + b2 + b3 + b4).toBeCloseTo(1.0, 4)
    }
  })

  it('every equityShare is within [0, 1]', () => {
    for (const s of STRATEGY_CATALOGUE) {
      expect(s.allocation.equityShare).toBeGreaterThanOrEqual(0)
      expect(s.allocation.equityShare).toBeLessThanOrEqual(1)
    }
  })
})

describe('STRATEGY_CATALOGUE — classification coverage', () => {
  it.each([
    'capital-preservation',
    'income-generation',
    'capital-appreciation',
    'liability-matching',
    'behavioural-stability',
    'tax-optimization',
    'dynamic-risk-mgmt',
  ] satisfies StrategyClassification[])('has at least one strategy for %s', (c) => {
    expect(strategiesByClassification(c).length).toBeGreaterThan(0)
  })
})

describe('strategyById', () => {
  it('returns the correct strategy', () => {
    const s = strategyById('bucket')
    expect(s?.name).toBe('Bucket Investing')
  })

  it('returns undefined for unknown id', () => {
    expect(strategyById('nonsense')).toBeUndefined()
  })
})
