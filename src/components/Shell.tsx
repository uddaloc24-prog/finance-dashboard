import { useEffect, useState } from 'react'
import type { PlanResult } from '../types/v2'
import { useInterview } from '../hooks/useInterview'
import { storage } from '../lib/storage'
import { postPlan, APIError } from '../lib/aiClient'
import { Interview } from './chat/Interview'
import { PlanReveal } from './plan/PlanReveal'
import { Button } from './ui/Button'

type Stage = 'corpus' | 'interview' | 'plan'

export function Shell() {
  const [stage, setStage] = useState<Stage>(() => {
    if (storage.getActivePlan()) return 'plan'
    if (storage.getInterviewSession()?.turns.length) return 'interview'
    return 'corpus'
  })
  const [corpus, setCorpus] = useState<number>(() => storage.getProfile()?.corpus ?? 0)
  const [corpusInput, setCorpusInput] = useState<string>(String(storage.getProfile()?.corpus ?? ''))
  const [plan, setPlan] = useState<PlanResult | null>(() => storage.getActivePlan())
  const [planBusy, setPlanBusy] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)

  const { session, isThinking, error, sendMessage, reset, bootstrap } = useInterview(corpus)

  useEffect(() => {
    if (stage === 'interview' && session.turns.length === 0 && !isThinking) {
      void bootstrap(corpus)
    }
  }, [stage, session.turns.length, isThinking, bootstrap, corpus])

  const handleStart = () => {
    const parsed = Math.max(0, Math.round(Number(corpusInput) || 0))
    if (parsed < 1_00_000) {
      setPlanError('Please enter a corpus of at least ₹1,00,000.')
      return
    }
    setPlanError(null)
    setCorpus(parsed)
    const existing = storage.getProfile()
    if (existing) {
      storage.setProfile({ ...existing, corpus: parsed })
    }
    setStage('interview')
  }

  const handlePlan = async () => {
    setPlanBusy(true)
    setPlanError(null)
    try {
      const goals = storage.getGoals()
      const res = await postPlan({
        corpus,
        profile: session.profileSoFar,
        goals,
      })
      storage.setActivePlan(res.plan)
      setPlan(res.plan)
      setStage('plan')
    } catch (e) {
      const msg = e instanceof APIError ? e.message : 'Could not build plan. Try again.'
      setPlanError(msg)
    } finally {
      setPlanBusy(false)
    }
  }

  const handleReset = () => {
    storage.clearActivePlan()
    storage.clearInterviewSession()
    reset()
    setPlan(null)
    setStage('corpus')
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-white">
      <header className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">Retirement Planner</div>
          <div className="text-[11px] text-gray-500">
            Chat-first · 4-bucket cascade · AMFI-validated funds
          </div>
        </div>
        {stage !== 'corpus' && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Restart
          </Button>
        )}
      </header>

      <main className="flex-1 min-h-0">
        {stage === 'corpus' && (
          <CorpusEntry
            value={corpusInput}
            onChange={setCorpusInput}
            onStart={handleStart}
            error={planError}
          />
        )}
        {stage === 'interview' && (
          <Interview
            session={session}
            isThinking={isThinking}
            error={error ?? planError}
            onSend={sendMessage}
            onPlan={handlePlan}
            planBusy={planBusy}
          />
        )}
        {stage === 'plan' && plan && <PlanReveal plan={plan} onReset={handleReset} />}
      </main>
    </div>
  )
}

function CorpusEntry({
  value,
  onChange,
  onStart,
  error,
}: {
  value: string
  onChange: (v: string) => void
  onStart: () => void
  error: string | null
}) {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            Know if your retirement plan actually works.
          </h1>
          <p className="text-sm text-gray-600">
            Tell us your corpus. We'll ask a few questions, then give you a verdict — not just a calculator.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-700">What's your current corpus?</span>
            <div className="mt-2 flex items-center rounded-lg border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <span className="pl-3 text-gray-500">₹</span>
              <input
                type="number"
                inputMode="numeric"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="1,00,00,000"
                className="flex-1 bg-transparent px-2 py-3 text-lg font-medium outline-none"
              />
            </div>
            <span className="mt-1 block text-[11px] text-gray-500">
              Across FDs, mutual funds, EPF, PPF, NPS — everything earmarked for retirement.
            </span>
          </label>
          {error && <div className="text-xs text-red-600">{error}</div>}
          <Button onClick={onStart} className="w-full">
            Start planning
          </Button>
        </div>

        <ul className="space-y-2 text-xs text-gray-600">
          <li className="flex items-start gap-2">
            <Check /> Real AMFI-listed funds — every pick cross-checked.
          </li>
          <li className="flex items-start gap-2">
            <Check /> Honest verdict — achievable, close, or not.
          </li>
          <li className="flex items-start gap-2">
            <Check /> Proven 4-bucket model — used by HDFC advisors.
          </li>
        </ul>
      </div>
    </div>
  )
}

function Check() {
  return (
    <svg className="w-4 h-4 text-green-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 011.4-1.4L8.5 12 15.3 5.3a1 1 0 011.4 0z" clipRule="evenodd" />
    </svg>
  )
}
