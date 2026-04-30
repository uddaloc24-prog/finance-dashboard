import type { SWPYearRow, BucketState } from './index'

// ── Goals ──────────────────────────────────────────────────────────

export type GoalKind = 'income' | 'event' | 'legacy' | 'corpus-build'

export type InflationCategory = 'general' | 'healthcare' | 'education'

export type GoalPriority = 'must-have' | 'nice-to-have'

export interface Goal {
  id: string
  label: string
  kind: GoalKind
  amount: number
  startYear?: number
  endYear?: number
  inflationCategory?: InflationCategory
  priority: GoalPriority
  notes?: string
}

// ── Strategies ─────────────────────────────────────────────────────

export type Strategy = 'cascade' | 'drawdown' | 'hybrid'

export interface StrategyPhase {
  startYear: number
  endYear: number
  strategy: Strategy
  rationale: string
}

// ── Verdict ────────────────────────────────────────────────────────

export type VerdictKind = 'achievable' | 'achievable-with-adjustments' | 'not-achievable'

export interface AIVerdict {
  kind: VerdictKind
  headline: string
  explanation: string[]
  adjustments?: Array<{ change: string; outcome: string }>
  gap?: { shortfallCorpus: number; alternativeMonthly: number }
}

// ── Funds ──────────────────────────────────────────────────────────

export type BucketKey = 'b1' | 'b2' | 'b3' | 'b4'

export interface FundPick {
  schemeCode: string
  schemeName: string
  nav: number
  oneYearReturn: number | null
  threeYearReturn: number | null
  suggestedAllocation: number
  rationale: string
}

export interface CuratedFund {
  schemeCode: string
  schemeName: string
  bucket: BucketKey
  category: string
  aumCrore?: number
  expenseRatio?: number
  inceptionYear?: number
}

// ── Plan Result ────────────────────────────────────────────────────

export interface ReturnRange {
  year: number
  low: number
  mid: number
  high: number
}

export interface PlanResult {
  strategy: Strategy
  phases?: StrategyPhase[]
  allocation: { b1: number; b2: number; b3: number; b4: number }
  initialBuckets: BucketState
  fundPicks: Record<BucketKey, FundPick[]>
  verdict: AIVerdict
  projection: SWPYearRow[]
  returnRanges: ReturnRange[]
  generatedAt: string
}

// ── Interview ──────────────────────────────────────────────────────

export type InterviewRole = 'user' | 'ai'

export type InterviewStatus = 'asking' | 'ready-to-plan' | 'plan-ready'

export interface InterviewTurn {
  role: InterviewRole
  content: string
  timestamp: string
  extracted?: Record<string, unknown>
}

export interface InterviewSession {
  turns: InterviewTurn[]
  status: InterviewStatus
  profileSoFar: Record<string, unknown>
  goalsSoFar: Goal[]
}

// ── Storage schema ────────────────────────────────────────────────

export const SCHEMA_VERSION = 2 as const

export interface V2Extensions {
  goals?: Goal[]
  activePlan?: PlanResult
  interviewSession?: InterviewSession
  schemaVersion?: typeof SCHEMA_VERSION
}

// ── API request/response contracts ─────────────────────────────────

export interface InterviewRequest {
  session: InterviewSession
  userMessage: string
  corpus: number
}

export interface InterviewResponse {
  nextTurn: InterviewTurn
  status: InterviewStatus
  profileSoFar: Record<string, unknown>
  goalsSoFar: Goal[]
}

export interface PlanRequest {
  corpus: number
  profile: Record<string, unknown>
  goals: Goal[]
  overrides?: {
    allocation?: { b1: number; b2: number; b3: number; b4: number }
    strategy?: Strategy
  }
}

export interface PlanResponse {
  plan: PlanResult
  provider: 'gpt' | 'gemini' | 'claude' | 'fallback'
  cachedAmfiAt: string | null
}

export interface FundsResponse {
  funds: CuratedFund[]
  navs: Record<string, { nav: number; date: string; oneYearReturn: number | null }>
  refreshedAt: string
}
