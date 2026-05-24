// React hook chaining the orchestration engine → strategy fitter.
// Returns both outputs so the EnginePage can render ranked goals AND
// the fitted strategy side by side.
//
// Memoises on (profile, buckets) so re-renders without state changes
// produce identical results (memo §2.4 determinism).

import { useMemo, useEffect, useRef } from 'react'
import type { UserProfile, BucketState } from '../types'
import type { EngineInput, EngineOutput, StrategyFit } from '../types/orchestration'
import { buildOrchestrationInputsFromStorage } from '../lib/orchestration/inputs'
import { rankGoals } from '../lib/orchestration/rankGoals'
import { fitStrategy } from '../lib/orchestration/fitStrategy'
import { writeSnapshot } from '../lib/orchestration/snapshot'

export interface OrchestrationResult {
  input: EngineInput
  ranked: EngineOutput
  fit: StrategyFit
}

export function useFittedStrategy(profile: UserProfile, buckets: BucketState): OrchestrationResult {
  const result = useMemo<OrchestrationResult>(() => {
    const now = new Date()
    const input = buildOrchestrationInputsFromStorage(profile, buckets, now)
    const ranked = rankGoals(input, now)
    const fit = fitStrategy(input, ranked, now)
    return { input, ranked, fit }
  }, [profile, buckets])

  // Persist a snapshot when the engine input hash changes — lets the
  // exporters render even after the user navigates away, and gives the
  // PDF / DOCX a clean as-of timestamp. Skipped if hash didn't move.
  const lastHash = useRef<string | null>(null)
  useEffect(() => {
    if (result.ranked.inputsHash !== lastHash.current) {
      lastHash.current = result.ranked.inputsHash
      writeSnapshot(result.ranked, result.fit)
    }
  }, [result])

  return result
}
