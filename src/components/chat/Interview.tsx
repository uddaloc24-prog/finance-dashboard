import { useEffect, useRef } from 'react'
import type { InterviewSession } from '../../types/v2'
import { Bubble } from './Bubble'
import { ThinkingState } from './ThinkingState'
import { AnswerForm } from './AnswerForm'

interface InterviewProps {
  session: InterviewSession
  isThinking: boolean
  error: string | null
  onSend: (text: string) => void
  onPlan: () => void
  planBusy?: boolean
}

export function Interview({
  session,
  isThinking,
  error,
  onSend,
  onPlan,
  planBusy,
}: InterviewProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [session.turns.length, isThinking])

  const readyToPlan = session.status === 'ready-to-plan'

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {session.turns.length === 0 && !isThinking && (
          <div className="text-center text-sm text-gray-500 mt-8">
            Starting your planning conversation...
          </div>
        )}
        {session.turns.map((turn, i) => (
          <Bubble key={i} role={turn.role} timestamp={turn.timestamp}>
            {turn.content}
          </Bubble>
        ))}
        {isThinking && <ThinkingState />}
        {error && (
          <div className="mx-auto max-w-[85%] mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>

      {readyToPlan ? (
        <div className="border-t border-gray-200 bg-white p-3">
          <button
            onClick={onPlan}
            disabled={planBusy}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {planBusy ? 'Building your plan...' : 'Generate my plan'}
          </button>
        </div>
      ) : (
        <AnswerForm onSubmit={onSend} disabled={isThinking} />
      )}
    </div>
  )
}
