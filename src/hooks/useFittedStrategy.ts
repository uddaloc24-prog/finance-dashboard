// React hook chaining the orchestration engine → strategy fitter.
// Returns both outputs so the EnginePage can render ranked goals AND
// the fitted strategy side by side.
//
// Memoises on (profile, buckets) so re-renders without state changes
// produce identical results (memo §2.4 determinism).

import { useMemo } from 'react'
import type { UserProfile, BucketState } from '../types'
import type { EngineInput, EngineOutput, StrategyFit } from '../types/orchestration'
import { buildOrchestrationInputsFromStorage } from '../lib/orchestration/inputs'
import { rankGoals } from '../lib/orchestration/rankGoals'
import { fitStrategy } from '../lib/orchestration/fitStrategy'

export interface OrchestrationResult {
  input: EngineInput
  ranked: EngineOutput
  fit: StrategyFit
}

export function useFittedStrategy(profile: UserProfile, buckets: BucketState): OrchestrationResult {
  return useMemo(() => {
    const now = new Date()
    const input = buildOrchestrationInputsFromStorage(profile, buckets, now)
    const ranked = rankGoals(input, now)
    const fit = fitStrategy(input, ranked, now)
    return { input, ranked, fit }
  }, [profile, buckets])
}
