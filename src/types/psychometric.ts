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
