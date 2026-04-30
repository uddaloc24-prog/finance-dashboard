import type { CuratedFund } from '../types/v2'

// Curated AMFI-listed fund universe per the paper's 4-Bucket Refill-Linked Strategy.
// Filter: AUM > ₹500 Cr, track record > 3 yrs.
//
//  B1 (10%) — Liquidity:    Liquid / Overnight / Arbitrage (0-2 yr cash)
//  B2 (35%) — Fixed Floor:  Corp Bond / Short Duration / Banking & PSU
//                           (stand-ins for SCSS & POMIS, which are instruments not MFs)
//  B3 (25%) — Stability:    BAF / Aggressive Hybrid / Equity Savings / Dividend / Multi-Asset
//  B4 (30%) — Growth:       Flexi/Multicap / Midcap / Multi-Asset / Gold

export const CURATED_FUNDS: CuratedFund[] = [
  // ── B1: Liquidity layer (liquid, overnight, arbitrage) ──
  { schemeCode: '120586', schemeName: 'ICICI Prudential Liquid Fund - Growth', bucket: 'b1', category: 'Liquid', aumCrore: 45000, expenseRatio: 0.33 },
  { schemeCode: '119551', schemeName: 'HDFC Liquid Fund - Growth', bucket: 'b1', category: 'Liquid', aumCrore: 60000, expenseRatio: 0.30 },
  { schemeCode: '119807', schemeName: 'SBI Liquid Fund - Growth', bucket: 'b1', category: 'Liquid', aumCrore: 55000, expenseRatio: 0.32 },
  { schemeCode: '118989', schemeName: 'Axis Liquid Fund - Growth', bucket: 'b1', category: 'Liquid', aumCrore: 28000, expenseRatio: 0.25 },
  { schemeCode: '119742', schemeName: 'Kotak Liquid Fund - Growth', bucket: 'b1', category: 'Liquid', aumCrore: 30000, expenseRatio: 0.30 },
  { schemeCode: '120823', schemeName: 'HDFC Overnight Fund - Growth', bucket: 'b1', category: 'Overnight', aumCrore: 14000, expenseRatio: 0.10 },
  { schemeCode: '120718', schemeName: 'SBI Arbitrage Opportunities Fund - Growth', bucket: 'b1', category: 'Arbitrage', aumCrore: 10000, expenseRatio: 0.37 },

  // ── B2: Fixed Floor (SCSS/POMIS represented by conservative debt MFs) ──
  { schemeCode: '118834', schemeName: 'HDFC Corporate Bond Fund - Growth', bucket: 'b2', category: 'Corporate Bond', aumCrore: 28000, expenseRatio: 0.36 },
  { schemeCode: '120338', schemeName: 'ICICI Prudential Corporate Bond Fund - Growth', bucket: 'b2', category: 'Corporate Bond', aumCrore: 29000, expenseRatio: 0.33 },
  { schemeCode: '118578', schemeName: 'Aditya Birla Sun Life Corporate Bond Fund - Growth', bucket: 'b2', category: 'Corporate Bond', aumCrore: 23000, expenseRatio: 0.35 },
  { schemeCode: '119241', schemeName: 'Kotak Corporate Bond Fund - Growth', bucket: 'b2', category: 'Corporate Bond', aumCrore: 12000, expenseRatio: 0.38 },
  { schemeCode: '120585', schemeName: 'HDFC Banking & PSU Debt Fund - Growth', bucket: 'b2', category: 'Banking & PSU', aumCrore: 5800, expenseRatio: 0.40 },
  { schemeCode: '118552', schemeName: 'Axis Banking & PSU Debt Fund - Growth', bucket: 'b2', category: 'Banking & PSU', aumCrore: 15500, expenseRatio: 0.35 },
  { schemeCode: '119723', schemeName: 'HDFC Short Term Debt Fund - Growth', bucket: 'b2', category: 'Short Duration', aumCrore: 13500, expenseRatio: 0.42 },
  { schemeCode: '119716', schemeName: 'ICICI Prudential Short Term Fund - Growth', bucket: 'b2', category: 'Short Duration', aumCrore: 17000, expenseRatio: 0.45 },
  { schemeCode: '118560', schemeName: 'Axis Short Duration Fund - Growth', bucket: 'b2', category: 'Short Duration', aumCrore: 7500, expenseRatio: 0.40 },

  // ── B3: Stability & SWP (BAF, Aggressive Hybrid, Equity Savings, Dividend, Multi-Asset) ──
  { schemeCode: '119609', schemeName: 'ICICI Prudential Balanced Advantage Fund - Growth', bucket: 'b3', category: 'Balanced Advantage', aumCrore: 62000, expenseRatio: 1.44 },
  { schemeCode: '118566', schemeName: 'HDFC Balanced Advantage Fund - Growth', bucket: 'b3', category: 'Balanced Advantage', aumCrore: 96000, expenseRatio: 1.31 },
  { schemeCode: '120484', schemeName: 'Edelweiss Balanced Advantage Fund - Growth', bucket: 'b3', category: 'Balanced Advantage', aumCrore: 12500, expenseRatio: 1.69 },
  { schemeCode: '125354', schemeName: 'Kotak Balanced Advantage Fund - Growth', bucket: 'b3', category: 'Balanced Advantage', aumCrore: 17000, expenseRatio: 1.50 },
  { schemeCode: '118525', schemeName: 'SBI Equity Hybrid Fund - Growth', bucket: 'b3', category: 'Aggressive Hybrid', aumCrore: 77000, expenseRatio: 1.44 },
  { schemeCode: '119827', schemeName: 'ICICI Prudential Equity & Debt Fund - Growth', bucket: 'b3', category: 'Aggressive Hybrid', aumCrore: 42000, expenseRatio: 1.65 },
  { schemeCode: '118825', schemeName: 'Canara Robeco Equity Hybrid Fund - Growth', bucket: 'b3', category: 'Aggressive Hybrid', aumCrore: 10500, expenseRatio: 1.75 },
  { schemeCode: '118468', schemeName: 'Kotak Equity Savings Fund - Growth', bucket: 'b3', category: 'Equity Savings', aumCrore: 8000, expenseRatio: 1.10 },
  { schemeCode: '120744', schemeName: 'HDFC Equity Savings Fund - Growth', bucket: 'b3', category: 'Equity Savings', aumCrore: 4500, expenseRatio: 1.20 },
  { schemeCode: '100349', schemeName: 'ICICI Prudential Dividend Yield Equity Fund - Growth', bucket: 'b3', category: 'Dividend Yield', aumCrore: 5500, expenseRatio: 1.80 },

  // ── B4: Growth & Refill (Flexi/Multicap, Midcap, Multi-Asset, Gold) ──
  { schemeCode: '118527', schemeName: 'Parag Parikh Flexi Cap Fund - Growth', bucket: 'b4', category: 'Flexi Cap', aumCrore: 89000, expenseRatio: 0.56 },
  { schemeCode: '101206', schemeName: 'HDFC Flexi Cap Fund - Growth', bucket: 'b4', category: 'Flexi Cap', aumCrore: 72000, expenseRatio: 0.78 },
  { schemeCode: '112932', schemeName: 'Kotak Flexi Cap Fund - Growth', bucket: 'b4', category: 'Flexi Cap', aumCrore: 50000, expenseRatio: 0.65 },
  { schemeCode: '118955', schemeName: 'Mirae Asset Multicap Fund - Growth', bucket: 'b4', category: 'Multicap', aumCrore: 42000, expenseRatio: 0.55 },
  { schemeCode: '112277', schemeName: 'Nippon India Multi Cap Fund - Growth', bucket: 'b4', category: 'Multicap', aumCrore: 34000, expenseRatio: 0.57 },
  { schemeCode: '125307', schemeName: 'Motilal Oswal Midcap Fund - Growth', bucket: 'b4', category: 'Mid Cap', aumCrore: 20000, expenseRatio: 0.64 },
  { schemeCode: '103504', schemeName: 'Kotak Emerging Equity Fund - Growth', bucket: 'b4', category: 'Mid Cap', aumCrore: 48000, expenseRatio: 0.85 },
  { schemeCode: '118819', schemeName: 'HDFC Mid-Cap Opportunities Fund - Growth', bucket: 'b4', category: 'Mid Cap', aumCrore: 35000, expenseRatio: 0.75 },
  { schemeCode: '120178', schemeName: 'ICICI Prudential Multi-Asset Fund - Growth', bucket: 'b4', category: 'Multi-Asset', aumCrore: 40000, expenseRatio: 1.15 },
  { schemeCode: '120716', schemeName: 'SBI Multi Asset Allocation Fund - Growth', bucket: 'b4', category: 'Multi-Asset', aumCrore: 5500, expenseRatio: 1.25 },
  { schemeCode: '119598', schemeName: 'Nippon India Gold BeES ETF', bucket: 'b4', category: 'Gold', aumCrore: 12000, expenseRatio: 0.82 },
]

export function curatedFundsByBucket(): Record<'b1' | 'b2' | 'b3' | 'b4', CuratedFund[]> {
  return {
    b1: CURATED_FUNDS.filter((f) => f.bucket === 'b1'),
    b2: CURATED_FUNDS.filter((f) => f.bucket === 'b2'),
    b3: CURATED_FUNDS.filter((f) => f.bucket === 'b3'),
    b4: CURATED_FUNDS.filter((f) => f.bucket === 'b4'),
  }
}

export function findCuratedFund(schemeCode: string): CuratedFund | null {
  return CURATED_FUNDS.find((f) => f.schemeCode === schemeCode) ?? null
}

export function defaultFundPerBucket(bucket: 'b1' | 'b2' | 'b3' | 'b4'): CuratedFund {
  const first = CURATED_FUNDS.find((f) => f.bucket === bucket)
  if (!first) throw new Error(`No curated fund for bucket ${bucket}`)
  return first
}
