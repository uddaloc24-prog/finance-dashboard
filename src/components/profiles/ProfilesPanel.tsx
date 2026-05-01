import { useState, type ReactNode } from 'react'
import type { UserProfile, BucketState } from '../../types'
import type { QuizState, RiskProfileId } from '../../types/profiles'
import { profileById, profileFromScore } from '../../lib/data/riskProfiles'
import { storage } from '../../lib/storage'
import { allocateBuckets, totalCorpus } from '../../lib/calculations'
import { RiskQuiz } from './RiskQuiz'
import { ProfileGrid } from './ProfileGrid'
import { RiskProfiler, type RiskResult } from '../RiskProfiler'

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
      {/* ── Hero strip ────────────────────────────────────── */}
      <ProfileHero />

      {/* ── 01 + 02 — side-by-side tone cards ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 items-stretch">
        {/* 01 — Risk Profile (current match) */}
        <ToneCard num="01" tone="navy" title="Risk Profile" subtitle="Your current setting and match">
          <div className="space-y-3">
            {matchedProfile ? (
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50/60 p-3">
                <div className="text-[10px] font-bold tracking-[2px] uppercase text-blue-700">Current match</div>
                <div className="text-lg font-extrabold tracking-tight text-slate-900 mt-0.5">
                  {matchedProfile.name}
                </div>
                <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                  {quizState?.completed ? (
                    <>Quiz score <span className="tabular-nums font-semibold">{quizState.totalScore}/50</span></>
                  ) : (
                    <>Selected manually — take the quiz to validate your match.</>
                  )}
                  {profilerResult && (
                    <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      · ✓ Detailed assessment complete
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/40 p-3 text-center">
                <div className="text-[10px] font-bold tracking-[2px] uppercase text-blue-700">No match yet</div>
                <div className="text-sm font-bold text-slate-800 mt-1">Pick a profile to load its plan</div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Use the assessment on the right or pick from the five profiles below.
                </div>
              </div>
            )}

            {/* Quick slider (kept here as the primary "current setting") */}
            <div className="rounded-lg border-2 border-blue-200 bg-white p-3">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] font-bold tracking-[2px] uppercase text-blue-700">Risk appetite</span>
                <span className="text-sm font-extrabold text-blue-700 tabular-nums">
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
              <div className="flex justify-between text-[9px] text-slate-500 mt-0.5 font-medium">
                <span>Conservative</span>
                <span>Moderate</span>
                <span>Aggressive</span>
              </div>
            </div>
          </div>
        </ToneCard>

        {/* 02 — Risk Assessment (tools to refine the match) */}
        <ToneCard num="02" tone="amber" title="Risk Assessment" subtitle="Calibrate by quiz or detailed assessment">
          <div className="space-y-3">
            {/* 90-second quiz */}
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50/60 p-3 flex flex-col">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] font-bold tracking-[2px] uppercase text-amber-700">Quick · 90 seconds</span>
                {quizState?.completed && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-white border border-emerald-200 px-1.5 py-0.5 rounded">Done</span>
                )}
              </div>
              <div className="text-sm font-extrabold tracking-tight text-slate-900">
                10-question risk quiz
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                Time horizon, capacity, goals — scores you 10–50 and maps to one of five profiles.
              </p>
              <button
                type="button"
                onClick={() => setShowQuiz((v) => !v)}
                className="mt-2 px-3 py-2 rounded-md text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors w-full"
              >
                {showQuiz ? 'Close quiz' : quizState?.completed ? 'Retake quiz →' : 'Take risk quiz →'}
              </button>
            </div>

            {/* Detailed 15-question assessment */}
            <div className="rounded-lg border-2 border-amber-200 bg-white p-3 flex flex-col">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] font-bold tracking-[2px] uppercase text-amber-700">Deep · 15 questions</span>
                {profilerResult && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Done</span>
                )}
              </div>
              <div className="text-sm font-extrabold tracking-tight text-slate-900">
                Detailed assessment
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                Demographics, finances, market psychology, goals — auto-tunes your bucket allocation.
              </p>
              <button
                type="button"
                onClick={() => setShowProfiler((v) => !v)}
                className="mt-2 px-3 py-2 rounded-md text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 transition-colors w-full"
              >
                {showProfiler ? 'Close assessment' : 'Take detailed assessment →'}
              </button>
            </div>
          </div>
        </ToneCard>
      </div>

      {/* ── Inline expanded panels ────────────────────────── */}
      {showProfiler && (
        <div className="bg-white rounded-lg border-[3px] border-amber-400 ring-1 ring-inset ring-amber-100 overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-600" aria-hidden="true" />
          <div className="px-4 sm:px-5 pt-5 pb-2 border-b-2 border-amber-100">
            <div className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700 mb-1">Detailed Assessment · 15 questions</div>
            <div className="text-base font-bold tracking-tight text-slate-900">Calibrate your risk profile</div>
          </div>
          <div className="p-4 sm:p-5">
            <RiskProfiler
              onComplete={handleProfilerComplete}
              onSkip={() => setShowProfiler(false)}
            />
          </div>
        </div>
      )}

      {showQuiz && (
        <RiskQuiz
          initialState={quizState}
          onComplete={handleQuizComplete}
          onSkipToProfile={(id) => { handleChoose(id); setShowQuiz(false) }}
        />
      )}

      {/* Hint banner — when quiz done but profile not selected */}
      {!showQuiz && quizProfile && !chosenId && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg px-4 py-3 text-xs text-blue-900 flex items-center gap-2">
          <span className="text-blue-700" aria-hidden="true">→</span>
          <span>
            Your quiz suggests <strong className="text-blue-800">{quizProfile.name}</strong>. Click "Use this plan"
            on the matching column below to confirm.
          </span>
        </div>
      )}

      {/* ── 03 — All five profiles, side by side ──────────── */}
      <ToneCard num="03" tone="green" title="All Five Risk Profiles" subtitle="Side-by-side comparison" framed>
        <p className="text-[11px] text-slate-600 mb-3 leading-snug max-w-3xl">
          The same ₹1 Cr reference plan rendered for every profile, then scaled to your actual corpus. Use this to validate
          the assessment, see what changes between profiles, or pick a different match if the recommendation feels off.
        </p>
        <ProfileGrid userCorpus={userProfile.corpus} matchedId={chosenId} onSelect={handleChoose} />
      </ToneCard>

      {/* Legend / explanatory footer */}
      <div className="bg-white border-2 border-slate-200 rounded-lg px-4 py-3.5">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[10px] font-bold tracking-[3px] uppercase text-slate-700 tabular-nums">Note</span>
          <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
        </div>
        <h4 className="text-xs font-bold text-slate-900 mb-2">How to read the comparison grid</h4>
        <ul className="text-[11px] text-slate-600 space-y-1 leading-snug">
          <li><strong className="text-slate-800">Allocation bar</strong> — share of corpus per bucket (B1 liquidity / B2 fixed floor / B3 stability / B4 growth). Equity % is the equity-weighted share of B3 + B4.</li>
          <li><strong className="text-slate-800">Year-1 mo</strong> — combined monthly income produced by the recommended instrument mix at retirement start.</li>
          <li><strong className="text-slate-800">Year-10 mo</strong> — same income measure 10 years in, after equity refill compounding kicks in.</li>
          <li><strong className="text-slate-800">Year-20 corpus</strong> — projected ending balance. Green when corpus exceeds your starting amount.</li>
          <li>Figures are scaled from the academic PDF's ₹1 Cr reference plan to your actual corpus.</li>
        </ul>
      </div>
    </div>
  )
}

// ── Layout primitives ───────────────────────────────────────────────

function ProfileHero() {
  return (
    <div className="bg-white rounded-lg border-2 border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700 tabular-nums">
          Step 2 · Profile
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-amber-500/60 to-transparent" aria-hidden="true" />
      </div>
      <h2 className="font-serif text-xl sm:text-2xl font-extralight tracking-tight text-slate-900 leading-tight">
        Find <em className="not-italic font-extrabold text-blue-700">your match</em>.
      </h2>
      <p className="text-[11px] sm:text-xs text-slate-600 mt-1.5 leading-snug max-w-2xl">
        Pick a profile manually, take a 90-second quiz, or run the 15-question detailed assessment — every choice flows
        through to bucket allocation, fund picks, and the strategy comparison.
      </p>
    </div>
  )
}

type Tone = 'navy' | 'amber' | 'green'

const TONES: Record<Tone, {
  border: string; ring: string; bar: string; text: string; numBg: string; numBorder: string
}> = {
  navy:  { border: 'border-blue-400',    ring: 'ring-blue-100',    bar: 'bg-blue-700',    text: 'text-blue-700',    numBg: 'bg-blue-50',    numBorder: 'border-blue-300' },
  amber: { border: 'border-amber-400',   ring: 'ring-amber-100',   bar: 'bg-amber-600',   text: 'text-amber-700',   numBg: 'bg-amber-50',   numBorder: 'border-amber-300' },
  green: { border: 'border-emerald-400', ring: 'ring-emerald-100', bar: 'bg-emerald-600', text: 'text-emerald-700', numBg: 'bg-emerald-50', numBorder: 'border-emerald-300' },
}

interface ToneCardProps {
  num: string
  title: string
  subtitle?: string
  tone: Tone
  framed?: boolean   // when true, renders the body without the bordered inner pad (used by ProfileGrid which has its own chrome)
  children: ReactNode
}

function ToneCard({ num, title, subtitle, tone, framed = false, children }: ToneCardProps) {
  const t = TONES[tone]
  return (
    <section
      className={`relative bg-white rounded-lg border-[3px] ${t.border} ring-1 ring-inset ${t.ring} overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 ${t.bar}`} aria-hidden="true" />
      <header className="px-4 sm:px-5 pt-5 pb-3 border-b-2 border-slate-100">
        <div className="flex items-center gap-3">
          <span
            className={`shrink-0 w-10 h-10 rounded-md ${t.numBg} ${t.text} font-serif text-lg font-extralight tabular-nums flex items-center justify-center border-2 ${t.numBorder}`}
            aria-hidden="true"
          >
            {num}
          </span>
          <div className="min-w-0 flex-1">
            <div className={`text-[10px] font-bold tracking-[2px] uppercase ${t.text} mb-0.5`}>
              Section {parseInt(num, 10)}
            </div>
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-snug">{subtitle}</p>
            )}
          </div>
        </div>
      </header>
      <div className={framed ? 'p-3 sm:p-4 flex-1' : 'px-4 sm:px-5 py-4 flex-1'}>
        {children}
      </div>
    </section>
  )
}
