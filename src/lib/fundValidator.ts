import type { FundPick, BucketKey, CuratedFund } from '../types/v2'
import { findCuratedFund, defaultFundPerBucket } from '../constants/curatedFunds'

export interface ValidationReport {
  validated: Record<BucketKey, FundPick[]>
  invalidCodes: string[]
  fallbacksUsed: BucketKey[]
}

export function validateFundPicks(
  picks: Partial<Record<BucketKey, FundPick[]>>,
): ValidationReport {
  const buckets: BucketKey[] = ['b1', 'b2', 'b3', 'b4']
  const validated: Record<BucketKey, FundPick[]> = { b1: [], b2: [], b3: [], b4: [] }
  const invalidCodes: string[] = []
  const fallbacksUsed: BucketKey[] = []

  for (const b of buckets) {
    const bucketPicks = picks[b] ?? []
    const cleaned: FundPick[] = []

    for (const pick of bucketPicks) {
      const curated = findCuratedFund(pick.schemeCode)
      if (curated && curated.bucket === b) {
        cleaned.push({ ...pick, schemeName: curated.schemeName })
      } else {
        invalidCodes.push(pick.schemeCode)
      }
    }

    if (cleaned.length === 0) {
      cleaned.push(fallbackPick(b))
      fallbacksUsed.push(b)
    }

    validated[b] = cleaned
  }

  return { validated, invalidCodes, fallbacksUsed }
}

function fallbackPick(bucket: BucketKey): FundPick {
  const fund: CuratedFund = defaultFundPerBucket(bucket)
  return {
    schemeCode: fund.schemeCode,
    schemeName: fund.schemeName,
    nav: 0,
    oneYearReturn: null,
    threeYearReturn: null,
    suggestedAllocation: 100,
    rationale: `Default pick (AI returned unrecognized scheme). ${fund.category} fund, AUM ~₹${fund.aumCrore?.toLocaleString('en-IN') ?? '-'} Cr.`,
  }
}
