// 4-Bucket Refill-Linked Strategy (per academic paper baseline: 10 / 35 / 25 / 30)
// B1 = Liquidity layer (0-2yr cash & liquid) — 10%
// B2 = Fixed Floor (SCSS, POMIS, corp bonds) — 35%
// B3 = Stability & SWP (BAF, hybrid, equity savings, REITs) — 25%
// B4 = Growth & Refill (flexi/midcap, multi-asset, SGB) — 30%
export const BUCKET_ALLOCATION = { b1: 0.10, b2: 0.35, b3: 0.25, b4: 0.30 } as const

export const SCSS_RATE_DEFAULT = 8.2

export const FD_RATES_DEFAULT = { SBI: 7.25, HDFC: 7.40, ICICI: 7.35 }

// Paper's return profile: B1 liquid ~6.5%, B2 fixed-floor blend ~8.5%,
// B3 hybrid/BAF/REIT blend ~10%, B4 diversified equity+gold ~13%.
export const DEFAULT_RETURN_ASSUMPTIONS = { b1: 6.5, b2: 8.5, b3: 10.0, b4: 13.0 }

export const REFILL_THRESHOLD_MONTHS = 12

// Refill rule (paper): when B4 annual return ≥ trigger, harvest PCT of that year's
// B4 gain into B3 to top up SWP source. B3 sufficiency target is years of cover.
export const B4_HARVEST_TRIGGER_PCT = 12.0
export const B4_HARVEST_PCT = 0.25
export const B3_SUFFICIENCY_YEARS = 6

export const SWP_YEARS = 25
export const PRESERVATION_YEARS = 20

export const LEGACY_YEARS = [15, 20, 25]

// LTCG threshold ₹1.25L = 125000 (FY 2024-25, Budget Jul 2024)
export const LTCG_THRESHOLD = 125000
export const LTCG_RATE = 0.125

// Guardrail (Guyton-Klinger inspired) — protects against sequence-of-returns risk.
// When corpus drops below FREEZE_THRESHOLD of initial, skip the inflation increase.
// When corpus drops below CUT_THRESHOLD, also reduce that year's draw by CUT_FACTOR.
// In any year where realized B4 return ≤ 0, skip the B4→B3 harvest (don't sell at a loss).
export const GUARDRAIL_FREEZE_THRESHOLD = 0.85
export const GUARDRAIL_CUT_THRESHOLD = 0.70
export const GUARDRAIL_CUT_FACTOR = 0.90

// Stress test scenario — 35% one-time equity (B4) crash in year 5.
// Year 5 is the worst sequence-of-returns timing for a freshly retired portfolio.
export const CRASH_TEST_YEAR = 5
export const CRASH_TEST_B4_RETURN_PCT = -35

// MF schemes tracked per bucket
export const MF_SCHEMES = {
  b1: [
    { name: 'SBI Liquid Fund', code: '125497' },
    { name: 'HDFC Liquid Fund', code: '119598' },
    { name: 'Nippon India Liquid Fund', code: '118701' },
  ],
  b2: [
    { name: 'HDFC Short Duration Fund', code: '118989' },
    { name: 'ICICI Pru Corporate Bond Fund', code: '120586' },
    { name: 'SBI Magnum Medium Duration Fund', code: '125354' },
  ],
  b3: [
    { name: 'HDFC Balanced Advantage Fund', code: '118989' },
    { name: 'ICICI Pru Balanced Advantage Fund', code: '120586' },
    { name: 'Mirae Asset Hybrid Equity Fund', code: '125354' },
  ],
  b4: [
    { name: 'Parag Parikh Flexi Cap Fund', code: '122639' },
    { name: 'Mirae Asset Large Cap Fund', code: '118834' },
    { name: 'Nippon India Gold BeES', code: '120503' },
  ],
} as const

export const BUCKET_INSTRUMENTS = {
  b1: ['Liquid MF', 'Overnight MF', 'Savings / Sweep', 'Arbitrage MF'],
  b2: ['SCSS (8.2%)', 'POMIS', 'Corporate Bond MF', 'Banking & PSU Debt MF'],
  b3: ['Balanced Advantage (BAF)', 'Aggressive Hybrid', 'Equity Savings', 'REITs / Dividend Yield'],
  b4: ['Flexi Cap / Multicap', 'Mid Cap MF', 'Multi-Asset MF', 'SGB / Gold ETF'],
}

export const BUCKET_LABELS = {
  b1: 'Bucket 1 — Liquidity',
  b2: 'Bucket 2 — Fixed Floor',
  b3: 'Bucket 3 — Stability & SWP',
  b4: 'Bucket 4 — Growth & Refill',
}

export const BUCKET_HORIZON = {
  b1: '0–2 Years',
  b2: '2–7 Years',
  b3: '5–10 Years',
  b4: '10+ Years',
}

// ── Demographics & Expenses ─────────────────────────────────────

import type { Demographics, ExpenseProfile, CityTier } from '../types'

export const DEFAULT_DEMOGRAPHICS: Demographics = {
  currentAge: 55,
  retirementAge: 60,
  lifeExpectancy: 90,
  city: 'metro',
}

export const DEFAULT_EXPENSES: ExpenseProfile = {
  essential: 30_000,
  lifestyle: 15_000,
  healthcare: 10_000,
  education: 5_000,
  generalInflation: 6,
  healthcareInflation: 10,
  educationInflation: 12,
}

export const CITY_OPTIONS: Array<{ label: string; value: CityTier }> = [
  { label: 'Metro', value: 'metro' },
  { label: 'Tier 1', value: 'tier1' },
  { label: 'Tier 2', value: 'tier2' },
  { label: 'Rural', value: 'rural' },
]

// Cost-of-living multiplier relative to metro
export const CITY_COST_MULTIPLIER: Record<CityTier, number> = {
  metro: 1.0,
  tier1: 0.85,
  tier2: 0.70,
  rural: 0.55,
}

export const TAB_ITEMS = [
  { id: 'plan', label: 'Plan', icon: '📋' },
  { id: 'profiles', label: 'Profile', icon: '👤' },
  { id: 'strategies', label: 'Compare', icon: '⚖️' },
  { id: 'assets', label: 'Buckets', icon: '🪣' },
  { id: 'explorer', label: 'Explorer', icon: '🔍' },
  { id: 'simulate', label: 'Simulate', icon: '📊' },
  { id: 'tax', label: 'Tax', icon: '🧾' },
  { id: 'insights', label: 'Insights', icon: '◆' },
  { id: 'ai', label: 'AI', icon: '🤖' },
] as const

export type TabId = typeof TAB_ITEMS[number]['id']
