// v10 Adaptive Psychometric — type definitions.
// Bank: 74 items across 16 constructs (C-1 .. C-16). See src/lib/data/psychometricBank.ts.

import type { RiskProfileId } from './profiles'

export type ConstructId =
  | 'C-1'  | 'C-2'  | 'C-3'  | 'C-4'  | 'C-5'
  | 'C-6'  | 'C-7'  | 'C-8'  | 'C-9'  | 'C-10'
  | 'C-11' | 'C-12' | 'C-13' | 'C-14' | 'C-15' | 'C-16'

export type AnswerScale =
  | '5-point-likert'
  | '7-point-likert'
  | 'knowledge-mcq'
  | 'multi-select'

export interface PsychOption {
  label: string
  score: number  // 1–5, 1–7, or 0/1; reverse-coded items have pre-inverted scores
}

export interface PsychQuestion {
  code: string                 // e.g. 'C1-Q1'
  construct: ConstructId
  constructName: string
  scale: AnswerScale
  question: string
  options: PsychOption[]
  correctIndex?: number        // knowledge-mcq only
}

// Single-select: value is the chosen option's score.
// Multi-select:  value is an array of option indices.
export interface PsychAnswer {
  value: number | number[]
  skipped: boolean
}

export type PsychAnswers = Record<string, PsychAnswer>

export type MoneyScriptId = 'avoidance' | 'worship' | 'status' | 'vigilance'

export interface CompositesResult {
  riskProfile: number              // 0–100, primary composite (drives bucket allocation)
  effectiveRiskAppetite: number    // (C-1 + invert(C-2)) / 2
  riskCapacity: number             // from financial inputs
  riskAppetite: number             // C-1 normalized
  biasIndex: number                // avg of invert(C-2, C-10, C-11, C-12)
  planningReadiness: number        // avg of C-3, C-4, C-15
  scamVulnerability: number        // invert(C-14) + age bonus
  dominantMoneyScript: MoneyScriptId | null
  moneyScripts: Record<MoneyScriptId, number>  // C-6, C-7, C-8, C-9 normalized
  constructScores: Partial<Record<ConstructId, number>>  // null/missing if no answers
  profileId: RiskProfileId
}

export interface RiskCapacityInput {
  savingsRate: number       // monthly savings / monthly income (0..1)
  debtToIncome: number      // monthly EMIs / monthly income (0..1)
  emergencyMonths: number   // months of expenses covered by emergency fund
}

export interface LifeStageInput {
  currentAge: number
  retirementAge: number
}

// Top-level state held during a v10 quiz session and persisted to localStorage.
export interface V10QuizState {
  sessionId: string
  startedAt: string        // ISO
  updatedAt: string        // ISO
  currentIndex: number     // pointer into the active question sequence
  questionSeq: string[]    // codes in adaptive order; static for phase 1
  answers: PsychAnswers
  completed: boolean
  composites: CompositesResult | null
}

// ─── Goal Discovery (phase 3) ────────────────────────────────────────────
// 5-block intake form that runs *before* the psychometric quiz. Captures
// life-design context that phase 4 will mine for persona + behavioural
// signals. The form holds free-text narratives + structured selections;
// every field is local-only (no upload, no server).

// The v10 spec uses block IDs 0..5. Phase 3 ships 0, 1, 2, 4, 5; block-3
// (per-goal interrogation) is deferred but its ID stays reserved here so
// later phases can fill it in without renumbering.
export type GoalDiscoveryBlockId =
  | 'block-0' | 'block-1' | 'block-2' | 'block-3' | 'block-4' | 'block-5'

// A single field value. We allow string (free text), string[] (multi-select),
// and number for sliders/ratings. Audio file refs are deferred to phase 3.5+.
export type GdFieldValue = string | string[] | number | null

export type GdBlockAnswers = Record<string, GdFieldValue>

export interface GoalDiscoveryState {
  sessionId: string
  startedAt: string                                     // ISO
  updatedAt: string                                     // ISO
  currentBlock: GoalDiscoveryBlockId
  visited: GoalDiscoveryBlockId[]                       // blocks the user has opened
  answers: Partial<Record<GoalDiscoveryBlockId, GdBlockAnswers>>
  completed: boolean
  inference?: InferenceResult                           // phase 4 — derived from `answers`
}

// ─── Inference (phase 4) ──────────────────────────────────────────────────
// Output of running persona + signal extraction over a GoalDiscoveryState.
// Re-derivable from `answers` alone, but cached on the state so the adaptive
// layer (phase 5) doesn't have to recompute on every render.

export type PersonaId =
  | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9'

export type PersonaConfidence = 'high' | 'medium' | 'low' | 'unclassified'

export interface PersonaHit {
  id: PersonaId
  name: string
  score: number            // raw weighted score
  evidence: string[]       // verbatim snippets / signals that contributed
}

export interface PersonaInference {
  primary: PersonaHit | null
  secondary: PersonaHit | null
  confidence: PersonaConfidence
  all: PersonaHit[]        // every persona that scored > 0, ranked
}

// Behavioural signals — 12 per v10. IDs and snake_case names match the
// source verbatim so SIGNAL_PREFILLS lookups stay 1:1 with the original.
// `protection_to_aspiration` and `overconfidence_marker` are declared but
// not actively scored in v10; we keep them as placeholders.
export type SignalId =
  | 'money_script_avoidance'
  | 'money_script_worship'
  | 'money_script_status'
  | 'money_script_vigilance'
  | 'time_orientation_present'
  | 'locus_of_control_internal'
  | 'self_efficacy'
  | 'family_obligation_weight'
  | 'protection_to_aspiration'
  | 'financial_anxiety_marker'
  | 'herding_susceptibility'
  | 'overconfidence_marker'

export interface SignalHit {
  id: SignalId
  score: number | null     // 0..1; null means no signal detected
  evidence: string[]       // verbatim snippets that drove the score
}

export type SignalMap = Record<SignalId, SignalHit>

export interface InferenceResult {
  persona: PersonaInference
  signals: SignalMap
  bridgeSentence: string   // generated intro to bridge GD → quiz
  computedAt: string       // ISO
}
