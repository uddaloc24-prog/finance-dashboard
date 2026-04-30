// 10-Strategy Comparison Engine — types for the global retirement strategy
// catalog from the academic PDF reference. Each strategy has fixed parameters
// + a simulator that produces a projection on the user's actual corpus.

export type StrategyId =
  | 'rule4pct'
  | 'guardrails'
  | 'vanguard'
  | 'bucket3'
  | 'bucket4india'
  | 'npsHybrid'
  | 'scssPmvvy'
  | 'rmdBased'
  | 'tipsLadder'
  | 'constantPct'

export type Verdict = 'PASSES' | 'PARTIAL' | 'FAILS' | 'NOT_APPLICABLE' | 'BEST_FIT'

export type FeasibilityRating = 'very-high' | 'high' | 'moderate' | 'low' | 'na'
export type PreservationRating = 'high' | 'moderate' | 'low' | 'none'
export type InflationRating = 'excellent' | 'good' | 'partial' | 'poor' | 'none'

export interface ScoreDimensions {
  achievesTarget: number       // /10 — meets monthly income target
  principalAfter20yr: number   // /10 — corpus preservation
  inflationProtection: number  // /10
  taxEfficiency: number        // /10
  indiaFeasibility: number     // /10
  simplicity: number           // /10
}

export interface StrategyDefinition {
  id: StrategyId
  name: string
  origin: string                          // e.g. 'USA — Trinity Study (1998)'
  flag: string                            // emoji flag
  safeWRrange: [number, number]           // % e.g. [3.5, 4.5]
  principalPreservation: PreservationRating
  indiaFeasibility: FeasibilityRating
  inflationProtection: InflationRating
  description: string
  pros: string[]
  cons: string[]
  scoreDimensions: ScoreDimensions        // baseline scores from PDF (1-10 each)
}

export interface StrategyResult {
  id: StrategyId
  name: string
  flag: string
  yearlyCorpus: number[]                  // index 0 = year 0 (start), through year N
  monthlyIncomeOnCorpus: number           // gross monthly INR sustained at safe WR
  postTaxMonthlyIncome: number            // net of Indian tax (LTCG / slab / 80TTB)
  taxDragPct: number                      // percent of gross lost to tax (0..100)
  finalCorpus: number                     // corpus at horizon (or 0 if depleted)
  depletionYear: number | null            // null if never depletes within horizon
  effectiveWR: number                     // user's actual annual WR (annual / corpus) %
  safeWRmid: number                       // mid of strategy's safe WR range
  totalScore: number                      // /60
  scoreDimensions: ScoreDimensions        // adjusted dimensions
  verdict: Verdict
  verdictReason: string                   // explanation for the verdict
  isBestFit: boolean
}
