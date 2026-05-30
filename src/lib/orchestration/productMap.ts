// productMap — pick the top product categories per bucket per goal,
// then turn the bucket allocation (Phase 5) into a concrete product
// plan with INR amounts.
//
// Scoring (each product in the bucket independently):
//   • taxFit   ∈ {0, 60, 100}      — does the user's tax bracket match?
//   • ageFit   ∈ {0, 100}          — is the user inside the product's age band?
//   • riskFit  ∈ [0, 100]          — alignment with fusedRisk and bias signals
//   • returnFit∈ [0, 100]          — preference for higher real return,
//                                    tempered by lockYears penalty
//
// Weights are bucket-dependent — protection-oriented buckets weight
// taxFit + ageFit; growth buckets weight returnFit + riskFit.
//
// Then top-K products by weighted score get an equal-share-ish blend
// (most-fit gets a heavier slice), normalised to sum = 1 within the
// bucket.
//
// Pure function · deterministic.

import type {
  EngineInput, RawGoal, ProductPlan, GoalProductPlan, BucketProductSlice,
  ProductSliceItem, BucketId, StrategySelection, FittedGoal,
} from '../../types/orchestration'
import {
  productsForBucket, type ProductCategory,
} from './productCatalogue'
import { hashInput } from './hash'

const TOP_K_PER_BUCKET = 3

// ─── Per-bucket weighting profile ─────────────────────────────────────

const BUCKET_WEIGHTS: Record<BucketId, { tax: number; age: number; risk: number; ret: number }> = {
  b1: { tax: 0.30, age: 0.10, risk: 0.10, ret: 0.50 },  // liquidity — favour post-tax yield
  b2: { tax: 0.35, age: 0.30, risk: 0.05, ret: 0.30 },  // floor — tax + age critical (SCSS, PPF)
  b3: { tax: 0.20, age: 0.20, risk: 0.30, ret: 0.30 },  // stability — balanced
  b4: { tax: 0.15, age: 0.10, risk: 0.35, ret: 0.40 },  // growth — risk-fit + return
}

// ─── Per-product scorers ──────────────────────────────────────────────

function scoreTaxFit(p: ProductCategory, taxBracket: number): number {
  if (p.taxBracketFit.length === 0) return 60
  if (p.taxBracketFit.includes(taxBracket as 0 | 5 | 20 | 30)) return 100
  // Adjacent bracket → partial fit
  const adjacent = p.taxBracketFit.some((b) => Math.abs(b - taxBracket) <= 10)
  return adjacent ? 60 : 0
}

function scoreAgeFit(p: ProductCategory, currentAge: number): number {
  return currentAge >= p.ageBand.min && currentAge <= p.ageBand.max ? 100 : 0
}

function scoreReturnFit(p: ProductCategory, bucket: BucketId): number {
  // Reward higher real return, penalise long lockups (less per bucket).
  const lockPenalty = bucket === 'b1' ? 12 : bucket === 'b2' ? 3 : 5
  const raw = p.typicalRealReturn * 10 - p.lockYears * lockPenalty
  // Map roughly [−40 .. 80] → [0..100]
  return Math.max(0, Math.min(100, raw + 30))
}

interface UserBiasSummary {
  overconfidence: number
  lossAversion: number
  statusSeeking: number
}

function scoreRiskFit(p: ProductCategory, fusedRisk: number, biasSummary: UserBiasSummary): number {
  // Each product carries an implicit "risk weight" via its bucket + vehicle.
  // Approximate it from typicalRealReturn (higher = riskier).
  const productRiskProxy = Math.min(100, p.typicalRealReturn * 14)   // 5 % → 70, 7 % → 98
  const userTolerance = fusedRisk
  const gap = Math.abs(productRiskProxy - userTolerance)
  let score = Math.max(0, 100 - gap)

  // Bias adjustments
  if (biasSummary.overconfidence > 70 && p.vehicle === 'mid-cap-mf') score *= 0.5
  if (biasSummary.lossAversion   > 70 && p.bucket === 'b4')          score *= 0.7
  if (biasSummary.statusSeeking  > 70 && p.vehicle === 'index-fund') score *= 0.85

  return Math.round(score)
}

// ─── Main entry ───────────────────────────────────────────────────────

export function buildProductPlan(
  input: EngineInput,
  fittedGoals: FittedGoal[],
  strategies: StrategySelection | undefined,
  now: Date = new Date(),
): ProductPlan {
  const { plan, preferences } = input
  const taxBracket = plan.taxBracket
  const currentAge = plan.currentAge
  const fusedRisk = preferences.fusedRisk.score
  const biasSummary: UserBiasSummary = {
    overconfidence: preferences.bias.signals.overconfidence,
    lossAversion:   preferences.bias.signals.lossAversion,
    statusSeeking:  preferences.bias.signals.statusSeeking,
  }

  const byGoal: GoalProductPlan[] = fittedGoals.map((fg) => {
    const goal = input.goals.find((g) => g.id === fg.goalId)
    const totalAllocated = fg.corpusAllocated

    // 1. Compute raw (un-rounded) per-bucket amounts.
    const rawAmounts: Record<BucketId, number> = {
      b1: totalAllocated * fg.bucketSplit.b1,
      b2: totalAllocated * fg.bucketSplit.b2,
      b3: totalAllocated * fg.bucketSplit.b3,
      b4: totalAllocated * fg.bucketSplit.b4,
    }

    // 2. Round to whole rupees, track residuals.
    const rounded: Record<BucketId, number> = {
      b1: Math.round(rawAmounts.b1),
      b2: Math.round(rawAmounts.b2),
      b3: Math.round(rawAmounts.b3),
      b4: Math.round(rawAmounts.b4),
    }

    // 3. Distribute rounding drift onto the largest bucket so the four
    //    amounts sum to exactly round0(totalAllocated). Keeps audit math
    //    crisp: ∑ slice.amount == goal.totalAllocated.
    const targetSum = Math.round(totalAllocated)
    let currentSum = rounded.b1 + rounded.b2 + rounded.b3 + rounded.b4
    const drift = targetSum - currentSum
    if (drift !== 0) {
      const order = (['b1', 'b2', 'b3', 'b4'] as BucketId[])
        .sort((x, y) => rounded[y] - rounded[x])
      rounded[order[0]] += drift
    }

    const slices: BucketProductSlice[] = (['b1', 'b2', 'b3', 'b4'] as BucketId[]).map((b) => {
      const amount = rounded[b]
      if (amount < 1) return { bucket: b, amount: 0, items: [] }
      const items = pickProductsForBucket(b, goal, taxBracket, currentAge, fusedRisk, biasSummary, amount)
      return { bucket: b, amount, items }
    })

    return {
      goalId: fg.goalId,
      totalAllocated: round0(totalAllocated),
      slices,
    }
  })

  return {
    byGoal,
    emittedAt: now.toISOString(),
    inputsHash: hashInput({
      engineHash: hashInput(input),
      selectorHash: strategies?.inputsHash ?? '',
      productVersion: 1,
    }),
  }
}

// ─── Per-bucket pick ──────────────────────────────────────────────────

function pickProductsForBucket(
  bucket: BucketId,
  goal: RawGoal | undefined,
  taxBracket: number,
  currentAge: number,
  fusedRisk: number,
  biasSummary: UserBiasSummary,
  bucketAmount: number,
): ProductSliceItem[] {
  const products = productsForBucket(bucket)
  if (products.length === 0) return []

  const w = BUCKET_WEIGHTS[bucket]
  const scored = products.map((p) => {
    const taxFit    = scoreTaxFit(p, taxBracket)
    const ageFit    = scoreAgeFit(p, currentAge)
    const riskFit   = scoreRiskFit(p, fusedRisk, biasSummary)
    const returnFit = scoreReturnFit(p, bucket)
    const composite = w.tax * taxFit + w.age * ageFit + w.risk * riskFit + w.ret * returnFit
    return { product: p, composite: Math.round(composite) }
  })

  // Stable sort by composite desc, then id asc for tie-break.
  scored.sort((a, b) =>
    b.composite - a.composite
    || a.product.id.localeCompare(b.product.id)
  )

  const picked = scored.slice(0, TOP_K_PER_BUCKET).filter((s) => s.composite > 0)
  if (picked.length === 0) return []

  // Softmax-like weight allocation across the picked products.
  // Highest scorer gets ~50 %; remainder split proportionally.
  const sum = picked.reduce((s, p) => s + p.composite, 0)
  if (sum <= 0) return []

  const items: ProductSliceItem[] = picked.map((s) => {
    const weight = s.composite / sum
    const amount = round0(bucketAmount * weight)
    return {
      categoryId: s.product.id,
      name: s.product.name,
      weight: round4(weight),
      amount,
      rationale: enrichRationale(s.product, goal),
    }
  })

  // Final pass: ensure weights sum exactly to 1.0 by adjusting the largest.
  const wSum = items.reduce((s, i) => s + i.weight, 0)
  if (Math.abs(wSum - 1) > 1e-6 && items.length > 0) {
    const drift = 1 - wSum
    const idx = items.reduce((maxI, _, i, arr) => arr[i].weight > arr[maxI].weight ? i : maxI, 0)
    items[idx].weight = round4(items[idx].weight + drift)
  }

  return items
}

function enrichRationale(p: ProductCategory, goal: RawGoal | undefined): string {
  let base = p.rationale
  if (goal?.kind === 'income' && p.vehicle === 'scss') base += ' Funds the monthly draw.'
  if (goal?.kind === 'event' && p.lockYears > 0)
    base += ` Lock-in ${p.lockYears} y aligns with the target.`
  return base
}

// ─── Helpers ──────────────────────────────────────────────────────────

function round0(v: number): number { return Math.round(v) }
function round4(v: number): number { return Math.round(v * 10000) / 10000 }
