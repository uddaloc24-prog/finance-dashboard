// strategyCatalogue — encode the PDF's 12 MVP strategies as data
// records (Goal-Based Investing: World-Class Investment Strategy
// Framework §IV). Each row carries everything the Strategy Selector
// (Phase 4) needs: the four classifications it primarily serves, the
// goal-kinds it fits, its risk-profile band, its bias-compatibility
// vector, its horizon band, and an allocation hint.
//
// Locked, declarative, single source of truth. Pure data.

import type { GoalKind } from '../../types/orchestration'

// ─── Classification taxonomy (PDF §I — 10 master classifications) ─────

export type StrategyClassification =
  | 'capital-preservation'   // 1
  | 'income-generation'      // 2
  | 'inflation-protection'   // 3
  | 'capital-appreciation'   // 4
  | 'liability-matching'     // 5
  | 'behavioural-stability'  // 6
  | 'tax-optimization'       // 7
  | 'opportunistic-alpha'    // 8
  | 'multi-generational'     // 9
  | 'dynamic-risk-mgmt'      // 10

// ─── Horizon band ──────────────────────────────────────────────────────

export type HorizonBand = 'short' | 'mid' | 'long' | 'any'  // 0-5 · 5-10 · 10+ · any

// ─── Bias-compatibility vector ─────────────────────────────────────────
//
// For each bias signal, the strategy declares its "tolerance" — how much
// of that bias the user can have while the strategy still serves them
// well. 0 means the strategy is *incompatible* with high values of that
// bias (e.g., Tactical Asset Allocation tolerates almost no
// overconfidence). 100 means the strategy is fully robust to that bias.

export interface BiasCompatibility {
  lossAversion:   number   // 0..100
  presentBias:    number
  statusSeeking:  number
  herding:        number
  overconfidence: number
}

// ─── Allocation hint ──────────────────────────────────────────────────

export interface AllocationHint {
  /** Target equity share at the strategy's reference horizon (0..1). */
  equityShare: number
  /** Whether the strategy follows a glide path. */
  glideDown: boolean
  /** Preferred 4-bucket bias at the reference horizon. */
  buckets: { b1: number; b2: number; b3: number; b4: number }
}

// ─── Strategy record ──────────────────────────────────────────────────

export interface Strategy {
  id: string
  name: string
  /** PDF reference (e.g., "II.A.1" for Liability-Driven Investing). */
  ref: string
  /** Short one-liner shown in UI. */
  tagline: string
  classifications: StrategyClassification[]
  /** Which RawGoal.kind values this strategy serves. */
  goalKinds: GoalKind[]
  /** Years-to-target band where the strategy is most appropriate. */
  horizon: HorizonBand
  /** Risk-profile bands the strategy fits — fused risk score 0..100. */
  riskBand: { min: number; max: number }
  /** How tolerant the strategy is of each bias dimension. */
  biasCompat: BiasCompatibility
  /** Allocation profile this strategy implies. */
  allocation: AllocationHint
  /** Distinctive feature; informational only. */
  signature?: string
}

// ─── The 12 MVP strategies (PDF §IV) ──────────────────────────────────

export const STRATEGY_CATALOGUE: readonly Strategy[] = [
  {
    id: 'lda',
    name: 'Liability-Driven Investing',
    ref: 'II.A.1',
    tagline: 'Build the portfolio backward from the future liability.',
    classifications: ['liability-matching', 'capital-preservation'],
    goalKinds: ['event', 'income', 'corpus-build'],
    horizon: 'any',
    riskBand: { min: 0, max: 65 },
    biasCompat: { lossAversion: 95, presentBias: 60, statusSeeking: 70, herding: 80, overconfidence: 60 },
    allocation: { equityShare: 0.30, glideDown: true,  buckets: { b1: 0.10, b2: 0.40, b3: 0.30, b4: 0.20 } },
    signature: 'Failure-probability minimised vs nominal-return maximised.',
  },
  {
    id: 'bucket',
    name: 'Bucket Investing',
    ref: 'II.A.3',
    tagline: 'Time-bucketed corpus — short, medium and long-term sleeves.',
    classifications: ['liability-matching', 'capital-preservation', 'income-generation'],
    goalKinds: ['income', 'event', 'corpus-build'],
    horizon: 'any',
    riskBand: { min: 20, max: 80 },
    biasCompat: { lossAversion: 90, presentBias: 80, statusSeeking: 70, herding: 80, overconfidence: 70 },
    allocation: { equityShare: 0.45, glideDown: true,  buckets: { b1: 0.10, b2: 0.20, b3: 0.25, b4: 0.45 } },
    signature: 'The native 4-bucket cascade this app already runs.',
  },
  {
    id: 'strategic',
    name: 'Strategic Asset Allocation',
    ref: 'II.B.4',
    tagline: 'A fixed long-term mix; rebalanced periodically.',
    classifications: ['capital-appreciation', 'behavioural-stability'],
    goalKinds: ['corpus-build', 'income', 'legacy'],
    horizon: 'long',
    riskBand: { min: 30, max: 80 },
    biasCompat: { lossAversion: 60, presentBias: 70, statusSeeking: 60, herding: 70, overconfidence: 80 },
    allocation: { equityShare: 0.60, glideDown: false, buckets: { b1: 0.05, b2: 0.15, b3: 0.20, b4: 0.60 } },
  },
  {
    id: 'dynamic',
    name: 'Dynamic Asset Allocation',
    ref: 'II.B.6',
    tagline: 'Allocation changes automatically with market state.',
    classifications: ['dynamic-risk-mgmt', 'behavioural-stability'],
    goalKinds: ['corpus-build', 'income'],
    horizon: 'mid',
    riskBand: { min: 20, max: 70 },
    biasCompat: { lossAversion: 85, presentBias: 85, statusSeeking: 75, herding: 90, overconfidence: 60 },
    allocation: { equityShare: 0.50, glideDown: false, buckets: { b1: 0.05, b2: 0.20, b3: 0.45, b4: 0.30 } },
    signature: 'BAF / hybrid funds; useful for emotionally weak investors.',
  },
  {
    id: 'glide',
    name: 'Glide Path Investing',
    ref: 'II.B.7',
    tagline: 'Equity reduces automatically as the target year approaches.',
    classifications: ['dynamic-risk-mgmt', 'capital-preservation'],
    goalKinds: ['corpus-build', 'event'],
    horizon: 'any',
    riskBand: { min: 20, max: 80 },
    biasCompat: { lossAversion: 90, presentBias: 80, statusSeeking: 70, herding: 80, overconfidence: 70 },
    allocation: { equityShare: 0.55, glideDown: true,  buckets: { b1: 0.05, b2: 0.20, b3: 0.30, b4: 0.45 } },
    signature: 'PDF: 20y→70% equity · 10y→50% · 5y→30%.',
  },
  {
    id: 'index',
    name: 'Index Investing',
    ref: 'II.C.8',
    tagline: 'Capture broad-market returns at minimal cost.',
    classifications: ['capital-appreciation', 'behavioural-stability', 'tax-optimization'],
    goalKinds: ['corpus-build', 'legacy'],
    horizon: 'long',
    riskBand: { min: 40, max: 100 },
    biasCompat: { lossAversion: 60, presentBias: 75, statusSeeking: 50, herding: 75, overconfidence: 90 },
    allocation: { equityShare: 0.75, glideDown: false, buckets: { b1: 0.05, b2: 0.10, b3: 0.15, b4: 0.70 } },
  },
  {
    id: 'core-sat',
    name: 'Core-Satellite Strategy',
    ref: 'II.K.35',
    tagline: 'Index core + small high-conviction satellite sleeve.',
    classifications: ['capital-appreciation', 'opportunistic-alpha'],
    goalKinds: ['corpus-build', 'legacy'],
    horizon: 'long',
    riskBand: { min: 50, max: 100 },
    biasCompat: { lossAversion: 60, presentBias: 75, statusSeeking: 80, herding: 70, overconfidence: 60 },
    allocation: { equityShare: 0.75, glideDown: false, buckets: { b1: 0.05, b2: 0.10, b3: 0.15, b4: 0.70 } },
    signature: 'Caps single-name and satellite exposure; defuses concentration risk.',
  },
  {
    id: 'retire-income',
    name: 'Retirement Income Strategy',
    ref: 'II.D.11',
    tagline: 'Stable monthly income post-retirement; sequence-risk aware.',
    classifications: ['income-generation', 'capital-preservation', 'liability-matching'],
    goalKinds: ['income'],
    horizon: 'any',
    riskBand: { min: 10, max: 60 },
    biasCompat: { lossAversion: 95, presentBias: 75, statusSeeking: 70, herding: 80, overconfidence: 65 },
    allocation: { equityShare: 0.35, glideDown: true,  buckets: { b1: 0.15, b2: 0.30, b3: 0.30, b4: 0.25 } },
    signature: 'SCSS + PMVVY + FD ladder + BAF SWP cascade.',
  },
  {
    id: 'tax-aware',
    name: 'Tax-Aware Investing',
    ref: 'II.G.19',
    tagline: 'Place each asset in its tax-optimal vehicle.',
    classifications: ['tax-optimization'],
    goalKinds: ['corpus-build', 'income', 'legacy'],
    horizon: 'any',
    riskBand: { min: 0, max: 100 },
    biasCompat: { lossAversion: 80, presentBias: 75, statusSeeking: 75, herding: 80, overconfidence: 70 },
    allocation: { equityShare: 0.55, glideDown: false, buckets: { b1: 0.05, b2: 0.20, b3: 0.30, b4: 0.45 } },
    signature: 'LTCG harvesting · debt-fund slab · 80TTB · regime choice.',
  },
  {
    id: 'guardrail',
    name: 'Behavioural Guardrail Strategy',
    ref: 'II.H.21',
    tagline: 'Pre-committed rules that block panic actions.',
    classifications: ['behavioural-stability'],
    goalKinds: ['corpus-build', 'income'],
    horizon: 'any',
    riskBand: { min: 0, max: 100 },
    biasCompat: { lossAversion: 100, presentBias: 100, statusSeeking: 90, herding: 95, overconfidence: 90 },
    allocation: { equityShare: 0.50, glideDown: false, buckets: { b1: 0.10, b2: 0.25, b3: 0.30, b4: 0.35 } },
  },
  {
    id: 'fire',
    name: 'FIRE — Financial Independence Retire Early',
    ref: 'II.D.13',
    tagline: 'Aggressive build-up to fund early retirement.',
    classifications: ['capital-appreciation', 'multi-generational'],
    goalKinds: ['corpus-build'],
    horizon: 'long',
    riskBand: { min: 65, max: 100 },
    biasCompat: { lossAversion: 50, presentBias: 60, statusSeeking: 60, herding: 70, overconfidence: 80 },
    allocation: { equityShare: 0.85, glideDown: false, buckets: { b1: 0.05, b2: 0.05, b3: 0.10, b4: 0.80 } },
    signature: 'Suits ≤ 50, 70 %+ equity, 4 % rule lens.',
  },
  {
    id: 'education',
    name: 'Child Education Strategy',
    ref: 'II.I.24',
    tagline: 'Targeted corpus for higher-education with education inflation.',
    classifications: ['liability-matching', 'capital-appreciation', 'inflation-protection'],
    goalKinds: ['event', 'corpus-build'],
    horizon: 'mid',
    riskBand: { min: 30, max: 80 },
    biasCompat: { lossAversion: 80, presentBias: 80, statusSeeking: 70, herding: 80, overconfidence: 70 },
    allocation: { equityShare: 0.65, glideDown: true,  buckets: { b1: 0.05, b2: 0.20, b3: 0.25, b4: 0.50 } },
    signature: 'Education inflation 10-12 % vs general 6 %.',
  },
] as const

// ─── Helpers ──────────────────────────────────────────────────────────

export function strategyById(id: string): Strategy | undefined {
  return STRATEGY_CATALOGUE.find((s) => s.id === id)
}

export function strategiesByClassification(c: StrategyClassification): Strategy[] {
  return STRATEGY_CATALOGUE.filter((s) => s.classifications.includes(c))
}
