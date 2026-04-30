// Risk-profile-driven asset class recommendations per bucket.
//
// For each of the 5 risk profiles × 4 buckets, we declare:
//   - the primary recommended asset class
//   - an optional secondary class (for diversification within bucket)
//   - the top 1-3 fund scheme codes from our curated AMFI list
//   - a one-paragraph rationale tailored to the profile

import type { RiskProfileId } from '../../types/profiles'
import type { AssetClassId, BucketKey } from './assetClasses'

export interface BucketRecommendation {
  primary: AssetClassId
  secondary?: AssetClassId
  primaryFundCodes: string[]
  rationale: string
}

type RecMap = Record<RiskProfileId, Record<BucketKey, BucketRecommendation>>

export const RECOMMENDATIONS: RecMap = {
  // ── Ultra-Conservative (10–19, ~12% equity) ──
  'ultra-conservative': {
    b1: {
      primary: 'liquid',
      primaryFundCodes: ['119551', '119807'],
      rationale: 'Pure capital preservation. Even arbitrage funds carry small equity-related volatility, which is unnecessary risk for the safety-first profile. Stick to AAA-only liquid funds.',
    },
    b2: {
      primary: 'banking-psu',
      secondary: 'corporate-bond',
      primaryFundCodes: ['120585', '118552'],
      rationale: 'Quasi-sovereign credit only. Banking & PSU debt funds give you AAA banking/PSU paper — the safest non-government debt available. Pair with senior FD ladder + SCSS for the hold-to-maturity B2 portion.',
    },
    b3: {
      primary: 'equity-savings',
      primaryFundCodes: ['118468', '120744'],
      rationale: 'Equity Savings caps net equity at ~30% while still qualifying for equity tax (12.5% LTCG). The least-volatile equity-taxed B3 option — drawdowns rarely exceed 10%.',
    },
    b4: {
      primary: 'multi-asset',
      secondary: 'gold',
      primaryFundCodes: ['120178'],
      rationale: 'Multi-asset funds blend equity, debt and gold automatically — far more conservative than pure equity. The 10-15% gold allocation acts as inflation and currency hedge. Drawdowns 20-30% vs 45%+ for pure equity.',
    },
  },

  // ── Conservative (20–27, ~17% equity) ──
  'conservative': {
    b1: {
      primary: 'liquid',
      primaryFundCodes: ['120586', '119551'],
      rationale: 'Liquid funds remain the right B1 vehicle until you cross a 20% slab — the arbitrage tax advantage does not yet outweigh its added complexity at your bracket.',
    },
    b2: {
      primary: 'corporate-bond',
      secondary: 'banking-psu',
      primaryFundCodes: ['118834', '120338'],
      rationale: 'AAA corporate bond funds offer 30-50bps higher yield than Banking & PSU funds with only marginally more credit risk. SCSS continues as the largest hold-to-maturity B2 component.',
    },
    b3: {
      primary: 'balanced-advantage',
      secondary: 'equity-savings',
      primaryFundCodes: ['119609', '118566'],
      rationale: 'Balanced Advantage is the SWP workhorse — auto-shifts equity↔debt by valuation. Drawdowns substantially smaller than aggressive hybrids; equity tax treatment intact.',
    },
    b4: {
      primary: 'multi-asset',
      secondary: 'flexi-cap',
      primaryFundCodes: ['120178', '118527'],
      rationale: 'Multi-Asset for the bulk; a single Flexi Cap kicker (Parag Parikh) for long-term growth. The diversification keeps drawdowns manageable while not foregoing all equity upside.',
    },
  },

  // ── Moderate (28–35, ~57% equity) — the recommended default ──
  'moderate': {
    b1: {
      primary: 'liquid',
      primaryFundCodes: ['120586', '119551'],
      rationale: 'B1 should always be the simplest, lowest-friction holding. Liquid funds at AAA composition deliver predictable monthly SWP into your bank account.',
    },
    b2: {
      primary: 'corporate-bond',
      primaryFundCodes: ['118834', '120338'],
      rationale: 'AAA corporate bonds at 7-8% yield. The mid-slab investor takes the slab tax hit and still nets 5-6% post-tax — well above PMVVY/POMIS at the same horizon.',
    },
    b3: {
      primary: 'balanced-advantage',
      secondary: 'aggressive-hybrid',
      primaryFundCodes: ['119609', '118566'],
      rationale: 'Balanced Advantage is the default SWP source. Pair with one aggressive hybrid (SBI Equity Hybrid or ICICI Equity & Debt) for management-style diversification without significantly increasing volatility.',
    },
    b4: {
      primary: 'flexi-cap',
      secondary: 'mid-cap',
      primaryFundCodes: ['118527', '101206', '112932'],
      rationale: 'Flexi Cap is the long-term wealth engine. Parag Parikh leads on the international + value tilt, HDFC and Kotak round out the shortlist. Add a midcap once you have 15+ year horizon.',
    },
  },

  // ── Moderately Aggressive (36–43, ~57% equity with midcap tilt) ──
  'moderately-aggressive': {
    b1: {
      primary: 'arbitrage',
      secondary: 'liquid',
      primaryFundCodes: ['120718'],
      rationale: 'At 20%+ slab, arbitrage funds beat liquid by ~120bps post-tax thanks to equity LTCG treatment. Hold for at least 12 months to qualify for LTCG (vs STCG 20%).',
    },
    b2: {
      primary: 'short-duration',
      secondary: 'corporate-bond',
      primaryFundCodes: ['119723', '119716'],
      rationale: 'Short Duration funds give the best risk-adjusted yield in the 1-3 year sweet spot. SCSS still anchors the hold-to-maturity portion; this fills the active SWP slice of B2.',
    },
    b3: {
      primary: 'aggressive-hybrid',
      secondary: 'balanced-advantage',
      primaryFundCodes: ['118525', '119827'],
      rationale: 'Aggressive Hybrids hold a static 65-80% equity — higher long-term return than BAFs in exchange for bigger drawdowns. Acceptable trade for this profile. SBI Equity Hybrid is the flagship.',
    },
    b4: {
      primary: 'multicap',
      secondary: 'flexi-cap',
      primaryFundCodes: ['118955', '112277'],
      rationale: 'Multicap funds mandate 25/25/25 across large/mid/small caps post the SEBI 2020 rule — gives you explicit small-cap exposure. Pair with a Flexi Cap for manager-style diversification.',
    },
  },

  // ── Aggressive / FIRE (44–50, ~78% equity) ──
  'aggressive': {
    b1: {
      primary: 'arbitrage',
      primaryFundCodes: ['120718'],
      rationale: 'At 30% slab, arbitrage is unambiguously better than liquid (~150bps post-tax advantage). Even though B1 is small (5% of corpus), the cumulative tax saving over 20 years is meaningful.',
    },
    b2: {
      primary: 'short-duration',
      primaryFundCodes: ['119723', '119716'],
      rationale: 'Short Duration funds maximise debt yield. B2 is only 10-15% of an aggressive corpus — the absolute rupee impact of higher yield is small but material across 20+ years.',
    },
    b3: {
      primary: 'aggressive-hybrid',
      primaryFundCodes: ['118525', '119827'],
      rationale: 'Aggressive Hybrid is the right B3 holding for high-equity profiles. The static 65-80% equity allocation matches your overall risk tolerance and produces materially higher 10-year returns than BAFs.',
    },
    b4: {
      primary: 'flexi-cap',
      secondary: 'mid-cap',
      primaryFundCodes: ['118527', '125307', '103504'],
      rationale: 'Flexi Cap (Parag Parikh) for the international + value core. Layer in midcap (Motilal Oswal, Kotak Emerging Equity) for the next 30%. For FIRE retirees, 5-10% in small cap (Quant) and Nasdaq 100 FoF complete the engine.',
    },
  },
}

export function recommendationFor(profileId: RiskProfileId | null, bucket: BucketKey): BucketRecommendation | null {
  if (!profileId) return null
  return RECOMMENDATIONS[profileId]?.[bucket] ?? null
}
