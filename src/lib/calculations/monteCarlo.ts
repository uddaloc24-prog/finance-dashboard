// Monte Carlo SWP simulation. Samples per-bucket annual returns from a normal
// distribution and runs the V2 refill-linked simulator N times. Aggregates
// into yearly percentile bands (p10/p25/median/p75/p90) and a success rate
// (% of runs where corpus stays positive through horizon).
//
// Runs synchronously in the main thread — 200 iterations × 25 years × cheap
// arithmetic completes in ~50–150ms, fast enough to skip a Web Worker.

import type { BucketState, ReturnAssumptions } from '../../types'
import { simulateRefillLinked, type ReturnShocks } from '../refillStrategy'
import { allocateBuckets } from '../calculations'
import { BUCKET_ALLOCATION, SWP_YEARS } from '../../constants'

// Volatility (std-dev of annual returns) per bucket — empirical Indian-market values
const VOLATILITY: ReturnAssumptions = {
  b1: 0.5,    // liquid funds: tiny vol
  b2: 1.5,    // short debt: low vol
  b3: 8.0,    // hybrid/BAF: moderate
  b4: 18.0,   // pure equity: high vol
}

export interface MonteCarloParams {
  corpus: number
  monthlyWithdrawal: number
  inflationRate: number
  returnAssumptions: ReturnAssumptions
  allocation?: { b1: number; b2: number; b3: number; b4: number }
  buckets?: BucketState
  horizonYears?: number
  runs?: number
}

export interface PercentileBand {
  year: number
  p10: number
  p25: number
  median: number
  p75: number
  p90: number
}

export interface MonteCarloResult {
  runs: number
  successRate: number              // 0..1
  yearlyPercentiles: PercentileBand[]
  medianFinalCorpus: number
  p10FinalCorpus: number
  p90FinalCorpus: number
  worstDepletionYear: number | null  // earliest year any run depletes
  durationMs: number
}

// Box-Muller transform — sample from N(mean, stdDev)
function sampleNormal(mean: number, stdDev: number): number {
  const u1 = Math.max(Math.random(), 1e-9)
  const u2 = Math.random()
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z0 * stdDev
}

export function runMonteCarlo(params: MonteCarloParams): MonteCarloResult {
  const start = (typeof performance !== 'undefined' ? performance.now() : Date.now())
  const horizon = params.horizonYears ?? SWP_YEARS
  const runs = params.runs ?? 200
  const allocation = params.allocation ?? BUCKET_ALLOCATION
  const baseBuckets = params.buckets ?? allocateBuckets(params.corpus, allocation)

  // Pre-allocate yearly columns: yearlyValues[year][run]
  const yearlyValues: number[][] = Array.from({ length: horizon + 1 }, () => [])
  let successCount = 0
  let earliestDepletion: number | null = null

  for (let run = 0; run < runs; run++) {
    // Build per-year shocks by sampling each bucket independently
    const shocks: ReturnShocks = {}
    for (let y = 1; y <= horizon; y++) {
      shocks[y] = {
        b1: sampleNormal(params.returnAssumptions.b1, VOLATILITY.b1),
        b2: sampleNormal(params.returnAssumptions.b2, VOLATILITY.b2),
        b3: sampleNormal(params.returnAssumptions.b3, VOLATILITY.b3),
        b4: sampleNormal(params.returnAssumptions.b4, VOLATILITY.b4),
      }
    }
    const projection = simulateRefillLinked({
      buckets: { ...baseBuckets },
      monthlyWithdrawal: params.monthlyWithdrawal,
      inflationRate: params.inflationRate,
      returnAssumptions: params.returnAssumptions,
      initialCorpus: params.corpus,
      horizonYears: horizon,
      shocks,
    })

    yearlyValues[0].push(params.corpus)
    let depleted = false
    for (let y = 1; y <= horizon; y++) {
      const row = projection[y - 1]
      const v = row?.totalCorpus ?? 0
      yearlyValues[y].push(v)
      if (v <= 0 && !depleted) {
        depleted = true
        if (earliestDepletion == null || y < earliestDepletion) earliestDepletion = y
      }
    }
    if (!depleted && (projection[horizon - 1]?.totalCorpus ?? 0) > 0) successCount++
  }

  const yearlyPercentiles: PercentileBand[] = []
  for (let y = 0; y <= horizon; y++) {
    const sorted = [...yearlyValues[y]].sort((a, b) => a - b)
    yearlyPercentiles.push({
      year: y,
      p10: pct(sorted, 0.10),
      p25: pct(sorted, 0.25),
      median: pct(sorted, 0.50),
      p75: pct(sorted, 0.75),
      p90: pct(sorted, 0.90),
    })
  }

  const finalSorted = [...yearlyValues[horizon]].sort((a, b) => a - b)
  const durationMs = Math.round(
    (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start,
  )

  return {
    runs,
    successRate: successCount / runs,
    yearlyPercentiles,
    medianFinalCorpus: pct(finalSorted, 0.50),
    p10FinalCorpus: pct(finalSorted, 0.10),
    p90FinalCorpus: pct(finalSorted, 0.90),
    worstDepletionYear: earliestDepletion,
    durationMs,
  }
}

function pct(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0
  const idx = Math.max(0, Math.min(sortedAsc.length - 1, Math.floor(p * (sortedAsc.length - 1))))
  return sortedAsc[idx]
}
