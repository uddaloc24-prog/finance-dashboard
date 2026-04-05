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
  b1: number   // percent e.g. 7.0  — Liquid / SCSS / FD
  b2: number   //                   — Short-term Debt / Corporate Bond
  b3: number   //                   — Hybrid / BAF / Multi-asset
  b4: number   //                   — Pure Equity (Flexi Cap / Large Cap)
}

export interface BucketState {
  b1: number
  b2: number
  b3: number
  b4: number
}

export interface MFNav {
  schemeCode: string
  schemeName: string
  nav: number
  date: string
  oneYearReturn: number | null   // percent, null if insufficient data
  bucket: 'b1' | 'b2' | 'b3' | 'b4'
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
  b3: number               // Hybrid/BAF — actively refills B1 & B2
  b4: number               // Equity — compounds; profits harvested to B3 when B3 needs it
  b4Harvested: number      // gains moved B4 → B3 this year (0 in most years)
  b1GrowthEarned: number
  b2GrowthEarned: number
  b3GrowthEarned: number
  b1RefillFromB2: number   // B2 → B1 transfer
  b2RefillFromB3: number   // B3 → B2 transfer
  b3HarvestFromB4: number  // B4 gains → B3 (same as b4Harvested, kept for clarity)
  b4EmergencyToB3: number  // emergency: B4 principal → B3
  totalCorpus: number
  isLegacyYear: boolean
}

export interface AISuggestion {
  fund: string
  bucket: 'B1' | 'B2' | 'B3' | 'B4'
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
