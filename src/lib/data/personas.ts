// Persona archetypes + adaptive tables, ported verbatim from v10
// (RetireWise_Psychometric_Assessment_Tool_v10_Adaptive.html, 2026-05-16).

import type { PersonaId, SignalId } from '../../types/psychometric'

export interface PersonaDef {
  id: PersonaId
  name: string
  description: string
  keywords: RegExp[]                                  // matched against combined GD free text
  goalTypeWeights: Partial<Record<string, number>>    // per goal type in block-1
  tagWeights: Partial<Record<string, number>>         // per scene tag in block-0
  // Extra ad-hoc weights handled inline in inferPersona() (e.g. P7 abroad,
  // P9 childless / DINK detection). Kept as data here only where clean.
}

// ─── 9 personas ──────────────────────────────────────────────────────────

export const PERSONAS: PersonaDef[] = [
  {
    id: 'P1', name: 'PSU Pensioner / Bank Babu',
    description: 'Government or PSU service, DA-indexed pension, FD-heavy, equity-shy.',
    keywords: [/\b(pension|psu|government|babu)\b/i],
    goalTypeWeights: {},
    tagWeights: {},
  },
  {
    id: 'P2', name: 'Patriarch Business Owner / Seth',
    description: 'Owns business, illiquid wealth in property and firm, succession anxiety, gold-heavy.',
    keywords: [/\b(firm|business|partners?|enterprise|company\s+i\s+own)\b/i],
    goalTypeWeights: { business: 2 },
    tagWeights: {},
  },
  {
    id: 'P3', name: 'Corporate Sophisticate',
    description: 'MNC senior, ESOPs, NPS, term-cover adequate, advisor-served, equity-comfortable.',
    keywords: [/\b(esops?|mnc|corporate|manager|director)\b/i],
    goalTypeWeights: {},
    tagWeights: {},
  },
  {
    id: 'P4', name: 'Late-Awakened Professional',
    description: 'Doctor, lawyer, consultant; high income, late savings start, property-heavy, under-insured.',
    keywords: [],
    goalTypeWeights: { education: 0.5, real_estate: 1, parent_care: 0.5 },
    tagWeights: { layoff: 1 },
  },
  {
    id: 'P5', name: 'DIY Equity Bull',
    description: 'Self-directed retail investor, post-2020 cohort, concentrated equity, recency-biased, advisor-skeptical.',
    keywords: [/\b(fire|financial independence|early retirement|retire early)\b/i],
    goalTypeWeights: {},
    tagWeights: {},
  },
  {
    id: 'P6', name: 'Frugal Saver — Cash & Gold',
    description: 'Older first-gen-urban; FDs and gold, distrusts equity, vigilance-heavy, under-living relative to means.',
    keywords: [/\b(gold|jewellery|fd|fixed deposit|frugal|save|saved)\b/i],
    goalTypeWeights: {},
    tagWeights: {},
  },
  {
    id: 'P7', name: 'NRI Returnee',
    description: 'Gulf, Singapore, US, UK; mixed jurisdictions, RNOR transition, India-asset planning.',
    keywords: [/\b(dollar|usd|h1b|green\s*card|abroad|overseas|gulf|us|uk|singapore)\b/i],
    goalTypeWeights: {},
    tagWeights: {},
  },
  {
    id: 'P8', name: 'Widowed / Single Conservative',
    description: 'Sole earner / inheritor; low risk tolerance, lifetime-income focus, low financial literacy common.',
    keywords: [],
    goalTypeWeights: {},
    tagWeights: { bereavement: 2, illness: 1 },
  },
  {
    id: 'P9', name: 'DINK / Childless Couple',
    description: 'No children, two incomes, weaker legacy motive, stronger experiential and FIRE motives.',
    keywords: [],
    goalTypeWeights: { lifestyle: 1, retirement: 1 },
    tagWeights: {},
  },
]

// ─── PERSONA_CONSTRUCT_ORDER (phase 5) ──────────────────────────────────
// Per-persona reorder of the 16 constructs. v10's source omits C-16; we
// append it at the end so all 74 items remain reachable.

const CORE_15: Record<PersonaId, string[]> = {
  P1: ['C-1','C-4','C-9','C-13','C-14','C-15','C-2','C-3','C-5','C-6','C-7','C-8','C-10','C-11','C-12'],
  P2: ['C-2','C-5','C-8','C-10','C-15','C-12','C-1','C-3','C-4','C-6','C-7','C-9','C-11','C-13','C-14'],
  P3: ['C-1','C-2','C-12','C-13','C-15','C-3','C-4','C-5','C-6','C-7','C-8','C-9','C-10','C-11','C-14'],
  P4: ['C-3','C-4','C-12','C-13','C-15','C-1','C-2','C-5','C-6','C-7','C-8','C-9','C-10','C-11','C-14'],
  P5: ['C-11','C-12','C-2','C-14','C-1','C-3','C-4','C-5','C-6','C-7','C-8','C-9','C-10','C-13','C-15'],
  P6: ['C-6','C-9','C-1','C-13','C-14','C-2','C-3','C-4','C-5','C-7','C-8','C-10','C-11','C-12','C-15'],
  P7: ['C-13','C-1','C-15','C-4','C-12','C-2','C-3','C-5','C-6','C-7','C-8','C-9','C-10','C-11','C-14'],
  P8: ['C-2','C-4','C-9','C-14','C-15','C-1','C-3','C-5','C-6','C-7','C-8','C-10','C-11','C-12','C-13'],
  P9: ['C-3','C-7','C-15','C-1','C-12','C-2','C-4','C-5','C-6','C-8','C-9','C-10','C-11','C-13','C-14'],
}

export const PERSONA_CONSTRUCT_ORDER: Record<PersonaId, string[]> = Object.fromEntries(
  (Object.keys(CORE_15) as PersonaId[]).map((id) => [id, [...CORE_15[id], 'C-16']]),
) as Record<PersonaId, string[]>

// ─── PERSONA_REPHRASINGS (phase 5) ──────────────────────────────────────
// Question-text replacements applied to (persona, code) pairs. P3 and P9
// intentionally empty per v10.

export const PERSONA_REPHRASINGS: Record<PersonaId, Partial<Record<string, string>>> = {
  P1: {
    'C1-Q1': 'Your bank FD has been broken early and the penalty plus rate change has cost you ₹2 lakh on a ₹10 lakh deposit. What do you do next?',
    'C1-Q3': 'Imagine waking up to news that RBI has cut the repo rate by 75 bps overnight and your bank has already announced FD rates will drop 100 bps from next quarter. Your first feeling is:',
    'C5-Q2': 'When a financial decision goes badly — rate cut after your FD locked in, scheme matured below expectations — you most often think: It was RBI / policy / not in my hands · The bank or branch staff mis-sold it to me · These things happen · I should have read the fine print more carefully.',
    'C11-Q1': 'A retired colleague tells you his NCD or company FD has been paying him 11% — well above your bank FD. He suggests you put some of your savings there too. You:',
  },
  P2: {
    'C1-Q1': 'Your firm\'s working-capital investment of ₹10 lakh has, after six months, shrunk to ₹8 lakh on paper. What would you most likely do?',
    'C2-Q1': 'A potential client offers you a one-shot contract: 50/50 odds of ₹1 lakh profit or ₹1 lakh loss, settled in six months. Do you take it?',
    'C5-Q2': 'When a financial decision goes badly — a deal, a placement, a counter-party defaulting — you most often think: Market cycle · The counter-party let me down · These things happen in business · I should have done more due diligence.',
    'C14-Q2': '"I would feel uncomfortable refusing a financial proposal from a family elder or community senior, even if I was unsure about it."',
  },
  P3: {},
  P4: {
    'C3-Q2': 'How do you feel about a goal that requires 15+ years of disciplined saving — given that you have roughly that long until retirement?',
  },
  P5: {
    'C1-Q1': 'Your concentrated mid-cap holding — ₹10 lakh six months ago — is now worth ₹8 lakh. What would you most likely do?',
    'C5-Q2': 'When a stock or fund pick goes badly, you most often think: Macros turned against it · The Twitter / WhatsApp / YouTube source was wrong · Stocks do this · I should have read the actual filings before buying.',
    'C3-Q2': 'How do you feel about a goal that requires 15+ years of disciplined saving — for example, an SIP that compounds quietly into your FIRE corpus?',
  },
  P6: {
    'C1-Q1': '₹10 lakh of your savings, parked in what you were told was a safe mutual fund, has become ₹8 lakh. What would you most likely do?',
    'C1-Q3': 'Imagine waking up to news that RBI has cut the repo rate by 75 bps overnight and your bank has already announced FD rates will drop 100 bps from next quarter. Your first feeling is:',
    'C11-Q1': 'A retired colleague tells you his NCD or company FD has been paying him 11% — well above your bank FD. He suggests you put some of your savings there too. You:',
    'C12-Q1': 'Gold has delivered 15%+ annual returns in rupees over the last 3 years. What return should I expect from gold in the next 3 years?',
  },
  P7: {
    'C1-Q1': 'Your NRE-managed equity allocation, worth ₹10 lakh six months ago, has dropped to ₹8 lakh after the rupee and market moved together. What would you most likely do?',
    'C14-Q2': '"I would feel uncomfortable refusing a financial offer or request from a relative back in India, even if I was unsure about it."',
  },
  P8: {
    'C1-Q1': 'The portion of your retirement corpus invested in a balanced mutual fund — ₹10 lakh — is now worth ₹8 lakh after six months. What would you most likely do?',
    'C14-Q2': '"I would feel uncomfortable refusing a financial offer, scheme, or arrangement suggested by my adult child, sibling, or close relative, even if I was unsure about it."',
    'C15-Q1': 'Since you became the sole financial head of your household, who makes the major financial decisions?',
    'C12-Q1': 'Balanced advantage funds (BAFs) have delivered 12%+ annual returns over the last 3 years — well above your FDs. What return should I expect from BAFs in the next 3 years?',
  },
  P9: {},
}

// ─── SIGNAL_PREFILLS (phase 5) ──────────────────────────────────────────
// Rules that turn an active signal (score ≥ activation threshold) into a
// suggested prefill for specific psychometric questions.

export interface SignalPrefillRule {
  items: string[]                       // question codes to prefill
  value: number                         // suggested score value to fill
  kind?: 'fc' | 'default'               // 'fc' marks free-choice-style items
}

export const SIGNAL_ACTIVATION_THRESHOLD = 0.7

export const SIGNAL_PREFILLS: Partial<Record<SignalId, SignalPrefillRule>> = {
  money_script_avoidance:    { items: ['C6-Q1','C6-Q2','C6-Q3'], value: 6 },
  money_script_worship:      { items: ['C7-Q1','C7-Q2','C7-Q3'], value: 6 },
  money_script_status:       { items: ['C8-Q1','C8-Q2','C8-Q3'], value: 6 },
  money_script_vigilance:    { items: ['C9-Q1','C9-Q2','C9-Q3'], value: 6 },
  locus_of_control_internal: { items: ['C5-Q1','C5-Q2'], value: 5, kind: 'fc' },
  self_efficacy:             { items: ['C4-Q1'], value: 6 },
  time_orientation_present:  { items: ['C3-Q2'], value: 1, kind: 'fc' },
  // overconfidence_marker — when detected during GD, seed C-12 toward the
  // overconfident answer (value 1 = "Well above average" on C12-Q2; value 1
  // = "I can pick winning stocks…strongly agree" on C12-Q3 once inverted).
  overconfidence_marker:     { items: ['C12-Q2','C12-Q3'], value: 1, kind: 'fc' },
  // protection_to_aspiration is a composite summary signal, intentionally
  // left without a prefill rule. It surfaces in the dashboard / persona
  // notes but does not auto-fill any quiz item.
}
