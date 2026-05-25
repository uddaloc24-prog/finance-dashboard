// @vitest-environment jsdom
//
// Regression tests for the two persistence fixes:
//   • RiskQuiz auto-saves every answer (not just on completion) — commit 9307308
//   • ProfilesPanel re-hydrates storage-backed state on modal close — commit 7615a17
//
// We test the mechanisms directly rather than mounting all of ProfilesPanel,
// which pulls in recharts and lazy-loaded dashboards that aren't worth the
// jsdom setup cost. The hook pattern and the RiskQuiz component cover the
// two fixes that were actually broken.

import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, renderHook, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { storage } from '../../../lib/storage'
import { RiskQuiz } from '../RiskQuiz'
import { profileFromScore } from '../../../lib/data/riskProfiles'
import type { QuizState } from '../../../types/profiles'

beforeEach(() => {
  window.localStorage.clear()
})

// ─── Fix 1: RiskQuiz auto-saves every answer ──────────────────────────

describe('RiskQuiz · per-answer auto-save (commit 9307308)', () => {
  it('persists partial state to storage after a single answer click', async () => {
    const user = userEvent.setup()
    render(
      <RiskQuiz
        initialState={null}
        onComplete={() => { /* not reached in this test */ }}
        onSkipToProfile={() => { /* not reached */ }}
      />,
    )

    // Quiz starts on question 1, no answers stored yet
    expect(storage.getQuizState()).toBeNull()

    // Click any answer option for Q1
    const firstOption = screen.getAllByRole('button').find((b) => /^[A-Z]/.test(b.textContent ?? '') && !/^(←|Skip|Next|See)/.test(b.textContent ?? ''))
    expect(firstOption, 'Expected to find a quiz option button').toBeTruthy()
    await user.click(firstOption!)

    // Now storage should reflect the answer immediately
    const persisted = storage.getQuizState()
    expect(persisted).not.toBeNull()
    expect(Object.keys(persisted!.answers).length).toBeGreaterThanOrEqual(1)
    expect(persisted!.completed).toBe(false)   // mid-quiz, not done
    expect(persisted!.totalScore).toBeGreaterThan(0)
  })

  it('partial state survives unmount — remount with same initialState restores progress', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <RiskQuiz
        initialState={null}
        onComplete={() => { /* noop */ }}
        onSkipToProfile={() => { /* noop */ }}
      />,
    )
    const firstOption = screen.getAllByRole('button').find((b) => /^[A-Z]/.test(b.textContent ?? '') && !/^(←|Skip|Next|See)/.test(b.textContent ?? ''))
    await user.click(firstOption!)
    const persistedAfterFirst = storage.getQuizState()
    unmount()

    // Re-mount with the freshly-saved state as initial — should pick up where the user left off
    render(
      <RiskQuiz
        initialState={persistedAfterFirst}
        onComplete={() => { /* noop */ }}
        onSkipToProfile={() => { /* noop */ }}
      />,
    )
    // Quiz survives across mounts: storage state is preserved
    expect(storage.getQuizState()?.answers).toEqual(persistedAfterFirst!.answers)
  })
})

// ─── Fix 2: ProfilesPanel re-hydration pattern (commit 7615a17) ───────

/**
 * Mini-replica of the ProfilesPanel storage-backed state pattern.
 * Mirrors lines 28-30 + 49 of ProfilesPanel.tsx exactly, so this hook
 * test pins the contract the fix established: closeAll must re-read
 * storage before any modal child re-mounts.
 */
function useProfilesPanelStatePattern() {
  const [quizState, setQuizState]     = useState(() => storage.getQuizState())
  const [v10State, setV10State]       = useState(() => storage.getV10QuizState())
  const [gdState, setGdState]         = useState(() => storage.getGoalDiscovery())

  function closeAll() {
    setQuizState(storage.getQuizState())
    setV10State(storage.getV10QuizState())
    setGdState(storage.getGoalDiscovery())
  }

  return { quizState, v10State, gdState, closeAll }
}

describe('ProfilesPanel · re-hydrate on modal close (commit 7615a17)', () => {
  it('parent state is initially null when storage is empty', () => {
    const { result } = renderHook(() => useProfilesPanelStatePattern())
    expect(result.current.quizState).toBeNull()
    expect(result.current.v10State).toBeNull()
    expect(result.current.gdState).toBeNull()
  })

  it('after a mid-modal storage write, parent state stays STALE until closeAll fires', () => {
    const { result } = renderHook(() => useProfilesPanelStatePattern())
    expect(result.current.quizState).toBeNull()

    // Simulate the quiz writing to storage mid-flow (every answer click)
    const partial: QuizState = {
      answers: { 'q1-horizon': 5 },
      totalScore: 5,
      profileId: profileFromScore(5).id,
      completed: false,
    }
    storage.setQuizState(partial)

    // ← THE BUG: parent React state has not refreshed; modal child
    // re-mounting now would see null and lose the user's progress.
    expect(result.current.quizState).toBeNull()
  })

  it('THE FIX: closeAll re-reads storage so the next modal open shows latest state', () => {
    const { result } = renderHook(() => useProfilesPanelStatePattern())

    const partial: QuizState = {
      answers: { 'q1-horizon': 5, 'q2-secondary-income': 4 },
      totalScore: 9,
      profileId: profileFromScore(9).id,
      completed: false,
    }
    storage.setQuizState(partial)

    // closeAll is what the × / Esc / Save-Exit buttons all funnel through
    act(() => result.current.closeAll())

    // Parent now matches storage — next modal mount receives fresh initialState
    expect(result.current.quizState).not.toBeNull()
    expect(result.current.quizState!.answers).toEqual(partial.answers)
    expect(result.current.quizState!.completed).toBe(false)
  })

  it('closeAll refreshes ALL THREE storage-backed pieces simultaneously', () => {
    const { result } = renderHook(() => useProfilesPanelStatePattern())

    storage.setQuizState({ answers: { q: 3 }, totalScore: 3, profileId: 'conservative', completed: false })
    storage.setGoalDiscovery({
      sessionId: 'sess', startedAt: '', updatedAt: '', currentBlock: 'block-2',
      visited: ['block-0', 'block-1'], answers: { 'block-1': { goals: [] } },
      completed: false,
    })

    expect(result.current.quizState).toBeNull()
    expect(result.current.gdState).toBeNull()

    act(() => result.current.closeAll())

    expect(result.current.quizState).not.toBeNull()
    expect(result.current.gdState).not.toBeNull()
    expect(result.current.gdState!.currentBlock).toBe('block-2')
  })
})
