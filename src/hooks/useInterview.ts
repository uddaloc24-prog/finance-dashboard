import { useCallback, useEffect, useRef, useState } from 'react'
import type { InterviewSession, InterviewTurn } from '../types/v2'
import { postInterview, APIError } from '../lib/aiClient'
import { storage } from '../lib/storage'

const EMPTY_SESSION: InterviewSession = {
  turns: [],
  status: 'asking',
  profileSoFar: {},
  goalsSoFar: [],
}

export interface UseInterviewResult {
  session: InterviewSession
  isThinking: boolean
  error: string | null
  sendMessage: (text: string) => Promise<void>
  reset: () => void
  bootstrap: (corpus: number) => Promise<void>
}

export function useInterview(corpus: number): UseInterviewResult {
  const [session, setSession] = useState<InterviewSession>(
    () => storage.getInterviewSession() ?? EMPTY_SESSION,
  )
  const [isThinking, setIsThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bootstrappedRef = useRef(false)

  useEffect(() => {
    storage.setInterviewSession(session)
  }, [session])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isThinking) return
      setError(null)

      const userTurn: InterviewTurn = {
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toISOString(),
      }
      const afterUser: InterviewSession = { ...session, turns: [...session.turns, userTurn] }
      setSession(afterUser)
      setIsThinking(true)

      try {
        const res = await postInterview({
          session: afterUser,
          userMessage: userTurn.content,
          corpus,
        })
        setSession({
          turns: [...afterUser.turns, res.nextTurn],
          status: res.status,
          profileSoFar: res.profileSoFar,
          goalsSoFar: res.goalsSoFar,
        })
      } catch (e) {
        const msg = e instanceof APIError ? e.message : 'Could not reach the planner. Try again.'
        setError(msg)
      } finally {
        setIsThinking(false)
      }
    },
    [session, isThinking, corpus],
  )

  const bootstrap = useCallback(
    async (initialCorpus: number) => {
      if (bootstrappedRef.current || session.turns.length > 0) return
      bootstrappedRef.current = true
      setIsThinking(true)
      try {
        const res = await postInterview({
          session: EMPTY_SESSION,
          userMessage: '',
          corpus: initialCorpus,
        })
        setSession({
          turns: [res.nextTurn],
          status: res.status,
          profileSoFar: res.profileSoFar,
          goalsSoFar: res.goalsSoFar,
        })
      } catch (e) {
        const msg = e instanceof APIError ? e.message : 'Could not start the interview.'
        setError(msg)
      } finally {
        setIsThinking(false)
      }
    },
    [session.turns.length],
  )

  const reset = useCallback(() => {
    storage.clearInterviewSession()
    setSession(EMPTY_SESSION)
    setError(null)
    bootstrappedRef.current = false
  }, [])

  return { session, isThinking, error, sendMessage, reset, bootstrap }
}
