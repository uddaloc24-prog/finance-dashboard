// 4-Bucket allocation (HDFC strategy)
// B1 = Emergency (0-1yr liquid)
// B2 = Short-term buffer (1-5yr debt)
// B3 = Intermediate growth engine (5-10yr hybrid/BAF) — refills B1 & B2
// B4 = Long-term legacy (10yr+ equity) — compounds; profits harvested into B3 when needed
export const BUCKET_ALLOCATION = { b1: 0.10, b2: 0.20, b3: 0.30, b4: 0.40 } as const

export const SCSS_RATE_DEFAULT = 8.2

export const FD_RATES_DEFAULT = { SBI: 7.25, HDFC: 7.40, ICICI: 7.35 }

export const DEFAULT_RETURN_ASSUMPTIONS = { b1: 7.0, b2: 8.0, b3: 9.5, b4: 12.0 }

export const REFILL_THRESHOLD_MONTHS = 12

export const SWP_YEARS = 25

export const LEGACY_YEARS = [15, 20, 25]

// LTCG threshold ₹1.25L = 125000
export const LTCG_THRESHOLD = 125000
export const LTCG_RATE = 0.125   // 12.5%

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
  b1: ['SCSS', 'Senior FD', 'Liquid MF', 'Money Market'],
  b2: ['Short Debt MF', 'Corporate Bond', 'Equity Savings', 'Refills B1'],
  b3: ['BAF', 'Hybrid MF', 'Multi-Asset', 'Refills B1 & B2'],
  b4: ['Flexi Cap', 'Large Cap', 'Gold ETF', 'Refills B3'],
}

export const BUCKET_LABELS = {
  b1: 'Bucket 1 — Emergency',
  b2: 'Bucket 2 — Short Term',
  b3: 'Bucket 3 — Growth Engine',
  b4: 'Bucket 4 — Legacy Equity',
}

export const BUCKET_HORIZON = {
  b1: '0–1 Year',
  b2: '1–5 Years',
  b3: '5–10 Years',
  b4: '10+ Years',
}
