// Risk-profile-driven asset class recommendations per bucket.
//
// For each of the 5 risk profiles × 4 buckets, we declare:
//   - the primary recommended asset class
//   - an optional secondary class (for diversification within bucket)
//   - the top 1-3 fund scheme codes from our curated AMFI list
//   - a one-paragraph rationale tailored to the profile

import type { RiskProfileId } from '../../types/profiles'
import type { AssetClassId, BucketKey } from './assetClasses'

export interface OptimalMixSlice {
  classId: AssetClassId
  pctOfBucket: number      // 0–100, sums across slices to ~100
  role: string             // 1-line description of why this slice exists
}

export interface BucketRecommendation {
  primary: AssetClassId
  secondary?: AssetClassId
  primaryFundCodes: string[]
  rationale: string
  // Optimised multi-class mix within this bucket — slices sum to ~100%
  // and represent the return-optimised allocation respecting bucket
  // constraints (liquidity, hold-to-maturity, etc.).
  optimalMix: OptimalMixSlice[]
}

type RecMap = Record<RiskProfileId, Record<BucketKey, BucketRecommendation>>

export const RECOMMENDATIONS: RecMap = {
  // ── Ultra-Conservative (10–19, ~12% equity) ──
  'ultra-conservative': {
    b1: {
      primary: 'liquid',
      primaryFundCodes: ['119551', '119807'],
      rationale: 'Pure capital preservation. Even arbitrage funds carry small equity-related volatility, which is unnecessary risk for the safety-first profile. Stick to AAA-only liquid funds.',
      optimalMix: [
        { classId: 'liquid', pctOfBucket: 100, role: 'AAA liquid funds — single-vehicle B1 for simplicity' },
      ],
    },
    b2: {
      primary: 'banking-psu',
      secondary: 'corporate-bond',
      primaryFundCodes: ['120585', '118552'],
      rationale: 'Quasi-sovereign credit only. Banking & PSU debt funds give you AAA banking/PSU paper — the safest non-government debt available. Pair with senior FD ladder + SCSS for the hold-to-maturity B2 portion.',
      optimalMix: [
        { classId: 'scss',         pctOfBucket: 50, role: 'Maximise SCSS quota first — highest govt-backed yield (8.2%)' },
        { classId: 'senior-fd',    pctOfBucket: 20, role: 'Bank senior FDs across 2-3 banks for DICGC coverage' },
        { classId: 'g-sec',        pctOfBucket: 15, role: 'Direct G-Sec via RBI Retail Direct — sovereign zero-default' },
        { classId: 'pomis',        pctOfBucket: 10, role: 'POMIS for monthly cashflow at 7.4%' },
        { classId: 'banking-psu',  pctOfBucket:  5, role: 'Banking & PSU MF for liquidity if needed' },
      ],
    },
    b3: {
      primary: 'equity-savings',
      primaryFundCodes: ['118468', '120744'],
      rationale: 'Equity Savings caps net equity at ~30% while still qualifying for equity tax (12.5% LTCG). The least-volatile equity-taxed B3 option — drawdowns rarely exceed 10%.',
      optimalMix: [
        { classId: 'equity-savings',       pctOfBucket: 55, role: '~30% net equity with equity-tax qualification' },
        { classId: 'conservative-hybrid',  pctOfBucket: 25, role: 'IDCW plan for periodic distributions' },
        { classId: 'reit',                 pctOfBucket: 15, role: 'Listed REITs for stable rental distributions' },
        { classId: 'invit',                pctOfBucket:  5, role: 'Small InvIT slice for incremental yield' },
      ],
    },
    b4: {
      primary: 'multi-asset',
      secondary: 'gold',
      primaryFundCodes: ['120178'],
      rationale: 'Multi-asset funds blend equity, debt and gold automatically — far more conservative than pure equity. The 10-15% gold allocation acts as inflation and currency hedge. Drawdowns 20-30% vs 45%+ for pure equity.',
      optimalMix: [
        { classId: 'multi-asset',  pctOfBucket: 60, role: 'Self-rebalancing equity+debt+gold blend' },
        { classId: 'sgb',          pctOfBucket: 25, role: 'SGBs for tax-free gold appreciation at maturity' },
        { classId: 'flexi-cap',    pctOfBucket: 15, role: 'Small flexi-cap kicker (Parag Parikh) — capped equity exposure' },
      ],
    },
  },

  // ── Conservative (20–27, ~17% equity) ──
  'conservative': {
    b1: {
      primary: 'liquid',
      primaryFundCodes: ['120586', '119551'],
      rationale: 'Liquid funds remain the right B1 vehicle until you cross a 20% slab — the arbitrage tax advantage does not yet outweigh its added complexity at your bracket.',
      optimalMix: [
        { classId: 'liquid',     pctOfBucket: 90, role: 'AAA liquid MFs for monthly SWP source' },
        { classId: 'liquid-etf', pctOfBucket: 10, role: 'Small demat slice if you want broker-side B1' },
      ],
    },
    b2: {
      primary: 'corporate-bond',
      secondary: 'banking-psu',
      primaryFundCodes: ['118834', '120338'],
      rationale: 'AAA corporate bond funds offer 30-50bps higher yield than Banking & PSU funds with only marginally more credit risk. SCSS continues as the largest hold-to-maturity B2 component.',
      optimalMix: [
        { classId: 'scss',           pctOfBucket: 45, role: 'Maximise SCSS quota — highest yield + 80C' },
        { classId: 'corporate-bond', pctOfBucket: 25, role: 'AAA corp bond MFs for active management' },
        { classId: 'senior-fd',      pctOfBucket: 15, role: 'Senior FD ladder spread across banks' },
        { classId: 'gilt-mf',        pctOfBucket: 10, role: 'Gilt MFs for sovereign duration kicker' },
        { classId: 'pomis',          pctOfBucket:  5, role: 'POMIS for monthly cashflow' },
      ],
    },
    b3: {
      primary: 'balanced-advantage',
      secondary: 'equity-savings',
      primaryFundCodes: ['119609', '118566'],
      rationale: 'Balanced Advantage is the SWP workhorse — auto-shifts equity↔debt by valuation. Drawdowns substantially smaller than aggressive hybrids; equity tax treatment intact.',
      optimalMix: [
        { classId: 'balanced-advantage', pctOfBucket: 50, role: 'BAF as primary SWP source' },
        { classId: 'equity-savings',     pctOfBucket: 20, role: 'Equity Savings for low-volatility income' },
        { classId: 'reit',               pctOfBucket: 15, role: 'REITs for rental income stream' },
        { classId: 'invit',              pctOfBucket: 10, role: 'InvITs for higher distribution yield' },
        { classId: 'dividend-yield',     pctOfBucket:  5, role: 'Dividend yield MF for defensive equity' },
      ],
    },
    b4: {
      primary: 'multi-asset',
      secondary: 'flexi-cap',
      primaryFundCodes: ['120178', '118527'],
      rationale: 'Multi-Asset for the bulk; a single Flexi Cap kicker (Parag Parikh) for long-term growth. The diversification keeps drawdowns manageable while not foregoing all equity upside.',
      optimalMix: [
        { classId: 'multi-asset',  pctOfBucket: 40, role: 'Self-rebalancing equity+debt+gold' },
        { classId: 'flexi-cap',    pctOfBucket: 25, role: 'Flexi cap (Parag Parikh) for compounding' },
        { classId: 'sgb',          pctOfBucket: 20, role: 'SGBs — tax-free at 8-yr maturity' },
        { classId: 'international', pctOfBucket: 10, role: 'International for currency hedge' },
        { classId: 'gold',         pctOfBucket:  5, role: 'Liquid gold ETF for rebalancing flexibility' },
      ],
    },
  },

  // ── Moderate (28–35, ~57% equity) — the recommended default ──
  'moderate': {
    b1: {
      primary: 'liquid',
      primaryFundCodes: ['120586', '119551'],
      rationale: 'B1 should always be the simplest, lowest-friction holding. Liquid funds at AAA composition deliver predictable monthly SWP into your bank account.',
      optimalMix: [
        { classId: 'liquid',    pctOfBucket: 80, role: 'Primary monthly SWP source' },
        { classId: 'arbitrage', pctOfBucket: 20, role: 'Arbitrage for tax efficiency on ≥12-month portion' },
      ],
    },
    b2: {
      primary: 'corporate-bond',
      primaryFundCodes: ['118834', '120338'],
      rationale: 'AAA corporate bonds at 7-8% yield. The mid-slab investor takes the slab tax hit and still nets 5-6% post-tax — well above PMVVY/POMIS at the same horizon.',
      optimalMix: [
        { classId: 'scss',           pctOfBucket: 35, role: 'SCSS — highest govt-backed yield' },
        { classId: 'corporate-bond', pctOfBucket: 30, role: 'AAA corp bond MFs for active management' },
        { classId: 'short-duration', pctOfBucket: 15, role: 'Short duration for SWP-able portion' },
        { classId: 'senior-fd',      pctOfBucket: 10, role: 'Senior FD ladder for diversification' },
        { classId: 'direct-bonds',   pctOfBucket: 10, role: 'Listed PSU bonds for direct yield' },
      ],
    },
    b3: {
      primary: 'balanced-advantage',
      secondary: 'aggressive-hybrid',
      primaryFundCodes: ['119609', '118566'],
      rationale: 'Balanced Advantage is the default SWP source. Pair with one aggressive hybrid (SBI Equity Hybrid or ICICI Equity & Debt) for management-style diversification without significantly increasing volatility.',
      optimalMix: [
        { classId: 'balanced-advantage', pctOfBucket: 45, role: 'BAF — the SWP workhorse' },
        { classId: 'aggressive-hybrid',  pctOfBucket: 20, role: 'Aggressive hybrid for higher long-term return' },
        { classId: 'reit',               pctOfBucket: 15, role: 'REITs for distribution yield' },
        { classId: 'invit',              pctOfBucket: 10, role: 'InvITs for higher yield (finite-life trade-off)' },
        { classId: 'dividend-stocks',    pctOfBucket: 10, role: 'Direct bluechip dividend stocks (ITC, ONGC)' },
      ],
    },
    b4: {
      primary: 'flexi-cap',
      secondary: 'mid-cap',
      primaryFundCodes: ['118527', '101206', '112932'],
      rationale: 'Flexi Cap is the long-term wealth engine. Parag Parikh leads on the international + value tilt, HDFC and Kotak round out the shortlist. Add a midcap once you have 15+ year horizon.',
      optimalMix: [
        { classId: 'flexi-cap',     pctOfBucket: 35, role: 'Flexi Cap (Parag Parikh) — core compounder' },
        { classId: 'index-etf',     pctOfBucket: 25, role: 'NIFTYBEES — passive market beta at <0.05% expense' },
        { classId: 'multi-asset',   pctOfBucket: 15, role: 'Self-rebalancing equity+debt+gold' },
        { classId: 'international', pctOfBucket: 10, role: 'International for currency hedge' },
        { classId: 'sgb',           pctOfBucket: 10, role: 'SGBs — tax-free gold at maturity' },
        { classId: 'mid-cap',       pctOfBucket:  5, role: 'Small midcap kicker for 15+ year horizon' },
      ],
    },
  },

  // ── Moderately Aggressive (36–43, ~57% equity with midcap tilt) ──
  'moderately-aggressive': {
    b1: {
      primary: 'arbitrage',
      secondary: 'liquid',
      primaryFundCodes: ['120718'],
      rationale: 'At 20%+ slab, arbitrage funds beat liquid by ~120bps post-tax thanks to equity LTCG treatment. Hold for at least 12 months to qualify for LTCG (vs STCG 20%).',
      optimalMix: [
        { classId: 'arbitrage', pctOfBucket: 60, role: 'Equity-tax arbitrage for >12-month holdings' },
        { classId: 'liquid',    pctOfBucket: 40, role: 'Liquid MFs for the 0-12 month portion' },
      ],
    },
    b2: {
      primary: 'short-duration',
      secondary: 'corporate-bond',
      primaryFundCodes: ['119723', '119716'],
      rationale: 'Short Duration funds give the best risk-adjusted yield in the 1-3 year sweet spot. SCSS still anchors the hold-to-maturity portion; this fills the active SWP slice of B2.',
      optimalMix: [
        { classId: 'scss',           pctOfBucket: 40, role: 'SCSS quota — fill first regardless of profile' },
        { classId: 'short-duration', pctOfBucket: 25, role: 'Short duration MF for active yield' },
        { classId: 'corporate-bond', pctOfBucket: 15, role: 'AAA corporate bond MF' },
        { classId: 'direct-bonds',   pctOfBucket: 15, role: 'Direct PSU/AAA listed bonds' },
        { classId: 'senior-fd',      pctOfBucket:  5, role: 'Senior FD ladder anchor' },
      ],
    },
    b3: {
      primary: 'aggressive-hybrid',
      secondary: 'balanced-advantage',
      primaryFundCodes: ['118525', '119827'],
      rationale: 'Aggressive Hybrids hold a static 65-80% equity — higher long-term return than BAFs in exchange for bigger drawdowns. Acceptable trade for this profile. SBI Equity Hybrid is the flagship.',
      optimalMix: [
        { classId: 'aggressive-hybrid',  pctOfBucket: 35, role: 'Aggressive hybrid — higher equity tilt for long-term return' },
        { classId: 'balanced-advantage', pctOfBucket: 25, role: 'BAF for valuation-aware rebalancing' },
        { classId: 'dividend-stocks',    pctOfBucket: 20, role: 'Direct dividend bluechips for cashflow + appreciation' },
        { classId: 'reit',               pctOfBucket: 10, role: 'REITs for stable distributions' },
        { classId: 'invit',              pctOfBucket: 10, role: 'InvITs for higher yield' },
      ],
    },
    b4: {
      primary: 'multicap',
      secondary: 'flexi-cap',
      primaryFundCodes: ['118955', '112277'],
      rationale: 'Multicap funds mandate 25/25/25 across large/mid/small caps post the SEBI 2020 rule — gives you explicit small-cap exposure. Pair with a Flexi Cap for manager-style diversification.',
      optimalMix: [
        { classId: 'flexi-cap',     pctOfBucket: 30, role: 'Flexi Cap core — Parag Parikh + HDFC' },
        { classId: 'multicap',      pctOfBucket: 25, role: 'SEBI-mandated 25/25/25 multicap for explicit smallcap' },
        { classId: 'mid-cap',       pctOfBucket: 15, role: 'Dedicated midcap for higher growth' },
        { classId: 'index-etf',     pctOfBucket: 10, role: 'Cost-efficient passive core' },
        { classId: 'international', pctOfBucket: 10, role: 'International for currency hedge' },
        { classId: 'sgb',           pctOfBucket:  5, role: 'SGBs — tax-free gold' },
        { classId: 'slbm',          pctOfBucket:  5, role: 'SLBM overlay on large-cap holdings (incremental fee)' },
      ],
    },
  },

  // ── Aggressive / FIRE (44–50, ~78% equity) ──
  'aggressive': {
    b1: {
      primary: 'arbitrage',
      primaryFundCodes: ['120718'],
      rationale: 'At 30% slab, arbitrage is unambiguously better than liquid (~150bps post-tax advantage). Even though B1 is small (5% of corpus), the cumulative tax saving over 20 years is meaningful.',
      optimalMix: [
        { classId: 'arbitrage',  pctOfBucket: 70, role: 'Arbitrage — equity tax wins decisively at 30% slab' },
        { classId: 'liquid-etf', pctOfBucket: 20, role: 'Demat-side liquidity for broker-platform F&O margin' },
        { classId: 'liquid',     pctOfBucket: 10, role: 'Small AAA liquid MF for emergency parking' },
      ],
    },
    b2: {
      primary: 'short-duration',
      primaryFundCodes: ['119723', '119716'],
      rationale: 'Short Duration funds maximise debt yield. B2 is only 10-15% of an aggressive corpus — the absolute rupee impact of higher yield is small but material across 20+ years.',
      optimalMix: [
        { classId: 'short-duration', pctOfBucket: 40, role: 'Short duration MFs for active yield' },
        { classId: 'direct-bonds',   pctOfBucket: 30, role: 'Direct PSU bonds — AAA listed' },
        { classId: 'senior-fd',      pctOfBucket: 20, role: 'Senior FD ladder for DICGC-insured floor' },
        { classId: 'g-sec',          pctOfBucket: 10, role: 'Direct G-Sec via RBI Retail Direct' },
      ],
    },
    b3: {
      primary: 'aggressive-hybrid',
      primaryFundCodes: ['118525', '119827'],
      rationale: 'Aggressive Hybrid is the right B3 holding for high-equity profiles. The static 65-80% equity allocation matches your overall risk tolerance and produces materially higher 10-year returns than BAFs.',
      optimalMix: [
        { classId: 'aggressive-hybrid', pctOfBucket: 50, role: 'Aggressive hybrid — primary SWP source with high equity' },
        { classId: 'dividend-stocks',   pctOfBucket: 25, role: 'Direct dividend stocks (HDFC Bank, ITC, Coal India)' },
        { classId: 'reit',              pctOfBucket: 15, role: 'REITs for distribution + appreciation' },
        { classId: 'invit',             pctOfBucket: 10, role: 'InvITs for higher cashflow yield' },
      ],
    },
    b4: {
      primary: 'flexi-cap',
      secondary: 'mid-cap',
      primaryFundCodes: ['118527', '125307', '103504'],
      rationale: 'Flexi Cap (Parag Parikh) for the international + value core. Layer in midcap (Motilal Oswal, Kotak Emerging Equity) for the next 30%. For FIRE retirees, 5-10% in small cap (Quant) and Nasdaq 100 FoF complete the engine.',
      optimalMix: [
        { classId: 'flexi-cap',     pctOfBucket: 30, role: 'Flexi Cap core — Parag Parikh' },
        { classId: 'mid-cap',       pctOfBucket: 20, role: 'Dedicated midcap for high-growth tilt' },
        { classId: 'multicap',      pctOfBucket: 20, role: 'Multicap with mandated smallcap exposure' },
        { classId: 'index-etf',     pctOfBucket: 15, role: 'Cost-efficient passive core (NIFTYBEES + Nasdaq 100)' },
        { classId: 'international', pctOfBucket: 10, role: 'International for currency hedge + US tech' },
        { classId: 'sgb',           pctOfBucket:  3, role: 'SGBs — tax-free gold at maturity' },
        { classId: 'slbm',          pctOfBucket:  2, role: 'SLBM overlay on large-cap holdings' },
      ],
    },
  },
}

export function recommendationFor(profileId: RiskProfileId | null, bucket: BucketKey): BucketRecommendation | null {
  if (!profileId) return null
  return RECOMMENDATIONS[profileId]?.[bucket] ?? null
}
