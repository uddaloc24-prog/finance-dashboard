import type { StrategyDefinition } from '../../types/strategies'

// 10-strategy catalog from the academic PDF reference. Score baselines (out of 10)
// per dimension are PDF-anchored — they get adjusted dynamically based on user's
// risk profile and withdrawal rate.

export const STRATEGY_DEFINITIONS: StrategyDefinition[] = [
  {
    id: 'rule4pct',
    name: '4% Rule (Trinity Study)',
    origin: 'USA — Bengen 1994 / Trinity Study',
    flag: '🇺🇸',
    safeWRrange: [3.5, 4.5],
    principalPreservation: 'low',
    indiaFeasibility: 'moderate',
    inflationProtection: 'partial',
    description:
      'Withdraw 4% of starting corpus in year 1, increase by inflation each year. Simple, well-known, but built on US 60/40 historical returns — Indian inflation routinely exceeds the buffer.',
    pros: ['Simple to follow', 'Universal benchmark', 'Backed by 30+ years of data'],
    cons: ['US-centric — assumes ~7% real returns', "Doesn't adapt to market crashes", 'Ignores Indian tax structure'],
    scoreDimensions: { achievesTarget: 4, principalAfter20yr: 3, inflationProtection: 5, taxEfficiency: 5, indiaFeasibility: 4, simplicity: 9 },
  },
  {
    id: 'guardrails',
    name: 'Guyton-Klinger Guardrails',
    origin: 'USA — Guyton & Klinger 2006',
    flag: '🇺🇸',
    safeWRrange: [4.5, 5.5],
    principalPreservation: 'moderate',
    indiaFeasibility: 'moderate',
    inflationProtection: 'partial',
    description:
      'Dynamic withdrawal — start at 5%, then freeze inflation (or cut 10%) when corpus drops below thresholds; raise the draw when corpus surges. Disciplined, defensible, but lifestyle is volatile.',
    pros: ['Adapts to market conditions', 'Higher safe WR than fixed 4%', 'Battle-tested by US advisors'],
    cons: ['Requires annual portfolio review', 'Income can drop 10%+ in bad years', 'Originally tuned for US tax law'],
    scoreDimensions: { achievesTarget: 5, principalAfter20yr: 5, inflationProtection: 5, taxEfficiency: 5, indiaFeasibility: 5, simplicity: 4 },
  },
  {
    id: 'vanguard',
    name: 'Vanguard Dynamic Spending',
    origin: 'USA — Vanguard 4-Pillars',
    flag: '🇺🇸',
    safeWRrange: [4.0, 5.0],
    principalPreservation: 'moderate',
    indiaFeasibility: 'low',
    inflationProtection: 'partial',
    description:
      'Withdraw a percentage with floor/ceiling rails — 4–5% target with ±2.5% bands. Smooths income vs straight Constant %, but assumes US fund tax treatment.',
    pros: ['Smoother income than pure constant %', 'Built-in floor/ceiling protection'],
    cons: ['No equivalent fund products in India', 'Requires Vanguard-style ETFs'],
    scoreDimensions: { achievesTarget: 4, principalAfter20yr: 4, inflationProtection: 4, taxEfficiency: 4, indiaFeasibility: 3, simplicity: 5 },
  },
  {
    id: 'bucket3',
    name: '3-Bucket Classic (HDFC)',
    origin: 'India — HDFC AMC framework',
    flag: '🇮🇳',
    safeWRrange: [4.5, 5.5],
    principalPreservation: 'moderate',
    indiaFeasibility: 'high',
    inflationProtection: 'good',
    description:
      'B1 emergency / B2 short-term debt / B3 hybrid-equity. Cascading interest from B3 → B2 → B1; principals largely preserved. The classic Indian retiree playbook.',
    pros: ['Indian instruments throughout', 'Well-understood by Indian advisors', 'Tax-efficient via SCSS/FD ladder'],
    cons: ['No dedicated growth engine — corpus erodes vs inflation', 'Conservative endpoint (~₹60L from ₹1Cr at year 20)'],
    scoreDimensions: { achievesTarget: 7, principalAfter20yr: 6, inflationProtection: 6, taxEfficiency: 7, indiaFeasibility: 9, simplicity: 7 },
  },
  {
    id: 'bucket4india',
    name: 'India 4-Bucket SWP ⭐',
    origin: 'India — academic refill-linked strategy',
    flag: '🇮🇳',
    safeWRrange: [5.5, 7.0],
    principalPreservation: 'high',
    indiaFeasibility: 'very-high',
    inflationProtection: 'excellent',
    description:
      'B1 liquidity / B2 fixed-floor (SCSS+FD ladder, untouched) / B3 stability (BAF/hybrid) / B4 growth (equity+gold). Refill chain B4→B3→B1 with guardrails. Preserves principal AND grows corpus.',
    pros: ['Highest projected end-corpus in PDF (₹235L from ₹1Cr at yr 20)', 'Principal-preserving by design', 'Inflation-beating via B4 equity', 'Crash-resilient via guardrails'],
    cons: ['Most complex to manage', 'Requires annual rebalancing', 'Needs equity exposure — uncomfortable for some'],
    scoreDimensions: { achievesTarget: 9, principalAfter20yr: 10, inflationProtection: 9, taxEfficiency: 8, indiaFeasibility: 10, simplicity: 5 },
  },
  {
    id: 'npsHybrid',
    name: 'NPS + Annuity Hybrid',
    origin: 'India — PFRDA mandated 40% annuitisation',
    flag: '🇮🇳',
    safeWRrange: [5.0, 6.0],
    principalPreservation: 'moderate',
    indiaFeasibility: 'high',
    inflationProtection: 'partial',
    description:
      '60% lump-sum tax-free + 40% mandatory annuity at age 60. Annuity gives lifetime income but locks principal forever; lump sum reinvested separately.',
    pros: ['Lifetime income guarantee on annuity portion', 'Tax-free 60% lump sum', 'Government-regulated'],
    cons: ['40% locked in low-yield annuity (~6%)', 'No inflation indexing on annuity', 'Forced annuitisation'],
    scoreDimensions: { achievesTarget: 6, principalAfter20yr: 5, inflationProtection: 4, taxEfficiency: 7, indiaFeasibility: 8, simplicity: 7 },
  },
  {
    id: 'scssPmvvy',
    name: 'SCSS + PMVVY + FD Ladder',
    origin: 'India — government-backed safe harbor',
    flag: '🇮🇳',
    safeWRrange: [5.5, 6.5],
    principalPreservation: 'moderate',
    indiaFeasibility: 'very-high',
    inflationProtection: 'poor',
    description:
      'SCSS @ 8.2% + senior FD ladder + PMVVY annuity. Pure debt allocation — government-backed, predictable, but inflation eats real value over 20 years.',
    pros: ['100% government-backed safety', 'Predictable monthly income', 'No equity volatility'],
    cons: ['Inflation erodes purchasing power (₹1Cr → ~₹18L real-terms equivalent at year 20)', 'No corpus growth', 'Re-investment risk on FD rollover'],
    scoreDimensions: { achievesTarget: 7, principalAfter20yr: 4, inflationProtection: 2, taxEfficiency: 5, indiaFeasibility: 10, simplicity: 9 },
  },
  {
    id: 'rmdBased',
    name: 'RMD-Based Withdrawal',
    origin: 'USA — IRS Required Minimum Distributions',
    flag: '🇺🇸',
    safeWRrange: [3.5, 6.0],
    principalPreservation: 'moderate',
    indiaFeasibility: 'na',
    inflationProtection: 'partial',
    description:
      'Withdrawal % based on IRS life-expectancy tables, applied annually to current balance. India has no equivalent regulatory framework.',
    pros: ['Simple formula', 'Auto-adjusts for longevity'],
    cons: ['No Indian regulatory equivalent', 'Forces withdrawals even when not needed'],
    scoreDimensions: { achievesTarget: 5, principalAfter20yr: 5, inflationProtection: 4, taxEfficiency: 4, indiaFeasibility: 1, simplicity: 7 },
  },
  {
    id: 'tipsLadder',
    name: 'TIPS Ladder',
    origin: 'USA — Treasury Inflation-Protected Securities',
    flag: '🇺🇸',
    safeWRrange: [3.0, 4.0],
    principalPreservation: 'high',
    indiaFeasibility: 'na',
    inflationProtection: 'excellent',
    description:
      'Build a 30-year ladder of US TIPS — guaranteed inflation-indexed real income. Indian Inflation-Indexed Bonds (IIBs) exist but lack liquidity and depth.',
    pros: ['Real-return guarantee in USD', 'Government-backed'],
    cons: ['No Indian equivalent — IIBs are illiquid', 'USD-denominated — currency risk for INR retirees'],
    scoreDimensions: { achievesTarget: 4, principalAfter20yr: 8, inflationProtection: 10, taxEfficiency: 5, indiaFeasibility: 1, simplicity: 6 },
  },
  {
    id: 'constantPct',
    name: 'Constant Percentage',
    origin: 'USA — Bogleheads / academic',
    flag: '🇺🇸',
    safeWRrange: [4.0, 5.0],
    principalPreservation: 'high',
    indiaFeasibility: 'moderate',
    inflationProtection: 'partial',
    description:
      'Withdraw a fixed % of current portfolio each year — never depletes (corpus shrinks but stays positive). Income is volatile, swinging with markets.',
    pros: ['Cannot run out of money', 'Mathematically simple'],
    cons: ['Income drops sharply in bear markets — not usable for fixed essentials', 'No inflation protection on withdrawals'],
    scoreDimensions: { achievesTarget: 4, principalAfter20yr: 8, inflationProtection: 3, taxEfficiency: 5, indiaFeasibility: 5, simplicity: 9 },
  },
]

export function strategyById(id: StrategyDefinition['id']): StrategyDefinition {
  const found = STRATEGY_DEFINITIONS.find((s) => s.id === id)
  if (!found) throw new Error(`Unknown strategy: ${id}`)
  return found
}
