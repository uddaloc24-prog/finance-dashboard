// v10 Adaptive Psychometric — static 74-item quiz UI (phase 2).
// No adaptation yet: questions run in their declared order. On completion we
// compute the composites and surface a minimal result screen. The fancy
// gauge dashboard comes in phase 6.

import { useMemo, useState } from 'react'
import type { CompositesResult, PsychAnswer, PsychQuestion, V10QuizState } from '../../types/psychometric'
import type { RiskProfileId } from '../../types/profiles'
import { PSYCH_QUESTIONS, PSYCH_TOTAL_ITEMS } from '../../lib/data/psychometricBank'
import { computeComposites } from '../../lib/psychometric/composites'
import { profileById } from '../../lib/data/riskProfiles'
import { storage } from '../../lib/storage'
import { Button } from '../ui/Button'

interface Props {
  initialState: V10QuizState | null
  currentAge: number
  retirementAge: number
  onComplete: (composites: CompositesResult, profileId: RiskProfileId) => void
  onExit: () => void
}

// Phase 2 uses neutral capacity defaults — phase 7 will plumb in real
// savingsRate / DTI / emergency-months from the Plan tab inputs.
const NEUTRAL_CAPACITY = { savingsRate: 0.15, debtToIncome: 0.15, emergencyMonths: 3 } as const

function makeSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function freshState(): V10QuizState {
  const now = new Date().toISOString()
  return {
    sessionId: makeSessionId(),
    startedAt: now,
    updatedAt: now,
    currentIndex: 0,
    questionSeq: PSYCH_QUESTIONS.map((q) => q.code),
    answers: {},
    completed: false,
    composites: null,
  }
}

export function V10Quiz({ initialState, currentAge, retirementAge, onComplete, onExit }: Props) {
  const [state, setState] = useState<V10QuizState>(() => initialState ?? freshState())
  const [showReview, setShowReview] = useState(initialState?.completed === true)

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
      capacity: NEUTRAL_CAPACITY,
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

  function restart() {
    const fresh = freshState()
    persist(fresh)
    setShowReview(false)
  }

  // ── Review screen ──────────────────────────────────────────────
  if (showReview && state.composites) {
    return <ReviewScreen
      composites={state.composites}
      onAccept={() => onComplete(state.composites!, state.composites!.profileId)}
      onRetake={restart}
      onExit={onExit}
    />
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

      {/* ── Question ──────────────────────────────────────────── */}
      <h3 className="text-base font-semibold text-slate-900 leading-snug">{q.question}</h3>

      {/* ── Options ───────────────────────────────────────────── */}
      <OptionList
        question={q}
        answer={answer}
        onPick={(a) => updateAnswer(q.code, a)}
      />

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

function OptionList({
  question, answer, onPick,
}: { question: PsychQuestion; answer: PsychAnswer | undefined; onPick: (a: PsychAnswer) => void }) {
  if (question.scale === 'multi-select') {
    const selected = Array.isArray(answer?.value) ? (answer!.value as number[]) : []
    function toggle(i: number) {
      const next = selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i]
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
  const chosen = typeof answer?.value === 'number' && !answer.skipped ? answer.value : null
  return (
    <div className="space-y-2">
      {question.options.map((opt, i) => {
        // For single-select we identify the chosen option by index, not score, to
        // handle ties (e.g. C12-Q2 has two options with score 3).
        const isChosen = chosen != null && state_chosenIndex(answer, question) === i
        return (
          <button
            key={`${opt.label}-${i}`}
            type="button"
            onClick={() => onPick({ value: opt.score, skipped: false })}
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

// Recover the chosen index from a stored answer. When two options share a score
// we cannot distinguish them on replay; the first match wins, which is fine for
// the highlight (the underlying score is what matters for scoring).
function state_chosenIndex(answer: PsychAnswer | undefined, question: PsychQuestion): number | null {
  if (!answer || answer.skipped || typeof answer.value !== 'number') return null
  return question.options.findIndex((o) => o.score === answer.value)
}

// ─── review screen ──────────────────────────────────────────────────────

function ReviewScreen({
  composites, onAccept, onRetake, onExit,
}: { composites: CompositesResult; onAccept: () => void; onRetake: () => void; onExit: () => void }) {
  const profile = profileById(composites.profileId)
  const scriptLabel: Record<string, string> = {
    avoidance: 'Money Avoidance',
    worship:   'Money Worship',
    status:    'Money Status',
    vigilance: 'Money Vigilance',
  }
  return (
    <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 space-y-4">
      <div className="text-center">
        <span className="inline-block bg-blue-100 text-blue-800 text-[10px] font-bold tracking-[2px] uppercase px-3 py-1 rounded-full">
          v10 assessment complete
        </span>
        <div className="text-4xl font-extrabold text-slate-900 mt-3 tabular-nums">
          {Math.round(composites.riskProfile)}<span className="text-slate-400 text-2xl">/100</span>
        </div>
        <h3 className="text-lg font-bold text-blue-700 mt-1">{profile.name}</h3>
        <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-snug">{profile.tagline}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <Stat label="Risk appetite"   value={composites.riskAppetite} />
        <Stat label="Risk capacity"   value={composites.riskCapacity} />
        <Stat label="Bias index"      value={composites.biasIndex} />
        <Stat label="Planning ready"  value={composites.planningReadiness} />
        <Stat label="Scam vulnerability" value={composites.scamVulnerability} />
        <Stat label="Dominant script" value={composites.dominantMoneyScript ? scriptLabel[composites.dominantMoneyScript] : '—'} raw />
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
        <Button variant="ghost" size="sm" onClick={onRetake}>Retake</Button>
        <Button variant="ghost" size="sm" onClick={onExit}>Close</Button>
        <Button onClick={onAccept}>Use this profile →</Button>
      </div>

      <p className="text-[10px] text-slate-500 text-center max-w-md mx-auto leading-snug">
        Phase 2 result. The full gauge dashboard and construct breakdown will replace this screen in phase 6.
      </p>
    </div>
  )
}

function Stat({ label, value, raw }: { label: string; value: number | string; raw?: boolean }) {
  return (
    <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50/60">
      <div className="text-[9px] font-bold tracking-[2px] uppercase text-slate-500">{label}</div>
      <div className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">
        {raw ? value : `${Math.round(value as number)}/100`}
      </div>
    </div>
  )
}
