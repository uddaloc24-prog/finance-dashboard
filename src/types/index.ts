export type PaymentFrequency = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly'

export type CityTier = 'metro' | 'tier1' | 'tier2' | 'rural'

export interface Demographics {
  currentAge: number           // default 55
  retirementAge: number        // default 60
  lifeExpectancy: number       // default 90
  spouseAge?: number
  spouseLifeExpectancy?: number
  city: CityTier
}

export interface ExpenseProfile {
  essential: number            // monthly ₹
  lifestyle: number
  healthcare: number
  education: number
  generalInflation: number     // percent, default 6
  healthcareInflation: number  // percent, default 10
  educationInflation: number   // percent, default 12
}

export interface FrequencySchedule {
  monthly: number       // INR received/paid monthly
  quarterly: number     // INR received/paid quarterly
  halfYearly: number    // INR received/paid half-yearly
  yearly: number        // INR received/paid yearly
}

export interface UserProfile {
  corpus: number
  monthlyWithdrawal: number    // always stored as monthly equivalent (sum of withdrawalSchedule)
  withdrawalFrequency: PaymentFrequency  // legacy — kept for header KPI label
  withdrawalAmount: number     // legacy — stored as the same value as monthlyWithdrawal
  withdrawalSchedule?: FrequencySchedule  // V3 — 4 simultaneous frequency slots
  sipAmount: number            // monthly equivalent of total SIP/passive income (0 = none)
  sipFrequency: PaymentFrequency  // legacy — kept for header KPI label
  sipSchedule?: FrequencySchedule  // V3 — 4 simultaneous frequency slots
  inflationRate: number        // percent, e.g. 6.5
  riskAppetite: 1 | 2 | 3 | 4 | 5
  taxBracket: 0 | 5 | 20 | 30  // percent
  refreshInterval: 1 | 6       // hours
  groqApiKey: string
  bucketAllocation?: { b1: number; b2: number; b3: number; b4: number }
  // fractions summing to 1.0 — e.g. { b1: 0.10, b2: 0.20, b3: 0.30, b4: 0.40 }
  // if absent, defaults to BUCKET_ALLOCATION from constants
  demographics?: Demographics
  expenses?: ExpenseProfile
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
  b4EmergencyToB3: number  // kept for backward compat, always 0 in new model
  b2EmergencyToB1: number  // emergency: B2 (SCSS/FD) principal → B1 (last resort)
  totalCorpus: number
  isLegacyYear: boolean
  corpusBelowInitial: boolean   // true if totalCorpus < initialCorpus this year
  totalReturnsEarned: number    // gross returns from all 4 buckets before withdrawals
  shortfall?: number            // unmet demand for this year (₹), 0 if fully paid (refill strategy only)
  b1RefillFromB3?: number       // B3 → B1 top-up at year end (refill strategy only)
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
