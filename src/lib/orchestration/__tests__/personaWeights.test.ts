import { describe, expect, it } from 'vitest'
import { PERSONA_WEIGHTS, resolveWeights } from '../personaWeights'

describe('PERSONA_WEIGHTS table', () => {
  it('contains all 9 personas + default', () => {
    const keys = Object.keys(PERSONA_WEIGHTS).sort()
    expect(keys).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'default'].sort())
  })

  it('every weight vector sums to 1.0 (±0.001 for float tolerance)', () => {
    for (const [key, w] of Object.entries(PERSONA_WEIGHTS)) {
      const sum = w.importance + w.urgency + w.affordability + w.riskFit
      expect(Math.abs(sum - 1), `Persona ${key} sum = ${sum}`).toBeLessThan(0.001)
    }
  })

  it('no individual weight is negative or > 1', () => {
    for (const [key, w] of Object.entries(PERSONA_WEIGHTS)) {
      for (const [criterion, value] of Object.entries(w)) {
        expect(value, `${key}.${criterion}`).toBeGreaterThanOrEqual(0)
        expect(value, `${key}.${criterion}`).toBeLessThanOrEqual(1)
      }
    }
  })

  // ─── §5 sign-off lock (memo Q1 resolved 2026-05-30) ────────────────
  //
  // Pins every persona row byte-for-byte. Any change to a weight must
  // refresh this snapshot DELIBERATELY — surface it in the memo + a
  // golden refresh on rankGoals snapshots will follow automatically.

  it('§5 sign-off — every row matches the locked table', () => {
    expect(PERSONA_WEIGHTS).toMatchSnapshot('persona-weights-locked-v1')
  })
})

describe('resolveWeights', () => {
  it('null persona → default weights, persona-default derivation', () => {
    const { weights, derivation } = resolveWeights(null, undefined)
    expect(weights).toEqual(PERSONA_WEIGHTS.default)
    expect(derivation).toBe('persona-default')
  })

  it('known persona → matching table row', () => {
    const { weights, derivation } = resolveWeights('P7', undefined)
    expect(weights).toEqual(PERSONA_WEIGHTS.P7)
    expect(derivation).toBe('persona-default')
  })

  it('empty overrides {} still counts as persona-default', () => {
    const { derivation } = resolveWeights('P3', {})
    expect(derivation).toBe('persona-default')
  })

  it('partial override → mixed derivation, missing keys from base', () => {
    const { weights, derivation } = resolveWeights('P5', { importance: 0.50 })
    // Mixed means some keys came from override, others from persona
    expect(derivation).toBe('mixed')
    // Re-normalised — sum must still be 1.0
    const sum = weights.importance + weights.urgency + weights.affordability + weights.riskFit
    expect(Math.abs(sum - 1)).toBeLessThan(0.001)
    // Importance share should have grown relative to P5 default (0.25)
    expect(weights.importance).toBeGreaterThan(PERSONA_WEIGHTS.P5.importance)
  })

  it('full override → user-override derivation', () => {
    const { derivation, weights } = resolveWeights('P1', {
      importance: 0.4, urgency: 0.2, affordability: 0.2, riskFit: 0.2,
    })
    expect(derivation).toBe('user-override')
    const sum = weights.importance + weights.urgency + weights.affordability + weights.riskFit
    expect(Math.abs(sum - 1)).toBeLessThan(0.001)
  })

  it('overrides not summing to 1 are re-normalised', () => {
    const { weights } = resolveWeights('P5', {
      importance: 2, urgency: 2, affordability: 2, riskFit: 2,
    })
    expect(weights.importance).toBeCloseTo(0.25, 4)
    expect(weights.urgency).toBeCloseTo(0.25, 4)
  })

  it('overrides summing to 0 → fall back to persona-default', () => {
    const { weights, derivation } = resolveWeights('P3', {
      importance: 0, urgency: 0, affordability: 0, riskFit: 0,
    })
    expect(weights).toEqual(PERSONA_WEIGHTS.P3)
    expect(derivation).toBe('persona-default')
  })
})
