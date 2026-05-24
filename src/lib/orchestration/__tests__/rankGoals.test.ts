import { describe, expect, it } from 'vitest'
import { rankGoals } from '../rankGoals'
import { buildInput, plan50, plan65, planUnderProtected, prefP1, prefP5, prefP7, prefDefault, goals5, FIXED_NOW } from './__fixtures__'

describe('rankGoals — integration', () => {
  it('emits ranked goals in composite-desc order', () => {
    const out = rankGoals(buildInput(), FIXED_NOW)
    for (let i = 1; i < out.ranked.length; i++) {
      expect(out.ranked[i - 1].composite).toBeGreaterThanOrEqual(out.ranked[i].composite)
    }
  })

  it('priority weights sum to 1.0', () => {
    const out = rankGoals(buildInput(), FIXED_NOW)
    const sum = out.ranked.reduce((s, r) => s + r.priorityWeight, 0)
    expect(Math.abs(sum - 1)).toBeLessThan(0.0001)
  })

  it('null persona → derivation persona-default', () => {
    const out = rankGoals(buildInput(plan50, prefDefault), FIXED_NOW)
    expect(out.trace.personaUsed).toBe('default')
    expect(out.trace.weightDerivation).toBe('persona-default')
  })

  it('weightsUsed matches the persona table entry', () => {
    const out = rankGoals(buildInput(plan50, prefP7), FIXED_NOW)
    expect(out.trace.personaUsed).toBe('P7')
    // P7 weights: imp 0.35, urg 0.10, aff 0.25, rsk 0.30
    expect(out.weightsUsed.importance).toBeCloseTo(0.35, 4)
    expect(out.weightsUsed.urgency).toBeCloseTo(0.10, 4)
  })

  it('emittedAt matches the passed-in `now`', () => {
    const out = rankGoals(buildInput(), FIXED_NOW)
    expect(out.emittedAt).toBe(FIXED_NOW.toISOString())
  })

  it('inputsHash is stable for identical input', () => {
    const a = rankGoals(buildInput(), FIXED_NOW)
    const b = rankGoals(buildInput(), FIXED_NOW)
    expect(a.inputsHash).toBe(b.inputsHash)
  })

  it('inputsHash changes when any plan field changes', () => {
    const base = rankGoals(buildInput(plan50), FIXED_NOW)
    const bumped = rankGoals(buildInput({ ...plan50, corpus: plan50.corpus + 1 }), FIXED_NOW)
    expect(base.inputsHash).not.toBe(bumped.inputsHash)
  })

  it('system goals from pre-emption are merged into the ranked list', () => {
    const out = rankGoals(buildInput(planUnderProtected, prefP1), FIXED_NOW)
    const systemCount = out.ranked.filter((r) => r.goal.source === 'system').length
    // Pre-emption fires all 3 rules for the under-protected fixture
    expect(systemCount).toBe(3)
    // Each system goal must be marked must-have
    out.ranked.filter((r) => r.goal.source === 'system').forEach((r) => {
      expect(r.goal.priority).toBe('must-have')
    })
  })

  it('no goals → empty ranked array', () => {
    const out = rankGoals(buildInput(plan50, prefP5, []), FIXED_NOW)
    expect(out.ranked).toHaveLength(0)
  })

  it('every ranked goal has trace bullets', () => {
    const out = rankGoals(buildInput(), FIXED_NOW)
    for (const r of out.ranked) {
      expect(out.trace.goalRationale[r.goal.id].length).toBeGreaterThan(0)
    }
  })

  it('scores are clamped 0..100 per criterion', () => {
    const out = rankGoals(buildInput(), FIXED_NOW)
    for (const r of out.ranked) {
      for (const v of Object.values(r.scores)) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    }
  })
})

// ─── Golden-master snapshots ──────────────────────────────────────────
// Three personas × three plan profiles × fixed 5-goal pile. The full
// JSON output (with emittedAt and inputsHash) is snapshotted so any
// engine-logic change requires a deliberate snapshot refresh.

describe('rankGoals — golden masters', () => {
  it('plan50 × P1 — security seeker', () => {
    const out = rankGoals(buildInput(plan50, prefP1, goals5), FIXED_NOW)
    expect(JSON.stringify(out, null, 2)).toMatchSnapshot()
  })

  it('plan50 × P5 — balanced planner', () => {
    const out = rankGoals(buildInput(plan50, prefP5, goals5), FIXED_NOW)
    expect(JSON.stringify(out, null, 2)).toMatchSnapshot()
  })

  it('plan50 × P7 — builder', () => {
    const out = rankGoals(buildInput(plan50, prefP7, goals5), FIXED_NOW)
    expect(JSON.stringify(out, null, 2)).toMatchSnapshot()
  })

  it('plan65 × P5 — recently retired', () => {
    const out = rankGoals(buildInput(plan65, prefP5, goals5), FIXED_NOW)
    expect(JSON.stringify(out, null, 2)).toMatchSnapshot()
  })

  it('planUnderProtected × P1 — pre-emption fires', () => {
    const out = rankGoals(buildInput(planUnderProtected, prefP1, goals5), FIXED_NOW)
    expect(JSON.stringify(out, null, 2)).toMatchSnapshot()
  })
})
