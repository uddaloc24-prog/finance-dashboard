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

// Each sub-category captures both the amount and the frequency at which
// it's paid (e.g., insurance ₹12000 yearly vs rent ₹15000 monthly).
export interface ExpenseEntry {
  amount: number
  frequency: PaymentFrequency
}

// Detailed monthly-budget breakdown. The four ExpenseProfile category totals
// (essential / lifestyle / healthcare / education) are derived from these.
export interface ExpenseBreakdown {
  // Essential
  rent: ExpenseEntry              // Rent / Housing / EMI
  food: ExpenseEntry              // Food & Groceries
  utilities: ExpenseEntry         // Electricity, water, gas, internet, phone
  domesticHelp: ExpenseEntry      // Cook, maid, driver, gardener
  transportation: ExpenseEntry    // Fuel, public transit, taxi
  // Lifestyle
  diningOut: ExpenseEntry         // Restaurants, entertainment
  travel: ExpenseEntry            // Vacations & weekend trips
  subscriptions: ExpenseEntry     // Streaming, gym, newspapers
  personalCare: ExpenseEntry      // Salon, clothing, shopping
  giftsMisc: ExpenseEntry         // Gifts, celebrations, donations
  // Healthcare
  insurancePremium: ExpenseEntry  // Health insurance premiums
  doctorVisits: ExpenseEntry      // Routine doctor & hospital
  medicines: ExpenseEntry         // Pharmacy & supplements
  diagnostics: ExpenseEntry       // Tests, scans, consultations
  // Education
  tuition: ExpenseEntry           // Grandchildren tuition / school fees
  books: ExpenseEntry             // Books & supplies
  courses: ExpenseEntry           // Online courses & skill-building
  coaching: ExpenseEntry          // Tutoring & coaching
}

export interface ExpenseProfile {
  essential: number            // monthly ₹ — derived from sum of essential breakdown
  lifestyle: number
  healthcare: number
  education: number
  breakdown?: ExpenseBreakdown // detailed sub-category breakdown
  generalInflation: number     // percent, default 6
  healthcareInflation: number  // percent, default 10
  educationInflation: number   // percent, default 12
}

// Each asset entry captures market value + the user's intent + monthly income:
// status 'liquid'   → counts toward Liquid Corpus (drives all retirement calcs)
// status 'invested' → counts toward Invested Corpus; its monthlyIncome flows to Passive Income
// optimize flag      → primarily for stocks + mutual funds, requests portfolio review
export type AssetStatus = 'liquid' | 'invested'

export interface AssetEntry {
  amount: number          // market value in INR
  status: AssetStatus     // liquid (move to Liquid Corpus) or invested (held, generates passive income)
  monthlyIncome: number   // INR/mo paid out by this asset (rent / dividend / interest); 0 if none
  optimize: boolean       // flag for portfolio optimisation (mainly stocks + MFs)
}

// Detailed wealth snapshot — sums to total corpus. Total splits into Liquid Corpus
// (drives retirement calcs) + Invested Corpus (held, income flows to Passive Income).
// 34 asset classes across 8 logical groups; mutual funds are clubbed into a single
// "Mutual Funds" entry (with optional CAS / statement upload for detailed breakdown).
export interface AssetInventory {
  // Liquid & Cash
  savings: AssetEntry              // Savings account balances
  sweepFdr: AssetEntry             // Sweep / auto-FDR with banks
  cashOnHand: AssetEntry           // Physical cash + petty

  // Fixed Income (non-government)
  bankFds: AssetEntry              // Bank Fixed Deposits
  bankRds: AssetEntry              // Bank Recurring Deposits
  corporateBonds: AssetEntry       // Corporate / NCD / NBFC bonds
  govtBonds: AssetEntry            // Government securities, T-Bills
  rbiFrb: AssetEntry               // RBI Floating Rate Bonds

  // Senior & Retirement Schemes
  scss: AssetEntry                 // Senior Citizen Savings Scheme
  pomis: AssetEntry                // Post Office Monthly Income Scheme
  pmvvy: AssetEntry                // PMVVY (LIC pension)
  ppf: AssetEntry                  // Public Provident Fund
  epfVpf: AssetEntry               // EPF + Voluntary PF
  npsTier1: AssetEntry             // NPS Tier 1 corpus
  npsTier2: AssetEntry             // NPS Tier 2 corpus
  sukanya: AssetEntry              // Sukanya Samriddhi (daughter-specific)

  // Mutual Funds — clubbed (Equity, Index, Hybrid, Debt, Liquid, ELSS, Gold MFs)
  mutualFunds: AssetEntry          // Total MF portfolio (use Upload CAS for detail)

  // Direct Equity
  stocksIndia: AssetEntry          // Direct equity — Indian stocks
  stocksIntl: AssetEntry           // Direct equity — US / international

  // Real Estate
  selfOccupiedHome: AssetEntry     // Primary residence (market value)
  secondHome: AssetEntry           // Second residential property
  commercialProperty: AssetEntry   // Shop / office / commercial real estate
  landPlot: AssetEntry             // Land or undeveloped plot
  reits: AssetEntry                // Real Estate Investment Trusts
  invits: AssetEntry               // Infrastructure Investment Trusts

  // Gold & Precious Metals
  physicalGold: AssetEntry         // Jewelry, coins, bars
  sgb: AssetEntry                  // Sovereign Gold Bonds
  silver: AssetEntry               // Physical silver, silver ETFs

  // Alternative & Other
  ulipsEndowment: AssetEntry       // ULIPs / endowment / money-back surrender value
  crypto: AssetEntry               // Bitcoin, Ethereum, etc.
  businessEquity: AssetEntry       // Equity in own business / private companies
  foreignAssets: AssetEntry        // Foreign bank accounts, RSUs, overseas property
  collectibles: AssetEntry         // Art, antiques, watches, etc.
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
  assetInventory?: AssetInventory   // detailed breakdown that sums to corpus
  insuranceCover?: InsuranceCover   // health / life / other risk cover catalogue
  loanProfile?: LoanProfile         // outstanding loans + repayment strategy
}

// ── Loans & Liabilities ─────────────────────────────────────────────

export type RepaymentStrategy = 'avalanche' | 'snowball' | 'maxgain'

export interface LoanEntry {
  active: boolean        // policy currently held
  outstanding: number    // current principal outstanding (₹)
  interestRate: number   // annual rate (% per annum)
  emi: number            // current EMI (₹ / month)
  maxGain?: boolean      // home loan only: SBI MaxGain / overdraft variant
}

// Catalogue of every relevant loan type for an Indian household 50+,
// grouped into Secured / Vehicle / Unsecured / Business. Plus a chosen
// repayment-strategy preference.
export interface LoanProfile {
  // Secured
  homeLoan: LoanEntry              // Home loan (with optional MaxGain)
  loanAgainstProperty: LoanEntry   // LAP (against existing property)
  plotLoan: LoanEntry              // Plot / land loan
  goldLoan: LoanEntry              // Gold loan
  loanAgainstSecurities: LoanEntry // Against shares / MFs / FDs / insurance

  // Vehicle
  carLoan: LoanEntry
  twoWheelerLoan: LoanEntry

  // Unsecured
  personalLoan: LoanEntry          // From bank / NBFC
  creditCardOutstanding: LoanEntry // Credit card dues
  familyLoan: LoanEntry            // From family / friends
  educationLoan: LoanEntry         // Self / children education

  // Business
  businessWorkingCapital: LoanEntry
  businessTermLoan: LoanEntry

  strategy?: RepaymentStrategy     // chosen repayment ordering preference
}

// ── Insurance Cover ─────────────────────────────────────────────────

export interface InsuranceEntry {
  cover: number              // sum insured / sum assured (₹)
  premium: number            // annual premium (₹)
  active: boolean            // policy currently in force
  mwp?: boolean              // term plan: held under Married Women's Property Act (creditor-proof)
}

// Catalogue of every relevant insurance product for an Indian household 50+.
// Tracks coverage (sum insured) + annual premium + active status separately
// from the Monthly Budget's healthcare premium expense.
export interface InsuranceCover {
  // Health & Medical
  familyFloater: InsuranceEntry      // Base family floater policy
  personalHealth: InsuranceEntry     // Individual health policy
  superTopUp: InsuranceEntry         // ₹50L+ super top-up with deductible
  criticalIllness: InsuranceEntry    // Lump sum on critical illness diagnosis
  seniorCitizen: InsuranceEntry      // Senior-specific plans (post-60)
  corporateGroup: InsuranceEntry     // Employer / group cover (terminates at retirement)

  // Life Insurance
  termPlan: InsuranceEntry           // Pure-protection term cover (mwp flag relevant)
  endowment: InsuranceEntry          // Endowment / money-back (also tracked as cash value in Wealth)
  ulip: InsuranceEntry               // Unit-Linked Insurance Plan
  wholeLife: InsuranceEntry          // Whole-life cover

  // Other Risk Cover
  personalAccident: InsuranceEntry   // Personal accident — disability + accidental death
  disability: InsuranceEntry         // Disability income cover
  homeProperty: InsuranceEntry       // Home / property — fire, theft, structure
  vehicle: InsuranceEntry            // Vehicle comprehensive insurance
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
