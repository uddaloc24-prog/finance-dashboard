// Orchestration Engine — input / output type contract.
// Locked by the Phase 5 design memo (§3, §4) on 2026-05-24.
// Implementations under `src/lib/orchestration/`.
//
// Determinism contract (memo §2.4): the engine is a pure function
//   rankGoals(input: EngineInput): EngineOutput
// with no I/O, no Date.now, no random. Same input → identical output
// byte-for-byte, enforced by snapshot tests.

import type { PersonaId, PersonaConfidence, MoneyScriptId } from './psychometric'

// ─── Plan-side facts (constraints) ─────────────────────────────────────

/** Distilled, engine-ready snapshot of the user's Plan-tab state. */
export interface PlanFacts {
  // Money position
  corpus: number              // INR, from totalCorpus(buckets) || profile.corpus
  netWorth: number            // INR, totalAssets − activeLiabilities
  liquidCorpus: number        // INR, sum of liquid-status assets
  passiveIncome: number       // INR / month, from assetInventory.monthlyIncome

  // Flows
  monthlyBurn: number         // INR / month, sum of all expense categories
  monthlyEMI: number          // INR / month, sum of active-loan EMIs
  monthlyWithdrawal: number   // INR / month, from profile
  monthlySIP: number          // INR / month, from profile

  // Time
  currentAge: number
  retireAge: number
  lifeExpectancy: number
  currentYear: number         // calendar year — fed in for engine determinism

  // Inflation (Step 05, per-category)
  inflation: {
    general: number           // percent, e.g. 6.0
    healthcare: number        // percent, e.g. 8.5
    education: number         // percent, e.g. 10.0
  }

  // Returns
  blendedReturn: number       // percent, weighted average of bucket returns

  // Insurance (Step 06 roll-ups)
  insurance: {
    healthCover: number       // INR, sum across family floater + personal + super + senior
    lifeCover: number         // INR, term + whole-life
    ciCover: number           // INR, critical-illness lump-sum
    termActive: boolean
    termMwp: boolean
  }

  // Settings
  taxBracket: 0 | 5 | 20 | 30
  riskAppetite: 1 | 2 | 3 | 4 | 5
}

// ─── Profile-side preferences ──────────────────────────────────────────

/** What the user has revealed about themselves on the Profile tab. */
export interface Preferences {
  personaPrimary: PersonaId | null
  personaConfidence: PersonaConfidence
  riskProfile: number | null            // 0-100 from v10 composites
  moneyScript: MoneyScriptId | null
  weightOverrides?: Partial<CriterionWeights>
}

// ─── Goals — engine input shape ────────────────────────────────────────

export type GoalKind = 'income' | 'event' | 'legacy' | 'corpus-build'
export type GoalInflationCategory = 'general' | 'healthcare' | 'education'
export type GoalPriority = 'must-have' | 'nice-to-have'

export interface RawGoal {
  id: string                 // stable id (from storage or `gd-${slug}`)
  label: string
  kind: GoalKind
  amount: number             // INR in today's rupees
  startYear?: number         // calendar year target
  endYear?: number           // for income-stream goals
  priority: GoalPriority
  inflationCategory: GoalInflationCategory
  source: 'manual' | 'gd-projection' | 'system'
}

// ─── Engine input (composed) ───────────────────────────────────────────

export interface EngineInput {
  plan: PlanFacts
  preferences: Preferences
  goals: RawGoal[]
}

// ─── Engine output ─────────────────────────────────────────────────────

/** The 4 MCDA criteria. Weights are dimensionless and sum to 1.0. */
export interface CriterionWeights {
  importance: number
  urgency: number
  affordability: number
  riskFit: number
}

/** Per-criterion scores for a single goal — each 0..100. */
export interface CriterionScores {
  importance: number
  urgency: number
  affordability: number
  riskFit: number
}

export interface RankedGoal {
  goal: RawGoal
  scores: CriterionScores
  composite: number          // 0..100, weighted sum of scores × weights
  priorityWeight: number     // share of total composite (∑ = 1.0)
  disputed?: boolean         // reserved for spousal mode; always false in v1
}

export interface EngineTrace {
  personaUsed: PersonaId | 'default'
  weightDerivation: 'persona-default' | 'user-override' | 'mixed'
  goalRationale: Record<string, string[]>
}

export interface EngineOutput {
  ranked: RankedGoal[]
  weightsUsed: CriterionWeights
  trace: EngineTrace
  emittedAt: string          // ISO timestamp of emission
  inputsHash: string         // short content hash of EngineInput — for cache + audit
}
