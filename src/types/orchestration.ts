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

/** Names of risk-profile estimators that can contribute to the fusion. */
export type RiskSourceName = 'plan' | 'v10' | 'deep' | 'quick'

/** A single estimator's contribution to the fused risk profile. */
export interface RiskSource {
  name: RiskSourceName
  value: number      // normalised to 0..100
  weight: number     // share of total precision; ∑ weights = 1.0
}

/** Posterior distribution over the user's true risk profile, fused from
 *  every available estimator via inverse-variance Bayesian weighting. */
export interface FusedRiskProfile {
  score: number              // 0..100, posterior mean
  confidence: number         // 0..1, saturating function of total precision
  sources: RiskSource[]
  derivation: 'plan-only' | 'fused-2' | 'fused-3' | 'fused-4'
}

/** Behavioural guardrail recommended for downstream strategies. */
export interface BehaviouralGuardrail {
  id: string
  category: 'sip-freeze' | 'rebalance-cap' | 'commitment' | 'review-cadence' | 'flag'
  trigger: string         // human-readable condition that lights it up
  action: string          // human-readable action the user should take
  severity: 'low' | 'med' | 'high'
}

/** Structured behavioural-bias profile distilled from v10 money scripts +
 *  v10 bias composites + GD signals. Drives the strategy filter for the
 *  PDF's "Behavioural Stability" classification (§I.6) and "Behavioural
 *  Strategies" branch (§II.H). */
export interface BiasProfile {
  /** Normalised 0..1 distribution of the four money scripts; ∑ = 1. */
  scripts: Record<MoneyScriptId, number>
  dominantScript: MoneyScriptId | null
  /** Derived bias indicators, all 0..100. */
  signals: {
    lossAversion: number
    presentBias: number
    statusSeeking: number
    herding: number
    overconfidence: number
    scamVulnerability: number
    acquiescence: number
  }
  /** Suggested guardrails. */
  guardrails: BehaviouralGuardrail[]
  /** 0..1 confidence — how well-resolved this profile is. */
  confidence: number
}

/** What the user has revealed about themselves on the Profile tab. */
export interface Preferences {
  personaPrimary: PersonaId | null
  personaConfidence: PersonaConfidence
  /** Legacy single-source risk score (0-100 from v10 only). Retained for
   *  back-compat; downstream code should read `fusedRisk.score` instead. */
  riskProfile: number | null
  /** Bayesian fusion of Plan + v10 + Deep + Quick risk estimators. */
  fusedRisk: FusedRiskProfile
  /** Structured behavioural-bias profile (Phase 2). */
  bias: BiasProfile
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

// ─── Strategy Fitter (Phase 6) ─────────────────────────────────────────
//
// Consumes the ranked goals from the engine and emits a concrete
// investment strategy: per-goal corpus allocation, SIP sizing,
// 4-bucket split, and an action list. Pure function, deterministic.

/** A single sample along a goal's glide path. */
export interface GlidePoint {
  year: number                                                // calendar year
  yearsToTarget: number                                       // 0 at target year, T at today
  equityShare: number                                         // 0..1 = b3 + b4
  buckets: { b1: number; b2: number; b3: number; b4: number } // fractions summing 1.0
}

/** Per-goal funding plan emitted by the fitter. */
export interface FittedGoal {
  goalId: string                                              // matches RawGoal.id
  rank: number                                                // 1-based, same order as engine ranked
  corpusAllocated: number                                     // INR from corpus assigned to this goal
  monthlySipNeeded: number                                    // INR / month to close the gap
  monthlySipAffordable: number                                // INR / month actually fundable from capacity
  bucketSplit: { b1: number; b2: number; b3: number; b4: number }  // fractions summing 1.0
  inflatedCost: number                                        // FV at target year (category-inflated)
  projectedAtTarget: number                                   // corpus FV + SIP FV at target year
  shortfall: number                                           // max(0, inflatedCost − projectedAtTarget)
  status: 'funded' | 'partial' | 'unfunded'                   // funded < 5%, partial < 50%, unfunded ≥ 50%
  /** Annual glide samples — present only when the recommended strategy
   *  has `glideDown: true`. Empty array for static-allocation strategies. */
  glidePath: GlidePoint[]
}

export interface FitTotals {
  corpus: number                  // input corpus
  corpusUsed: number              // ∑ corpusAllocated
  corpusFree: number              // corpus − corpusUsed
  sipCapacity: number             // monthlySIP + max(0, passive − burn − EMI)
  sipUsed: number                 // ∑ monthlySipAffordable
  sipShortfall: number            // ∑ max(0, sipNeeded − sipAffordable)
  goalsFunded: number
  goalsPartial: number
  goalsUnfunded: number
}

export interface BucketTargets {
  b1: number; b2: number; b3: number; b4: number              // INR amounts (sum ≤ corpusUsed)
  b1Pct: number; b2Pct: number; b3Pct: number; b4Pct: number  // fractions summing 1.0 (of corpusUsed)
}

export interface FitAction {
  priority: number
  category: 'reserve' | 'allocate' | 'sip' | 'rebalance' | 'flag'
  title: string
  detail: string
  amount?: number                 // INR if relevant
}

export interface StrategyFit {
  goals: FittedGoal[]
  totals: FitTotals
  bucketTargets: BucketTargets
  actions: FitAction[]
  emittedAt: string
  inputsHash: string              // hash of (EngineInput, EngineOutput)
}

// ─── Strategy Selector (Phase 4 — PDF §III) ───────────────────────────
//
// Per-goal output of the TOPSIS strategy selector. `topsisScore` ∈ [0,1]
// is the relative closeness to the ideal solution; `criterionScores`
// holds the per-axis raw values so the Engine Explain page can render
// the trace.

export interface CriterionScores5 {
  riskFit:        number   // alignment between strategy.riskBand and fusedRisk
  biasFit:        number   // alignment between strategy.biasCompat and user's bias signals
  horizonFit:     number   // alignment between strategy.horizon and goal yearsOut
  classification: number   // dominance of the strategy's primary classification for the goal kind
  complexity:     number   // higher = simpler (penalty for over-engineered strategies)
}

export interface RankedStrategy {
  strategyId: string                  // matches Strategy.id in the catalogue
  rank: number                        // 1 = best fit
  topsisScore: number                 // 0..1, relative closeness to ideal
  criterionScores: CriterionScores5
}

export interface GoalStrategy {
  goalId: string                      // matches RawGoal.id
  ranked: RankedStrategy[]            // sorted by topsisScore desc
  /** Convenience: top-ranked strategy id. */
  recommended: string
}

export interface StrategySelection {
  byGoal: GoalStrategy[]
  emittedAt: string
  inputsHash: string                  // hash of (EngineInput, EngineOutput)
}

// ─── Product Category mapping (Phase 7 — PDF §IV pipeline final step) ─

export type BucketId = 'b1' | 'b2' | 'b3' | 'b4'

/** Tax treatment classes for Indian products. */
export type TaxTreatment =
  | 'slab'           // taxed at user's slab (e.g., savings interest, debt MFs)
  | 'ltcg-equity'    // 12.5 % above ₹1.25 L per FY (equity > 12 m)
  | 'exempt'         // PPF, EPF, tax-free bonds, eligible LTC

/** Allocation share within a single bucket, drawn from a specific product category. */
export interface ProductSliceItem {
  categoryId: string                  // matches ProductCategory.id
  name: string                        // human-readable
  weight: number                      // 0..1 share of THIS bucket
  amount: number                      // INR
  rationale: string                   // one-line "why this fits"
}

/** One bucket's product breakdown for one goal. */
export interface BucketProductSlice {
  bucket: BucketId
  amount: number                      // INR allocated to this bucket (across whole goal)
  items: ProductSliceItem[]           // ∑ weights = 1.0; ∑ amounts = amount
}

/** Product plan for a single goal. */
export interface GoalProductPlan {
  goalId: string
  totalAllocated: number              // INR = ∑ slice.amount
  slices: BucketProductSlice[]        // exactly 4 (one per bucket); items[] may be empty if amount=0
}

export interface ProductPlan {
  byGoal: GoalProductPlan[]
  emittedAt: string
  inputsHash: string                  // hash of (EngineInput, EngineOutput, StrategySelection)
}

// ─── Monitoring Framework (Phase 8 — PDF §III pipeline final step) ────

export type ReviewCadence =
  | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly' | 'event-driven'

export type ReviewKind =
  | 'rebalance'         // strategy-level — drift vs target buckets
  | 'glide-step'        // glide-path scheduled equity reduction
  | 'tax-action'        // LTCG harvest · regime check · 80TTB sweep
  | 'product-check'     // SCSS renewal · PPF extension · FD ladder rollover
  | 'guardrail-trigger' // behavioural guardrail fires
  | 'lifecycle'         // age-keyed milestone (60 SCSS · 70 annuity · 75 estate)
  | 'milestone'         // generic plan milestone

export type ReviewResponsibility =
  | 'user'              // active user decision
  | 'auto-debit'        // pre-committed, runs without action
  | 'advisor'           // SEBI-RIA / planner
  | 'ca'                // chartered accountant

export interface ReviewItem {
  id: string
  kind: ReviewKind
  cadence: ReviewCadence
  title: string
  detail: string                       // 1-2 line description
  trigger: string                      // condition that lights this review
  action: string                       // what to do when triggered
  responsibility: ReviewResponsibility
  priority: 1 | 2 | 3 | 4 | 5          // 1 = highest
  goalId?: string                      // null = portfolio-wide
  bucketId?: BucketId                  // null = not bucket-specific
  productId?: string                   // null = not product-specific
  /** ISO date for the next scheduled occurrence. Empty for event-driven. */
  nextDate: string
}

export interface ScheduledReview {
  date: string                         // ISO
  itemId: string
  summary: string
}

export interface MonitoringFramework {
  items: ReviewItem[]                  // sorted by priority then cadence
  upcoming: ScheduledReview[]          // 10 nearest by date, scheduled items only
  emittedAt: string
  inputsHash: string
}
