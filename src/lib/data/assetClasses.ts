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
  | 'liquid-etf'
  // B2 — Fixed Floor
  | 'corporate-bond'
  | 'banking-psu'
  | 'short-duration'
  | 'scss'
  | 'pomis'
  | 'senior-fd'
  | 'direct-bonds'
  | 'g-sec'
  | 'gilt-mf'
  // B3 — Stability & SWP
  | 'balanced-advantage'
  | 'aggressive-hybrid'
  | 'equity-savings'
  | 'dividend-yield'
  | 'reit'
  | 'invit'
  | 'dividend-stocks'
  | 'conservative-hybrid'
  | 'sif'
  // B4 — Growth
  | 'flexi-cap'
  | 'multicap'
  | 'mid-cap'
  | 'multi-asset'
  | 'gold'
  | 'index-etf'
  | 'international'
  | 'sgb'
  | 'commercial-real-estate'
  | 'slbm'

export type AssetClassKind = 'mf' | 'direct'

export interface DirectInstrument {
  name: string
  issuer: string
  category: string
  expectedCagr: number       // % annual
  minTicket?: string         // e.g. "₹1,000"
  maxTicket?: string         // e.g. "₹30,00,000"
  tenure?: string            // e.g. "5 years"
  yieldOrCoupon?: string     // e.g. "8.2% paid quarterly"
  taxNote: string
  notes: string
}

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
  category: string                  // matches CuratedFund.category for kind='mf'
  kind?: AssetClassKind             // 'mf' (default) — funds come from CURATED_FUNDS
                                    // 'direct' — instruments listed in directInstruments
  directInstruments?: DirectInstrument[]
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

  // ── B1 additions ──────────────────────────────────────────────────
  {
    id: 'liquid-etf', bucket: 'b1',
    label: 'Liquid ETFs', short: 'Demat-traded liquid alternative — broker-friendly',
    category: 'Liquid ETF', kind: 'direct',
    rationale: 'Liquid ETFs (like LIQUIDBEES) trade on exchanges and settle T+1 like equity, but track overnight money market. Useful when you maintain a broker account and want B1 cash on the same demat platform as your equity holdings.',
    selectionCriteria: ['AUM ≥ ₹2,000 Cr', 'Tracking error vs benchmark < 0.10%', 'Tight bid-ask spread (< 1 paisa)', 'Demat-only — needs trading account'],
    riskFactors: ['Yield ~30-50bps below top liquid MFs', 'Bid-ask spread can eat returns over very short holds', 'Requires active broker account'],
    expectedReturnRange: [5.5, 6.5], volatilityBand: 'Negligible — daily NAV move <0.05%',
    taxTreatment: 'Debt MF: slab rate on all gains',
    liquidityNote: 'T+1 settlement; zero exit load; sell on exchange anytime markets open',
    howToInvest: 'Buy on exchange via your broker. Useful as collateral for equity F&O margin.',
    bestFor: 'Active investors who want B1 on the same platform as equity.',
    directInstruments: [
      { name: 'Nippon India ETF Liquid BeES (LIQUIDBEES)', issuer: 'Nippon India AMC', category: 'Liquid ETF', expectedCagr: 6.2, minTicket: '~₹1,000 per unit', taxNote: 'Slab rate on capital gains', notes: 'Largest liquid ETF in India; ₹2,500+ Cr AUM. Used widely as F&O margin collateral.' },
      { name: 'ICICI Prudential Liquid ETF', issuer: 'ICICI Prudential AMC', category: 'Liquid ETF', expectedCagr: 6.0, minTicket: '~₹100 per unit', taxNote: 'Slab rate', notes: 'Smaller AUM but tighter spreads on NSE.' },
    ],
  },

  // ── B2 additions ──────────────────────────────────────────────────
  {
    id: 'scss', bucket: 'b2',
    label: 'SCSS — Senior Citizens Savings Scheme', short: 'Govt-backed, 8.2% (FY 24-25), 5-year lock-in',
    category: 'SCSS', kind: 'direct',
    rationale: 'SCSS is the highest-yield government-backed scheme available to senior citizens (60+). 8.2% paid quarterly. Maximum ₹30 lakh per individual, plus another ₹30 lakh in spouse\'s name. The cornerstone of B2 for nearly every Indian retiree.',
    selectionCriteria: ['Indian resident aged 60+ (or 55+ with VRS)', 'Maximum ₹30 lakh per PAN', 'Joint account allowed (first holder must be 60+)', 'Single account also allowed for retired defence personnel ≥50'],
    riskFactors: ['Interest rate reset by Govt every quarter — could decrease in low-rate regimes', 'Premature exit penalty: 1.5% in year 1, 1% after', 'Slab tax on interest — significant drag at 30% bracket'],
    expectedReturnRange: [8.0, 8.5], volatilityBand: 'Zero — fixed quarterly payout',
    taxTreatment: 'Slab rate on interest; principal eligible for 80C deduction up to ₹1.5L (only at deposit)',
    liquidityNote: 'Quarterly interest (Apr/Jul/Oct/Jan); principal locked 5 years; one extension of 3 years allowed at maturity',
    howToInvest: 'Open at any post office, SBI, HDFC, ICICI, Axis branch. Need PAN + Aadhaar + age proof. No brokerage fees.',
    bestFor: 'Every senior citizen with at least ₹15-30L of B2 allocation — consume the full ₹30L quota first.',
    directInstruments: [
      { name: 'SCSS Account', issuer: 'Government of India (Post Offices, designated banks)', category: 'Govt small savings scheme', expectedCagr: 8.2, minTicket: '₹1,000', maxTicket: '₹30,00,000 per individual', tenure: '5 years (extendable by 3)', yieldOrCoupon: '8.2% paid quarterly', taxNote: 'Slab rate; 80C eligible; TDS 10% if interest >₹50k/yr (file Form 15H to avoid if income below taxable)', notes: 'The single best risk-adjusted yield available to Indian seniors. Open one in your name + one in spouse\'s = ₹60L combined floor.' },
    ],
  },
  {
    id: 'pomis', bucket: 'b2',
    label: 'POMIS — Post Office Monthly Income Scheme', short: 'Govt-backed, 7.4%, monthly payout',
    category: 'POMIS', kind: 'direct',
    rationale: 'POMIS pays a fixed monthly interest with full government backing. 7.4% annualised, paid every month directly to your post office or savings account. Lower yield than SCSS but pays monthly (not quarterly), useful for regular cashflow alongside SCSS.',
    selectionCriteria: ['Indian resident, no age restriction', 'Maximum ₹9 lakh single / ₹15 lakh joint', '5-year tenure', 'Multiple accounts allowed up to combined limits'],
    riskFactors: ['Lower yield than SCSS for seniors', 'Slab tax on monthly interest', 'Principal locked 5 years (1% penalty on premature exit before 3 years)'],
    expectedReturnRange: [7.3, 7.5], volatilityBand: 'Zero — fixed monthly payout',
    taxTreatment: 'Slab rate on interest; no 80C benefit; no TDS',
    liquidityNote: 'Monthly interest credited automatically; principal locked 5 years; partial withdrawal not allowed',
    howToInvest: 'Open at any post office. Need PAN + Aadhaar. No brokerage.',
    bestFor: 'Retirees who want a smaller monthly-cashflow vehicle alongside SCSS quarterly.',
    directInstruments: [
      { name: 'POMIS Account', issuer: 'India Post (Government of India)', category: 'Postal scheme', expectedCagr: 7.4, minTicket: '₹1,000', maxTicket: '₹9,00,000 single / ₹15,00,000 joint', tenure: '5 years', yieldOrCoupon: '7.4% paid monthly', taxNote: 'Slab rate; no 80C; no TDS', notes: 'Open in joint mode with spouse to use the higher ₹15L cap. Auto-credit of monthly interest to linked savings account.' },
    ],
  },
  {
    id: 'senior-fd', bucket: 'b2',
    label: 'Senior Citizen FDs (Bank & NBFC)', short: 'Bank/NBFC term deposits with senior premium',
    category: 'Senior FD', kind: 'direct',
    rationale: 'Bank and NBFC FDs are the most familiar fixed-income instrument. Senior citizens (60+) get a 25-50bps premium over regular rates. Combined with the ₹50,000 80TTB exemption, FDs at large banks are tax-efficient up to that limit.',
    selectionCriteria: ['Issuer: SCB-rated bank, NBFC AAA-rated only (avoid AA and below — see DHFL collapse 2019)', 'DICGC insurance cover ₹5 lakh per bank per depositor', 'Spread amount across 3-4 banks for full insurance coverage'],
    riskFactors: ['NBFC failures (DHFL 2019, Reliance Capital 2021) — only AAA NBFCs and only for short tenors', 'Re-investment risk on rollover — rates may be lower next cycle', 'Slab tax minus 80TTB ₹50k exemption — drag at 30% bracket'],
    expectedReturnRange: [7.5, 8.5], volatilityBand: 'Zero — locked-in rate for tenure',
    taxTreatment: 'Slab rate on interest; ₹50,000 80TTB deduction for seniors on bank/co-op/post office interest; TDS 10% if interest >₹50k/yr (file 15H)',
    liquidityNote: 'Premature withdrawal allowed with 0.5-1% penalty; cumulative or non-cumulative payout',
    howToInvest: 'Open online via your bank app or NetBanking. NBFC FDs via direct websites (Bajaj Finance, HDFC, etc.). Always check DICGC coverage.',
    bestFor: 'Conservative B2 allocation alongside SCSS — laddered across 1, 2, 3, 5-year buckets to manage re-investment risk.',
    directInstruments: [
      { name: 'SBI Senior Citizen FD', issuer: 'State Bank of India', category: 'Public sector bank FD', expectedCagr: 7.75, minTicket: '₹1,000', maxTicket: 'No upper limit', tenure: '7 days to 10 years', yieldOrCoupon: '7.75% (5-yr senior, FY 24-25)', taxNote: 'Slab rate, 80TTB exempt up to ₹50k', notes: 'Full sovereign-style backing; DICGC ₹5L insured.' },
      { name: 'HDFC Bank Senior Citizen FD', issuer: 'HDFC Bank', category: 'Private bank FD', expectedCagr: 7.90, minTicket: '₹5,000', tenure: '7 days to 10 years', yieldOrCoupon: '7.90% (5-yr senior)', taxNote: 'Slab rate, 80TTB exempt up to ₹50k', notes: 'Highest senior rate among private banks. Auto-renewal option.' },
      { name: 'ICICI Bank Senior Citizen FD', issuer: 'ICICI Bank', category: 'Private bank FD', expectedCagr: 7.85, minTicket: '₹10,000', tenure: '7 days to 10 years', yieldOrCoupon: '7.85% (5-yr senior)', taxNote: 'Slab rate, 80TTB exempt up to ₹50k', notes: 'Online iWish FD allows recurring deposits with senior premium.' },
      { name: 'Bajaj Finance FD (AAA)', issuer: 'Bajaj Finance Ltd', category: 'NBFC FD (AAA-rated)', expectedCagr: 8.40, minTicket: '₹15,000', tenure: '12-60 months', yieldOrCoupon: '8.40% (44-month senior)', taxNote: 'Slab rate, no 80TTB (NBFC interest does NOT qualify)', notes: 'Highest-yield AAA NBFC FD. NOT covered by DICGC — only AAA rating provides safety.' },
    ],
  },
  {
    id: 'direct-bonds', bucket: 'b2',
    label: 'Direct Corporate / NBFC Bonds', short: 'Listed bonds — buy on NSE/BSE via demat',
    category: 'Direct Corporate Bond', kind: 'direct',
    rationale: 'Listed corporate and NBFC bonds offer 7-9% yields with predictable coupon payouts. Higher yield than bank FDs of equivalent rating. Held to maturity, they are functionally equivalent to FDs but with better tax efficiency in some cases.',
    selectionCriteria: ['AAA or AA+ rating only', 'Listed on NSE/BSE', 'Coupon paid annually or semi-annually', 'Issuer pedigree: PSU > PFI > AAA private > AA-rated NBFC'],
    riskFactors: ['Mark-to-market on resale before maturity (rates rise → price falls)', 'Liquidity gap in secondary market — may need to hold to maturity', 'Issuer credit downgrade risk', 'Slab-rate tax on coupon and capital gains (debt MF rule applies)'],
    expectedReturnRange: [7.5, 9.0], volatilityBand: 'Low if held to maturity; -3 to -5% mark-to-market in rate spikes',
    taxTreatment: 'Coupon at slab rate; LTCG at 12.5% if listed and held >12 months; no indexation',
    liquidityNote: 'Listed bonds tradeable on NSE/BSE; thin secondary liquidity — best held to maturity',
    howToInvest: 'Buy on NSE/BSE via your demat account. Some brokers (Zerodha, Goldenpi, INDmoney) specialize in retail bond access. Lot sizes typically ₹10,000-100,000.',
    bestFor: 'Retirees with demat accounts who want bond-like income at 50-100bps higher yield than FDs.',
    directInstruments: [
      { name: 'NHAI Tax-Free Bonds (legacy)', issuer: 'National Highways Authority of India', category: 'Tax-free PSU bond', expectedCagr: 7.0, tenure: '15-20 years (legacy issues)', yieldOrCoupon: '7-8% tax-free coupon', taxNote: 'Coupon 100% tax-exempt (Sec 10(15)(iv)(h))', notes: 'No new tax-free issues post-2016 but legacy bonds trade on NSE/BSE. Excellent for 30% slab investors.' },
      { name: 'PFC Listed Bonds', issuer: 'Power Finance Corporation', category: 'PSU bond', expectedCagr: 7.8, tenure: '5-15 years', yieldOrCoupon: '7.5-8.5% coupon paid annually', taxNote: 'Slab rate', notes: 'PSU rated AAA, sovereign-equivalent credit.' },
      { name: 'REC Listed Bonds', issuer: 'Rural Electrification Corporation', category: 'PSU bond', expectedCagr: 7.9, tenure: '5-10 years', yieldOrCoupon: '7.8-8.5% coupon', taxNote: 'Slab rate', notes: 'AAA PSU. Listed on NSE/BSE.' },
      { name: 'Bajaj Finance Listed NCD', issuer: 'Bajaj Finance Ltd', category: 'AAA NBFC NCD', expectedCagr: 8.6, tenure: '3-10 years', yieldOrCoupon: '8.5-9.0% coupon', taxNote: 'Slab rate', notes: 'Only AAA NBFCs; never go below AA+. NCDs less liquid than PSU bonds.' },
    ],
  },
  {
    id: 'g-sec', bucket: 'b2',
    label: 'Government Securities (G-Sec, RBI Retail Direct)', short: 'Sovereign-backed, 6.8-7.5% yield, zero credit risk',
    category: 'G-Sec', kind: 'direct',
    rationale: 'G-Secs are Government of India bonds — zero credit risk, sovereign-rated. Yields 6.8-7.5% depending on tenor. Available to retail investors via the RBI Retail Direct scheme (rbiretaildirect.org.in) without intermediaries. Best for the absolute-safety portion of B2.',
    selectionCriteria: ['Tenor matches your B2 holding period (5/10/30 years available)', 'Use RBI Retail Direct for zero brokerage', 'Avoid long-tenor G-Secs unless willing to hold to maturity (rate sensitivity)'],
    riskFactors: ['Mark-to-market loss if rates rise and you exit early', 'Yield typically 30-100bps below corporate bonds', 'Coupon at slab rate — drag at higher brackets'],
    expectedReturnRange: [6.8, 7.5], volatilityBand: 'Low — held to maturity, zero default risk',
    taxTreatment: 'Coupon at slab rate; LTCG 12.5% if listed and held >12 months',
    liquidityNote: 'Listed on NSE/BSE; secondary liquidity for benchmark G-Secs is good, less so for off-the-run',
    howToInvest: 'Open RBI Retail Direct account (free, government-run). Bid in primary auctions or buy in secondary market. Or buy via stockbroker on NSE/BSE.',
    bestFor: 'Risk-averse seniors who want sovereign-grade safety beyond their FD coverage.',
    directInstruments: [
      { name: 'RBI Retail Direct Gilt Account', issuer: 'Reserve Bank of India', category: 'Govt platform', expectedCagr: 7.2, minTicket: '₹10,000', tenure: '1-30 years', yieldOrCoupon: '6.8-7.5% coupon paid semi-annually', taxNote: 'Slab rate on coupon; LTCG 12.5% if held >12 months', notes: 'Zero brokerage, direct from RBI. Required: PAN, Aadhaar, savings account, demat optional.' },
      { name: '7.18% GoI 2033 (10-year benchmark)', issuer: 'Government of India', category: 'Long-tenor G-Sec', expectedCagr: 7.18, tenure: 'Matures 2033', yieldOrCoupon: '7.18% paid semi-annually', taxNote: 'Slab rate on coupon', notes: 'Most-traded benchmark. Tradeable on NSE/BSE.' },
    ],
  },
  {
    id: 'gilt-mf', bucket: 'b2',
    label: 'Gilt & Long Duration MFs', short: 'Pure G-Sec mutual funds — sovereign credit, active duration',
    category: 'Gilt MF', kind: 'direct',
    rationale: 'Gilt mutual funds invest 80%+ in government securities. Zero credit risk, professionally managed duration. Capital appreciation in falling-rate cycles can boost returns to double-digits. Use as the conservative part of B2 alongside SCSS for sovereign-only exposure.',
    selectionCriteria: ['80%+ G-Sec composition (per fund factsheet)', 'AUM ≥ ₹2,000 Cr', 'Manager tenure 5+ years', 'Modified duration matches your horizon (Gilt = 6-8 yrs, Long Duration = 7-12 yrs)'],
    riskFactors: ['Mark-to-market losses if rates rise — Gilt funds had -8 to -10% drawdowns in 2021-22', 'Duration risk — long-duration funds amplify rate moves', 'Slab-rate tax on all gains (post Apr-2023)'],
    expectedReturnRange: [7.0, 9.0], volatilityBand: 'Low-moderate — drawdowns 5-10% in rate-spike years',
    taxTreatment: 'Debt MF (post Apr-2023): slab rate on all gains',
    liquidityNote: 'T+1 to T+2; some have 7-30 day exit load',
    howToInvest: 'SIP or lump-sum via AMC website or distributor. Best held in flat-to-falling rate environments.',
    bestFor: 'Investors who want sovereign-credit exposure with active duration management — willing to ride MTM swings.',
    directInstruments: [
      { name: 'SBI Magnum Gilt Fund', issuer: 'SBI Mutual Fund', category: 'Gilt MF', expectedCagr: 8.5, tenure: 'Open-ended', yieldOrCoupon: 'Variable; recent 5y CAGR ~8%', taxNote: 'Slab rate on all gains', notes: '~₹10kCr AUM, conservative duration management.' },
      { name: 'ICICI Prudential Gilt Fund', issuer: 'ICICI Prudential AMC', category: 'Gilt MF', expectedCagr: 8.7, tenure: 'Open-ended', yieldOrCoupon: '5y CAGR ~8.5%', taxNote: 'Slab rate', notes: 'Strong long-term track record; active duration.' },
    ],
  },

  // ── B3 additions ──────────────────────────────────────────────────
  {
    id: 'reit', bucket: 'b3',
    label: 'REITs (Real Estate Investment Trusts)', short: 'Listed commercial real estate — quarterly distributions',
    category: 'REIT', kind: 'direct',
    rationale: 'REITs own commercial real estate (Grade A office towers in metros) and distribute 90%+ of rental income to unit-holders quarterly. Yields 6-7% with potential capital appreciation as occupancy and rents grow. Listed on NSE/BSE, tradeable in demat.',
    selectionCriteria: ['SEBI-registered REIT (currently 4: Embassy, Mindspace, Brookfield, Nexus)', 'Occupancy >85% sustained', 'Diversified tenant base (top 10 < 50% of rent)', 'NAV trading at <10% premium to fair value'],
    riskFactors: ['Office demand cyclicality (WFH risk post-COVID)', 'Tenant concentration (IT/BFSI dominance)', 'Limited number of REITs in India — concentration risk in your REIT allocation', 'Distributions taxed in pieces (slab + LTCG + tax-free)'],
    expectedReturnRange: [9.0, 11.0], volatilityBand: 'Moderate — drawdowns -15 to -25% in stressed markets',
    taxTreatment: 'Mixed: portion as interest (slab), portion as dividend (slab post-Mar 2020), portion as capital appreciation (LTCG 12.5% if held >12 months). Verify with CA or REIT factsheet.',
    liquidityNote: 'Listed on NSE/BSE; daily liquidity but may have wider spreads than top-traded stocks',
    howToInvest: 'Buy on exchange via demat, like any stock. Lot size = 1 unit (around ₹300-450 per unit currently).',
    bestFor: '5-10% allocation within B3 for retirees who want real estate exposure without managing physical property.',
    directInstruments: [
      { name: 'Embassy Office Parks REIT', issuer: 'Embassy Group / Blackstone', category: 'Commercial office REIT', expectedCagr: 10.0, minTicket: '~₹400 per unit', yieldOrCoupon: '~6.5% distribution yield (paid quarterly)', taxNote: 'Mixed (slab + LTCG + tax-free portions)', notes: 'Largest REIT in India, ~36 million sq ft Grade A office space across Bangalore, Mumbai, Pune, NCR, Chennai.' },
      { name: 'Mindspace Business Parks REIT', issuer: 'K Raheja Corp', category: 'Commercial office REIT', expectedCagr: 9.5, minTicket: '~₹350 per unit', yieldOrCoupon: '~6.8% distribution yield', taxNote: 'Mixed', notes: 'Mumbai/Pune-heavy portfolio. Stable distribution growth.' },
      { name: 'Brookfield India REIT', issuer: 'Brookfield Asset Management', category: 'Commercial office REIT', expectedCagr: 9.0, minTicket: '~₹260 per unit', yieldOrCoupon: '~7.2% distribution yield', taxNote: 'Mixed', notes: 'Largest by NAV, NCR-heavy. Higher current yield.' },
    ],
  },
  {
    id: 'invit', bucket: 'b3',
    label: 'InvITs (Infrastructure Investment Trusts)', short: 'Listed infrastructure assets — predictable distributions',
    category: 'InvIT', kind: 'direct',
    rationale: 'InvITs own operating infrastructure assets (toll roads, transmission lines, gas pipelines) and distribute 90%+ of cash flows quarterly. Higher yield than REITs (8-11%) because of finite asset life. Listed on NSE/BSE, demat-tradeable.',
    selectionCriteria: ['SEBI-registered InvIT', 'Operating (not under-construction) assets', 'Sponsor pedigree (PowerGrid, IRB, IndiGrid)', 'Asset diversification across geographies / counterparties'],
    riskFactors: ['Asset life constrained — distributions decline as concession periods end', 'Toll-road traffic risk (pandemic taught us this)', 'Counterparty risk on transmission contracts', 'Tax structure complex — verify with CA'],
    expectedReturnRange: [9.0, 12.0], volatilityBand: 'Moderate — sometimes higher than REITs due to lower liquidity',
    taxTreatment: 'Similar to REITs: slab + LTCG + tax-free portions. Verify per InvIT.',
    liquidityNote: 'Listed; liquidity varies. PowerGrid InvIT and IndiGrid have decent volumes.',
    howToInvest: 'Buy on NSE/BSE via demat. Some InvITs offer NCD-style structured products too.',
    bestFor: 'Yield-seeking retirees wanting 8-11% cashflow with quarterly distributions.',
    directInstruments: [
      { name: 'PowerGrid InvIT', issuer: 'Power Grid Corporation of India', category: 'Transmission InvIT', expectedCagr: 11.0, minTicket: '~₹100 per unit', yieldOrCoupon: '~9.5% distribution yield', taxNote: 'Mixed (mostly slab + some LTCG)', notes: 'Owns transmission assets with 30+ year residual life. Sovereign-equivalent counterparty (utilities).' },
      { name: 'IndiGrid InvIT', issuer: 'KKR / Sterlite Power', category: 'Transmission InvIT', expectedCagr: 11.5, minTicket: '~₹140 per unit', yieldOrCoupon: '~9.0% distribution yield', taxNote: 'Mixed', notes: 'Largest pure-transmission InvIT. Quarterly distribution growing 5-7% annually.' },
      { name: 'IRB InvIT Fund', issuer: 'IRB Infrastructure Developers', category: 'Toll road InvIT', expectedCagr: 9.0, minTicket: '~₹70 per unit', yieldOrCoupon: '~10.5% distribution yield', taxNote: 'Mixed', notes: 'Higher yield reflects toll-road traffic risk. Smaller asset base.' },
    ],
  },
  {
    id: 'dividend-stocks', bucket: 'b3',
    label: 'Direct Dividend Stocks', short: 'Bluechip stocks with sustained dividend history',
    category: 'Direct Dividend', kind: 'direct',
    rationale: 'Direct ownership of dividend-paying bluechip stocks gives 2-4% dividend yield plus capital appreciation. Lower expense than dividend-yield MFs (no fund management fee). Suitable for the portion of B3 you can self-research and monitor.',
    selectionCriteria: ['Dividend yield >2.5% sustained over 5+ years', 'Payout ratio <70% (room to grow)', 'No dividend cut in the last 5 years', 'Market cap >₹50,000 Cr', 'Diversify across 8-12 names minimum'],
    riskFactors: ['Dividend cuts in stressed years (banks 2020 covid restrictions)', 'Concentration risk if you hold <8 names', 'Capital loss if you bought at peak (HUL post-2021)', 'Active management required — quarterly results review'],
    expectedReturnRange: [10.0, 13.0], volatilityBand: 'Moderate-high — 25-35% individual stock drawdowns',
    taxTreatment: 'Dividend at slab rate (post-Mar 2020 — earlier was DDT regime); LTCG 12.5% above ₹1.25L; STCG 20%',
    liquidityNote: 'T+1 settlement; high liquidity in NSE 100 names',
    howToInvest: 'Buy direct on NSE/BSE via demat. SWP equivalent: take dividends as cash, harvest LTCG to ₹1.25L exemption annually.',
    bestFor: 'DIY retirees willing to research and monitor 8-12 stocks. Not for set-and-forget investors.',
    directInstruments: [
      { name: 'ITC Ltd', issuer: 'ITC Ltd', category: 'FMCG diversified', expectedCagr: 11.0, yieldOrCoupon: '~3.5% dividend yield', taxNote: 'Dividend slab; capital gains LTCG 12.5%', notes: 'Decade of consistent payout growth. FMCG core stable.' },
      { name: 'ONGC', issuer: 'Oil and Natural Gas Corporation', category: 'PSU oil & gas', expectedCagr: 9.0, yieldOrCoupon: '~4.5% dividend yield', taxNote: 'Slab + LTCG', notes: 'Highest-yield PSU. Cyclical commodity exposure.' },
      { name: 'Coal India', issuer: 'Coal India Ltd', category: 'PSU mining', expectedCagr: 8.0, yieldOrCoupon: '~6.5% dividend yield', taxNote: 'Slab + LTCG', notes: 'Highest dividend yield among Nifty 50. ESG concerns worth noting.' },
      { name: 'HDFC Bank', issuer: 'HDFC Bank', category: 'Private sector bank', expectedCagr: 13.0, yieldOrCoupon: '~1.5% dividend yield', taxNote: 'Slab + LTCG', notes: 'Lower yield but historical compounder. Capital growth dominant.' },
      { name: 'Hindustan Unilever (HUL)', issuer: 'Hindustan Unilever', category: 'FMCG', expectedCagr: 11.0, yieldOrCoupon: '~2.0% dividend yield', taxNote: 'Slab + LTCG', notes: 'Defensive consumption play. Buy in corrections; rich PE typically.' },
    ],
  },
  {
    id: 'conservative-hybrid', bucket: 'b3',
    label: 'Conservative Hybrid (with IDCW)', short: '10-25% equity / 75-90% debt — for conservative income',
    category: 'Conservative Hybrid', kind: 'direct',
    rationale: 'Conservative Hybrid funds hold only 10-25% equity, vs 65-80% in aggressive hybrids. Available with IDCW (Income Distribution cum Capital Withdrawal) plans that pay regular distributions — useful for retirees wanting smoother monthly cashflow than direct SWP.',
    selectionCriteria: ['Equity allocation 10-25% sustained', 'AUM ≥ ₹2,000 Cr', 'IDCW plan available with sustained payout history', 'Manager tenure 5+ years'],
    riskFactors: ['IDCW reduces NAV — not "free" income; technically capital plus dividend', 'Slightly lower long-term return than balanced advantage', 'Slab-rate tax on the debt portion'],
    expectedReturnRange: [7.5, 9.5], volatilityBand: 'Low — drawdowns rarely exceed 8%',
    taxTreatment: 'Hybrid funds with <65% equity treated as DEBT MFs (post Apr-2023): slab rate on all gains',
    liquidityNote: 'T+1 to T+3; usually 1% exit load if redeemed within 1 year',
    howToInvest: 'Choose IDCW plan for periodic distributions OR Growth plan for compounding. Conservative SWP rate of 6-7% works well.',
    bestFor: 'Retirees who want low-volatility income without DIY-ing the equity-debt mix.',
    directInstruments: [
      { name: 'Parag Parikh Conservative Hybrid', issuer: 'PPFAS Mutual Fund', category: 'Conservative Hybrid', expectedCagr: 9.5, tenure: 'Open-ended', yieldOrCoupon: 'IDCW typically 6-7% annually', taxNote: 'Debt MF (slab rate)', notes: 'Newer fund but strong manager track record. ~₹3kCr AUM growing.' },
      { name: 'ICICI Prudential Conservative Hybrid', issuer: 'ICICI Prudential AMC', category: 'Conservative Hybrid', expectedCagr: 8.5, tenure: 'Open-ended', yieldOrCoupon: 'IDCW ~7%', taxNote: 'Debt MF (slab rate)', notes: 'Larger AUM, longer track record. Conservative duration on debt portion.' },
    ],
  },
  {
    id: 'sif', bucket: 'b3',
    label: 'SIF (Specialized Investment Fund)', short: 'New SEBI category for HNI investors — ₹10L minimum',
    category: 'SIF', kind: 'direct',
    rationale: 'Specialized Investment Funds are a new SEBI fund category (introduced 2024) that sits between mutual funds and PMS. Higher minimum investment (₹10 lakh) but more flexible mandates — long-short equity, sector-concentrated, derivative strategies. For sophisticated retirees with HNI status.',
    selectionCriteria: ['Minimum ₹10 lakh investment per scheme', 'AMC pedigree — only top-tier AMCs are launching SIFs', 'Manager track record of running similar mandates in PMS', 'Clear mandate disclosure'],
    riskFactors: ['New regulatory regime — minimal track record in India', 'Higher expense ratios than MFs (1.5-2.5% TER)', 'Less liquidity than MFs — daily NAV but typically 30-day lock-ins', 'Lower SEBI oversight than MFs (closer to PMS)'],
    expectedReturnRange: [10.0, 14.0], volatilityBand: 'Variable — depends on mandate (long-only ~MF-like, long-short lower)',
    taxTreatment: 'Same as underlying scheme classification (equity / hybrid / debt) — verify per SIF',
    liquidityNote: 'Daily NAV; redemption typically within 7-10 working days',
    howToInvest: 'Through AMC or SEBI-registered distributor. Currently very few SIFs exist (launched late 2024 / early 2025).',
    bestFor: 'HNI retirees with corpus >₹2 Cr who want differentiated strategies beyond plain MFs.',
    directInstruments: [
      { name: 'SIF — Long-Short Equity (representative)', issuer: 'Various AMCs (HDFC, ICICI, Edelweiss launching)', category: 'SIF — long-short', expectedCagr: 12.0, minTicket: '₹10,00,000', tenure: 'Open-ended; 30-day lock typical', taxNote: 'Per scheme classification', notes: 'Brand new category — wait for 2-3 year track record before allocating significantly.' },
    ],
  },

  // ── B4 additions ──────────────────────────────────────────────────
  {
    id: 'index-etf', bucket: 'b4',
    label: 'Index ETFs (Nifty 50, Sensex, Smallcap)', short: 'Demat-traded index trackers — lowest expense in equity',
    category: 'Index ETF', kind: 'direct',
    rationale: 'Index ETFs trade on exchanges and replicate broad market indices at expense ratios as low as 0.05% (vs 0.30-1.00% for index MFs). Best vehicle for the "boring" core of B4 — pure market beta with minimal cost drag.',
    selectionCriteria: ['Tracking error < 0.10% over 1 year', 'AUM ≥ ₹3,000 Cr (for tight bid-ask)', 'Expense ratio ≤ 0.10% (large-cap), ≤ 0.20% (smallcap)', 'Daily volume sufficient for your typical trade size'],
    riskFactors: ['ETFs trade at premiums/discounts to NAV — verify before buying', 'Need an active broker / demat account', 'Smaller smallcap ETFs have wider spreads', 'Index returns only — no alpha possible'],
    expectedReturnRange: [11.0, 13.0], volatilityBand: 'Same as underlying index (Nifty 50: -25 to -45% in major bears)',
    taxTreatment: 'Equity ETFs: equity LTCG 12.5% above ₹1.25L; STCG 20%',
    liquidityNote: 'T+1 settlement; trades on exchange continuously during market hours',
    howToInvest: 'Buy on NSE/BSE via your broker. Place limit orders to control entry price. Reinvest dividends manually.',
    bestFor: 'Cost-sensitive retirees who want passive equity exposure. The default core for FIRE-style portfolios.',
    directInstruments: [
      { name: 'NIFTYBEES (Nippon Nifty 50 ETF)', issuer: 'Nippon India AMC', category: 'Nifty 50 ETF', expectedCagr: 12.5, minTicket: '~₹250 per unit', yieldOrCoupon: 'Tracks Nifty 50', taxNote: 'Equity LTCG 12.5%', notes: 'Largest Nifty 50 ETF in India. Tracking error <0.05%.' },
      { name: 'SETFNIF50 (SBI Nifty 50 ETF)', issuer: 'SBI AMC', category: 'Nifty 50 ETF', expectedCagr: 12.5, minTicket: '~₹250 per unit', yieldOrCoupon: 'Tracks Nifty 50', taxNote: 'Equity LTCG 12.5%', notes: 'Lowest expense ratio among Nifty 50 ETFs (0.04%).' },
      { name: 'JUNIORBEES (Nippon Nifty Next 50)', issuer: 'Nippon India AMC', category: 'Nifty Next 50 ETF', expectedCagr: 13.0, minTicket: '~₹600 per unit', yieldOrCoupon: 'Tracks Nifty Next 50', taxNote: 'Equity LTCG 12.5%', notes: 'Beta+ exposure to large-but-not-mega caps.' },
      { name: 'Motilal Oswal Nasdaq 100 ETF', issuer: 'Motilal Oswal AMC', category: 'International index ETF', expectedCagr: 13.5, minTicket: '~₹150 per unit', yieldOrCoupon: 'Tracks Nasdaq 100 (USD)', taxNote: 'Debt MF (slab) post-2023', notes: 'USD exposure + US tech beta. Currency-hedged variant unavailable as ETF.' },
    ],
  },
  {
    id: 'international', bucket: 'b4',
    label: 'International Funds & FoFs', short: 'US, EM, global equity — currency hedge + diversification',
    category: 'International',
    rationale: 'International equity (predominantly US, with some emerging markets and global) provides geographic diversification AND a natural rupee-depreciation hedge. The Indian market is ~3% of global market cap — concentration risk is real. 10-15% of B4 in international is reasonable for FIRE-style portfolios.',
    selectionCriteria: [
      'AUM ≥ ₹500 Cr',
      'Tracking error vs benchmark < 1% (FoF / index variant)',
      'No FoF-on-FoF structure (double layer of fees)',
      'Available in growth plan (compounding)',
    ],
    riskFactors: [
      'Tax treatment changed in 2023 — FoFs now taxed as debt MFs at slab rate',
      'Currency volatility cuts both ways — strong rupee periods hurt returns',
      'Concentration in mega-cap US tech if you choose Nasdaq 100',
      'Time-zone gap means India-side NAV uses prior-day US close',
    ],
    expectedReturnRange: [12.0, 15.0],
    volatilityBand: 'High — drawdowns 30-40% in US bear markets, plus currency component',
    taxTreatment: 'International FoFs (post Apr-2023): debt MF — slab rate on all gains. Direct US stocks via LRS: STCG slab, LTCG 12.5% > ₹1.25L (after 2-year holding)',
    liquidityNote: 'T+3 to T+5 for FoFs; depends on settlement of underlying',
    howToInvest: 'Easiest path: domestic FoFs (Motilal Nasdaq, Parag Parikh built-in international). Advanced: LRS direct US investing via INDmoney, Vested.',
    bestFor: 'Long-horizon retirees with 10+ year B4 holding, especially FIRE retirees with rupee-depreciation concern.',
  },
  {
    id: 'sgb', bucket: 'b4',
    label: 'Sovereign Gold Bonds (SGBs)', short: 'RBI-issued gold bonds — 2.5% interest + gold appreciation, tax-free at maturity',
    category: 'SGB', kind: 'direct',
    rationale: 'SGBs are gold-linked bonds issued by the RBI. You get gold price appreciation PLUS 2.5% annual interest, AND the capital gain at 8-year maturity is fully tax-exempt — the only tax-free gold investment available. Strictly better than gold ETFs if held to maturity.',
    selectionCriteria: ['Buy in primary issue (RBI tranches) for ₹50/gm discount', 'OR buy on NSE/BSE secondary market when trading at slight discount to spot', 'Minimum 1 gm; maximum 4 kg per individual per fiscal year', 'Held in demat or physical certificate'],
    riskFactors: ['Capital loss if gold price falls before maturity (and you sell early)', '8-year lock-in for tax-free benefit (early exit allowed after year 5 with capital gains tax)', 'Liquidity in secondary market is decent but spreads can be 1-2% wide'],
    expectedReturnRange: [9.0, 12.0], volatilityBand: 'Same as gold — typical -20 to -30% drawdowns; capital gain 8-12% annualised on average',
    taxTreatment: 'Interest (2.5%) at slab rate; capital gains at maturity (8 years) fully exempt — best tax-treated gold investment',
    liquidityNote: '8-year tenor; early redemption to RBI at year 5/6/7 (gain taxed at slab); secondary trading on NSE/BSE',
    howToInvest: 'Subscribe to RBI tranches when announced (typically 4-6 issues per year). Or buy listed SGBs on NSE/BSE — check premium/discount to spot gold.',
    bestFor: 'Retirees with horizon ≥8 years who want gold exposure with the best tax profile. Strictly preferred over gold ETFs for hold-to-maturity.',
    directInstruments: [
      { name: 'SGB 2024-25 Series I/II/III (representative)', issuer: 'Reserve Bank of India', category: 'Sovereign Gold Bond', expectedCagr: 10.5, minTicket: '1 gram of gold', maxTicket: '4 kg per individual per FY', tenure: '8 years', yieldOrCoupon: '2.5% interest paid semi-annually + gold price appreciation', taxNote: 'Interest slab; capital gain at maturity tax-free', notes: 'No new issues are guaranteed each year — RBI announces tranches based on Govt requirements. Subscription via banks, post offices, NSE/BSE primary, or AMC platforms.' },
      { name: 'Listed SGBs (secondary market)', issuer: 'Reserve Bank of India (issuer); various traders on NSE/BSE', category: 'Listed SGB', expectedCagr: 10.0, minTicket: '~1 unit (= 1 gram)', tenure: 'Residual to original 8-year tenor', yieldOrCoupon: '2.5% interest + gold appreciation', taxNote: 'Same as primary; tax-free at maturity', notes: 'Often trade at 5-10% discount to spot gold — better entry than primary issues.' },
    ],
  },
  {
    id: 'commercial-real-estate', bucket: 'b4',
    label: 'Commercial Real Estate (Direct)', short: 'Owned office/retail space — illiquid, lumpy, high-yield',
    category: 'Direct CRE', kind: 'direct',
    rationale: 'Direct ownership of commercial property (office space, retail shops, warehouses). 6-9% rental yield + capital appreciation. Generally not recommended for retail — minimum sensible ticket ₹2-5 Cr, illiquid, management-intensive. REITs are usually a better way to access CRE economics.',
    selectionCriteria: ['Tier 1 city Grade A property only', 'Established tenant on long lease (5+ years committed)', 'Verify clear title, RERA registration, structural quality', 'Minimum sensible ticket ₹2-5 Cr — below this, transaction costs dominate'],
    riskFactors: ['Highly illiquid — months to years to exit', 'Tenant vacancy risk (months without rent)', 'Maintenance costs 1-2% of asset value annually', 'Property tax + capital gains complexity', 'WFH demand uncertainty for office space'],
    expectedReturnRange: [9.0, 12.0], volatilityBand: 'Capital values smooth (illiquid mark-to-market); rental income stable',
    taxTreatment: 'Rental income at slab; capital gain LTCG 12.5% (post-2024) if held >24 months; cost-indexation no longer available post-budget Jul 2024',
    liquidityNote: 'Months to years to find buyer; legal closing 30-90 days even after offer',
    howToInvest: 'Direct purchase via property advisor / channel partner. Demat-tradeable fractional ownership platforms (Strata, Property Share) emerging — verify regulatory status.',
    bestFor: 'High-net-worth retirees with corpus >₹5 Cr and willingness to manage property. For everyone else: REITs.',
    directInstruments: [
      { name: 'Tier 1 city Grade A office (representative)', issuer: 'Direct ownership', category: 'Commercial property', expectedCagr: 10.0, minTicket: '~₹2-5 Cr', tenure: 'Long-term hold (10+ years)', yieldOrCoupon: '6-9% rental yield', taxNote: 'Rent slab; LTCG 12.5% after 24 months', notes: 'Highly variable by location, tenant, property quality. Strongly consider REITs as a substitute unless you have estate-planning reasons for direct ownership.' },
      { name: 'Fractional CRE (Strata, Property Share, Assetmonk)', issuer: 'Various platforms', category: 'Fractional commercial property', expectedCagr: 9.5, minTicket: '~₹10 lakh per fraction', tenure: '5-10 years typical', yieldOrCoupon: '7-10% rental yield', taxNote: 'Similar to direct CRE; verify with platform', notes: 'Lower entry barrier but exit liquidity uncertain. SEBI is creating SM-REIT framework for these (2024-25).' },
    ],
  },
  {
    id: 'slbm', bucket: 'b4',
    label: 'Securities Lending (SLBM) Overlay', short: 'Lend your B4 demat shares — fee income on top of equity returns',
    category: 'SLBM', kind: 'direct',
    rationale: 'Securities Lending and Borrowing Mechanism (SLBM) is an income OVERLAY on your existing B4 equity holdings. Lend large-cap shares you already plan to hold long-term and earn a 1-3% annual fee on top of normal capital appreciation and dividends. Belongs in B4 (not B1) because the underlying capital is locked equity, not cash — the SLBM fee is incremental, not principal.',
    selectionCriteria: [
      'Hold large-cap stocks in demat (Nifty 50 / 100 names have most borrower demand)',
      'Broker that supports SLBM (Zerodha, Groww, ICICI Direct, HDFC Securities)',
      'Willingness to lock specific shares for 1-12 months at a time',
      'Already-long-horizon B4 holdings — do not lend trading positions',
    ],
    riskFactors: [
      'Lent shares cannot be sold during the lending period — emergency exit blocked',
      'Counterparty risk mitigated by NSE Clearing Corp guarantee, but fee depends on borrower demand',
      'Lending fees vary stock-to-stock; predictable income only on high-demand names',
      'Disclosure complexity at tax time (income from other sources)',
    ],
    expectedReturnRange: [1.0, 4.0],
    volatilityBand: 'Income volatility — fees fluctuate with market interest in your specific stock',
    taxTreatment: 'Lending fee taxed as Income from Other Sources at slab rate (separate from underlying equity LTCG)',
    liquidityNote: 'Shares locked for the lending period (typically 1-12 months); auto-recall available with notice',
    howToInvest: 'Enable SLBM on your broker platform. Lend stocks you already plan to hold for 5+ years anyway. The lending fee is pure upside on top of dividends + capital appreciation.',
    bestFor: 'B4 long-term equity holders with NSE 100 names in demat. Adds 100-300bps incremental yield to assets you would hold regardless.',
    directInstruments: [
      {
        name: 'SLBM via Zerodha / Kite',
        issuer: 'NSE Clearing Corp (NSCCL)',
        category: 'Securities lending',
        expectedCagr: 2.5,
        taxNote: 'Slab rate on lending fee income',
        notes: 'Lent shares appear as collateral; you continue to receive dividends and bonuses. Splits handled per SEBI rules. Best fees on Nifty 50 stocks during F&O expiry weeks.',
      },
    ],
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
