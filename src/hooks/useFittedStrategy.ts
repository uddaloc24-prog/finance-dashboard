// React hook chaining the orchestration engine → strategy fitter.
// Returns both outputs so the EnginePage can render ranked goals AND
// the fitted strategy side by side.
//
// Memoises on (profile, buckets) so re-renders without state changes
// produce identical results (memo §2.4 determinism).

import { useMemo, useEffect, useRef } from 'react'
import type { UserProfile, BucketState } from '../types'
import type { EngineInput, EngineOutput, StrategyFit, StrategySelection, ProductPlan, MonitoringFramework } from '../types/orchestration'
import { buildOrchestrationInputsFromStorage } from '../lib/orchestration/inputs'
import { rankGoals } from '../lib/orchestration/rankGoals'
import { fitStrategy } from '../lib/orchestration/fitStrategy'
import { selectStrategies } from '../lib/orchestration/strategySelector'
import { buildProductPlan } from '../lib/orchestration/productMap'
import { buildMonitoringFramework } from '../lib/orchestration/monitoringFramework'
import { writeSnapshot } from '../lib/orchestration/snapshot'

export interface OrchestrationResult {
  input: EngineInput
  ranked: EngineOutput
  fit: StrategyFit
  /** Per-goal recommended strategy from the PDF's 12 MVP catalogue (Phase 4). */
  strategies: StrategySelection
  /** Per-goal per-bucket product breakdown with INR amounts (Phase 7). */
  productPlan: ProductPlan
  /** Structured review schedule keyed to strategies + products + bias (Phase 8). */
  monitoring: MonitoringFramework
}

export function useFittedStrategy(profile: UserProfile, buckets: BucketState): OrchestrationResult {
  const result = useMemo<OrchestrationResult>(() => {
    const now = new Date()
    const input = buildOrchestrationInputsFromStorage(profile, buckets, now)
    const ranked = rankGoals(input, now)
    const strategies = selectStrategies(input, now)
    // Phase 5: fitter receives `strategies` so per-goal bucket splits
    // reflect the recommended strategy + risk-tilt + safety-floor.
    const fit = fitStrategy(input, ranked, now, strategies)
    // Phase 7: turn each goal's bucket allocation into a concrete
    // product plan with INR amounts per category.
    const productPlan = buildProductPlan(input, fit.goals, strategies, now)
    // Phase 8: structured review schedule across strategies + products
    // + bias guardrails + age-keyed lifecycle.
    const monitoring = buildMonitoringFramework(input, fit.goals, strategies, productPlan, now)
    return { input, ranked, fit, strategies, productPlan, monitoring }
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
