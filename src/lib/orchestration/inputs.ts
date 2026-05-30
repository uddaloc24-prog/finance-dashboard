// OrchestrationInputs aggregator — pulls from the Plan store, the
// Profile store (GD + v10), and the legacy Goals store, and assembles
// the single EngineInput contract that the Goal Ranking Engine will
// consume. No side effects, no I/O — all state is passed in.
//
// Memo reference: §3 (input contract) + audit gap F1.

import type { UserProfile, BucketState, AssetEntry, LoanEntry, InsuranceEntry } from '../../types'
import type { GoalDiscoveryState, V10QuizState } from '../../types/psychometric'
import type { QuizState } from '../../types/profiles'
import type { Goal } from '../../types/v2'
import type {
  EngineInput, PlanFacts, Preferences, CriterionWeights,
} from '../../types/orchestration'
import { totalCorpus } from '../calculations'
import { blendedReturn } from '../blendedReturn'
import { storage } from '../storage'
import { goalsFromGd, goalsFromManual, mergeGoals } from './goalsFromGd'
import { fuseRisk } from './riskFusion'
import { deriveBiasProfile } from './biasProfile'

export interface BuildArgs {
  profile: UserProfile
  buckets: BucketState
  gd?: GoalDiscoveryState | null
  v10?: V10QuizState | null
  manualGoals?: Goal[]
  /** Risk Profile & Assessment — Deep quiz percent (0..100). Null if not taken. */
  deepRiskPercent?: number | null
  /** Quick 10-Q quiz state for `totalScore`. Null if not taken. */
  quickQuiz?: QuizState | null
  /** Memo §2.2 — user-tunable MCDA weight overrides; merged with persona
   *  defaults inside resolveWeights() at engine run-time. */
  weightOverrides?: Partial<CriterionWeights> | null
  /** Defaults to `new Date()`. Override for deterministic tests. */
  now?: Date
}

/** Compose the full EngineInput. Pure function; no storage reads when
 *  every dependency is passed in. */
export function buildOrchestrationInputs(args: BuildArgs): EngineInput {
  const now = args.now ?? new Date()
  return {
    plan: distilPlanFacts(args.profile, args.buckets, now),
    preferences: distilPreferences(
      args.profile,
      args.gd  ?? null,
      args.v10 ?? null,
      args.deepRiskPercent ?? null,
      args.quickQuiz ?? null,
      args.weightOverrides ?? null,
    ),
    goals: mergeGoals(
      goalsFromManual(args.manualGoals ?? []),
      goalsFromGd(args.gd ?? null, now),
    ),
  }
}

/** Convenience wrapper that reads optional pieces from storage. Use this
 *  inside React; keep the pure variant for tests. */
export function buildOrchestrationInputsFromStorage(profile: UserProfile, buckets: BucketState, now?: Date): EngineInput {
  return buildOrchestrationInputs({
    profile,
    buckets,
    gd:               storage.getGoalDiscovery() ?? null,
    v10:              storage.getV10QuizState() ?? null,
    manualGoals:      storage.getGoals() ?? [],
    // Deep risk percent isn't persisted today (lives only in ProfilesPanel
    // component state). When it gets stored, plumb it here.
    deepRiskPercent:  null,
    quickQuiz:        storage.getQuizState() ?? null,
    weightOverrides:  storage.getWeightOverrides() ?? null,
    now,
  })
}

// ─── Plan distillation ─────────────────────────────────────────────────

function distilPlanFacts(profile: UserProfile, buckets: BucketState, now: Date): PlanFacts {
  const inv = (profile.assetInventory ?? {}) as Record<string, AssetEntry>
  const assets = Object.values(inv)
  const totalAssets = assets.reduce((s, e) => s + (e?.amount || 0), 0)
  const liquidCorpus = assets.filter((e) => e?.status === 'liquid').reduce((s, e) => s + (e?.amount || 0), 0)
  const passiveIncome = assets.reduce((s, e) => s + (e?.monthlyIncome || 0), 0)

  const lp = profile.loanProfile
  const activeLoans = lp
    ? (Object.entries(lp).filter(([k]) => k !== 'strategy') as Array<[string, LoanEntry]>).filter(([, l]) => l?.active)
    : []
  const liabilities = activeLoans.reduce((s, [, l]) => s + (l.outstanding || 0), 0)
  const monthlyEMI  = activeLoans.reduce((s, [, l]) => s + (l.emi || 0), 0)
  // Preserve per-loan rates (sorted desc) so the high-rate-debt rule
  // in preempt.ts can pick out individual high-cost liabilities. The
  // threshold is applied at the rule level, not at distillation.
  const loans = activeLoans
    .map(([, l]) => ({
      outstanding:  l.outstanding  || 0,
      interestRate: l.interestRate || 0,
      emi:          l.emi          || 0,
    }))
    .sort((a, b) => b.interestRate - a.interestRate)

  const exp = profile.expenses
  const monthlyBurn = exp
    ? (exp.essential ?? 0) + (exp.lifestyle ?? 0) + (exp.healthcare ?? 0) + (exp.education ?? 0)
    : 0

  const ins = profile.insuranceCover
  const insEntry = (key: keyof NonNullable<typeof ins>): InsuranceEntry | undefined => ins?.[key]
  const sumActiveCover = (keys: Array<keyof NonNullable<typeof ins>>): number =>
    keys.map(insEntry).filter((e): e is InsuranceEntry => !!e?.active).reduce((s, e) => s + (e.cover || 0), 0)

  return {
    corpus:      totalCorpus(buckets) || profile.corpus || 0,
    netWorth:    totalAssets - liabilities,
    liquidCorpus,
    passiveIncome,

    monthlyBurn,
    monthlyEMI,
    monthlyWithdrawal: profile.monthlyWithdrawal ?? 0,
    monthlySIP:        profile.sipAmount ?? 0,

    loans,

    currentAge:     profile.demographics?.currentAge     ?? 60,
    retireAge:      profile.demographics?.retirementAge  ?? 60,
    lifeExpectancy: profile.demographics?.lifeExpectancy ?? 88,
    currentYear:    now.getFullYear(),

    inflation: {
      general:    exp?.generalInflation    ?? profile.inflationRate ?? 6,
      healthcare: exp?.healthcareInflation ?? 8.5,
      education:  exp?.educationInflation  ?? 10,
    },

    blendedReturn: blendedReturn(storage.getReturnAssumptions(), profile.bucketAllocation),

    insurance: {
      healthCover: sumActiveCover(['familyFloater', 'personalHealth', 'superTopUp', 'seniorCitizen', 'corporateGroup']),
      lifeCover:   sumActiveCover(['termPlan', 'wholeLife']),
      ciCover:     insEntry('criticalIllness')?.active ? (insEntry('criticalIllness')?.cover ?? 0) : 0,
      termActive:  !!insEntry('termPlan')?.active,
      termMwp:     !!insEntry('termPlan')?.mwp,
    },

    taxBracket:   profile.taxBracket,
    riskAppetite: profile.riskAppetite,
  }
}

// ─── Preferences distillation ──────────────────────────────────────────

function distilPreferences(
  profile: UserProfile,
  gd: GoalDiscoveryState | null,
  v10: V10QuizState | null,
  deepRiskPercent: number | null,
  quickQuiz: QuizState | null,
  weightOverrides: Partial<CriterionWeights> | null,
): Preferences {
  const persona = gd?.inference?.persona
  const fusedRisk = fuseRisk({
    planRiskAppetite: profile.riskAppetite,
    v10RiskProfile:   v10?.composites?.riskProfile ?? null,
    deepRiskPercent,
    quickQuizScore:   quickQuiz?.totalScore ?? null,
  })
  return {
    personaPrimary:    persona?.primary?.id ?? null,
    personaConfidence: persona?.confidence ?? 'unclassified',
    // Legacy: still v10-only. Downstream code reads fusedRisk.score now.
    riskProfile:       v10?.composites?.riskProfile ?? null,
    fusedRisk,
    bias:              deriveBiasProfile(v10, gd),
    moneyScript:       v10?.composites?.dominantMoneyScript ?? null,
    // Memo §2.2 — weightOverrides surfaced 2026-05-30. Empty object is
    // treated as "no override" by resolveWeights().
    weightOverrides:   weightOverrides && Object.keys(weightOverrides).length > 0
                         ? weightOverrides
                         : undefined,
  }
}
