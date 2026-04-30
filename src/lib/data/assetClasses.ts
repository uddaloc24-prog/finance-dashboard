// Asset-class metadata + analysis content per bucket. Each class has a
// rationale, selection criteria, risk factors, expected return range, and
// tax treatment. Used by the Buckets-tab fund explorer to produce a
// detailed analysis report alongside the curated fund picks.

import type { CuratedFund } from '../../types/v2'
import { CURATED_FUNDS } from '../../constants/curatedFunds'

export type AssetClassId =
  // B1 — Liquidity
  | 'liquid'
  | 'overnight'
  | 'arbitrage'
  // B2 — Fixed Floor
  | 'corporate-bond'
  | 'banking-psu'
  | 'short-duration'
  // B3 — Stability & SWP
  | 'balanced-advantage'
  | 'aggressive-hybrid'
  | 'equity-savings'
  | 'dividend-yield'
  // B4 — Growth
  | 'flexi-cap'
  | 'multicap'
  | 'mid-cap'
  | 'multi-asset'
  | 'gold'

export type BucketKey = 'b1' | 'b2' | 'b3' | 'b4'

export interface FundEnrichment {
  schemeCode: string
  expectedCAGR: [number, number]    // % range, e.g. [6.0, 7.0]
  riskRating: 'very-low' | 'low' | 'moderate' | 'moderately-high' | 'high'
  trackRecordYears: number          // approximate vintage
  rationale: string                 // why THIS specific fund is in the shortlist
  swpFriendly: boolean              // suitable for systematic withdrawal
}

export interface AssetClassMeta {
  id: AssetClassId
  bucket: BucketKey
  label: string
  short: string                     // 1-line tagline
  category: string                  // matches CuratedFund.category
  rationale: string                 // why this class fits this bucket
  selectionCriteria: string[]
  riskFactors: string[]
  expectedReturnRange: [number, number] // % CAGR
  volatilityBand: string            // human description
  taxTreatment: string
  liquidityNote: string
  howToInvest: string               // typical investment mode
  bestFor: string
}

export const BUCKET_PURPOSES: Record<BucketKey, { label: string; role: string; horizon: string; defaultPct: number }> = {
  b1: { label: 'Bucket 1 — Liquidity',   role: 'Cash buffer for the next 12-24 months of withdrawals.',                        horizon: '0–2 years',  defaultPct: 10 },
  b2: { label: 'Bucket 2 — Fixed Floor', role: '5-year fixed-deposit ladder. Held to maturity, untouched in normal years.',   horizon: '5-yr ladder', defaultPct: 20 },
  b3: { label: 'Bucket 3 — Stability',   role: 'Active SWP source. Compounds modestly while paying out monthly.',             horizon: '5–10 years', defaultPct: 25 },
  b4: { label: 'Bucket 4 — Growth',      role: 'Long-horizon equity engine. Funds future refills via interest harvest.',      horizon: '10+ years',  defaultPct: 45 },
}

export const ASSET_CLASSES: AssetClassMeta[] = [
  // ── B1 ──────────────────────────────────────────────────────────
  {
    id: 'liquid', bucket: 'b1',
    label: 'Liquid Funds', short: 'Ultra-short money-market for instant cash needs',
    category: 'Liquid',
    rationale: 'Liquid funds invest in money-market instruments maturing in ≤91 days. They produce stable returns with near-zero NAV volatility and full T+1 redemption. Perfect for the B1 cash buffer.',
    selectionCriteria: [
      'AUM ≥ ₹10,000 Cr — large enough to absorb redemption shocks',
      'Top quartile credit quality (AAA-only, no AT1 bonds)',
      'Expense ratio ≤ 0.35% (direct plan)',
      'Track record ≥ 5 years across rate cycles',
    ],
    riskFactors: [
      'Credit-event risk (rare but real — see Franklin Templeton 2020)',
      'Slight NAV dip in sharp rate-rise scenarios',
      'Yield can lag inflation in low-rate regimes',
    ],
    expectedReturnRange: [6.0, 7.5],
    volatilityBand: 'Negligible — typical daily NAV change <0.01%',
    taxTreatment: 'Debt MF (post-Apr 2023): all gains taxed at slab rate, irrespective of holding period',
    liquidityNote: 'T+1 redemption to bank account. Most AMCs offer instant redemption up to ₹50,000/day.',
    howToInvest: 'Lump-sum the 10% B1 allocation. Set up monthly SWP into your bank account for living expenses.',
    bestFor: 'Anyone who needs a 12-24 month cash buffer earning more than savings account.',
  },
  {
    id: 'overnight', bucket: 'b1',
    label: 'Overnight Funds', short: '1-day-maturity instruments — safest of all debt MFs',
    category: 'Overnight',
    rationale: 'Overnight funds invest in instruments maturing the next business day. Zero credit risk, zero interest-rate risk. Returns are slightly lower than liquid funds but the safety profile is unmatched.',
    selectionCriteria: [
      'AUM ≥ ₹5,000 Cr',
      'Strictly TREPS / Reverse Repo / 1-day CBLO holdings',
      'Expense ratio ≤ 0.15%',
      'Sponsor AMC pedigree (HDFC, SBI, ICICI tier)',
    ],
    riskFactors: [
      'Returns lag liquid funds by 30-50bps in normal rate environments',
      'Unsuitable for purposes longer than a few weeks',
    ],
    expectedReturnRange: [5.5, 6.5],
    volatilityBand: 'Effectively zero',
    taxTreatment: 'Debt MF: slab rate on all gains',
    liquidityNote: 'T+1 redemption; some AMCs offer same-day before cutoff',
    howToInvest: 'Park surplus that you may need in days/weeks. Not the primary B1 vehicle.',
    bestFor: 'Treasury-style parking for very short horizons.',
  },
  {
    id: 'arbitrage', bucket: 'b1',
    label: 'Arbitrage Funds', short: 'Equity-taxed, debt-like returns — tax win at higher slabs',
    category: 'Arbitrage',
    rationale: 'Arbitrage funds exploit cash-vs-futures spreads. They behave like debt funds but qualify as equity-oriented (>65% equity hedged), so gains are taxed as equity LTCG (12.5% above ₹1.25L) rather than slab. Materially better post-tax for 20%+ slab investors.',
    selectionCriteria: [
      'AUM ≥ ₹5,000 Cr — needed for arbitrage opportunities at scale',
      'Equity exposure consistently >65% (per SEBI definition)',
      'Lower expense ratio than typical equity funds (≤0.40%)',
      '1-month rolling returns above the corresponding liquid fund (after-tax)',
    ],
    riskFactors: [
      'Returns dip when arbitrage spreads narrow (low-volatility markets)',
      '1-day holding minimum (vs T+1 for liquid)',
      'STCG 20% if held <12 months — better held for at least 1 year',
    ],
    expectedReturnRange: [5.5, 7.0],
    volatilityBand: 'Very low — comparable to liquid funds',
    taxTreatment: 'Equity LTCG 12.5% above ₹1.25L exemption (>12 months); STCG 20% (<12 months)',
    liquidityNote: 'T+1; brief pop-up in NAV as the market closes positions',
    howToInvest: 'Best held for >1 year to qualify for LTCG. Use for the portion of B1 you do not need in the next 12 months.',
    bestFor: 'High-slab investors (20-30%) who want B1 income with equity tax treatment.',
  },

  // ── B2 ──────────────────────────────────────────────────────────
  {
    id: 'corporate-bond', bucket: 'b2',
    label: 'Corporate Bond Funds', short: 'AAA corporate paper — predictable, taxable income',
    category: 'Corporate Bond',
    rationale: 'Corporate bond funds invest at least 80% in AA+/AAA corporate debt. They sit in B2 because they offer higher yields than government securities while keeping credit risk low. Held to maturity in our model — interest compounds within the fund.',
    selectionCriteria: [
      'AUM ≥ ₹15,000 Cr — diversification across 50+ issuers',
      'Average credit rating AAA or AA+',
      'Modified duration 2-4 years (matches B2 5-year ladder horizon)',
      'No defaulted issuer in the last 5 years',
      'Expense ratio ≤ 0.40%',
    ],
    riskFactors: [
      'Mark-to-market dips when rates rise sharply',
      'Credit downgrades can hurt NAV (rare for AAA-only funds)',
      'Slab-rate tax — material drag at 30% bracket',
    ],
    expectedReturnRange: [7.0, 8.0],
    volatilityBand: 'Low — typical drawdown <3% even in rate shocks',
    taxTreatment: 'Debt MF (post-Apr 2023): slab rate on all gains',
    liquidityNote: 'T+1 redemption; partial early redemption usually carries no exit load',
    howToInvest: 'Park 15-20L lump sum on day 1. Hold to maturity within the 5-year B2 cycle. SWP not recommended (defeats the held-to-maturity logic).',
    bestFor: 'Mid-slab (5-20%) investors wanting more yield than FDs without equity exposure.',
  },
  {
    id: 'banking-psu', bucket: 'b2',
    label: 'Banking & PSU Debt', short: 'Bank / PSU bonds — quasi-sovereign credit quality',
    category: 'Banking & PSU',
    rationale: 'Banking & PSU debt funds invest 80%+ in bonds issued by banks, PSUs, and PFIs. Effectively quasi-sovereign credit. Slightly lower yield than corporate bond funds but safer in stress scenarios.',
    selectionCriteria: [
      'AUM ≥ ₹5,000 Cr',
      '90%+ in AAA banking/PSU paper',
      'Modified duration 1.5-3.5 years',
      'Track record across at least one rate cycle (rate-cut and rate-hike)',
    ],
    riskFactors: [
      'Yield typically 30-50bps below corporate bond funds',
      'Same slab-rate tax drag',
      'PSU bond illiquidity in stress events',
    ],
    expectedReturnRange: [6.5, 7.5],
    volatilityBand: 'Very low — drawdowns rarely exceed 2%',
    taxTreatment: 'Debt MF: slab rate on all gains',
    liquidityNote: 'T+1, no exit load after 7-30 days typically',
    howToInvest: 'Use for the conservative portion of B2 if you want pure quasi-sovereign exposure.',
    bestFor: 'Risk-averse retirees who prefer government-backed credit over private corporates.',
  },
  {
    id: 'short-duration', bucket: 'b2',
    label: 'Short Duration Funds', short: '1-3 year duration — buffered against rate shocks',
    category: 'Short Duration',
    rationale: 'Short duration funds maintain a Macaulay duration of 1-3 years. Best risk-adjusted returns in the debt MF category for a 5-year horizon. Less rate-sensitive than longer-duration funds.',
    selectionCriteria: [
      'AUM ≥ ₹5,000 Cr',
      'Duration consistently 1.5-3 years (per fund factsheet)',
      'Top-quartile rolling 3-year returns',
      'AA- or above credit composition',
    ],
    riskFactors: [
      'Mark-to-market on rate rises (limited but real)',
      'Some funds dilute credit quality to chase yield — verify factsheet',
    ],
    expectedReturnRange: [7.0, 8.0],
    volatilityBand: 'Low — drawdowns 2-4% in worst rate cycles',
    taxTreatment: 'Debt MF: slab rate on all gains',
    liquidityNote: 'T+1; minimum holding 30-90 days for some AMCs',
    howToInvest: 'Suitable for SWP at 6-7% withdrawal rate within B2. Or hold to maturity.',
    bestFor: 'Slab ≤20% investors who want active monthly income from B2 (rather than just compounding).',
  },

  // ── B3 ──────────────────────────────────────────────────────────
  {
    id: 'balanced-advantage', bucket: 'b3',
    label: 'Balanced Advantage / Dynamic Asset Allocation', short: 'Auto-rotates equity↔debt by valuation — the SWP workhorse',
    category: 'Balanced Advantage',
    rationale: 'BAFs use models (typically PE/PB ratio bands) to auto-shift between equity (max ~80%) and debt (min ~20%). This dampens drawdowns substantially while still capturing equity upside. The SWP source par excellence — equity-taxed, low-volatility, professionally managed.',
    selectionCriteria: [
      'AUM ≥ ₹10,000 Cr — needed for SEBI re-balancing without slippage',
      'Equity allocation maintained >65% on average (for equity tax status)',
      'Drawdown in 2020/2022 corrections <-15%',
      'Consistent rolling 5-year return >10% CAGR',
      'Manager tenure ≥ 5 years preferred',
    ],
    riskFactors: [
      'Underperforms pure equity in strong bull markets',
      'Some BAFs are equity-savings in disguise — verify >65% equity exposure',
      'Net equity vs gross equity disclosure varies — read factsheet',
    ],
    expectedReturnRange: [10.0, 12.0],
    volatilityBand: 'Moderate — typical max drawdown 15-25% vs 35-45% for pure equity',
    taxTreatment: 'Equity LTCG 12.5% above ₹1.25L (>12 months); STCG 20% (<12 months)',
    liquidityNote: 'T+1 to T+3 redemption; usually no exit load after 1 year',
    howToInvest: 'SWP at 6-7% WR. The B3 income engine — set up a monthly SWP for the rupee amount your B1 buffer + B3 → B1 refills require.',
    bestFor: 'The default B3 holding for nearly all retirees with a 10+ year horizon.',
  },
  {
    id: 'aggressive-hybrid', bucket: 'b3',
    label: 'Aggressive Hybrid (65/35)', short: 'Static 65-80% equity / 20-35% debt — old-school workhorse',
    category: 'Aggressive Hybrid',
    rationale: 'Aggressive hybrids hold 65-80% equity statically (no dynamic shift). Higher long-term returns than BAFs but bigger drawdowns. Makes sense as a B3 holding alongside a BAF for diversification of management style.',
    selectionCriteria: [
      'AUM ≥ ₹10,000 Cr',
      'Equity 65-80% disclosed in factsheet',
      'Top-quartile rolling 5-year returns vs category',
      'Manager tenure 5+ years',
    ],
    riskFactors: [
      'Larger drawdowns than BAF in corrections (-25 to -35%)',
      'Static allocation means less downside protection',
    ],
    expectedReturnRange: [11.0, 13.0],
    volatilityBand: 'Moderate-high — drawdowns up to -35% in 2008-style crashes',
    taxTreatment: 'Equity LTCG 12.5% above ₹1.25L; STCG 20%',
    liquidityNote: 'T+3, exit load 1% if redeemed within 12 months typically',
    howToInvest: 'SWP at 5-6% WR. Pair with a BAF in B3 for style diversification.',
    bestFor: 'Retirees with higher risk tolerance who want more equity in the SWP source.',
  },
  {
    id: 'equity-savings', bucket: 'b3',
    label: 'Equity Savings', short: '~30% equity / ~30% arbitrage / ~40% debt — equity-taxed, debt-volatility',
    category: 'Equity Savings',
    rationale: 'Equity savings funds use only ~30% net equity but tag in arbitrage to qualify as equity-oriented for tax. Result: equity LTCG treatment with debt-like returns and very low volatility. Good for risk-averse retirees who still want the tax benefit.',
    selectionCriteria: [
      'AUM ≥ ₹3,000 Cr',
      '>65% equity (gross, including arbitrage hedges) for equity tax status',
      'Rolling 3-year volatility <10%',
      'Yield consistently above pure debt funds after tax',
    ],
    riskFactors: [
      'Returns lag aggressive hybrids and BAFs in bull markets',
      'Net equity confusion — read factsheet carefully',
    ],
    expectedReturnRange: [8.0, 10.0],
    volatilityBand: 'Low — drawdowns rarely exceed -10%',
    taxTreatment: 'Equity LTCG 12.5%; STCG 20%',
    liquidityNote: 'T+1 to T+3',
    howToInvest: 'SWP at 6-7% WR. Use for the conservative portion of B3.',
    bestFor: '20-30% slab investors who want tax-efficient income with minimal volatility.',
  },
  {
    id: 'dividend-yield', bucket: 'b3',
    label: 'Dividend Yield Equity', short: 'High-DY large/mid caps — defensive equity tilt',
    category: 'Dividend Yield',
    rationale: 'Dividend yield funds invest in stocks with above-market dividend yields. Tend to hold defensive sectors (PSUs, FMCG, utilities) that hold up better in downturns. Less volatile than diversified equity, but lower long-term returns.',
    selectionCriteria: [
      'AUM ≥ ₹2,000 Cr',
      'Portfolio dividend yield >2.5% sustained',
      'Top 20 holdings concentration <60%',
      'Manager has run dividend strategies before',
    ],
    riskFactors: [
      'Dividend payouts can be cut in stressed environments',
      'PSU concentration risk',
      'Underperformance in growth-led rallies',
    ],
    expectedReturnRange: [9.0, 11.0],
    volatilityBand: 'Moderate — drawdowns -20 to -25%',
    taxTreatment: 'Equity LTCG 12.5%; STCG 20%',
    liquidityNote: 'T+3; 1% exit load <1 year typically',
    howToInvest: 'Hold for the long term within B3 — generally too volatile for SWP at high rates.',
    bestFor: 'Retirees who want a defensive equity tilt within B3.',
  },

  // ── B4 ──────────────────────────────────────────────────────────
  {
    id: 'flexi-cap', bucket: 'b4',
    label: 'Flexi Cap', short: 'Dynamic large/mid/small cap allocation — the flagship growth vehicle',
    category: 'Flexi Cap',
    rationale: 'Flexi caps have full discretion across market cap. The best ones (Parag Parikh, HDFC, Kotak) have shown 13-15% CAGR over 10+ year horizons. The default B4 holding — produces the equity gains that get harvested into B3 each year.',
    selectionCriteria: [
      'AUM ≥ ₹15,000 Cr — large enough not to be hurt by inflows/outflows',
      'Manager tenure ≥ 7 years (prefer 10+)',
      'Rolling 10-year return ≥ 14% CAGR',
      'Drawdown in 2020 better than Nifty 50',
      'Portfolio turnover <50% (low churn = manager conviction)',
      'International exposure (Parag Parikh-style) for currency hedge',
    ],
    riskFactors: [
      'Drawdowns -35 to -45% in major bear markets',
      'Manager-dependent — track record can break with manager change',
      'High small-cap allocation can amplify bear markets',
    ],
    expectedReturnRange: [12.0, 15.0],
    volatilityBand: 'High — drawdowns up to -45% in 2008-style crashes',
    taxTreatment: 'Equity LTCG 12.5% above ₹1.25L; STCG 20%',
    liquidityNote: 'T+3; exit load 1% if redeemed <1 year',
    howToInvest: 'Lump-sum at retirement. No SWP. Harvest only the LTCG-exempt amount each March 31. Let it compound for 10-25 years.',
    bestFor: 'Almost every retiree with 15+ year horizon — the long-term wealth engine.',
  },
  {
    id: 'multicap', bucket: 'b4',
    label: 'Multicap (mandated 25/25/25)', short: 'SEBI-mandated 25% large + 25% mid + 25% small — true multi-cap',
    category: 'Multicap',
    rationale: 'Post-2020 SEBI rules require Multicap funds to hold ≥25% in each of large, mid, and small caps. Higher mid/small bias than flexi caps means higher upside but also higher drawdowns. A diversified equity exposure with explicit small-cap allocation.',
    selectionCriteria: [
      'AUM ≥ ₹15,000 Cr',
      'Compliant with 25/25/25 SEBI rule (verify post-Sep 2020)',
      'Strong rolling 5-year return ≥ 16% CAGR',
      'Manager tenure ≥ 5 years',
    ],
    riskFactors: [
      'Forced 25% small-cap allocation amplifies drawdowns (-50% in 2020)',
      'Liquidity squeeze in small caps during stressed markets',
    ],
    expectedReturnRange: [12.0, 16.0],
    volatilityBand: 'High — drawdowns -40 to -50%',
    taxTreatment: 'Equity LTCG 12.5%; STCG 20%',
    liquidityNote: 'T+3; 1% exit load <1 year',
    howToInvest: 'Lump-sum, hold long-term, no SWP.',
    bestFor: 'Retirees with high risk appetite who want explicit small-cap exposure.',
  },
  {
    id: 'mid-cap', bucket: 'b4',
    label: 'Mid Cap', short: '101-250th ranked stocks — high-growth, high-volatility',
    category: 'Mid Cap',
    rationale: 'Mid caps are 101st-250th ranked stocks by market cap. Higher growth than large caps over long horizons but with substantially more volatility. Suitable for the portion of B4 you genuinely will not need for 15+ years.',
    selectionCriteria: [
      'AUM ≥ ₹10,000 Cr',
      '>65% in pure midcap stocks (some funds drift into small/large)',
      '15-year rolling return ≥ 16% CAGR',
      'Quality bias in stock selection (avoid junk midcaps)',
    ],
    riskFactors: [
      '-50% drawdowns possible in major corrections',
      'Liquidity gaps during forced selling',
      'Index reclassification risk (midcap → smallcap)',
    ],
    expectedReturnRange: [13.0, 17.0],
    volatilityBand: 'Very high — drawdowns up to -55%',
    taxTreatment: 'Equity LTCG 12.5%; STCG 20%',
    liquidityNote: 'T+3; 1% exit load <1 year',
    howToInvest: 'Lump-sum portion of B4 you can lock for 15+ years.',
    bestFor: 'Retirees with 15+ year horizon and tolerance for large drawdowns.',
  },
  {
    id: 'multi-asset', bucket: 'b4',
    label: 'Multi Asset', short: 'Equity + debt + gold (+real estate) — built-in diversification',
    category: 'Multi-Asset',
    rationale: 'Multi-asset funds hold 10-65% in each of equity / debt / gold (some include international and REITs). Built-in diversification. Lower drawdowns than pure equity, similar long-term returns to BAFs. A natural B4 holding for retirees who do not want to manage gold and equity separately.',
    selectionCriteria: [
      'AUM ≥ ₹3,000 Cr',
      'Asset allocation rules clearly disclosed',
      'Equity allocation maintained >65% on average for equity tax status',
      'Inclusion of gold (10-15% typically)',
    ],
    riskFactors: [
      'Some multi-asset funds are debt-heavy in disguise — read factsheet',
      'Returns can lag pure equity in bull markets',
    ],
    expectedReturnRange: [10.0, 13.0],
    volatilityBand: 'Moderate — drawdowns -20 to -30%',
    taxTreatment: 'If >65% equity: equity LTCG; otherwise debt-MF slab rate',
    liquidityNote: 'T+3; exit load 1% <1 year',
    howToInvest: 'Lump-sum, hold 10+ years.',
    bestFor: 'Retirees who want one-fund diversified equity exposure within B4.',
  },
  {
    id: 'gold', bucket: 'b4',
    label: 'Gold ETF / Gold MF', short: 'Inflation hedge + currency hedge — non-correlated to equity',
    category: 'Gold',
    rationale: 'Gold has historically been negatively correlated with equity in stressed environments and acts as both an inflation hedge and a rupee-depreciation hedge. A 5-10% allocation within B4 reduces overall drawdowns without sacrificing much long-term return.',
    selectionCriteria: [
      'AUM ≥ ₹3,000 Cr',
      'Tracking error vs spot gold <0.5% over 1 year',
      'Expense ratio ≤ 0.50% (ETF) or ≤ 1.00% (FoF)',
      'No premium/discount issues vs NAV',
    ],
    riskFactors: [
      'Gold goes nowhere for years (e.g., 2012-2018)',
      'Currency-rupee correlation can mute returns in strong-rupee periods',
      'Storage and impurity costs for physical gold (avoid)',
    ],
    expectedReturnRange: [8.0, 11.0],
    volatilityBand: 'Moderate — drawdowns -20 to -30% in commodity downturns',
    taxTreatment: 'Gold MF/ETF post-Apr 2023: slab rate on all gains',
    liquidityNote: 'T+1 to T+3 for ETFs (need demat); FoFs T+3',
    howToInvest: 'Hold 5-10% of B4 as a long-term diversifier. Re-balance to target if it drifts beyond ±50%.',
    bestFor: 'Inflation-conscious retirees and FIRE-style portfolios.',
  },
]

// ── Helpers ────────────────────────────────────────────────────────

export function classesForBucket(bucket: BucketKey): AssetClassMeta[] {
  return ASSET_CLASSES.filter((c) => c.bucket === bucket)
}

export function classById(id: AssetClassId): AssetClassMeta | undefined {
  return ASSET_CLASSES.find((c) => c.id === id)
}

export function fundsForClass(cls: AssetClassMeta): CuratedFund[] {
  return CURATED_FUNDS.filter((f) => f.bucket === cls.bucket && f.category === cls.category)
}

// Per-fund analysis content. Falls back to a templated rationale if no
// specific entry is provided for the scheme code.
const FUND_NOTES: Record<string, string> = {
  // B1 — Liquid
  '120586': 'ICICI Prudential Liquid Fund — flagship liquid fund, ₹45kCr AUM. AAA-only paper, modified duration ~30 days. Steady ~7% across rate cycles.',
  '119551': 'HDFC Liquid Fund — largest in category at ~₹60kCr. Conservative allocation, instant redemption available up to ₹50k/day.',
  '119807': 'SBI Liquid Fund — strong sponsor backing (state-owned bank). ~7% YTD with negligible volatility.',
  '118989': 'Axis Liquid Fund — lowest expense ratio in category (0.25%). Good track record across managers.',
  '119742': 'Kotak Liquid Fund — sub-30 day maturity, AAA credit composition.',

  // B1 — Overnight
  '120823': 'HDFC Overnight Fund — pure 1-day TREPS exposure. The safest debt MF you can own.',

  // B1 — Arbitrage
  '120718': 'SBI Arbitrage Opportunities Fund — large enough to capture spreads at scale. Tax win at 20-30% slab.',

  // B2 — Corporate Bond
  '118834': 'HDFC Corporate Bond Fund — flagship of the category, ₹28kCr AUM. >85% AAA, modified duration ~2.5y.',
  '120338': 'ICICI Prudential Corporate Bond Fund — peer-leading rolling returns; 95% AAA composition.',
  '118578': 'Aditya Birla Sun Life Corporate Bond Fund — consistent top-quartile, AUM ~₹23kCr.',
  '119241': 'Kotak Corporate Bond Fund — moderate AUM, AAA-heavy. Use as the second corporate bond holding.',

  // B2 — Banking & PSU
  '120585': 'HDFC Banking & PSU Debt Fund — pure quasi-sovereign exposure, lower yield but materially safer.',
  '118552': 'Axis Banking & PSU Debt Fund — largest in category, AAA-only banking/PSU paper.',

  // B2 — Short Duration
  '119723': 'HDFC Short Term Debt Fund — modified duration 2-3 years, top-quartile returns over 5 years.',
  '119716': 'ICICI Prudential Short Term Fund — strong rolling 3y, ₹17kCr AUM.',
  '118560': 'Axis Short Duration Fund — competitive returns, slight tilt to AA+ for yield kicker.',

  // B3 — Balanced Advantage
  '119609': 'ICICI Prudential Balanced Advantage Fund — ₹62kCr AUM, P/E-band model. -12% drawdown in 2020 (vs Nifty -38%).',
  '118566': 'HDFC Balanced Advantage Fund — largest BAF at ₹96kCr. Manager: Prashant Jain era now succeeded but track is intact.',
  '120484': 'Edelweiss Balanced Advantage Fund — newer entrant but consistent rolling 3-5y returns. Lower AUM allows nimbler shifts.',
  '125354': 'Kotak Balanced Advantage Fund — solid mid-AUM choice, equity 50-65% range.',

  // B3 — Aggressive Hybrid
  '118525': 'SBI Equity Hybrid Fund — flagship aggressive hybrid, ₹77kCr AUM. Long manager tenure.',
  '119827': 'ICICI Prudential Equity & Debt Fund — conservative within the hybrid category, lower drawdowns.',
  '118825': 'Canara Robeco Equity Hybrid — top-quartile 5-year, lower expense.',

  // B3 — Equity Savings
  '118468': 'Kotak Equity Savings Fund — clean structure, equity-taxed but debt-like volatility.',
  '120744': 'HDFC Equity Savings Fund — newer, moderate AUM but solid construction.',

  // B3 — Dividend Yield
  '100349': 'ICICI Prudential Dividend Yield Equity — defensive tilt, sustainable 2.5%+ portfolio yield.',

  // B4 — Flexi Cap
  '118527': 'Parag Parikh Flexi Cap — best-in-class. ~₹89kCr AUM. International exposure 25% (incl Alphabet, Meta). 13.5% 10-year CAGR.',
  '101206': 'HDFC Flexi Cap Fund — back to strength under current manager. Top-3 long-term track.',
  '112932': 'Kotak Flexi Cap Fund — ₹50kCr AUM, large-cap leaning, lower drawdowns than peers.',

  // B4 — Multicap
  '118955': 'Mirae Asset Multicap — newer post-SEBI rules but pedigree is strong.',
  '112277': 'Nippon India Multi Cap — disciplined 25/25/25 adherence, top-quartile rolling 5y.',

  // B4 — Mid Cap
  '125307': 'Motilal Oswal Midcap — aggressive but thoughtful stock selection. Strong 10-year rolling.',
  '103504': 'Kotak Emerging Equity — ₹48kCr AUM, large mid-cap with quality bias.',
  '118819': 'HDFC Mid-Cap Opportunities — flagship midcap, 13-year history.',

  // B4 — Multi-Asset
  '120178': 'ICICI Prudential Multi-Asset — ₹40kCr AUM. 65-70% equity, 10-15% gold, rest debt. The all-in-one B4 fund.',
  '120716': 'SBI Multi Asset Allocation — newer but well-constructed.',

  // B4 — Gold
  '119598': 'Nippon India Gold BeES ETF — largest gold ETF at ₹12kCr. Tracking error <0.3%, expense 0.82%.',
}

export function fundAnalysis(schemeCode: string): string | null {
  return FUND_NOTES[schemeCode] ?? null
}
