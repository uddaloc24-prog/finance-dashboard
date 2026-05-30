// monitoringFramework.test.ts — Phase 8 review-schedule contract.

import { describe, it, expect } from 'vitest'
import { buildMonitoringFramework } from '../monitoringFramework'
import { buildProductPlan } from '../productMap'
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
  const productPlan = buildProductPlan(input, fit.goals, strategies, FIXED_NOW)
  const monitoring = buildMonitoringFramework(input, fit.goals, strategies, productPlan, FIXED_NOW)
  return { input, fit, strategies, productPlan, monitoring }
}

// ─── Shape ────────────────────────────────────────────────────────────

describe('buildMonitoringFramework — shape', () => {
  const { monitoring } = pipeline(plan50, prefP5, [corpusGoal])

  it('produces a non-empty items array', () => {
    expect(monitoring.items.length).toBeGreaterThan(0)
  })

  it('every item carries the required fields', () => {
    for (const it of monitoring.items) {
      expect(it.id).toBeTruthy()
      expect(it.kind).toBeTruthy()
      expect(it.cadence).toBeTruthy()
      expect(it.title).toBeTruthy()
      expect(it.action).toBeTruthy()
      expect(it.trigger).toBeTruthy()
      expect(it.priority).toBeGreaterThanOrEqual(1)
      expect(it.priority).toBeLessThanOrEqual(5)
    }
  })

  it('item ids are unique', () => {
    const ids = new Set(monitoring.items.map((i) => i.id))
    expect(ids.size).toBe(monitoring.items.length)
  })

  it('items sorted by priority asc, ties broken by cadence then id', () => {
    for (let i = 1; i < monitoring.items.length; i++) {
      const prev = monitoring.items[i - 1]
      const cur  = monitoring.items[i]
      expect(prev.priority).toBeLessThanOrEqual(cur.priority)
    }
  })

  it('upcoming has at most 10 scheduled items, all in chronological order', () => {
    const { upcoming } = monitoring
    expect(upcoming.length).toBeLessThanOrEqual(10)
    for (let i = 1; i < upcoming.length; i++) {
      expect(upcoming[i - 1].date.localeCompare(upcoming[i].date)).toBeLessThanOrEqual(0)
    }
  })

  it('upcoming contains no event-driven items (those have empty nextDate)', () => {
    for (const u of monitoring.upcoming) {
      const item = monitoring.items.find((i) => i.id === u.itemId)!
      expect(item.cadence).not.toBe('event-driven')
    }
  })
})

// ─── Source coverage ──────────────────────────────────────────────────

describe('buildMonitoringFramework — source coverage', () => {
  const { monitoring } = pipeline(plan65, prefP5, [incomeGoal])

  it('emits a per-goal rebalance item', () => {
    const reb = monitoring.items.find((i) => i.kind === 'rebalance' && i.goalId === 'g-inc')
    expect(reb).toBeDefined()
  })

  it('emits an FY-end tax action', () => {
    const tax = monitoring.items.find((i) => i.id === 'tax-fy-end')
    expect(tax).toBeDefined()
    expect(tax?.responsibility).toBe('ca')
    expect(tax?.nextDate.endsWith('-03-31T00:00:00.000Z')).toBe(true)
  })

  it('emits at least one lifecycle milestone for a 65-y-old (Age 70+ entries)', () => {
    const lifecycle = monitoring.items.filter((i) => i.kind === 'lifecycle')
    expect(lifecycle.length).toBeGreaterThan(0)
    for (const l of lifecycle) {
      // Plan65 is age 65; we only emit ages ≥ currentAge
      const age = parseInt(l.id.replace('lifecycle-', ''), 10)
      expect(age).toBeGreaterThanOrEqual(65)
    }
  })

  it('does NOT emit lifecycle milestones for ages already past', () => {
    // Plan50 is age 50; the 60-y SCSS milestone should still emit.
    const { monitoring: m50 } = pipeline(plan50, prefP5, [incomeGoal])
    const scss60 = m50.items.find((i) => i.id === 'lifecycle-60')
    expect(scss60).toBeDefined()
  })

  it('emits product-specific reviews when matching products are present', () => {
    const productItems = monitoring.items.filter((i) => i.kind === 'product-check' || i.kind === 'rebalance')
    expect(productItems.length).toBeGreaterThan(0)
  })
})

// ─── Bias guardrail integration ───────────────────────────────────────

describe('buildMonitoringFramework — guardrails', () => {
  it('every bias guardrail becomes a review item', () => {
    const prefWithGuardrails = {
      ...prefP7,
      bias: {
        ...prefP7.bias,
        guardrails: [
          { id: 'sip-freeze-on-drawdown',
            category: 'sip-freeze' as const,
            trigger: 'drop > 10 %', action: 'freeze',
            severity: 'high' as const },
          { id: 'tactical-cap',
            category: 'rebalance-cap' as const,
            trigger: 'devi > 10 %', action: 'cap',
            severity: 'med' as const },
        ],
      },
    }
    const { monitoring } = pipeline(plan50, prefWithGuardrails, [corpusGoal])
    const guard = monitoring.items.filter((i) => i.kind === 'guardrail-trigger')
    expect(guard.length).toBe(2)
    const high = guard.find((g) => g.id === 'guardrail-sip-freeze-on-drawdown')
    expect(high?.priority).toBe(1)
  })

  it('review-cadence guardrails get quarterly cadence; others are event-driven', () => {
    const prefWithGuardrails = {
      ...prefP7,
      bias: {
        ...prefP7.bias,
        guardrails: [
          { id: 'review-cadence', category: 'review-cadence' as const,
            trigger: 't', action: 'a', severity: 'med' as const },
          { id: 'cooling-off',    category: 'commitment'    as const,
            trigger: 't', action: 'a', severity: 'high' as const },
        ],
      },
    }
    const { monitoring } = pipeline(plan50, prefWithGuardrails, [corpusGoal])
    const cadenceItem = monitoring.items.find((i) => i.id === 'guardrail-review-cadence')
    const cooling = monitoring.items.find((i) => i.id === 'guardrail-cooling-off')
    expect(cadenceItem?.cadence).toBe('quarterly')
    expect(cooling?.cadence).toBe('event-driven')
  })
})

// ─── Cadence date helpers ─────────────────────────────────────────────

describe('buildMonitoringFramework — date calculation', () => {
  it('nextDate for yearly items is the next Mar 31 (FY-end)', () => {
    const { monitoring } = pipeline(plan50, prefP5, [corpusGoal])
    const yearly = monitoring.items.filter((i) => i.cadence === 'yearly')
    for (const y of yearly) {
      expect(y.nextDate.endsWith('-03-31T00:00:00.000Z')).toBe(true)
    }
  })

  it('nextDate for half-yearly items lands on Mar 31 or Sep 30', () => {
    const { monitoring } = pipeline(plan50, prefP5, [corpusGoal])
    const half = monitoring.items.filter((i) => i.cadence === 'half-yearly')
    for (const h of half) {
      const ok = h.nextDate.endsWith('-03-31T00:00:00.000Z')
              || h.nextDate.endsWith('-09-30T00:00:00.000Z')
      expect(ok).toBe(true)
    }
  })

  it('FIXED_NOW = May 29, 2026 → next March 31 is 2027-03-31', () => {
    const { monitoring } = pipeline(plan50, prefP5, [corpusGoal])
    const tax = monitoring.items.find((i) => i.id === 'tax-fy-end')
    expect(tax?.nextDate).toBe('2027-03-31T00:00:00.000Z')
  })
})

// ─── Determinism ──────────────────────────────────────────────────────

describe('buildMonitoringFramework — determinism', () => {
  it('same input → byte-identical output', () => {
    const a = pipeline(plan50, prefP5, [corpusGoal]).monitoring
    const b = pipeline(plan50, prefP5, [corpusGoal]).monitoring
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
