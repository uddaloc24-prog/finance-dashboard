// Risk profile types — 5 named profiles from the academic PDF, each with
// a baseline bucket allocation, recommended fund instruments, and projected
// monthly income on a ₹1Cr reference corpus.

export type RiskProfileId =
  | 'ultra-conservative'
  | 'conservative'
  | 'moderate'
  | 'moderately-aggressive'
  | 'aggressive'

export interface BucketShare {
  b1: number  // fraction (0..1)
  b2: number
  b3: number
  b4: number
}

export interface InstrumentRecommendation {
  name: string
  fundHouse: string
  bucket: 'B1' | 'B2' | 'B3' | 'B4'
  category: string                         // e.g. 'Flexi Cap'
  expectedCagr: number                     // percent
  allocationOn1CrCorpus: number            // INR — what spec recommends on a ₹1Cr corpus
  monthlyIncomeOn1Cr?: number              // INR/month — only for income-generating instruments
  taxTreatment: string
  governmentBacked: boolean
  lockIn?: string
  notes?: string
}

export interface RiskProfile {
  id: RiskProfileId
  name: string
  scoreRange: [number, number]             // quiz score range
  tagline: string
  description: string
  bucketShare: BucketShare                 // sums to 1.0
  expectedMonthlyOn1Cr: number             // INR/month at year 1
  expectedYr10MonthlyOn1Cr: number         // by year 10 (after growth)
  expected20yrCorpusFromCr: number         // INR — corpus at year 20 starting from ₹1Cr
  principalSafe: 'high' | 'moderate' | 'low'
  bestFor: string
  pros: string[]
  cons: string[]
  instruments: InstrumentRecommendation[]
}

// Risk quiz — 10 questions, sections A/B/C, scoring 1–5 each, total 10–50

export type QuizSection = 'A' | 'B' | 'C'

export interface QuizOption {
  label: string
  score: number  // 1–5
}

export interface QuizQuestion {
  id: string
  section: QuizSection
  question: string
  options: QuizOption[]
}

export interface QuizState {
  answers: Record<string, number>          // questionId -> chosen score
  totalScore: number
  profileId: RiskProfileId | null
  completed: boolean
}
