// v10 adaptive layer — applies persona + signal inference to the quiz.
// Pure functions: given an InferenceResult, produce a reordered question
// sequence, a set of prefilled answers, and a per-question rephrase lookup.

import type {
  ConstructId,
  InferenceResult,
  LengthMode,
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

// ─── length presets ────────────────────────────────────────────────────

export interface LengthPreset {
  id: LengthMode
  label: string
  description: string
  /** items kept per construct; the special 'C-13' override caps the financial-literacy block */
  perConstruct: Partial<Record<ConstructId, number>> & { default: number }
}

export const LENGTH_PRESETS: Record<LengthMode, LengthPreset> = {
  short: {
    id: 'short',
    label: 'Short',
    description: '~18 questions · 5 min · one item per construct + 3 from financial literacy',
    perConstruct: { 'C-13': 3, default: 1 },
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    description: '~50 questions · 12 min · balanced coverage across all 16 constructs',
    perConstruct: { 'C-13': 5, 'C-14': 5, default: 3 },
  },
  exhaustive: {
    id: 'exhaustive',
    label: 'Exhaustive',
    description: 'All 74 items · 20 min · full clinical battery',
    perConstruct: { default: 99 },
  },
}

// ─── seeded shuffle (deterministic per session) ────────────────────────

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h) || 1
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice()
  let s = seed
  function rand(): number {
    // 32-bit LCG (Numerical Recipes constants)
    s = (Math.imul(1664525, s) + 1013904223) | 0
    return ((s >>> 0) / 0xFFFFFFFF)
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ─── question ordering + length-aware sampling ─────────────────────────

export function buildAdaptiveSequence(
  personaId: PersonaId | null,
  bank: PsychQuestion[],
  options: { lengthMode?: LengthMode; sessionSeed?: string } = {},
): string[] {
  const lengthMode = options.lengthMode ?? 'standard'
  const preset = LENGTH_PRESETS[lengthMode]
  const seed = options.sessionSeed ? hashString(options.sessionSeed) : 0

  // Group by construct
  const byConstruct = bank.reduce<Record<string, PsychQuestion[]>>((acc, q) => {
    ;(acc[q.construct] ||= []).push(q)
    return acc
  }, {})

  // For each construct: seeded shuffle, then take the first N per the preset.
  // Different sessionSeed → different items selected on retake.
  const sampled: Record<string, PsychQuestion[]> = {}
  for (const [cid, items] of Object.entries(byConstruct)) {
    const n = preset.perConstruct[cid as ConstructId] ?? preset.perConstruct.default
    const shuffled = seed > 0 ? seededShuffle(items, seed + hashString(cid)) : items
    sampled[cid] = shuffled.slice(0, Math.min(n, items.length))
  }

  // Concatenate in persona order (fall back to declared bank order)
  const constructOrder = personaId
    ? PERSONA_CONSTRUCT_ORDER[personaId] ?? Array.from(new Set(bank.map((q) => q.construct)))
    : Array.from(new Set(bank.map((q) => q.construct)))

  const out: string[] = []
  for (const c of constructOrder) {
    for (const q of sampled[c] ?? []) out.push(q.code)
  }
  // Defensive: append any sampled items whose construct wasn't in the persona order.
  const seen = new Set(out)
  for (const items of Object.values(sampled)) {
    for (const q of items) if (!seen.has(q.code)) out.push(q.code)
  }
  return out
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
