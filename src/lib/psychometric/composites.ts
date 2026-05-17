// v10 Adaptive — composite scoring.
// Pure functions: given answers + financial inputs + life stage, produce all composites.
// All composites are on a 0–100 scale (higher = more of the named property).

import type {
  AnswerScale,
  CompositesResult,
  ConstructId,
  LifeStageInput,
  MoneyScriptId,
  PsychAnswer,
  PsychAnswers,
  PsychQuestion,
  RiskCapacityInput,
} from '../../types/psychometric'
import type { RiskProfileId } from '../../types/profiles'
import { PSYCH_BANK_BY_CODE } from '../data/psychometricBank'

// ─── normalization ───────────────────────────────────────────────────────

function maxForScale(scale: AnswerScale): number {
  switch (scale) {
    case '5-point-likert': return 5
    case '7-point-likert': return 7
    case 'knowledge-mcq':  return 1
    case 'multi-select':   return 0  // not scored
  }
}

function minForScale(scale: AnswerScale): number {
  return scale === 'knowledge-mcq' ? 0 : 1
}

// Normalize a raw score on its own scale to 0..100. Multi-select returns null.
function normalize(rawScore: number, scale: AnswerScale): number | null {
  if (scale === 'multi-select') return null
  const lo = minForScale(scale)
  const hi = maxForScale(scale)
  if (hi === lo) return null
  return ((rawScore - lo) / (hi - lo)) * 100
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n))
}

function invert(score: number): number {
  return 100 - score
}

// ─── per-construct mean ─────────────────────────────────────────────────

/**
 * Mean of all answered, non-skipped items in a construct, normalized to 0..100.
 * Returns null if no scorable items were answered.
 */
export function constructScore(
  answers: PsychAnswers,
  construct: ConstructId
): number | null {
  let sum = 0
  let count = 0
  for (const [code, ans] of Object.entries(answers)) {
    if (ans.skipped) continue
    const q = PSYCH_BANK_BY_CODE[code]
    if (!q || q.construct !== construct) continue
    if (q.scale === 'multi-select') continue   // unscored
    if (typeof ans.value !== 'number') continue
    const norm = normalize(ans.value, q.scale)
    if (norm == null) continue
    sum += norm
    count += 1
  }
  return count > 0 ? sum / count : null
}

// Take a construct mean, or fall back to a neutral 50 if there were no answers.
function constructOrNeutral(answers: PsychAnswers, construct: ConstructId): number {
  return constructScore(answers, construct) ?? 50
}

// ─── risk capacity (from financial inputs) ──────────────────────────────

/**
 * Risk capacity in 0..100. Inputs:
 *  - savingsRate: monthly savings / monthly income (0..1)
 *  - debtToIncome: monthly EMIs / monthly income (0..1)
 *  - emergencyMonths: months of expenses covered by emergency fund
 *
 * Each sub-component is mapped to 0..100 and the three are averaged.
 */
export function riskCapacity(input: RiskCapacityInput): number {
  const savingsComponent  = clamp(input.savingsRate * 100 * 2.5)          // 40% savings → 100
  const dtiComponent      = clamp(100 - input.debtToIncome * 100 * 1.8)   // 0 DTI → 100; ~56% DTI → 0
  const emergencyComponent = clamp(input.emergencyMonths * 15)            // ~6.7 months → 100
  return (savingsComponent + dtiComponent + emergencyComponent) / 3
}

// ─── primary composites ─────────────────────────────────────────────────

export function effectiveRiskAppetite(answers: PsychAnswers): number {
  const c1 = constructOrNeutral(answers, 'C-1')
  const c2 = constructOrNeutral(answers, 'C-2')  // already higher = less loss-averse
  // Higher C-2 already means less loss-averse, but the original formula calls for
  // willingness + (100 - lossAversion). Our C-2 encodes the inverse of loss-aversion,
  // so add it directly rather than inverting.
  return (c1 + c2) / 2
}

function lifeStageWeights(life: LifeStageInput): { wRA: number; wRC: number } {
  const yearsToRetirement = life.retirementAge - life.currentAge
  if (yearsToRetirement < 5) return { wRA: 0.4, wRC: 0.6 }
  return { wRA: 0.5, wRC: 0.5 }
}

export function biasIndex(answers: PsychAnswers): number {
  // The v10 formula is avg of (100 - C-2, 100 - C-10, 100 - C-11, 100 - C-12),
  // where each of those constructs is *coded so higher = less biased*.
  // So a high bias index means more bias.
  const c2  = constructOrNeutral(answers, 'C-2')
  const c10 = constructOrNeutral(answers, 'C-10')
  const c11 = constructOrNeutral(answers, 'C-11')
  const c12 = constructOrNeutral(answers, 'C-12')
  return (invert(c2) + invert(c10) + invert(c11) + invert(c12)) / 4
}

export function planningReadiness(answers: PsychAnswers): number {
  const c3  = constructOrNeutral(answers, 'C-3')
  const c4  = constructOrNeutral(answers, 'C-4')
  const c15 = constructOrNeutral(answers, 'C-15')  // C15-Q3 multi-select is excluded by constructScore
  return (c3 + c4 + c15) / 3
}

export function scamVulnerability(answers: PsychAnswers, age: number): number {
  const c14 = constructOrNeutral(answers, 'C-14')   // higher = LESS vulnerable
  // Pull the C-15-Q4 openness sub-item directly: higher openness → lower vulnerability.
  const c15q4 = answers['C15-Q4']
  let c15q4Norm = 50
  if (c15q4 && !c15q4.skipped && typeof c15q4.value === 'number') {
    c15q4Norm = normalize(c15q4.value, '5-point-likert') ?? 50
  }
  // Vulnerability is the inverse of (composite of protective factors).
  let vuln = invert((c14 + c15q4Norm) / 2)
  if (age >= 75) vuln += 12
  else if (age >= 65) vuln += 6
  return clamp(vuln)
}

const MONEY_SCRIPT_CONSTRUCTS: Record<MoneyScriptId, ConstructId> = {
  avoidance: 'C-6',
  worship:   'C-7',
  status:    'C-8',
  vigilance: 'C-9',
}

export function moneyScripts(answers: PsychAnswers): Record<MoneyScriptId, number> {
  return {
    avoidance: constructOrNeutral(answers, MONEY_SCRIPT_CONSTRUCTS.avoidance),
    worship:   constructOrNeutral(answers, MONEY_SCRIPT_CONSTRUCTS.worship),
    status:    constructOrNeutral(answers, MONEY_SCRIPT_CONSTRUCTS.status),
    vigilance: constructOrNeutral(answers, MONEY_SCRIPT_CONSTRUCTS.vigilance),
  }
}

export function dominantMoneyScript(answers: PsychAnswers): MoneyScriptId | null {
  const scripts = moneyScripts(answers)
  // If every construct is at the neutral fallback, we have no real signal.
  const allNeutral = Object.values(scripts).every((v) => v === 50)
  if (allNeutral && !answers['C6-Q1'] && !answers['C7-Q1'] && !answers['C8-Q1'] && !answers['C9-Q1']) {
    return null
  }
  let best: MoneyScriptId = 'avoidance'
  let bestVal = -Infinity
  for (const id of Object.keys(scripts) as MoneyScriptId[]) {
    if (scripts[id] > bestVal) {
      bestVal = scripts[id]
      best = id
    }
  }
  return best
}

// ─── profile mapping ────────────────────────────────────────────────────

export function profileBandFromScore(score: number): RiskProfileId {
  if (score < 20) return 'ultra-conservative'
  if (score < 40) return 'conservative'
  if (score < 60) return 'moderate'
  if (score < 80) return 'moderately-aggressive'
  return 'aggressive'
}

// ─── top-level entry point ──────────────────────────────────────────────

export interface ComputeCompositesArgs {
  answers: PsychAnswers
  capacity: RiskCapacityInput
  life: LifeStageInput
}

export function computeComposites({ answers, capacity, life }: ComputeCompositesArgs): CompositesResult {
  const era = effectiveRiskAppetite(answers)
  const rc  = riskCapacity(capacity)
  const { wRA, wRC } = lifeStageWeights(life)
  const rp = clamp(wRA * era + wRC * rc)

  const ra = constructOrNeutral(answers, 'C-1')
  const bias = biasIndex(answers)
  const planning = planningReadiness(answers)
  const scam = scamVulnerability(answers, life.currentAge)
  const scripts = moneyScripts(answers)
  const dominant = dominantMoneyScript(answers)

  const allConstructs: ConstructId[] = [
    'C-1','C-2','C-3','C-4','C-5','C-6','C-7','C-8','C-9','C-10',
    'C-11','C-12','C-13','C-14','C-15','C-16',
  ]
  const constructScores: Partial<Record<ConstructId, number>> = {}
  for (const c of allConstructs) {
    const s = constructScore(answers, c)
    if (s != null) constructScores[c] = s
  }

  return {
    riskProfile: rp,
    effectiveRiskAppetite: era,
    riskCapacity: rc,
    riskAppetite: ra,
    biasIndex: bias,
    planningReadiness: planning,
    scamVulnerability: scam,
    dominantMoneyScript: dominant,
    moneyScripts: scripts,
    constructScores,
    profileId: profileBandFromScore(rp),
  }
}

// ─── helpers exported for tests / UI ────────────────────────────────────

export function answerHasValue(a: PsychAnswer | undefined): boolean {
  if (!a || a.skipped) return false
  if (Array.isArray(a.value)) return a.value.length > 0
  return typeof a.value === 'number'
}

export function answeredCount(answers: PsychAnswers): number {
  return Object.values(answers).filter(answerHasValue).length
}

export function pickOptionScore(q: PsychQuestion, optionIndex: number): number {
  return q.options[optionIndex]?.score ?? 0
}
