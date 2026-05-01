import { useState } from 'react'
import type { UserProfile, BucketState } from '../../types'
import type { QuizState, RiskProfileId } from '../../types/profiles'
import { profileById, profileFromScore } from '../../lib/data/riskProfiles'
import { storage } from '../../lib/storage'
import { allocateBuckets, totalCorpus } from '../../lib/calculations'
import { RiskQuiz } from './RiskQuiz'
import { ProfileGrid } from './ProfileGrid'
import { RiskProfiler, type RiskResult } from '../RiskProfiler'
import { Button } from '../ui/Button'

interface Props {
  userProfile: UserProfile
  buckets: BucketState
  onProfileUpdate: (p: UserProfile) => void
  onBucketsUpdate: (b: BucketState) => void
}

export function ProfilesPanel({ userProfile, buckets, onProfileUpdate, onBucketsUpdate }: Props) {
  const [quizState, setQuizState] = useState<QuizState | null>(() => storage.getQuizState())
  const [chosenId, setChosenId] = useState<RiskProfileId | null>(
    () => storage.getRiskProfile() ?? quizState?.profileId ?? null,
  )
  const [showQuiz, setShowQuiz] = useState(false)
  const [showProfiler, setShowProfiler] = useState(false)
  const [profilerResult, setProfilerResult] = useState<RiskResult | null>(null)

  const matchedProfile = chosenId ? profileById(chosenId) : null
  const quizProfile = quizState?.completed && quizState.profileId ? profileFromScore(quizState.totalScore) : null
  const corpus = totalCorpus(buckets)

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

  const updateProfile = (partial: Partial<UserProfile>) => {
    const updated = { ...userProfile, ...partial }
    storage.setProfile(updated)
    onProfileUpdate(updated)
  }

  const handleSliderChange = (v: number) => {
    updateProfile({ riskAppetite: v as 1 | 2 | 3 | 4 | 5 })
  }

  const handleProfilerComplete = (result: RiskResult) => {
    setProfilerResult(result)
    const allocFractions = {
      b1: result.allocation.b1 / 100,
      b2: result.allocation.b2 / 100,
      b3: result.allocation.b3 / 100,
      b4: result.allocation.b4 / 100,
    }
    const newBuckets = allocateBuckets(corpus, allocFractions)
    const updated: UserProfile = {
      ...userProfile,
      riskAppetite: result.riskScore,
      bucketAllocation: allocFractions,
    }
    storage.setProfile(updated)
    onProfileUpdate(updated)
    storage.setBuckets(newBuckets)
    onBucketsUpdate(newBuckets)
    setShowProfiler(false)
  }

  const riskLabel =
    userProfile.riskAppetite <= 2 ? 'Conservative' :
    userProfile.riskAppetite === 3 ? 'Moderate' : 'Aggressive'

  return (
    <div className="space-y-4">
      {/* Header strip — current match + retake quiz CTA */}
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
              Take a quiz, run the detailed assessment, or pick any of the 5 profiles below.
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

      {/* Risk Profile — manual slider + detailed assessment (moved here from Plan tab) */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Risk Assessment</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Quick slider for a rough setting, or take the 15-question detailed assessment that auto-tunes your bucket allocation.
            </p>
          </div>
          {profilerResult && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Assessed
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Quick slider */}
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-semibold text-gray-700">Quick slider</span>
              <span className="text-sm font-bold text-blue-700 tabular-nums">
                {riskLabel} · {userProfile.riskAppetite}/5
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={userProfile.riskAppetite}
              onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
              aria-label="Risk appetite"
              className="w-full accent-blue-600 mt-1"
            />
            <div className="flex justify-between text-[9px] text-gray-400 mt-1">
              <span>Conservative</span>
              <span>Moderate</span>
              <span>Aggressive</span>
            </div>
          </div>

          {/* Detailed assessment CTA */}
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex flex-col">
            <div>
              <span className="text-xs font-semibold text-gray-700">Detailed assessment</span>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                15 questions across demographics, finances, market psychology, and goals. Auto-adjusts your bucket
                allocation to match.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowProfiler((v) => !v)}
              className="mt-2 px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              {showProfiler ? 'Close assessment' : 'Take detailed assessment →'}
            </button>
          </div>
        </div>

        {showProfiler && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <RiskProfiler
              onComplete={handleProfilerComplete}
              onSkip={() => setShowProfiler(false)}
            />
          </div>
        )}
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
