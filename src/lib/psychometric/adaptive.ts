// v10 adaptive layer — applies persona + signal inference to the quiz.
// Pure functions: given an InferenceResult, produce a reordered question
// sequence, a set of prefilled answers, and a per-question rephrase lookup.

import type {
  InferenceResult,
  PersonaId,
  PsychAnswers,
  PsychQuestion,
  SignalId,
} from '../../types/psychometric'
import {
  PERSONA_CONSTRUCT_ORDER,
  PERSONA_REPHRASINGS,
  SIGNAL_ACTIVATION_THRESHOLD,
  SIGNAL_PREFILLS,
} from '../data/personas'

// ─── question ordering ──────────────────────────────────────────────────

export function buildAdaptiveSequence(
  personaId: PersonaId | null,
  bank: PsychQuestion[],
): string[] {
  const base = bank.map((q) => q.code)
  if (!personaId) return base
  const order = PERSONA_CONSTRUCT_ORDER[personaId]
  if (!order) return base

  const byConstruct = bank.reduce<Record<string, PsychQuestion[]>>((acc, q) => {
    ;(acc[q.construct] ||= []).push(q)
    return acc
  }, {})

  const reordered: string[] = []
  for (const c of order) {
    for (const q of byConstruct[c] ?? []) reordered.push(q.code)
  }
  // Defensive: append any items whose construct wasn't in the persona order.
  const seen = new Set(reordered)
  for (const q of bank) if (!seen.has(q.code)) reordered.push(q.code)
  return reordered
}

// ─── prefills from active signals ───────────────────────────────────────

export function buildAdaptivePrefills(inference: InferenceResult | null): PsychAnswers {
  if (!inference) return {}
  const out: PsychAnswers = {}
  const ids = Object.keys(inference.signals) as SignalId[]
  for (const id of ids) {
    const sig = inference.signals[id]
    if (!sig || sig.score === null || sig.score < SIGNAL_ACTIVATION_THRESHOLD) continue
    const rule = SIGNAL_PREFILLS[id]
    if (!rule) continue
    const ev = sig.evidence?.[0] ?? ''
    for (const code of rule.items) {
      out[code] = { value: rule.value, skipped: false, prefilled: true, prefillEvidence: ev }
    }
  }
  return out
}

// ─── per-question text (rephrasing) ─────────────────────────────────────

export interface QuestionTextResult {
  text: string
  isRephrased: boolean
}

export function getQuestionText(
  question: PsychQuestion,
  personaId: PersonaId | null,
): QuestionTextResult {
  if (!personaId) return { text: question.question, isRephrased: false }
  // v10 rule: never rephrase knowledge items (C-13); always use default text.
  if (question.scale === 'knowledge-mcq') return { text: question.question, isRephrased: false }
  const rephrased = PERSONA_REPHRASINGS[personaId]?.[question.code]
  if (rephrased) return { text: rephrased, isRephrased: true }
  return { text: question.question, isRephrased: false }
}
