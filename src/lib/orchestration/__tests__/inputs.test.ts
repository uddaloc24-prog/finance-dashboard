// inputs.test.ts — verifies the input distillation pipeline.
//
// Constructs a representative UserProfile + BucketState (+ optional GD,
// v10, manual goals) and asserts that every field on the resulting
// EngineInput is pulled from the correct source with the correct
// arithmetic. Catches field-name drift between the Profile / Plan stores
// and the engine's PlanFacts contract.
//
// Companion to: goalsFromGd.test.ts (goal projection in isolation),
// rankGoals.test.ts (engine determinism with synthetic PlanFacts).

import { describe, it, expect } from 'vitest'
import { buildOrchestrationInputs } from '../inputs'
import type { UserProfile, BucketState } from '../../../types'
import type { GoalDiscoveryState, V10QuizState } from '../../../types/psychometric'
import type { Goal } from '../../../types/v2'

// ─── Fixtures ────────────────────────────────────────────────────────

const NOW = new Date('2026-05-29T00:00:00Z')

/** Representative healthy 55-year-old, fully populated profile. */
const profile: UserProfile = {
  corpus: 0,                            // intentionally 0 so totalCorpus(buckets) wins
  monthlyWithdrawal: 1_00_000,
  withdrawalFrequency: 'monthly',
  withdrawalAmount: 1_00_000,
  sipAmount: 50_000,
  sipFrequency: 'monthly',
  inflationRate: 6.0,
  riskAppetite: 3,
  taxBracket: 30,
  refreshInterval: 6,
  groqApiKey: '',
  bucketAllocation: { b1: 0.10, b2: 0.20, b3: 0.30, b4: 0.40 },
  demographics: {
    currentAge: 55, retirementAge: 60, lifeExpectancy: 88, city: 'tier1',
  },
  expenses: {
    essential: 80_000, lifestyle: 30_000, healthcare: 25_000, education: 15_000,
    generalInflation: 6.5, healthcareInflation: 9.0, educationInflation: 11.0,
  },
  assetInventory: {
    savings:     { amount: 5_00_000,    status: 'liquid',   monthlyIncome: 0,      optimize: false },
    mutualFunds: { amount: 1_00_00_000, status: 'invested', monthlyIncome: 20_000, optimize: true  },
    realEstate:  { amount: 50_00_000,   status: 'invested', monthlyIncome: 15_000, optimize: false },
  } as never,                           // partial inventory acceptable in tests
  loanProfile: {
    homeLoan: { active: true,  outstanding: 30_00_000, interestRate: 8.5, emi: 25_000 },
    carLoan:  { active: true,  outstanding:  5_00_000, interestRate: 9.5, emi: 10_000 },
    plotLoan: { active: false, outstanding:  0,        interestRate: 0,   emi: 0      },
  } as never,
  insuranceCover: {
    familyFloater:   { cover: 10_00_000, premium: 25_000, active: true  },
    personalHealth:  { cover:  0,        premium:     0, active: false },
    superTopUp:      { cover: 15_00_000, premium: 12_000, active: true  },
    seniorCitizen:   { cover:  0,        premium:     0, active: false },
    corporateGroup:  { cover:  0,        premium:     0, active: false },
    criticalIllness: { cover: 25_00_000, premium:  8_000, active: true  },
    termPlan:        { cover: 1_00_00_000, premium: 35_000, active: true, mwp: true },
    wholeLife:       { cover:  0,        premium:     0, active: false },
  } as never,
}

const buckets: BucketState = { b1: 5_00_000, b2: 20_00_000, b3: 40_00_000, b4: 1_35_00_000 }
const expectedCorpus = 5_00_000 + 20_00_000 + 40_00_000 + 1_35_00_000   // ₹2 Cr

// ─── Plan distillation ────────────────────────────────────────────────

describe('buildOrchestrationInputs → PlanFacts', () => {
  const input = buildOrchestrationInputs({ profile, buckets, now: NOW })

  it('pulls corpus from buckets when profile.corpus is 0', () => {
    expect(input.plan.corpus).toBe(expectedCorpus)
  })

  it('computes netWorth = totalAssets − activeLiabilities', () => {
    const totalAssets = 5_00_000 + 1_00_00_000 + 50_00_000
    const activeLiabilities = 30_00_000 + 5_00_000  // home + car (plot inactive)
    expect(input.plan.netWorth).toBe(totalAssets - activeLiabilities)
  })

  it('sums liquidCorpus only over liquid-status assets', () => {
    expect(input.plan.liquidCorpus).toBe(5_00_000)
  })

  it('sums passiveIncome across all assets', () => {
    expect(input.plan.passiveIncome).toBe(20_000 + 15_000)
  })

  it('sums monthlyBurn over the four expense categories', () => {
    expect(input.plan.monthlyBurn).toBe(80_000 + 30_000 + 25_000 + 15_000)
  })

  it('sums monthlyEMI over active loans only (skips inactive)', () => {
    expect(input.plan.monthlyEMI).toBe(25_000 + 10_000)
  })

  it('distils per-loan list — active only, sorted by interestRate desc', () => {
    expect(input.plan.loans).toHaveLength(2)        // plot loan is inactive
    expect(input.plan.loans[0].interestRate).toBeGreaterThanOrEqual(input.plan.loans[1].interestRate)
    const rates = input.plan.loans.map((l) => l.interestRate).sort((a, b) => b - a)
    expect(rates).toEqual([9.5, 8.5])
  })

  it('pulls monthlyWithdrawal + monthlySIP from the profile', () => {
    expect(input.plan.monthlyWithdrawal).toBe(1_00_000)
    expect(input.plan.monthlySIP).toBe(50_000)
  })

  it('pulls age fields from demographics', () => {
    expect(input.plan.currentAge).toBe(55)
    expect(input.plan.retireAge).toBe(60)
    expect(input.plan.lifeExpectancy).toBe(88)
    expect(input.plan.currentYear).toBe(2026)
  })

  it('pulls per-category inflation from expenses (not the legacy single rate)', () => {
    expect(input.plan.inflation.general).toBe(6.5)
    expect(input.plan.inflation.healthcare).toBe(9.0)
    expect(input.plan.inflation.education).toBe(11.0)
  })

  it('sums health-cover across the five active health entries', () => {
    expect(input.plan.insurance.healthCover).toBe(10_00_000 + 15_00_000)
  })

  it('sums life-cover across term + wholeLife (active only)', () => {
    expect(input.plan.insurance.lifeCover).toBe(1_00_00_000)
  })

  it('pulls ciCover only when criticalIllness is active', () => {
    expect(input.plan.insurance.ciCover).toBe(25_00_000)
    expect(input.plan.insurance.termActive).toBe(true)
    expect(input.plan.insurance.termMwp).toBe(true)
  })

  it('forwards taxBracket and riskAppetite verbatim', () => {
    expect(input.plan.taxBracket).toBe(30)
    expect(input.plan.riskAppetite).toBe(3)
  })

  it('produces a finite blendedReturn (uses storage defaults when none stored)', () => {
    expect(input.plan.blendedReturn).toBeGreaterThan(0)
    expect(Number.isFinite(input.plan.blendedReturn)).toBe(true)
  })
})

// ─── Edge case: profile.corpus wins when buckets are empty ─────────────

describe('PlanFacts.corpus fallbacks', () => {
  it('falls back to profile.corpus when buckets are empty', () => {
    const p2 = { ...profile, corpus: 7_50_00_000 }
    const b2: BucketState = { b1: 0, b2: 0, b3: 0, b4: 0 }
    const input = buildOrchestrationInputs({ profile: p2, buckets: b2, now: NOW })
    expect(input.plan.corpus).toBe(7_50_00_000)
  })

  it('returns 0 when both buckets and profile.corpus are 0', () => {
    const b3: BucketState = { b1: 0, b2: 0, b3: 0, b4: 0 }
    const input = buildOrchestrationInputs({ profile, buckets: b3, now: NOW })
    expect(input.plan.corpus).toBe(0)
  })
})

// ─── Preferences distillation ─────────────────────────────────────────

describe('buildOrchestrationInputs → Preferences', () => {
  it('returns null persona + unclassified confidence when no GD inference', () => {
    const input = buildOrchestrationInputs({ profile, buckets, now: NOW })
    expect(input.preferences.personaPrimary).toBeNull()
    expect(input.preferences.personaConfidence).toBe('unclassified')
    expect(input.preferences.riskProfile).toBeNull()
    expect(input.preferences.moneyScript).toBeNull()
  })

  it('always produces a fusedRisk; plan-only when no other signals', () => {
    const input = buildOrchestrationInputs({ profile, buckets, now: NOW })
    expect(input.preferences.fusedRisk.derivation).toBe('plan-only')
    expect(input.preferences.fusedRisk.score).toBe(50)        // riskAppetite 3 → 50
    expect(input.preferences.fusedRisk.sources).toHaveLength(1)
    expect(input.preferences.fusedRisk.sources[0].name).toBe('plan')
  })

  it('fuses Plan + v10 when v10 composites are present', () => {
    const v10 = {
      sessionId: 't', startedAt: '', updatedAt: '',
      currentIndex: 0, questionSeq: [], answers: {} as never, completed: true,
      composites: {
        riskProfile: 80, effectiveRiskAppetite: 78, riskCapacity: 70,
        dominantMoneyScript: null, moneyScripts: {} as never, constructScores: {},
      } as never,
    }
    const input = buildOrchestrationInputs({ profile, buckets, v10, now: NOW })
    expect(input.preferences.fusedRisk.derivation).toBe('fused-2')
    // (1×50 + 4×80) / 5 = 74
    expect(input.preferences.fusedRisk.score).toBeCloseTo(74, 0)
  })

  it('back-compat: preferences.riskProfile still pulls from v10 only', () => {
    const v10 = {
      sessionId: 't', startedAt: '', updatedAt: '',
      currentIndex: 0, questionSeq: [], answers: {} as never, completed: true,
      composites: {
        riskProfile: 80, effectiveRiskAppetite: 78, riskCapacity: 70,
        dominantMoneyScript: null, moneyScripts: {} as never, constructScores: {},
      } as never,
    }
    const input = buildOrchestrationInputs({ profile, buckets, v10, now: NOW })
    expect(input.preferences.riskProfile).toBe(80)            // legacy field
    expect(input.preferences.fusedRisk.score).toBeCloseTo(74, 0)  // new field
  })

  it('pulls persona from gd.inference', () => {
    const gd: GoalDiscoveryState = {
      sessionId: 't', startedAt: '', updatedAt: '',
      currentBlock: 'block-1', visited: [], answers: {}, completed: true,
      inference: {
        persona: { primary: { id: 'P5', score: 80 }, secondary: null, confidence: 'high' },
        signals: {}, derivedAt: '',
      } as never,
    }
    const input = buildOrchestrationInputs({ profile, buckets, gd, now: NOW })
    expect(input.preferences.personaPrimary).toBe('P5')
    expect(input.preferences.personaConfidence).toBe('high')
  })

  it('pulls riskProfile and moneyScript from v10.composites', () => {
    const v10: V10QuizState = {
      sessionId: 't', startedAt: '', updatedAt: '',
      currentIndex: 0, questionSeq: [], answers: {} as never, completed: true,
      composites: {
        riskProfile: 72, effectiveRiskAppetite: 70, riskCapacity: 75,
        dominantMoneyScript: 'avoidance',
        moneyScripts: {} as never, constructScores: {},
      } as never,
    }
    const input = buildOrchestrationInputs({ profile, buckets, v10, now: NOW })
    expect(input.preferences.riskProfile).toBe(72)
    expect(input.preferences.moneyScript).toBe('avoidance')
  })
})

// ─── Goals merging ────────────────────────────────────────────────────

describe('buildOrchestrationInputs → goals', () => {
  it('returns empty when no manual or GD goals supplied', () => {
    const input = buildOrchestrationInputs({ profile, buckets, now: NOW })
    expect(input.goals).toEqual([])
  })

  it('tags manual goals with source=manual', () => {
    const manualGoals: Goal[] = [
      {
        id: 'g1', label: 'Daughter wedding', kind: 'event',
        amount: 30_00_000, startYear: 2030, priority: 'must-have',
        inflationCategory: 'general',
      } as never,
    ]
    const input = buildOrchestrationInputs({ profile, buckets, manualGoals, now: NOW })
    expect(input.goals).toHaveLength(1)
    expect(input.goals[0].source).toBe('manual')
    expect(input.goals[0].id).toBe('g1')
    expect(input.goals[0].label).toBe('Daughter wedding')
    expect(input.goals[0].amount).toBe(30_00_000)
  })

  it('projects gd block-1 goals with source=gd-projection', () => {
    const gd: GoalDiscoveryState = {
      sessionId: 't', startedAt: '', updatedAt: '',
      currentBlock: 'block-1', visited: [], completed: true,
      answers: {
        'block-1': {
          goals: [
            { name: 'World cruise', type: 'lifestyle', amount: '15L', horizon: '5y', priority: 'nice' },
          ],
        } as never,
      } as never,
    }
    const input = buildOrchestrationInputs({ profile, buckets, gd, now: NOW })
    expect(input.goals).toHaveLength(1)
    expect(input.goals[0].source).toBe('gd-projection')
    expect(input.goals[0].label).toBe('World cruise')
  })

  it('merges manual + gd, preserving both sources', () => {
    const manualGoals: Goal[] = [
      { id: 'g1', label: 'M', kind: 'event', amount: 10_00_000, startYear: 2028, priority: 'must-have', inflationCategory: 'general' } as never,
    ]
    const gd: GoalDiscoveryState = {
      sessionId: 't', startedAt: '', updatedAt: '',
      currentBlock: 'block-1', visited: [], completed: true,
      answers: {
        'block-1': { goals: [{ name: 'GD goal', type: 'lifestyle', amount: '5L', horizon: '3y', priority: 'must' }] } as never,
      } as never,
    }
    const input = buildOrchestrationInputs({ profile, buckets, manualGoals, gd, now: NOW })
    expect(input.goals).toHaveLength(2)
    const sources = input.goals.map((g) => g.source).sort()
    expect(sources).toEqual(['gd-projection', 'manual'])
  })
})
