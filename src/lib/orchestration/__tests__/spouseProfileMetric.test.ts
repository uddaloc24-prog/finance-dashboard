// spouseProfileMetric.test.ts — memo §2.3 deterministic-metric contract.

import { describe, it, expect } from 'vitest'
import { computeSpouseProfileMetric } from '../spouseProfileMetric'
import type { UserIdentity } from '../../../types/identity'
import type { Demographics } from '../../../types'

const FIXED_NOW = new Date('2026-05-30T00:00:00Z')

function identity(opts: Partial<UserIdentity> = {}): UserIdentity {
  return {
    fullName: '', email: '', phone: '', dateOfBirth: '', panCard: '',
    maritalStatus: undefined, spouseName: '', occupation: '',
    address: { line1: '', city: '', state: '', pincode: '' },
    createdAt: '', updatedAt: '',
    ...opts,
  }
}

function demo(opts: Partial<Demographics> = {}): Demographics {
  return {
    currentAge: 55, retirementAge: 60, lifeExpectancy: 88, city: 'tier1',
    ...opts,
  }
}

// ─── No data ──────────────────────────────────────────────────────────

describe('computeSpouseProfileMetric — no data', () => {
  it('null identity + null demographics → not partnered, 0 completeness', () => {
    const m = computeSpouseProfileMetric(null, null, FIXED_NOW)
    expect(m.maritalStatus).toBeUndefined()
    expect(m.isPartnered).toBe(false)
    expect(m.hasCompleteSpouseProfile).toBe(false)
    expect(m.completeness).toBe(0)
  })

  it('identity with no maritalStatus → not partnered', () => {
    const m = computeSpouseProfileMetric(identity({}), demo({}), FIXED_NOW)
    expect(m.isPartnered).toBe(false)
  })
})

// ─── Non-partnered states ─────────────────────────────────────────────

describe('computeSpouseProfileMetric — non-partnered', () => {
  it.each(['single', 'divorced', 'widowed'] as const)(
    '%s → isPartnered=false, hasCompleteSpouseProfile=false',
    (status) => {
      const m = computeSpouseProfileMetric(
        identity({ maritalStatus: status }),
        demo({ spouseAge: 50, spouseLifeExpectancy: 85 }),
        FIXED_NOW,
      )
      expect(m.isPartnered).toBe(false)
      expect(m.hasCompleteSpouseProfile).toBe(false)
    },
  )

  it('stray spouse data on a single user still counts toward completeness', () => {
    // Edge case: completeness reflects raw field count regardless of status.
    // Only hasCompleteSpouseProfile is gated by isPartnered.
    const m = computeSpouseProfileMetric(
      identity({ maritalStatus: 'single', spouseName: 'Anika' }),
      demo({ spouseAge: 50, spouseLifeExpectancy: 85 }),
      FIXED_NOW,
    )
    expect(m.completeness).toBe(1)
    expect(m.hasCompleteSpouseProfile).toBe(false)   // because not married
  })
})

// ─── Partnered progression ───────────────────────────────────────────

describe('computeSpouseProfileMetric — married, varying completeness', () => {
  it('married + no spouse data → 0 % complete', () => {
    const m = computeSpouseProfileMetric(
      identity({ maritalStatus: 'married' }),
      demo({}),
      FIXED_NOW,
    )
    expect(m.isPartnered).toBe(true)
    expect(m.completeness).toBe(0)
    expect(m.hasCompleteSpouseProfile).toBe(false)
  })

  it('married + name only → ≈ 33 %', () => {
    const m = computeSpouseProfileMetric(
      identity({ maritalStatus: 'married', spouseName: 'Anika' }),
      demo({}),
      FIXED_NOW,
    )
    expect(m.completeness).toBeCloseTo(0.333, 3)
    expect(m.hasCompleteSpouseProfile).toBe(false)
  })

  it('married + name + age → ≈ 67 %', () => {
    const m = computeSpouseProfileMetric(
      identity({ maritalStatus: 'married', spouseName: 'Anika' }),
      demo({ spouseAge: 50 }),
      FIXED_NOW,
    )
    expect(m.completeness).toBeCloseTo(0.667, 3)
    expect(m.hasCompleteSpouseProfile).toBe(false)
  })

  it('married + name + age + life-expectancy → 100 %', () => {
    const m = computeSpouseProfileMetric(
      identity({ maritalStatus: 'married', spouseName: 'Anika' }),
      demo({ spouseAge: 50, spouseLifeExpectancy: 85 }),
      FIXED_NOW,
    )
    expect(m.completeness).toBe(1)
    expect(m.hasCompleteSpouseProfile).toBe(true)
  })

  it('treats whitespace-only spouseName as empty', () => {
    const m = computeSpouseProfileMetric(
      identity({ maritalStatus: 'married', spouseName: '   ' }),
      demo({ spouseAge: 50, spouseLifeExpectancy: 85 }),
      FIXED_NOW,
    )
    expect(m.completeness).toBeCloseTo(0.667, 3)
    expect(m.hasCompleteSpouseProfile).toBe(false)
  })

  it('treats spouseAge = 0 as not-set', () => {
    const m = computeSpouseProfileMetric(
      identity({ maritalStatus: 'married', spouseName: 'Anika' }),
      demo({ spouseAge: 0, spouseLifeExpectancy: 85 }),
      FIXED_NOW,
    )
    expect(m.completeness).toBeCloseTo(0.667, 3)
  })
})

// ─── Determinism ──────────────────────────────────────────────────────

describe('computeSpouseProfileMetric — determinism', () => {
  it('same input → byte-identical output', () => {
    const i = identity({ maritalStatus: 'married', spouseName: 'Anika' })
    const d = demo({ spouseAge: 50, spouseLifeExpectancy: 85 })
    const a = computeSpouseProfileMetric(i, d, FIXED_NOW)
    const b = computeSpouseProfileMetric(i, d, FIXED_NOW)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
