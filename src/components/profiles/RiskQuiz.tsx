import { useState } from 'react'
import type { QuizState, RiskProfileId } from '../../types/profiles'
import { QUIZ_QUESTIONS } from '../../lib/data/quiz'
import { profileFromScore, RISK_PROFILES } from '../../lib/data/riskProfiles'
import { storage } from '../../lib/storage'
import { Button } from '../ui/Button'
import { HoverExplain } from '../ui/HoverExplain'

// Hover-trigger explanations per quiz question. Keyed by question id.
const QUIZ_EXPLAIN: Record<string, string> = {
  'q1-horizon':
    'How long the corpus has to last. Shorter horizons favour capital safety (B1/B2). Longer horizons let you ride equity volatility (B3/B4) and need an inflation hedge.',
  'q2-secondary-income':
    'Pensions / rental / spouse working reduce dependence on the corpus. More secondary income = higher capacity for an equity tilt.',
  'q3-essential-share':
    'Rent, food and healthcare are eaten first by the withdrawal stream. High essentials → need a stable B1/B2 floor; low essentials → flexibility to tilt to growth.',
  'q4-crash-reaction':
    'Behavioural test under stress. The honest answer matters more than the "right" one — pick what you would actually do.',
  'q5-volatility-tolerance':
    'How much month-to-month swing you can stomach without acting impulsively. Frequent portfolio-checking + high anxiety usually means lower tolerance.',
  'q6-investing-experience':
    'Familiarity with equity reduces the chance of panic-selling at the bottom. First-time equity investors do best with index funds + automation.',
  'q7-emergency-fund':
    'Separate-from-corpus cash is your real cushion. The deeper this is, the more risk capacity you have — and the more you can keep B4 invested through bad years.',
  'q8-legacy':
    'Leaving an inheritance forces a lower safe-withdrawal rate. "Spend every rupee" allows ~1% extra. Be honest with yourself — half-hearted legacy goals usually backfire.',
  'q9-inflation-priority':
    'Inflation hedge usually requires equity (B3/B4). At 6%, ₹1 today buys ~₹0.55 in 10 years — real income matters more than rupee-stated income.',
  'q10-management-effort':
    'Active engagement enables Monte Carlo sanity checks + rebalancing. If set-and-forget, default to index funds + a balanced advantage fund.',
}

interface Props {
  initialState: QuizState | null
  onComplete: (state: QuizState) => void
  onSkipToProfile: (id: RiskProfileId) => void
}

export function RiskQuiz({ initialState, onComplete, onSkipToProfile }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>(initialState?.answers ?? {})
  const [step, setStep] = useState(initialState?.completed ? QUIZ_QUESTIONS.length : 0)

  const isReview = initialState?.completed === true && step >= QUIZ_QUESTIONS.length

  if (isReview) {
    const profile = profileFromScore(initialState!.totalScore)
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="text-center">
          <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
            Quiz complete · Score {initialState!.totalScore}/50
          </span>
          <h3 className="text-lg font-semibold text-gray-900 mt-3">
            You're a <span className="text-blue-700">{profile.name}</span> investor
          </h3>
          <p className="text-sm text-gray-600 mt-1">{profile.tagline}</p>
        </div>
        <div className="text-xs text-gray-500 text-center">
          See your detailed allocation below — or
        </div>
        <div className="flex gap-2 justify-center flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => { setStep(0); setAnswers({}) }}>
            Retake quiz
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onSkipToProfile(profile.id)}>
            Confirm — show my plan
          </Button>
        </div>
      </div>
    )
  }

  if (step >= QUIZ_QUESTIONS.length) {
    const total = Object.values(answers).reduce((a, b) => a + b, 0)
    const profile = profileFromScore(total)
    const state: QuizState = { answers, totalScore: total, profileId: profile.id, completed: true }
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="text-center">
          <div className="text-sm text-gray-500">Your risk score</div>
          <div className="text-4xl font-bold text-gray-900 mt-1 tabular-nums">
            {total} <span className="text-gray-400 text-2xl">/50</span>
          </div>
          <h3 className="text-lg font-semibold text-blue-700 mt-3">{profile.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{profile.tagline}</p>
          <p className="text-xs text-gray-500 mt-3 max-w-md mx-auto">{profile.description}</p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="ghost" size="sm" onClick={() => { setStep(0); setAnswers({}) }}>
            Retake
          </Button>
          <Button onClick={() => { storage.setQuizState(state); onComplete(state) }}>
            See my plan →
          </Button>
        </div>
      </div>
    )
  }

  const q = QUIZ_QUESTIONS[step]
  const chosen = answers[q.id]

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-500">
          Question {step + 1} of {QUIZ_QUESTIONS.length} · Section {q.section}
        </span>
        <div className="flex-1 mx-3 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${((step + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
          />
        </div>
        <span className="text-[11px] tabular-nums text-gray-400">
          {Math.round(((step + 1) / QUIZ_QUESTIONS.length) * 100)}%
        </span>
      </div>

      <HoverExplain hint={QUIZ_EXPLAIN[q.id]} tone="navy" className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 leading-snug">{q.question}</h3>

        <div className="space-y-2">
          {q.options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setAnswers({ ...answers, [q.id]: opt.score })}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm ${
                chosen === opt.score
                  ? 'bg-blue-50 border-blue-400 text-blue-900'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </HoverExplain>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          ← Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => onSkipToProfile('moderate')}>
            Skip — use Moderate
          </Button>
          <Button onClick={() => chosen != null && setStep(step + 1)} disabled={chosen == null}>
            {step === QUIZ_QUESTIONS.length - 1 ? 'See result →' : 'Next →'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export { RISK_PROFILES }
