export const BUCKET_ALLOCATION = { b1: 0.21, b2: 0.32, b3: 0.47 } as const

export const SCSS_RATE_DEFAULT = 8.2

export const FD_RATES_DEFAULT = { SBI: 7.25, HDFC: 7.40, ICICI: 7.35 }

export const DEFAULT_RETURN_ASSUMPTIONS = { b1: 7.0, b2: 8.5, b3: 12.0 }

export const REFILL_THRESHOLD_MONTHS = 6

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
    { name: 'Parag Parikh Flexi Cap Fund', code: '122639' },
    { name: 'Mirae Asset Large Cap Fund', code: '118834' },
    { name: 'Nippon India Gold BeES', code: '120503' },
  ],
} as const

export const BUCKET_INSTRUMENTS = {
  b1: ['SCSS', 'Senior FD', 'Liquid MF', 'SWP Source'],
  b2: ['Debt MF', 'BAF', 'Corporate Bonds', 'Refills B1'],
  b3: ['Equity MF', 'Gold ETF', 'Refills B2'],
}

export const BUCKET_LABELS = {
  b1: 'Bucket 1 — Short Term',
  b2: 'Bucket 2 — Mid Term',
  b3: 'Bucket 3 — Long Term',
}

export const BUCKET_HORIZON = {
  b1: '0–3 Years',
  b2: '3–10 Years',
  b3: '10–20 Years',
}
