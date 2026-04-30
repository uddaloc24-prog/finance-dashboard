import type { RiskProfile, RiskProfileId } from '../../types/profiles'

// 5 risk profiles per the academic PDF. Bucket allocations and instrument
// recommendations are fixed — quiz score maps user to one profile.
//
// All instrument allocations are stated for a ₹1 Cr reference corpus and scale
// proportionally to the user's actual corpus.

export const RISK_PROFILES: RiskProfile[] = [
  {
    id: 'ultra-conservative',
    name: 'Ultra-Conservative',
    scoreRange: [10, 19],
    tagline: 'SCSS + PMVVY + FD Ladder',
    description:
      'Maximum safety, predictable income, fully government-backed. Inflation will erode real value over 20 years — accept this trade-off for absolute capital safety and steady ₹/month.',
    bucketShare: { b1: 0.05, b2: 0.60, b3: 0.25, b4: 0.10 },
    expectedMonthlyOn1Cr: 55_668,
    expectedYr10MonthlyOn1Cr: 55_668,    // fixed-rate, no growth
    expected20yrCorpusFromCr: 18_00_000,  // ₹18L real-terms equivalent (PDF anchor)
    principalSafe: 'moderate',
    bestFor: 'Retirees age 70+, single-source pensioners, anyone who panics in a market crash.',
    pros: ['100% government-backed', 'Predictable monthly income', 'Zero equity volatility'],
    cons: ['Inflation erodes purchasing power dramatically', 'Limited corpus growth', 'Re-investment risk on FD rollover'],
    instruments: [
      { name: 'Senior Citizens Savings Scheme (SCSS)', fundHouse: 'Govt of India', bucket: 'B2', category: 'Govt Scheme', expectedCagr: 8.2, allocationOn1CrCorpus: 30_00_000, monthlyIncomeOn1Cr: 20_500, taxTreatment: 'Slab-rate, 80C deduction', governmentBacked: true, lockIn: '5 years' },
      { name: 'Pradhan Mantri Vaya Vandana Yojana (PMVVY)', fundHouse: 'LIC', bucket: 'B2', category: 'Pension Scheme', expectedCagr: 7.4, allocationOn1CrCorpus: 15_00_000, monthlyIncomeOn1Cr: 9_250, taxTreatment: 'Slab-rate', governmentBacked: true, lockIn: '10 years' },
      { name: 'RBI Floating Rate Savings Bonds', fundHouse: 'RBI', bucket: 'B2', category: 'Govt Bond', expectedCagr: 8.05, allocationOn1CrCorpus: 15_00_000, monthlyIncomeOn1Cr: 10_063, taxTreatment: 'Slab-rate', governmentBacked: true, lockIn: '7 years' },
      { name: 'Post Office Monthly Income Scheme (POMIS)', fundHouse: 'India Post', bucket: 'B2', category: 'Postal Scheme', expectedCagr: 7.4, allocationOn1CrCorpus: 10_00_000, monthlyIncomeOn1Cr: 6_167, taxTreatment: 'Slab-rate', governmentBacked: true, lockIn: '5 years' },
      { name: 'Senior Citizen Bank FD', fundHouse: 'SBI / HDFC / ICICI', bucket: 'B2', category: 'Fixed Deposit', expectedCagr: 7.9, allocationOn1CrCorpus: 15_00_000, monthlyIncomeOn1Cr: 9_688, taxTreatment: 'Slab-rate', governmentBacked: false, notes: 'Senior citizen rate (+50bps)' },
      { name: 'Public Provident Fund (PPF)', fundHouse: 'Govt of India', bucket: 'B3', category: 'Govt Scheme', expectedCagr: 7.1, allocationOn1CrCorpus: 5_00_000, taxTreatment: 'EEE — fully tax-exempt', governmentBacked: true, lockIn: '15 years' },
      { name: 'Nippon India Liquid Fund', fundHouse: 'Nippon AMC', bucket: 'B1', category: 'Liquid Fund', expectedCagr: 6.5, allocationOn1CrCorpus: 5_00_000, taxTreatment: 'Slab-rate (debt MF post-Apr 2023)', governmentBacked: false },
    ],
  },
  {
    id: 'conservative',
    name: 'Conservative',
    scoreRange: [20, 27],
    tagline: '2-Bucket Debt + Conservative Hybrid SWP',
    description:
      'Predominantly debt with a small hybrid kicker for inflation protection. Income stays steady; corpus stagnates rather than grows.',
    bucketShare: { b1: 0.05, b2: 0.55, b3: 0.25, b4: 0.15 },
    expectedMonthlyOn1Cr: 60_000,
    expectedYr10MonthlyOn1Cr: 65_000,
    expected20yrCorpusFromCr: 35_00_000,
    principalSafe: 'moderate',
    bestFor: 'Retirees 65–75, those with secondary income (rental/pension), low risk tolerance.',
    pros: ['Stable monthly income', 'Modest inflation buffer via hybrid', 'Mostly government/AAA debt'],
    cons: ['Limited corpus growth', 'Hybrid fund volatility (~10–15%)', 'No real legacy upside'],
    instruments: [
      { name: 'SCSS', fundHouse: 'Govt of India', bucket: 'B2', category: 'Govt Scheme', expectedCagr: 8.2, allocationOn1CrCorpus: 30_00_000, monthlyIncomeOn1Cr: 20_500, taxTreatment: 'Slab-rate', governmentBacked: true, lockIn: '5 years' },
      { name: 'Nippon Short Duration Fund (SWP)', fundHouse: 'Nippon AMC', bucket: 'B2', category: 'Short Duration', expectedCagr: 7.5, allocationOn1CrCorpus: 20_00_000, monthlyIncomeOn1Cr: 12_000, taxTreatment: 'Slab-rate (debt MF)', governmentBacked: false },
      { name: 'HDFC Corporate Bond Fund (SWP)', fundHouse: 'HDFC AMC', bucket: 'B2', category: 'Corporate Bond', expectedCagr: 7.5, allocationOn1CrCorpus: 15_00_000, monthlyIncomeOn1Cr: 9_000, taxTreatment: 'Slab-rate (debt MF)', governmentBacked: false },
      { name: 'Parag Parikh Conservative Hybrid', fundHouse: 'PPFAS', bucket: 'B3', category: 'Conservative Hybrid', expectedCagr: 9.5, allocationOn1CrCorpus: 10_00_000, monthlyIncomeOn1Cr: 7_000, taxTreatment: 'Equity LTCG 12.5% / STCG 20%', governmentBacked: false },
      { name: 'SBI Senior Citizen FD', fundHouse: 'SBI', bucket: 'B2', category: 'Fixed Deposit', expectedCagr: 7.9, allocationOn1CrCorpus: 10_00_000, monthlyIncomeOn1Cr: 6_500, taxTreatment: 'Slab-rate', governmentBacked: false },
      { name: 'HDFC Balanced Advantage Fund', fundHouse: 'HDFC AMC', bucket: 'B3', category: 'Balanced Advantage', expectedCagr: 11, allocationOn1CrCorpus: 10_00_000, monthlyIncomeOn1Cr: 5_000, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false },
    ],
  },
  {
    id: 'moderate',
    name: 'Moderate',
    scoreRange: [28, 35],
    tagline: 'Classic 4-Bucket SWP with Balanced Advantage ⭐',
    description:
      'The recommended baseline. 45% in growth-oriented equity for inflation protection, 25% in BAF/hybrid for stability, balanced with debt floor. Corpus grows AND income keeps pace with inflation.',
    bucketShare: { b1: 0.10, b2: 0.20, b3: 0.25, b4: 0.45 },
    expectedMonthlyOn1Cr: 60_000,
    expectedYr10MonthlyOn1Cr: 92_000,
    expected20yrCorpusFromCr: 2_35_00_000,  // ₹2.35 Cr — PDF anchor
    principalSafe: 'high',
    bestFor: 'Retirees 55–70 with 20+ year horizon. Standard advice for most Indian retirees.',
    pros: ['Best long-term outcome (₹2.35Cr from ₹1Cr at yr 20)', 'Inflation-beating equity exposure', 'Tax-efficient via LTCG harvesting'],
    cons: ['Requires annual rebalancing', 'Equity volatility — corpus may dip in bad years', 'Most complex of the 5'],
    instruments: [
      { name: 'SCSS', fundHouse: 'Govt of India', bucket: 'B2', category: 'Govt Scheme', expectedCagr: 8.2, allocationOn1CrCorpus: 30_00_000, monthlyIncomeOn1Cr: 20_500, taxTreatment: 'Slab-rate', governmentBacked: true, lockIn: '5 years' },
      { name: 'HDFC Short Duration Fund (SWP)', fundHouse: 'HDFC AMC', bucket: 'B2', category: 'Short Duration', expectedCagr: 7.5, allocationOn1CrCorpus: 10_00_000, monthlyIncomeOn1Cr: 6_250, taxTreatment: 'Slab-rate (debt MF)', governmentBacked: false },
      { name: 'ICICI Equity & Debt Fund', fundHouse: 'ICICI Prudential', bucket: 'B3', category: 'Aggressive Hybrid', expectedCagr: 11.5, allocationOn1CrCorpus: 15_00_000, monthlyIncomeOn1Cr: 8_500, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false },
      { name: 'Mirae Asset Balanced Advantage', fundHouse: 'Mirae Asset', bucket: 'B3', category: 'Balanced Advantage', expectedCagr: 11, allocationOn1CrCorpus: 10_00_000, monthlyIncomeOn1Cr: 5_500, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false },
      { name: 'Parag Parikh Flexi Cap Fund', fundHouse: 'PPFAS', bucket: 'B4', category: 'Flexi Cap', expectedCagr: 13, allocationOn1CrCorpus: 10_00_000, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false, notes: 'Refill engine' },
      { name: 'UTI / HDFC Nifty 50 Index Fund', fundHouse: 'UTI / HDFC', bucket: 'B4', category: 'Index Fund', expectedCagr: 12, allocationOn1CrCorpus: 10_00_000, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false, notes: 'Refill engine, low cost' },
      { name: 'Mirae Emerging Bluechip', fundHouse: 'Mirae Asset', bucket: 'B4', category: 'Large & Midcap', expectedCagr: 13, allocationOn1CrCorpus: 10_00_000, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false, notes: 'Refill engine' },
    ],
  },
  {
    id: 'moderately-aggressive',
    name: 'Moderately Aggressive',
    scoreRange: [36, 43],
    tagline: 'Equity-Heavy SWP with Midcap Refill Engine',
    description:
      'Extra equity tilt — adds midcap and international exposure for higher long-term growth. Higher year-1 income trade-off accepted in exchange for ₹80K+/mo by year 10.',
    bucketShare: { b1: 0.05, b2: 0.25, b3: 0.25, b4: 0.45 },
    expectedMonthlyOn1Cr: 58_000,
    expectedYr10MonthlyOn1Cr: 1_05_000,
    expected20yrCorpusFromCr: 3_20_00_000,  // ₹3.20 Cr at yr 20
    principalSafe: 'high',
    bestFor: 'Retirees 50–65 with 25+ year horizon, secondary income, comfortable with -25% drawdown.',
    pros: ['Strong corpus growth (~₹3.2Cr at yr 20)', 'Real income grows with inflation', 'International + midcap diversification'],
    cons: ['Year-1 income lower than conservative options', 'Bigger drawdowns in bear markets', 'Requires Monte Carlo discipline'],
    instruments: [
      { name: 'SCSS', fundHouse: 'Govt of India', bucket: 'B2', category: 'Govt Scheme', expectedCagr: 8.2, allocationOn1CrCorpus: 15_00_000, monthlyIncomeOn1Cr: 10_250, taxTreatment: 'Slab-rate', governmentBacked: true, lockIn: '5 years' },
      { name: 'Nippon India Banking & PSU Fund', fundHouse: 'Nippon AMC', bucket: 'B2', category: 'Banking & PSU', expectedCagr: 7.5, allocationOn1CrCorpus: 10_00_000, monthlyIncomeOn1Cr: 6_250, taxTreatment: 'Slab-rate (debt MF)', governmentBacked: false },
      { name: 'HDFC Balanced Advantage', fundHouse: 'HDFC AMC', bucket: 'B3', category: 'Balanced Advantage', expectedCagr: 11, allocationOn1CrCorpus: 15_00_000, monthlyIncomeOn1Cr: 8_500, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false },
      { name: 'Kotak Equity Hybrid', fundHouse: 'Kotak AMC', bucket: 'B3', category: 'Aggressive Hybrid', expectedCagr: 12, allocationOn1CrCorpus: 10_00_000, monthlyIncomeOn1Cr: 6_000, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false },
      { name: 'UTI Nifty 50 Index Fund', fundHouse: 'UTI', bucket: 'B4', category: 'Index Fund', expectedCagr: 12, allocationOn1CrCorpus: 15_00_000, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false, notes: 'Refill engine' },
      { name: 'Parag Parikh Flexi Cap', fundHouse: 'PPFAS', bucket: 'B4', category: 'Flexi Cap', expectedCagr: 13, allocationOn1CrCorpus: 10_00_000, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false, notes: 'Refill engine' },
      { name: 'Quant Small Cap', fundHouse: 'Quant AMC', bucket: 'B4', category: 'Small Cap', expectedCagr: 14, allocationOn1CrCorpus: 10_00_000, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false, notes: 'Refill engine, high vol' },
      { name: 'Motilal Nasdaq 100 FoF', fundHouse: 'Motilal Oswal', bucket: 'B4', category: 'International', expectedCagr: 13, allocationOn1CrCorpus: 10_00_000, taxTreatment: 'Slab-rate (debt MF post-2023)', governmentBacked: false, notes: 'Currency hedge + USD exposure' },
    ],
  },
  {
    id: 'aggressive',
    name: 'Aggressive / FIRE',
    scoreRange: [44, 50],
    tagline: 'Equity-First Endowment with Dynamic Withdrawal',
    description:
      '70% equity. Endowment-style — corpus is treated as an income engine, not a finite pool. Year-1 income may be modest but compounds aggressively. Suited to early retirees with very long horizons.',
    bucketShare: { b1: 0.05, b2: 0.10, b3: 0.15, b4: 0.70 },
    expectedMonthlyOn1Cr: 50_000,
    expectedYr10MonthlyOn1Cr: 1_10_000,
    expected20yrCorpusFromCr: 4_50_00_000,  // ₹4.5 Cr at yr 20
    principalSafe: 'high',
    bestFor: 'FIRE retirees 40–55, those with non-portfolio income, tolerance for -40% drawdowns.',
    pros: ['Highest projected corpus growth', 'Income grows fastest with inflation', 'International + REIT diversification'],
    cons: ['Lower year-1 income', 'Severe bear markets hurt — must be financially & psychologically resilient', 'Demanding rebalancing discipline'],
    instruments: [
      { name: 'Zerodha Overnight Fund', fundHouse: 'Zerodha AMC', bucket: 'B1', category: 'Overnight', expectedCagr: 6, allocationOn1CrCorpus: 5_00_000, taxTreatment: 'Slab-rate (debt MF)', governmentBacked: false },
      { name: 'RBI Floating Rate Bond', fundHouse: 'RBI', bucket: 'B2', category: 'Govt Bond', expectedCagr: 8.05, allocationOn1CrCorpus: 10_00_000, monthlyIncomeOn1Cr: 6_708, taxTreatment: 'Slab-rate', governmentBacked: true },
      { name: 'HDFC Balanced Advantage', fundHouse: 'HDFC AMC', bucket: 'B3', category: 'Balanced Advantage', expectedCagr: 11, allocationOn1CrCorpus: 15_00_000, monthlyIncomeOn1Cr: 8_500, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false },
      { name: 'UTI Nifty 50 Index Fund', fundHouse: 'UTI', bucket: 'B4', category: 'Index Fund', expectedCagr: 12, allocationOn1CrCorpus: 20_00_000, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false, notes: 'Core refill engine' },
      { name: 'Parag Parikh Flexi Cap', fundHouse: 'PPFAS', bucket: 'B4', category: 'Flexi Cap', expectedCagr: 13, allocationOn1CrCorpus: 15_00_000, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false },
      { name: 'Mirae Emerging Bluechip', fundHouse: 'Mirae Asset', bucket: 'B4', category: 'Large & Midcap', expectedCagr: 13, allocationOn1CrCorpus: 10_00_000, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false },
      { name: 'Quant Small Cap', fundHouse: 'Quant AMC', bucket: 'B4', category: 'Small Cap', expectedCagr: 14, allocationOn1CrCorpus: 10_00_000, taxTreatment: 'Equity LTCG 12.5%', governmentBacked: false, notes: 'High vol' },
      { name: 'Motilal Nasdaq 100 FoF', fundHouse: 'Motilal Oswal', bucket: 'B4', category: 'International', expectedCagr: 13, allocationOn1CrCorpus: 10_00_000, taxTreatment: 'Slab-rate (debt MF post-2023)', governmentBacked: false, notes: 'USD exposure' },
      { name: 'Embassy / Mindspace REITs', fundHouse: 'Embassy / Mindspace', bucket: 'B3', category: 'REIT', expectedCagr: 10, allocationOn1CrCorpus: 5_00_000, monthlyIncomeOn1Cr: 3_125, taxTreatment: 'Special — verify with CA', governmentBacked: false, notes: 'Real estate income' },
    ],
  },
]

export function profileById(id: RiskProfileId): RiskProfile {
  const found = RISK_PROFILES.find((p) => p.id === id)
  if (!found) throw new Error(`Unknown profile: ${id}`)
  return found
}

export function profileFromScore(score: number): RiskProfile {
  for (const p of RISK_PROFILES) {
    if (score >= p.scoreRange[0] && score <= p.scoreRange[1]) return p
  }
  return RISK_PROFILES[2]  // default to Moderate
}
