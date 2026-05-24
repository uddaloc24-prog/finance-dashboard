// React hook that wraps the orchestration engine. Memoises on the
// (profile, buckets) tuple so it only re-runs when relevant state moves.
// `now` is fixed at first call so re-renders within the same session
// produce identical `emittedAt` / `inputsHash` (memo §2.4).

import { useMemo } from 'react'
import type { UserProfile, BucketState } from '../types'
import type { EngineOutput } from '../types/orchestration'
import { buildOrchestrationInputsFromStorage } from '../lib/orchestration/inputs'
import { rankGoals } from '../lib/orchestration/rankGoals'

export function useRankedGoals(profile: UserProfile, buckets: BucketState): EngineOutput {
  return useMemo(() => {
    const now = new Date()
    const input = buildOrchestrationInputsFromStorage(profile, buckets, now)
    return rankGoals(input, now)
  }, [profile, buckets])
}
