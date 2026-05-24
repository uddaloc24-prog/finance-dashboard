// OrchestrationInputs aggregator — pulls from the Plan store, the
// Profile store (GD + v10), and the legacy Goals store, and assembles
// the single EngineInput contract that the Goal Ranking Engine will
// consume. No side effects, no I/O — all state is passed in.
//
// Memo reference: §3 (input contract) + audit gap F1.

import type { UserProfile, BucketState, AssetEntry, LoanEntry, InsuranceEntry } from '../../types'
import type { GoalDiscoveryState, V10QuizState } from '../../types/psychometric'
import type { Goal } from '../../types/v2'
import type {
  EngineInput, PlanFacts, Preferences,
} from '../../types/orchestration'
import { totalCorpus } from '../calculations'
import { blendedReturn } from '../blendedReturn'
import { storage } from '../storage'
import { goalsFromGd, goalsFromManual, mergeGoals } from './goalsFromGd'

export interface BuildArgs {
  profile: UserProfile
  buckets: BucketState
  gd?: GoalDiscoveryState | null
  v10?: V10QuizState | null
  manualGoals?: Goal[]
  /** Defaults to `new Date()`. Override for deterministic tests. */
  now?: Date
}

/** Compose the full EngineInput. Pure function; no storage reads when
 *  every dependency is passed in. */
export function buildOrchestrationInputs(args: BuildArgs): EngineInput {
  return {
    plan: distilPlanFacts(args.profile, args.buckets),
    preferences: distilPreferences(args.gd ?? null, args.v10 ?? null),
    goals: mergeGoals(
      goalsFromManual(args.manualGoals ?? []),
      goalsFromGd(args.gd ?? null, args.now ?? new Date()),
    ),
  }
}

/** Convenience wrapper that reads optional pieces from storage. Use this
 *  inside React; keep the pure variant for tests. */
export function buildOrchestrationInputsFromStorage(profile: UserProfile, buckets: BucketState, now?: Date): EngineInput {
  return buildOrchestrationInputs({
    profile,
    buckets,
    gd:           storage.getGoalDiscovery() ?? null,
    v10:          storage.getV10QuizState() ?? null,
    manualGoals:  storage.getGoals() ?? [],
    now,
  })
}

// ─── Plan distillation ─────────────────────────────────────────────────

function distilPlanFacts(profile: UserProfile, buckets: BucketState): PlanFacts {
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

    currentAge:     profile.demographics?.currentAge     ?? 60,
    retireAge:      profile.demographics?.retirementAge  ?? 60,
    lifeExpectancy: profile.demographics?.lifeExpectancy ?? 88,

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

function distilPreferences(gd: GoalDiscoveryState | null, v10: V10QuizState | null): Preferences {
  const persona = gd?.inference?.persona
  return {
    personaPrimary:    persona?.primary?.id ?? null,
    personaConfidence: persona?.confidence ?? 'unclassified',
    riskProfile:       v10?.composites?.riskProfile ?? null,
    moneyScript:       v10?.composites?.dominantMoneyScript ?? null,
    // weightOverrides intentionally absent in v1 — UI surface comes in
    // Phase 7 after engine ships. Engine treats absence as "use persona
    // defaults" (memo §6 step 1).
  }
}
