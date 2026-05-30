// Latency contract from memo §2.5: engine p95 < 50ms, engine+fitter p95
// < 75ms at 50 goals × 100 runs. Extended 2026-05-30: full Phase 1-8
// pipeline (selectStrategies + strategyAwareBuckets + glidePath +
// buildProductPlan + buildMonitoringFramework) must stay under the
// memo's overall 100 ms p95 envelope so React render still has budget.

import { describe, expect, it } from 'vitest'
import { rankGoals } from '../rankGoals'
import { fitStrategy } from '../fitStrategy'
import { selectStrategies } from '../strategySelector'
import { buildProductPlan } from '../productMap'
import { buildMonitoringFramework } from '../monitoringFramework'
import { plan50, prefP5 } from './__fixtures__'
import type { RawGoal } from '../../../types/orchestration'

function makeGoals(n: number): RawGoal[] {
  const out: RawGoal[] = []
  for (let i = 0; i < n; i++) {
    out.push({
      id:    `bench-goal-${i}`,
      label: `Bench goal ${i}`,
      kind:  i % 4 === 0 ? 'income' : i % 4 === 1 ? 'event' : i % 4 === 2 ? 'legacy' : 'corpus-build',
      amount: 1_00_000 + i * 10_000,
      startYear: 2026 + (i % 30),
      priority: i % 3 === 0 ? 'must-have' : 'nice-to-have',
      inflationCategory: i % 5 === 0 ? 'healthcare' : i % 5 === 1 ? 'education' : 'general',
      source: 'manual',
    })
  }
  return out
}

function p95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor(0.95 * sorted.length))
  return sorted[idx]
}

describe('engine latency budget', () => {
  it('50 goals × 100 runs — p95 under 50ms', () => {
    const goals = makeGoals(50)
    const input = { plan: plan50, preferences: prefP5, goals }
    const now = new Date('2026-05-24T10:00:00.000Z')
    const samples: number[] = []
    // Warm-up run not counted
    rankGoals(input, now)
    for (let i = 0; i < 100; i++) {
      const t0 = performance.now()
      rankGoals(input, now)
      samples.push(performance.now() - t0)
    }
    const p = p95(samples)
    expect(p, `p95 was ${p.toFixed(2)} ms`).toBeLessThan(50)
  })

  it('50 goals × 100 runs — engine + fitter chained p95 under 75ms', () => {
    const goals = makeGoals(50)
    const input = { plan: plan50, preferences: prefP5, goals }
    const now = new Date('2026-05-24T10:00:00.000Z')
    const samples: number[] = []
    rankGoals(input, now)  // warm-up
    for (let i = 0; i < 100; i++) {
      const t0 = performance.now()
      const ranked = rankGoals(input, now)
      fitStrategy(input, ranked, now)
      samples.push(performance.now() - t0)
    }
    const p = p95(samples)
    expect(p, `engine+fitter p95 was ${p.toFixed(2)} ms`).toBeLessThan(75)
  })

  it('50 goals × 100 runs — full Phase 1-8 pipeline p95 under 100ms', () => {
    const goals = makeGoals(50)
    const input = { plan: plan50, preferences: prefP5, goals }
    const now = new Date('2026-05-24T10:00:00.000Z')
    const samples: number[] = []
    // Warm-up — every function once so JIT primes.
    {
      const r0 = rankGoals(input, now)
      const s0 = selectStrategies(input, now)
      const f0 = fitStrategy(input, r0, now, s0)
      const p0 = buildProductPlan(input, f0.goals, s0, now)
      buildMonitoringFramework(input, f0.goals, s0, p0, now)
    }
    for (let i = 0; i < 100; i++) {
      const t0 = performance.now()
      const ranked = rankGoals(input, now)
      const strategies = selectStrategies(input, now)
      const fit = fitStrategy(input, ranked, now, strategies)
      const productPlan = buildProductPlan(input, fit.goals, strategies, now)
      buildMonitoringFramework(input, fit.goals, strategies, productPlan, now)
      samples.push(performance.now() - t0)
    }
    const p = p95(samples)
    expect(p, `full pipeline p95 was ${p.toFixed(2)} ms`).toBeLessThan(100)
  })
})
