// v10 Adaptive Psychometric — static 74-item quiz UI (phase 2).
// No adaptation yet: questions run in their declared order. On completion we
// compute the composites and surface a minimal result screen. The fancy
// gauge dashboard comes in phase 6.

import { useMemo, useState } from 'react'
import type {
  CompositesResult,
  InferenceResult,
  LengthMode,
  PersonaId,
  PsychAnswer,
  PsychQuestion,
  V10QuizState,
} from '../../types/psychometric'
import type { RiskProfileId } from '../../types/profiles'
import type { UserProfile } from '../../types'
import { PSYCH_QUESTIONS, PSYCH_TOTAL_ITEMS } from '../../lib/data/psychometricBank'
import { PSYCH_EXPLANATIONS } from '../../lib/data/psychometricExplanations'
import { computeComposites } from '../../lib/psychometric/composites'
import { deriveRiskCapacity } from '../../lib/psychometric/capacityInputs'
import {
  buildAdaptivePrefills,
  buildAdaptiveSequence,
  getQuestionText,
  LENGTH_PRESETS,
} from '../../lib/psychometric/adaptive'
import { storage } from '../../lib/storage'
import { Button } from '../ui/Button'
import { CompositesDashboard } from './CompositesDashboard'

interface Props {
  initialState: V10QuizState | null
  inference: InferenceResult | null
  userProfile: UserProfile
  currentAge: number
  retirementAge: number
  onComplete: (composites: CompositesResult, profileId: RiskProfileId) => void
  onExit: () => void
}

// Risk-capacity inputs (savingsRate / DTI / emergency-months) are derived
// from the user's Wealth Snapshot, Loans, and Budget data via
// deriveRiskCapacity(userProfile). Phase 7.

function makeSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function freshState(inference: InferenceResult | null, lengthMode: LengthMode = 'standard'): V10QuizState {
  const now = new Date().toISOString()
  const personaId = inference?.persona.primary?.id ?? null
  const sessionId = makeSessionId()
  return {
    sessionId,
    startedAt: now,
    updatedAt: now,
    currentIndex: 0,
    questionSeq: buildAdaptiveSequence(personaId as PersonaId | null, PSYCH_QUESTIONS, {
      lengthMode,
      sessionSeed: sessionId,
    }),
    lengthMode,
    answers: buildAdaptivePrefills(inference),
    completed: false,
    composites: null,
  }
}

export function V10Quiz({ initialState, inference, userProfile, currentAge, retirementAge, onComplete, onExit }: Props) {
  const [state, setState] = useState<V10QuizState>(() => initialState ?? freshState(inference))
  const [showReview, setShowReview] = useState(initialState?.completed === true)
  const [bridgeDismissed, setBridgeDismissed] = useState(false)
  const personaId = (inference?.persona.primary?.id ?? null) as PersonaId | null
  const persona = inference?.persona.primary

  const questions = useMemo<PsychQuestion[]>(
    () => state.questionSeq.map((code) => PSYCH_QUESTIONS.find((q) => q.code === code)!).filter(Boolean),
    [state.questionSeq],
  )
  const total = questions.length || PSYCH_TOTAL_ITEMS

  function persist(next: V10QuizState) {
    storage.setV10QuizState(next)
    setState(next)
  }

  function updateAnswer(code: string, answer: PsychAnswer) {
    persist({
      ...state,
      answers: { ...state.answers, [code]: answer },
      updatedAt: new Date().toISOString(),
    })
  }

  function go(toIndex: number) {
    persist({
      ...state,
      currentIndex: Math.max(0, Math.min(total, toIndex)),
      updatedAt: new Date().toISOString(),
    })
  }

  function finish() {
    const composites = computeComposites({
      answers: state.answers,
      capacity: deriveRiskCapacity(userProfile),
      life: { currentAge, retirementAge },
    })
    const next: V10QuizState = {
      ...state,
      completed: true,
      composites,
      updatedAt: new Date().toISOString(),
    }
    persist(next)
    setShowReview(true)
  }

  function restart(lengthMode: LengthMode = state.lengthMode ?? 'standard') {
    const fresh = freshState(inference, lengthMode)
    persist(fresh)
    setShowReview(false)
    setBridgeDismissed(false)
  }

  // No-progress-yet check — used to gate the length picker. Picks aren't
  // counted; only real (non-prefilled) answers are.
  const hasProgress = Object.values(state.answers).some(
    (a) => !a.prefilled && !a.skipped && (Array.isArray(a.value) ? a.value.length > 0 : typeof a.value === 'number'),
  ) || state.currentIndex > 0

  // ── Review screen ──────────────────────────────────────────────
  if (showReview && state.composites) {
    return (
      <CompositesDashboard
        composites={state.composites}
        onAccept={() => onComplete(state.composites!, state.composites!.profileId)}
        onRetake={restart}
        onExit={onExit}
      />
    )
  }

  // ── Question screen ────────────────────────────────────────────
  const idx = state.currentIndex
  if (idx >= total) {
    // Defensive: if currentIndex somehow points past the end without completion, finalize now.
    finish()
    return null
  }
  const q = questions[idx]
  const answer = state.answers[q.code]
  const answered = answer && !answer.skipped &&
    (Array.isArray(answer.value) ? answer.value.length > 0 : typeof answer.value === 'number')
  const isLast = idx === total - 1
  const textInfo = getQuestionText(q, personaId)
  const showBridge = !bridgeDismissed && idx === 0 && !!inference?.bridgeSentence

  // Hover-triggered explanation visibility. Shows on pointer-enter of the
  // question section / options, and on focus-within for keyboard users.
  // On touch devices (no hover capability) it stays visible permanently
  // via the media-query fallback in `showExplanationAlways`.
  const [hoverExplanation, setHoverExplanation] = useState(false)
  const showExplanationAlways = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(hover: none)').matches

  // Section bookkeeping — show "Construct k of N · <name>"
  const constructsInOrder = useMemo(() => {
    const seen = new Set<string>()
    const list: { id: string; name: string }[] = []
    for (const item of questions) {
      if (!seen.has(item.construct)) {
        seen.add(item.construct)
        list.push({ id: item.construct, name: item.constructName })
      }
    }
    return list
  }, [questions])
  const constructIndex = constructsInOrder.findIndex((c) => c.id === q.construct)
  const constructPositionInBlock = questions.slice(0, idx + 1).filter((qq) => qq.construct === q.construct).length
  const constructTotalInBlock = questions.filter((qq) => qq.construct === q.construct).length

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 space-y-4">
      {/* ── Length picker — visible on fresh start ─────────────── */}
      {!hasProgress && (
        <div className="rounded-md border-2 border-slate-200 bg-slate-50/60 p-3 space-y-2">
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600">
            Battery length
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(Object.values(LENGTH_PRESETS)).map((preset) => {
              const active = (state.lengthMode ?? 'standard') === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => restart(preset.id)}
                  className={`text-left px-3 py-2 rounded-md border-2 transition-colors ${
                    active
                      ? 'border-blue-400 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    {active && <span aria-hidden="true">●</span>}
                    {preset.label}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{preset.description}</div>
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-slate-500 italic">
            Switching length re-shuffles the items. Items are also re-sampled on each new session, so a retake won't be identical.
          </p>
        </div>
      )}

      {/* ── Personalisation banner ─────────────────────────────── */}
      {persona && (
        <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] font-bold tracking-[2px] uppercase text-indigo-800">Tailored</span>
          <span className="text-[11px] text-indigo-900 leading-snug">
            Sequence and wording adjusted for the <strong>{persona.name}</strong> persona
            inferred from your Goal Discovery answers ({inference?.persona.confidence} confidence).
          </span>
        </div>
      )}

      {/* ── Bridge sentence (Q1 only, dismissable) ─────────────── */}
      {showBridge && (
        <div className="rounded-md border-2 border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-900 leading-relaxed">
          {inference?.bridgeSentence}
          <button
            type="button"
            onClick={() => setBridgeDismissed(true)}
            className="block mt-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 hover:text-amber-900"
          >
            Got it →
          </button>
        </div>
      )}

      {/* ── Header / progress ─────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold tracking-[2px] uppercase text-blue-700">
            v10 · Full assessment
          </span>
          <span className="text-[11px] tabular-nums text-slate-500">
            Question {idx + 1} of {total}
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${((idx + 1) / total) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
          <span>
            Construct {constructIndex + 1} of {constructsInOrder.length} ·{' '}
            <span className="text-slate-700">{q.constructName}</span>
          </span>
          <span className="tabular-nums">{constructPositionInBlock}/{constructTotalInBlock} in section</span>
        </div>
      </div>

      {/* ── Question + options — wrapped so hover anywhere shows the hint */}
      <div
        onMouseEnter={() => setHoverExplanation(true)}
        onMouseLeave={() => setHoverExplanation(false)}
        onFocus={() => setHoverExplanation(true)}
        onBlur={(e) => {
          // only hide if focus has left the whole question section
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setHoverExplanation(false)
        }}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="inline-flex items-center text-[9px] font-bold tracking-[1.5px] uppercase text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded"
              title={`This question measures ${q.constructName} (${q.construct}). Code: ${q.code}.`}
            >
              {q.construct} · {q.constructName}
            </span>
            {textInfo.isRephrased && (
              <span className="inline-block text-[9px] font-bold tracking-[2px] uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                Rephrased for you
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-slate-900 leading-snug">{textInfo.text}</h3>
          {/* Hover-triggered explanation tooltip (always-on for touch devices) */}
          {PSYCH_EXPLANATIONS[q.code] && (hoverExplanation || showExplanationAlways) && (
            <div
              className="rounded-md border-l-4 border-indigo-300 bg-indigo-50/60 px-3 py-2 text-[12px] text-slate-700 italic leading-relaxed max-w-3xl shadow-sm"
              role="tooltip"
              aria-live="polite"
            >
              <span className="inline-flex items-baseline gap-1.5">
                <span aria-hidden="true">💡</span>
                <span>{PSYCH_EXPLANATIONS[q.code]}</span>
              </span>
            </div>
          )}
        </div>

        {/* ── Prefill banner ─────────────────────────────────────── */}
        {answer?.prefilled && (
          <div className="rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-900 leading-snug">
            <span className="font-bold">Pre-filled from your earlier responses.</span> Adjust if you'd like.
            {answer.prefillEvidence && (
              <span className="block mt-0.5 italic text-amber-800">"{answer.prefillEvidence}"</span>
            )}
          </div>
        )}

        {/* ── Options ───────────────────────────────────────────── */}
        <OptionList
          question={q}
          answer={answer}
          onPick={(a) => updateAnswer(q.code, a)}
        />
      </div>

      {/* ── Controls ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => go(idx - 1)} disabled={idx === 0}>
          ← Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onExit}>
            Save &amp; exit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              updateAnswer(q.code, { value: q.scale === 'multi-select' ? [] : 0, skipped: true })
              if (isLast) finish()
              else go(idx + 1)
            }}
          >
            Skip
          </Button>
          {isLast ? (
            <Button onClick={finish} disabled={!answered}>See result →</Button>
          ) : (
            <Button onClick={() => go(idx + 1)} disabled={!answered}>Next →</Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── option lists ────────────────────────────────────────────────────────

// Labels that should behave as exclusive ("either-or") inside a multi-select.
// Picking one of these clears the rest; picking anything else clears these.
const EXCLUSIVE_LABEL_RE = /^(none\b|nothing\b)/i

function OptionList({
  question, answer, onPick,
}: { question: PsychQuestion; answer: PsychAnswer | undefined; onPick: (a: PsychAnswer) => void }) {
  if (question.scale === 'multi-select') {
    const selected = Array.isArray(answer?.value) ? (answer!.value as number[]) : []
    const exclusiveIndexes = new Set(
      question.options.map((o, i) => (EXCLUSIVE_LABEL_RE.test(o.label) ? i : -1)).filter((i) => i >= 0),
    )
    function toggle(i: number) {
      const isCurrentlySelected = selected.includes(i)
      let next: number[]
      if (isCurrentlySelected) {
        next = selected.filter((x) => x !== i)
      } else if (exclusiveIndexes.has(i)) {
        next = [i]                                                      // exclusive — clear all
      } else {
        next = [...selected.filter((x) => !exclusiveIndexes.has(x)), i] // regular — drop any exclusive
      }
      onPick({ value: next, skipped: false })
    }
    return (
      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const isOn = selected.includes(i)
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => toggle(i)}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors text-sm flex items-center gap-3 ${
                isOn
                  ? 'bg-blue-50 border-blue-400 text-blue-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span
                aria-hidden="true"
                className={`shrink-0 w-4 h-4 rounded-sm border-2 flex items-center justify-center text-[10px] font-bold ${
                  isOn ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                }`}
              >
                {isOn ? '✓' : ''}
              </span>
              {opt.label}
            </button>
          )
        })}
        <div className="text-[10px] text-slate-500 italic">Select all that apply.</div>
      </div>
    )
  }

  // Single-select scales (5-Likert, 7-Likert, knowledge-MCQ)
  const isAnswered = answer != null && !answer.skipped && typeof answer.value === 'number'
  return (
    <div className="space-y-2">
      {question.options.map((opt, i) => {
        // Prefer the persisted selectedIndex (set on click). Fall back to
        // first index whose score matches stored value — handles answers
        // stored before selectedIndex was added.
        const fallbackIdx = isAnswered ? question.options.findIndex((o) => o.score === answer!.value) : -1
        const idx = answer?.selectedIndex ?? fallbackIdx
        const isChosen = isAnswered && idx === i
        return (
          <button
            key={`${opt.label}-${i}`}
            type="button"
            onClick={() => onPick({ value: opt.score, skipped: false, selectedIndex: i })}
            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors text-sm ${
              isChosen
                ? 'bg-blue-50 border-blue-400 text-blue-900'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

