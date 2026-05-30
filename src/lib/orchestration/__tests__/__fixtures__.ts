// Shared test fixtures for the orchestration engine.
// Synthetic — chosen to exercise edge cases without depending on real
// user data or localStorage.

import type {
  EngineInput, PlanFacts, Preferences, RawGoal,
} from '../../../types/orchestration'

// ─── PlanFacts variants ───────────────────────────────────────────────

/** Healthy 50-year-old in mid-career — most criteria pass. */
export const plan50: PlanFacts = {
  corpus:           1_50_00_000,
  netWorth:         1_30_00_000,
  liquidCorpus:        20_00_000,    // ~10× burn — comfortable
  passiveIncome:        30_000,

  monthlyBurn:           1_50_000,
  monthlyEMI:              20_000,
  monthlyWithdrawal:           0,    // pre-retirement
  monthlySIP:             80_000,

  loans: [],                         // no high-rate debt by default

  currentAge: 50, retireAge: 60, lifeExpectancy: 85, currentYear: 2026,

  inflation: { general: 6.0, healthcare: 8.5, education: 10.0 },
  blendedReturn: 10.0,

  insurance: {
    healthCover: 25_00_000,
    lifeCover:   1_00_00_000,
    ciCover:        25_00_000,
    termActive: true,
    termMwp:    true,
  },

  taxBracket: 30,
  riskAppetite: 4,
}

/** 65-year-old recently retired — corpus drawdown begins, tighter SIP. */
export const plan65: PlanFacts = {
  ...plan50,
  corpus:           2_50_00_000,
  netWorth:         2_30_00_000,
  liquidCorpus:        50_00_000,
  passiveIncome:       80_000,
  monthlyBurn:         1_80_000,
  monthlyEMI:                0,
  monthlyWithdrawal:   1_00_000,
  monthlySIP:                0,
  currentAge: 65, retireAge: 60, lifeExpectancy: 88,
  taxBracket: 20,
  riskAppetite: 3,
}

/** Under-protected 55-year-old — all 3 pre-emption rules should fire. */
export const planUnderProtected: PlanFacts = {
  ...plan50,
  liquidCorpus:    5_00_000,         // < 6 × monthly burn (180k * 6 = 1.08L → fails)
  insurance: {
    healthCover:  5_00_000,          // < ₹15L × 1.4 (age 55) = ₹21L floor
    lifeCover:    20_00_000,         // < 5 × annual burn (180k × 12 × 5 = 1.08Cr)
    ciCover:               0,
    termActive: false,
    termMwp:    false,
  },
  monthlyBurn:    1_50_000,
}

// ─── Preferences variants ─────────────────────────────────────────────

/** Build a deterministic FusedRiskProfile that matches the v10-only
 *  `riskProfile` legacy field — so existing fixtures stay self-consistent
 *  without depending on the precision constants. */
function fixedFusedRisk(score: number): import('../../../types/orchestration').FusedRiskProfile {
  return {
    score,
    confidence: 0.632,
    sources: [{ name: 'plan', value: score, weight: 1 }],
    derivation: 'plan-only',
  }
}

/** Default flat BiasProfile — equal scripts, neutral signals, no guardrails.
 *  Engine snapshots use this so behavioural tests can mutate just one field. */
function neutralBias(): import('../../../types/orchestration').BiasProfile {
  return {
    scripts: { avoidance: 0.25, worship: 0.25, status: 0.25, vigilance: 0.25 },
    dominantScript: null,
    signals: {
      lossAversion: 25, presentBias: 35, statusSeeking: 25, herding: 35,
      overconfidence: 50, scamVulnerability: 50, acquiescence: 50,
    },
    guardrails: [],
    confidence: 0.4,
  }
}

export const prefP1: Preferences = {
  personaPrimary: 'P1', personaConfidence: 'high',
  riskProfile: 25, fusedRisk: fixedFusedRisk(25), bias: neutralBias(), moneyScript: 'vigilance',
}
export const prefP5: Preferences = {
  personaPrimary: 'P5', personaConfidence: 'medium',
  riskProfile: 50, fusedRisk: fixedFusedRisk(50), bias: neutralBias(), moneyScript: null,
}
export const prefP7: Preferences = {
  personaPrimary: 'P7', personaConfidence: 'high',
  riskProfile: 75, fusedRisk: fixedFusedRisk(75), bias: neutralBias(), moneyScript: 'worship',
}
export const prefDefault: Preferences = {
  personaPrimary: null, personaConfidence: 'unclassified',
  riskProfile: null, fusedRisk: fixedFusedRisk(50), bias: neutralBias(), moneyScript: null,
}

// ─── Goal pile — fixed 5 goals exercising every kind ──────────────────

export const goals5: RawGoal[] = [
  {
    id: 'goal-retire-corpus',
    label: 'Retirement corpus top-up',
    kind: 'corpus-build', amount: 50_00_000,
    startYear: 2031, priority: 'must-have',
    inflationCategory: 'general', source: 'manual',
  },
  {
    id: 'goal-child-college',
    label: 'Child college tuition',
    kind: 'event', amount: 30_00_000,
    startYear: 2029, priority: 'must-have',
    inflationCategory: 'education', source: 'manual',
  },
  {
    id: 'goal-house-renovation',
    label: 'Home renovation',
    kind: 'event', amount: 15_00_000,
    startYear: 2028, priority: 'nice-to-have',
    inflationCategory: 'general', source: 'gd-projection',
  },
  {
    id: 'goal-vacation',
    label: 'Europe trip',
    kind: 'event', amount: 8_00_000,
    startYear: 2027, priority: 'nice-to-have',
    inflationCategory: 'general', source: 'gd-projection',
  },
  {
    id: 'goal-legacy',
    label: 'Legacy for grandchildren',
    kind: 'legacy', amount: 1_00_00_000,
    startYear: 2046, priority: 'nice-to-have',
    inflationCategory: 'general', source: 'manual',
  },
]

// ─── EngineInput builders ─────────────────────────────────────────────

export function buildInput(
  plan: PlanFacts = plan50,
  preferences: Preferences = prefP5,
  goals: RawGoal[] = goals5,
): EngineInput {
  return { plan, preferences, goals }
}

/** Fixed Date used in determinism tests so emittedAt is reproducible. */
export const FIXED_NOW = new Date('2026-05-24T10:00:00.000Z')
