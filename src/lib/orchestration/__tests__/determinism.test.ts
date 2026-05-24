// Determinism contract from memo §2.4: rankGoals + fitStrategy are
// pure functions. Same inputs (incl. `now`) → identical output bytes.

import { describe, expect, it } from 'vitest'
import { rankGoals } from '../rankGoals'
import { fitStrategy } from '../fitStrategy'
import { buildInput, plan50, plan65, planUnderProtected, prefP1, prefP5, prefP7, FIXED_NOW } from './__fixtures__'

describe('engine determinism — 100× identical output', () => {
  it.each([
    ['plan50 × P1', plan50, prefP1],
    ['plan50 × P5', plan50, prefP5],
    ['plan50 × P7', plan50, prefP7],
    ['plan65 × P5', plan65, prefP5],
    ['planUnderProtected × P1', planUnderProtected, prefP1],
  ])('%s — 100 runs all hash identically', (_label, plan, pref) => {
    const input = buildInput(plan, pref)
    const first = rankGoals(input, FIXED_NOW)
    const firstJson = JSON.stringify(first)
    const firstHash = first.inputsHash

    for (let i = 0; i < 100; i++) {
      const r = rankGoals(input, FIXED_NOW)
      expect(r.inputsHash, `run ${i + 1} hash mismatch`).toBe(firstHash)
      expect(JSON.stringify(r), `run ${i + 1} JSON mismatch`).toBe(firstJson)
    }
  })
})

describe('fitter determinism — 100× identical output', () => {
  it('100 runs all hash identically', () => {
    const input = buildInput()
    const ranked = rankGoals(input, FIXED_NOW)
    const first = fitStrategy(input, ranked, FIXED_NOW)
    const firstJson = JSON.stringify(first)

    for (let i = 0; i < 100; i++) {
      const f = fitStrategy(input, ranked, FIXED_NOW)
      expect(JSON.stringify(f), `run ${i + 1} mismatch`).toBe(firstJson)
    }
  })

  it('fit hash stable for identical engine output', () => {
    const input = buildInput()
    const ranked = rankGoals(input, FIXED_NOW)
    const a = fitStrategy(input, ranked, FIXED_NOW)
    const b = fitStrategy(input, ranked, FIXED_NOW)
    expect(a.inputsHash).toBe(b.inputsHash)
  })
})
