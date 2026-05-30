// Strategy Fitter — Phase 6.
// Consumes the ranked goals from the Goal Ranking Engine + the same
// PlanFacts, and emits a concrete investment strategy: per-goal corpus
// allocation, SIP sizing, 4-bucket split, action list.
//
// Pure function · same input → identical output. Greedy by rank: each
// goal in priority order claims its needed corpus + SIP up to remaining
// capacity. Bucket split per goal is horizon-driven.
//
// Memo reference: §1 (architecture target), §7 (pre-emption already
// handled upstream by preempt.ts — fitter just funds them first by
// virtue of their rank).

import type {
  EngineInput, EngineOutput, RawGoal,
  StrategyFit, FittedGoal, FitTotals, BucketTargets, FitAction,
  StrategySelection,
} from '../../types/orchestration'
import { hashInput } from './hash'
import { strategyAwareBuckets } from './strategyBuckets'
import { buildGlidePath } from './glidePath'
import { strategyById } from './strategyCatalogue'

const STATUS_FUNDED_THRESHOLD = 0.05    // shortfall < 5% of cost → funded
const STATUS_PARTIAL_THRESHOLD = 0.50   // shortfall < 50% → partial; else unfunded

export function fitStrategy(
  input: EngineInput,
  engineOut: EngineOutput,
  now: Date = new Date(),
  strategies?: StrategySelection,
): StrategyFit {
  const { plan } = input

  // Capacity
  const sipCapacity = plan.monthlySIP + Math.max(0, plan.passiveIncome - plan.monthlyBurn - plan.monthlyEMI)
  let corpusRemaining = plan.corpus
  let sipRemaining = sipCapacity

  const goals: FittedGoal[] = engineOut.ranked.map((r, idx) => {
    const goalStrategy = strategies?.byGoal.find((g) => g.goalId === r.goal.id)
    const f = fitOneGoal(r.goal, plan, corpusRemaining, sipRemaining, idx + 1, input, goalStrategy)
    corpusRemaining = Math.max(0, corpusRemaining - f.corpusAllocated)
    sipRemaining = Math.max(0, sipRemaining - f.monthlySipAffordable)
    return f
  })

  const totals = computeTotals(goals, plan.corpus, sipCapacity)
  const bucketTargets = computeBucketTargets(goals, totals.corpusUsed)
  const actions = buildActions(goals, totals, bucketTargets, plan.corpus)

  return {
    goals,
    totals,
    bucketTargets,
    actions,
    emittedAt: now.toISOString(),
    inputsHash: hashInput({ engineHash: engineOut.inputsHash, fitterVersion: 1 }),
  }
}

// ─── Per-goal fit ─────────────────────────────────────────────────────

function fitOneGoal(
  goal: RawGoal,
  plan: EngineInput['plan'],
  corpusRemaining: number,
  sipRemaining: number,
  rank: number,
  input?: EngineInput,
  goalStrategy?: import('../../types/orchestration').GoalStrategy,
): FittedGoal {
  const targetYear = goal.startYear ?? plan.currentYear + 5
  const yrs = Math.max(0.5, targetYear - plan.currentYear)
  const months = yrs * 12
  const inflRate = (goal.inflationCategory === 'healthcare' ? plan.inflation.healthcare
                  : goal.inflationCategory === 'education'  ? plan.inflation.education
                  :                                            plan.inflation.general) / 100
  const inflatedCost = goal.amount * Math.pow(1 + inflRate, yrs)

  const annualReturn = plan.blendedReturn / 100
  const monthlyReturn = annualReturn / 12

  // 1. Compute corpus PV required to alone cover this goal
  const pvNeeded = inflatedCost / Math.pow(1 + annualReturn, yrs)
  const corpusAllocated = Math.min(pvNeeded, corpusRemaining)
  const corpusFvAtTarget = corpusAllocated * Math.pow(1 + annualReturn, yrs)

  // 2. Gap after corpus → required SIP
  const gapAfterCorpus = Math.max(0, inflatedCost - corpusFvAtTarget)
  const monthlySipNeeded = gapAfterCorpus <= 0
    ? 0
    : Math.abs(monthlyReturn) < 1e-9
      ? gapAfterCorpus / months
      : gapAfterCorpus * monthlyReturn / (Math.pow(1 + monthlyReturn, months) - 1)

  // 3. Affordable SIP = capped at remaining capacity
  const monthlySipAffordable = Math.min(monthlySipNeeded, sipRemaining)

  // 4. Project actual achievement with what we could fund
  const sipFv = monthlySipAffordable > 0 && Math.abs(monthlyReturn) > 1e-9
    ? monthlySipAffordable * (Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn
    : monthlySipAffordable * months
  const projectedAtTarget = corpusFvAtTarget + sipFv
  const shortfall = Math.max(0, inflatedCost - projectedAtTarget)

  const shortfallRatio = inflatedCost > 0 ? shortfall / inflatedCost : 0
  const status: FittedGoal['status'] =
    shortfallRatio < STATUS_FUNDED_THRESHOLD ? 'funded' :
    shortfallRatio < STATUS_PARTIAL_THRESHOLD ? 'partial' :
                                                'unfunded'

  // Bucket split — strategy-aware when input + strategy are provided,
  // falls back to horizon-only otherwise (used by legacy callers).
  const bucketSplit = input
    ? strategyAwareBuckets(goal, input, goalStrategy).buckets
    : bucketSplitFor(yrs)

  // Glide path — only when the recommended strategy has glideDown: true.
  // Falls back to empty array for static-allocation strategies.
  const glidePath = input
    ? buildGlidePath({
        goal,
        input,
        strategy: strategyById(goalStrategy?.recommended ?? ''),
        initialBuckets: bucketSplit,
      })
    : []

  return {
    goalId: goal.id,
    rank,
    corpusAllocated: round(corpusAllocated),
    monthlySipNeeded: round(monthlySipNeeded),
    monthlySipAffordable: round(monthlySipAffordable),
    bucketSplit,
    inflatedCost: round(inflatedCost),
    projectedAtTarget: round(projectedAtTarget),
    shortfall: round(shortfall),
    status,
    glidePath,
  }
}

// ─── Bucket split by horizon (memo §1, 4-bucket cascade) ──────────────

/** Map years-to-target → B1/B2/B3/B4 allocation. Tighter cash for near-
 *  term goals, equity tilt for long-term. Sums to 1.0. */
export function bucketSplitFor(yearsOut: number): { b1: number; b2: number; b3: number; b4: number } {
  if (yearsOut < 2)  return { b1: 1.00, b2: 0.00, b3: 0.00, b4: 0.00 }
  if (yearsOut < 4)  return { b1: 0.30, b2: 0.70, b3: 0.00, b4: 0.00 }
  if (yearsOut < 7)  return { b1: 0.10, b2: 0.40, b3: 0.40, b4: 0.10 }
  if (yearsOut < 12) return { b1: 0.05, b2: 0.20, b3: 0.40, b4: 0.35 }
  if (yearsOut < 20) return { b1: 0.05, b2: 0.10, b3: 0.30, b4: 0.55 }
  return                    { b1: 0.05, b2: 0.05, b3: 0.20, b4: 0.70 }
}

// ─── Aggregates ───────────────────────────────────────────────────────

function computeTotals(goals: FittedGoal[], corpus: number, sipCapacity: number): FitTotals {
  const corpusUsed = goals.reduce((s, g) => s + g.corpusAllocated, 0)
  const sipUsed = goals.reduce((s, g) => s + g.monthlySipAffordable, 0)
  const sipShortfall = goals.reduce((s, g) => s + Math.max(0, g.monthlySipNeeded - g.monthlySipAffordable), 0)
  return {
    corpus,
    corpusUsed: round(corpusUsed),
    corpusFree: round(Math.max(0, corpus - corpusUsed)),
    sipCapacity: round(sipCapacity),
    sipUsed: round(sipUsed),
    sipShortfall: round(sipShortfall),
    goalsFunded:   goals.filter((g) => g.status === 'funded').length,
    goalsPartial:  goals.filter((g) => g.status === 'partial').length,
    goalsUnfunded: goals.filter((g) => g.status === 'unfunded').length,
  }
}

function computeBucketTargets(goals: FittedGoal[], corpusUsed: number): BucketTargets {
  const acc = { b1: 0, b2: 0, b3: 0, b4: 0 }
  goals.forEach((g) => {
    acc.b1 += g.corpusAllocated * g.bucketSplit.b1
    acc.b2 += g.corpusAllocated * g.bucketSplit.b2
    acc.b3 += g.corpusAllocated * g.bucketSplit.b3
    acc.b4 += g.corpusAllocated * g.bucketSplit.b4
  })
  const denom = corpusUsed > 0 ? corpusUsed : 1
  return {
    b1: round(acc.b1), b2: round(acc.b2), b3: round(acc.b3), b4: round(acc.b4),
    b1Pct: acc.b1 / denom, b2Pct: acc.b2 / denom, b3Pct: acc.b3 / denom, b4Pct: acc.b4 / denom,
  }
}

// ─── Action list ──────────────────────────────────────────────────────

function buildActions(
  goals: FittedGoal[],
  totals: FitTotals,
  buckets: BucketTargets,
  corpus: number,
): FitAction[] {
  const out: FitAction[] = []
  let p = 1

  // 1. Mandatory reserves (system-sourced goals come first in rank order)
  const systemFunded = goals.filter((g) => g.goalId.startsWith('sys-'))
  if (systemFunded.length > 0) {
    const reserveAmount = systemFunded.reduce((s, g) => s + g.corpusAllocated, 0)
    out.push({
      priority: p++,
      category: 'reserve',
      title: `Reserve ₹${fmt(reserveAmount)} for mandatory protection floors`,
      detail: `${systemFunded.length} system goal${systemFunded.length > 1 ? 's' : ''} reserved before discretionary allocation (term, health, emergency, high-rate debt).`,
      amount: reserveAmount,
    })
  }

  // 2. SIP shortfall
  if (totals.sipShortfall > 0) {
    out.push({
      priority: p++,
      category: 'sip',
      title: `Monthly SIP gap: ₹${fmt(totals.sipShortfall)}/mo`,
      detail: 'Goals cannot all be fully funded at current SIP capacity. Options: lift SIP, cut budget, defer target years, or accept partial funding on lowest-rank goals.',
      amount: totals.sipShortfall,
    })
  }

  // 3. Free corpus
  if (totals.corpusFree > 0 && corpus > 0) {
    out.push({
      priority: p++,
      category: 'allocate',
      title: `Free corpus: ₹${fmt(totals.corpusFree)} after goal allocation`,
      detail: 'Surplus capital not assigned to any specific goal. Park per Bucket Target below, or earmark for a future goal (legacy / dream / liquidity buffer).',
      amount: totals.corpusFree,
    })
  }

  // 4. Unfunded goals — flag each
  const unfunded = goals.filter((g) => g.status === 'unfunded')
  unfunded.slice(0, 3).forEach((g) => {
    out.push({
      priority: p++,
      category: 'flag',
      title: `Goal #${g.rank} is currently unfunded`,
      detail: `Shortfall ₹${fmt(g.shortfall)} of ₹${fmt(g.inflatedCost)} target. Lower its priority, delay, or accept partial.`,
      amount: g.shortfall,
    })
  })

  // 5. Rebalance directive
  if (totals.corpusUsed > 0) {
    out.push({
      priority: p++,
      category: 'rebalance',
      title: 'Rebalance allocated corpus to Bucket Target',
      detail: `B1 ${(buckets.b1Pct * 100).toFixed(0)}% · B2 ${(buckets.b2Pct * 100).toFixed(0)}% · B3 ${(buckets.b3Pct * 100).toFixed(0)}% · B4 ${(buckets.b4Pct * 100).toFixed(0)}% — weighted by per-goal horizons.`,
    })
  }

  // 6. Healthy state
  if (out.length === 0 || (totals.sipShortfall === 0 && unfunded.length === 0 && totals.goalsFunded === goals.length)) {
    out.push({
      priority: p++,
      category: 'allocate',
      title: 'All goals on track at current SIP + corpus',
      detail: 'No shortfalls, no unfunded goals. Re-run quarterly or on major life events.',
    })
  }

  return out
}

// ─── Utils ────────────────────────────────────────────────────────────

function round(n: number): number { return Math.round(n) }

function fmt(n: number): string {
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)} L`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`
  return `${Math.round(n)}`
}
