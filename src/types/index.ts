export interface UserProfile {
  corpus: number
  monthlyWithdrawal: number
  inflationRate: number        // percent, e.g. 6.5
  riskAppetite: 1 | 2 | 3 | 4 | 5
  taxBracket: 0 | 5 | 20 | 30  // percent
  refreshInterval: 1 | 6       // hours
  groqApiKey: string
}

export interface ReturnAssumptions {
  b1: number   // percent e.g. 7.0
  b2: number
  b3: number
}

export interface BucketState {
  b1: number
  b2: number
  b3: number
}

export interface MFNav {
  schemeCode: string
  schemeName: string
  nav: number
  date: string
  oneYearReturn: number | null   // percent, null if insufficient data
  bucket: 'b1' | 'b2' | 'b3'
}

export interface MarketData {
  nifty: number | null
  niftChange: number | null
  sensex: number | null
  sensexChange: number | null
  gold: number | null           // ₹ per 10g
  scssRate: number              // percent, default 8.2
  fdRates: { SBI: number; HDFC: number; ICICI: number }
  mfNavs: MFNav[]
  lastRefreshed: string | null  // ISO timestamp
}

export interface SWPYearRow {
  year: number
  annualWithdrawal: number
  b1: number
  b2: number
  b3: number              // principal only — gains are harvested each year
  b3Harvested: number     // profit moved from B3 → B2 this year
  b1GrowthEarned: number  // return B1 earned before withdrawal
  b2GrowthEarned: number  // return B2 earned (after receiving B3 profit)
  b1RefillFromB2: number  // amount topped up B1 from B2 this year
  b2EmergencyFromB3: number // emergency: B3 principal → B2
  totalCorpus: number
  isLegacyYear: boolean
}

export interface AISuggestion {
  fund: string
  bucket: 'B1' | 'B2' | 'B3'
  nav: string
  oneYearReturn: string
  suggestedAllocation: string
  rationale: string
}

export interface AppState {
  profile: UserProfile | null
  buckets: BucketState | null
  returnAssumptions: ReturnAssumptions
  marketData: MarketData | null
  aiSuggestions: AISuggestion[] | null
  aiLastFetched: string | null
}
