import { useState } from 'react'
import type { UserProfile } from '../../types'
import type { QuizState, RiskProfileId } from '../../types/profiles'
import { profileById, profileFromScore } from '../../lib/data/riskProfiles'
import { storage } from '../../lib/storage'
import { RiskQuiz } from './RiskQuiz'
import { ProfileGrid } from './ProfileGrid'
import { Button } from '../ui/Button'

interface Props {
  userProfile: UserProfile
}

export function ProfilesPanel({ userProfile }: Props) {
  const [quizState, setQuizState] = useState<QuizState | null>(() => storage.getQuizState())
  const [chosenId, setChosenId] = useState<RiskProfileId | null>(
    () => storage.getRiskProfile() ?? quizState?.profileId ?? null,
  )
  const [showQuiz, setShowQuiz] = useState(false)

  const matchedProfile = chosenId ? profileById(chosenId) : null
  const quizProfile = quizState?.completed && quizState.profileId ? profileFromScore(quizState.totalScore) : null

  const handleQuizComplete = (state: QuizState) => {
    setQuizState(state)
    if (state.profileId) {
      storage.setRiskProfile(state.profileId)
      setChosenId(state.profileId)
    }
    setShowQuiz(false)
  }

  const handleChoose = (id: RiskProfileId) => {
    storage.setRiskProfile(id)
    setChosenId(id)
  }

  return (
    <div className="space-y-4">
      {/* Header strip — quiz status + retake CTA */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Risk profile</h2>
          {matchedProfile ? (
            <p className="text-[11px] text-gray-600 mt-0.5">
              Your match: <span className="font-medium text-blue-700">{matchedProfile.name}</span>
              {quizState?.completed && (
                <> · quiz score <span className="tabular-nums">{quizState.totalScore}/50</span></>
              )}
              {!quizState?.completed && <> · selected manually</>}
            </p>
          ) : (
            <p className="text-[11px] text-gray-500 mt-0.5">
              Take the quiz or pick any of the 5 profiles below to load its detailed plan.
            </p>
          )}
        </div>
        <div className="flex gap-1.5">
          {!showQuiz && (
            <Button variant="ghost" size="sm" onClick={() => setShowQuiz(true)}>
              {quizState?.completed ? 'Retake quiz' : 'Take risk quiz'}
            </Button>
          )}
          {showQuiz && (
            <Button variant="ghost" size="sm" onClick={() => setShowQuiz(false)}>
              Close quiz
            </Button>
          )}
        </div>
      </div>

      {/* Quiz panel — collapsible */}
      {showQuiz && (
        <RiskQuiz
          initialState={quizState}
          onComplete={handleQuizComplete}
          onSkipToProfile={(id) => { handleChoose(id); setShowQuiz(false) }}
        />
      )}

      {/* Hint when quiz already done but profile not yet picked */}
      {!showQuiz && quizProfile && !chosenId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-xs text-blue-900 flex items-center justify-between">
          <span>Your quiz suggests <strong>{quizProfile.name}</strong>. Click "Use this plan" on the matching column to confirm.</span>
        </div>
      )}

      {/* The main attraction — all 5 profiles side by side */}
      <ProfileGrid userCorpus={userProfile.corpus} matchedId={chosenId} onSelect={handleChoose} />

      {/* Legend / explanatory footer */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <h4 className="text-xs font-semibold text-gray-900 mb-2">How to read this page</h4>
        <ul className="text-[11px] text-gray-600 space-y-1 leading-snug">
          <li><strong>Allocation bar</strong> — share of corpus per bucket (B1 liquidity / B2 fixed floor / B3 stability / B4 growth). Equity % is the equity-weighted share of B3 + B4.</li>
          <li><strong>Year-1 mo</strong> — combined monthly income produced by the recommended instrument mix at retirement start.</li>
          <li><strong>Year-10 mo</strong> — same income measure 10 years in, after equity refill compounding kicks in.</li>
          <li><strong>Year-20 corpus</strong> — projected ending balance. Green when corpus exceeds your starting amount.</li>
          <li>Figures are scaled from the academic PDF's ₹1Cr reference plan to your actual corpus.</li>
        </ul>
      </div>
    </div>
  )
}
