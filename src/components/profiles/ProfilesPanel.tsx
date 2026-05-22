import { useState, type ReactNode } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from '../../types'
import type { QuizState, RiskProfileId } from '../../types/profiles'
import type { V10QuizState, CompositesResult, GoalDiscoveryState } from '../../types/psychometric'
import { profileById, profileFromScore } from '../../lib/data/riskProfiles'
import { storage } from '../../lib/storage'
import { allocateBuckets, totalCorpus } from '../../lib/calculations'
import { DEFAULT_DEMOGRAPHICS, DEFAULT_RETURN_ASSUMPTIONS } from '../../constants'
import { RiskQuiz } from './RiskQuiz'
import { V10Quiz } from './V10Quiz'
import { GoalDiscoveryForm } from './GoalDiscoveryForm'
import { ProfileGrid } from './ProfileGrid'
import { RiskProfiler, type RiskResult } from '../RiskProfiler'
import { GoalDiscoveryDashboard } from './GoalDiscoveryDashboard'
import { RiskAssessmentDashboard } from './RiskAssessmentDashboard'
import { ExecutiveDashboard } from './ExecutiveDashboard'
import { Modal } from '../ui/Modal'

interface Props {
  userProfile: UserProfile
  buckets: BucketState
  returnAssumptions?: ReturnAssumptions
  onProfileUpdate: (p: UserProfile) => void
  onBucketsUpdate: (b: BucketState) => void
}

export function ProfilesPanel({ userProfile, buckets, returnAssumptions = DEFAULT_RETURN_ASSUMPTIONS, onProfileUpdate, onBucketsUpdate }: Props) {
  const [quizState, setQuizState] = useState<QuizState | null>(() => storage.getQuizState())
  const [v10State, setV10State] = useState<V10QuizState | null>(() => storage.getV10QuizState())
  const [gdState, setGdState] = useState<GoalDiscoveryState | null>(() => storage.getGoalDiscovery())
  const [chosenId, setChosenId] = useState<RiskProfileId | null>(
    () => storage.getRiskProfile() ?? quizState?.profileId ?? v10State?.composites?.profileId ?? null,
  )
  // Single-open assessment / dashboard row. Quiz modals AND dashboard
  // popups all share this state so only one floats at a time.
  type AssessmentKind = 'quiz' | 'profiler' | 'gd' | 'v10' | 'gd-dash' | 'risk-dash' | 'exec-dash'
  const [openAssessment, setOpenAssessment] = useState<AssessmentKind | null>(null)
  const showQuiz = openAssessment === 'quiz'
  const showProfiler = openAssessment === 'profiler'
  const showGd = openAssessment === 'gd'
  const showV10 = openAssessment === 'v10'
  const showGdDash = openAssessment === 'gd-dash'
  const showRiskDash = openAssessment === 'risk-dash'
  const showExecDash = openAssessment === 'exec-dash'
  function toggleOpen(kind: AssessmentKind) {
    setOpenAssessment((cur) => (cur === kind ? null : kind))
  }
  function closeAll() { setOpenAssessment(null) }
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
    closeAll()
  }

  const handleGdComplete = (next: GoalDiscoveryState) => {
    setGdState(next)
    closeAll()
  }

  const handleV10Complete = (_composites: CompositesResult, profileId: RiskProfileId) => {
    // Phase 2 wiring: set the matched profile and align bucket allocation to
    // it. Composites are persisted inside V10QuizState; phase 7 will plumb
    // them deeper into the engine.
    setV10State(storage.getV10QuizState())
    storage.setRiskProfile(profileId)
    setChosenId(profileId)
    const matched = profileById(profileId)
    const allocFractions = { ...matched.bucketShare }
    const newBuckets = allocateBuckets(corpus, allocFractions)
    const updated: UserProfile = { ...userProfile, bucketAllocation: allocFractions }
    storage.setProfile(updated)
    onProfileUpdate(updated)
    storage.setBuckets(newBuckets)
    onBucketsUpdate(newBuckets)
    closeAll()
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
    closeAll()
  }

  const riskLabel =
    userProfile.riskAppetite <= 2 ? 'Conservative' :
    userProfile.riskAppetite === 3 ? 'Moderate' : 'Aggressive'

  // ── Smart-launcher status computations ──────────────────────────────
  const gdDashEnabled   = !!(gdState?.inference || v10State?.composites)
  const riskDashEnabled = !!(chosenId || quizState?.completed || profilerResult || v10State?.composites)

  // Goal Discovery status — what would the GD dashboard know?
  const gdStatus: LauncherStatus[] = []
  if (gdState?.inference?.persona.primary) {
    gdStatus.push({ label: `Persona: ${gdState.inference.persona.primary.id}`, tone: 'good' })
    const active = Object.values(gdState.inference.signals).filter((s) => s.score != null && s.score >= 0.7).length
    gdStatus.push({ label: `Signals ${active}/12 active`, tone: active > 0 ? 'good' : 'muted' })
  } else if (gdState) {
    const visited = gdState.visited?.length ?? 1
    gdStatus.push({ label: `${visited}/6 blocks visited`, tone: 'warn' })
    gdStatus.push({ label: 'Process & apply →', tone: 'muted' })
  } else {
    gdStatus.push({ label: 'Not started', tone: 'muted' })
  }
  if (v10State?.completed) {
    gdStatus.push({ label: 'v10 composites ready', tone: 'good' })
  } else if (v10State) {
    gdStatus.push({ label: `v10 ${v10State.currentIndex}/${v10State.questionSeq.length}`, tone: 'warn' })
  }

  // Risk Profile status — what would the Risk dashboard surface?
  const riskStatus: LauncherStatus[] = []
  if (chosenId) {
    const profileName = profileById(chosenId).name
    riskStatus.push({ label: profileName, tone: 'good' })
  } else {
    riskStatus.push({ label: 'No profile set', tone: 'muted' })
  }
  riskStatus.push({ label: `Appetite ${userProfile.riskAppetite}/5`, tone: 'good' })
  if (quizState?.completed) {
    riskStatus.push({ label: `Quick ${quizState.totalScore}/50`, tone: 'good' })
  }
  if (profilerResult) {
    riskStatus.push({ label: `Deep ${Math.round(profilerResult.riskScore)}/100`, tone: 'good' })
  }
  if (v10State?.composites) {
    riskStatus.push({ label: `v10 ${Math.round(v10State.composites.riskProfile)}/100`, tone: 'good' })
  }

  // Executive status — aggregates EVERYTHING the cockpit shows
  // (count of known sub-scores out of 10).
  const execKnown = (() => {
    let n = 0
    // Net worth + debt freedom + money health + risk-appetite + risk-capacity always knowable
    if ((userProfile.assetInventory || userProfile.loanProfile)) n += 1                  // net worth
    if (userProfile.loanProfile) n += 1                                                    // debt freedom
    n += 1                                                                                 // appetite (slider always present)
    if (userProfile.assetInventory || userProfile.loanProfile || userProfile.expenses) n += 2  // capacity + money health
    if (v10State?.composites) n += 2                                                       // cog bias + scam resilience
    if (gdState?.inference) n += 1                                                         // goal clarity
    if (chosenId || quizState?.completed || v10State?.composites) n += 1                   // risk profile
    if (gdState?.answers['block-5']?.['applicable'] && gdState.answers['block-5']['applicable'] !== 'no') n += 1   // spousal
    return Math.min(10, n)
  })()
  const execStatus: LauncherStatus[] = [
    { label: `${execKnown}/10 systems known`, tone: execKnown >= 7 ? 'good' : execKnown >= 4 ? 'warn' : 'muted' },
    { label: gdState && v10State?.composites ? 'Full read available' : 'Partial read', tone: gdState && v10State?.composites ? 'good' : 'muted' },
  ]

  function LaunchersRail({ orientation = 'col' }: { orientation?: 'col' | 'row' }) {
    return (
      <aside className={orientation === 'col' ? 'flex flex-col gap-2 shrink-0 w-full md:w-[170px]' : 'flex flex-row gap-2'}>
        <LauncherBtn
          icon="🎯"
          label="Goal Discovery"
          sub="Dashboard"
          tone="indigo"
          status={gdStatus}
          onClick={() => toggleOpen('gd-dash')}
          disabled={!gdDashEnabled}
          disabledTitle="Complete Goal Discovery first (Process & apply)"
        />
        <LauncherBtn
          icon="⚖️"
          label="Risk Profile"
          sub="Dashboard"
          tone="navy"
          status={riskStatus}
          onClick={() => toggleOpen('risk-dash')}
          disabled={!riskDashEnabled}
          disabledTitle="Take any one assessment first"
        />
        <LauncherBtn
          icon="📊"
          label="Executive"
          sub="Cockpit"
          tone="slate"
          status={execStatus}
          onClick={() => toggleOpen('exec-dash')}
        />
      </aside>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Hero strip ────────────────────────────────────── */}
      <ProfileHero />

      {/* ── Launchers + Section 01 + Section 02 in a 3-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[170px_1fr_1fr] gap-3 items-start">
        <LaunchersRail />

      {/* ── 01 — Goal Discovery & Psychometric Assessment (indigo) */}
      <ToneCard num="01" tone="indigo" title="Goal Discovery & Psychometric Assessment" subtitle="Adaptive intelligence · the deeper tools that personalise your plan">
        <div className="grid grid-cols-1 gap-3">
          {/* Goal Discovery */}
          <AssessmentCard
            tone="indigo"
            eyebrow={
              gdState?.completed ? 'Preflight · 5 blocks · ✓ Done' :
              gdState ? 'Preflight · 5 blocks · In progress' : 'Preflight · 5 blocks'
            }
            stateLabel={gdState?.completed ? 'done' : gdState ? 'progress' : null}
            title="Goal Discovery"
            blurb="Life context, your goals, three Kinder reflections, trade-offs, partner alignment. Personalises the psychometric assessment. ~15 min."
            buttonLabel={
              showGd ? 'Close Goal Discovery'
                : gdState?.completed ? 'Review / continue →'
                  : gdState ? 'Resume Goal Discovery →'
                    : 'Start Goal Discovery →'
            }
            onClick={() => toggleOpen('gd')}
            active={showGd}
          />
          {/* Full · v10 psychometric (74-item battery) */}
          <AssessmentCard
            tone="indigo"
            eyebrow={
              v10State?.completed ? 'Full · 74 items · ✓ Done' :
              v10State ? `Full · 74 items · ${v10State.currentIndex}/74 in progress` : 'Full · 74 items'
            }
            stateLabel={v10State?.completed ? 'done' : v10State ? 'progress' : null}
            title="Psychometric Assessment"
            blurb="74 questions across 16 constructs — risk tolerance, loss aversion, money scripts, biases, financial literacy, scam vulnerability. Six composite scores. ~20 min."
            buttonLabel={
              showV10 ? 'Close assessment'
                : v10State?.completed ? 'Review / retake →'
                  : v10State ? 'Resume assessment →'
                    : 'Take psychometric assessment →'
            }
            onClick={() => toggleOpen('v10')}
            active={showV10}
            buttonClass="bg-gradient-to-r from-indigo-700 to-violet-700 hover:from-indigo-800 hover:to-violet-800"
          />
        </div>
      </ToneCard>

      {/* ── 02 — Risk Profile & Risk Assessment (navy, with two subheaders) */}
      <ToneCard num="02" tone="navy" title="Risk Profile & Risk Assessment" subtitle="Your current setting and quick / detailed calibration">
        <div className="space-y-4">
          {/* ── Subheader: Risk Profile ─── */}
          <section>
            <SubHeader tone="navy" eyebrow="Risk Profile" subtitle="Current match · slider · score history" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
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
                      <>Selected manually — take a quiz to validate.</>
                    )}
                    {profilerResult && (
                      <span className="block mt-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        ✓ Detailed assessment complete
                      </span>
                    )}
                    {v10State?.composites && (
                      <span className="block mt-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                        v10 score <span className="tabular-nums">{Math.round(v10State.composites.riskProfile)}/100</span>
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/40 p-3 text-center flex flex-col justify-center">
                  <div className="text-[10px] font-bold tracking-[2px] uppercase text-blue-700">No match yet</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Pick a profile to load its plan</div>
                  <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                    Use an assessment below or pick from the five profiles further down.
                  </div>
                </div>
              )}
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
          </section>

          {/* ── Subheader: Risk Assessment ─── */}
          <section>
            <SubHeader tone="amber" eyebrow="Risk Assessment" subtitle="Calibrate quickly · 90 seconds or a deeper 15-question pass" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <AssessmentCard
                tone="amber"
                eyebrow={quizState?.completed ? 'Quick · 90s · ✓ Done' : 'Quick · 90 seconds'}
                stateLabel={quizState?.completed ? 'done' : null}
                title="10-question risk quiz"
                blurb="Time horizon, capacity, goals — scores you 10–50 and maps to one of five profiles."
                buttonLabel={showQuiz ? 'Close quiz' : quizState?.completed ? 'Retake quiz →' : 'Take risk quiz →'}
                onClick={() => toggleOpen('quiz')}
                active={showQuiz}
              />
              <AssessmentCard
                tone="amber"
                eyebrow={profilerResult ? 'Deep · 15 questions · ✓ Done' : 'Deep · 15 questions'}
                stateLabel={profilerResult ? 'done' : null}
                title="Detailed assessment"
                blurb="Demographics, finances, market psychology, goals — auto-tunes your bucket allocation."
                buttonLabel={showProfiler ? 'Close assessment' : 'Take detailed assessment →'}
                onClick={() => toggleOpen('profiler')}
                active={showProfiler}
                buttonClass="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
              />
            </div>
          </section>
        </div>
      </ToneCard>
      </div>

      {/* ── Modals — assessments render in pop-up windows ── */}
      <Modal
        open={showQuiz}
        title="Quick · 10-question risk quiz"
        subtitle="Time horizon · capacity · goals — scores you 10–50"
        accent="amber"
        size="lg"
        onClose={closeAll}
      >
        <RiskQuiz
          initialState={quizState}
          onComplete={handleQuizComplete}
          onSkipToProfile={(id) => { handleChoose(id); closeAll() }}
        />
      </Modal>

      <Modal
        open={showProfiler}
        title="Deep · 15-question detailed assessment"
        subtitle="Demographics, finances, psychology — auto-tunes your bucket allocation"
        accent="amber"
        size="xl"
        onClose={closeAll}
      >
        <RiskProfiler
          onComplete={handleProfilerComplete}
          onSkip={closeAll}
        />
      </Modal>

      <Modal
        open={showGd}
        title="Goal Discovery"
        subtitle="5-block preflight — life context, goals, three Kinder reflections, trade-offs, partner alignment"
        accent="indigo"
        size="2xl"
        onClose={closeAll}
      >
        <GoalDiscoveryForm
          initialState={gdState}
          groqApiKey={userProfile.groqApiKey}
          onComplete={handleGdComplete}
          onExit={closeAll}
        />
      </Modal>

      <Modal
        open={showV10}
        title="Psychometric Assessment"
        subtitle="74 items · 16 constructs · adaptive ordering driven by Goal Discovery"
        accent="indigo"
        size="2xl"
        onClose={closeAll}
      >
        <V10Quiz
          initialState={v10State}
          inference={gdState?.inference ?? null}
          userProfile={userProfile}
          currentAge={userProfile.demographics?.currentAge ?? DEFAULT_DEMOGRAPHICS.currentAge}
          retirementAge={userProfile.demographics?.retirementAge ?? DEFAULT_DEMOGRAPHICS.retirementAge}
          onComplete={handleV10Complete}
          onExit={closeAll}
        />
      </Modal>

      <Modal
        open={showGdDash}
        title="Goal Discovery Dashboard"
        subtitle="Persona · signals · divergence · scripts · downloads"
        accent="indigo"
        size="2xl"
        onClose={closeAll}
      >
        <GoalDiscoveryDashboard
          gdState={gdState}
          v10State={v10State}
          userProfile={userProfile}
          buckets={buckets}
          returnAssumptions={returnAssumptions}
        />
      </Modal>

      <Modal
        open={showRiskDash}
        title="Risk Profile & Risk Assessment Dashboard"
        subtitle="Appetite · capacity · allocation · assessment history · downloads"
        accent="navy"
        size="2xl"
        onClose={closeAll}
      >
        <RiskAssessmentDashboard
          userProfile={userProfile}
          buckets={buckets}
          returnAssumptions={returnAssumptions}
          quizState={quizState}
          v10State={v10State}
          gdState={gdState}
          deepRiskPercent={profilerResult ? profilerResult.riskScore : null}
        />
      </Modal>

      <Modal
        open={showExecDash}
        title="Executive Dashboard"
        subtitle="Your financial cockpit — net worth, runway, risk, goals, action items"
        accent="slate"
        size="3xl"
        onClose={closeAll}
      >
        <ExecutiveDashboard
          userProfile={userProfile}
          buckets={buckets}
          returnAssumptions={returnAssumptions}
          gdState={gdState}
          v10State={v10State}
          quizState={quizState}
          deepRiskPercent={profilerResult ? profilerResult.riskScore : null}
        />
      </Modal>

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
      <p className="text-[11px] sm:text-xs text-slate-600 mt-1.5 leading-snug max-w-3xl">
        Four ways to land your risk profile, ordered roughly by depth:
        a <strong className="text-indigo-700">Goal Discovery</strong> intake and a 74-item{' '}
        <strong className="text-indigo-700">psychometric assessment</strong> (deeper, adaptive);
        a <strong className="text-amber-700">90-second quiz</strong> or 15-question{' '}
        <strong className="text-amber-700">detailed assessment</strong> (faster);
        or manually picking from the five canonical profiles below. Every choice flows through to bucket
        allocation, fund picks, and the strategy comparison.
      </p>
    </div>
  )
}

type Tone = 'navy' | 'amber' | 'green' | 'indigo'

const TONES: Record<Tone, {
  border: string; ring: string; bar: string; text: string; numBg: string; numBorder: string
}> = {
  navy:   { border: 'border-blue-400',    ring: 'ring-blue-100',    bar: 'bg-blue-700',    text: 'text-blue-700',    numBg: 'bg-blue-50',    numBorder: 'border-blue-300' },
  amber:  { border: 'border-amber-400',   ring: 'ring-amber-100',   bar: 'bg-amber-600',   text: 'text-amber-700',   numBg: 'bg-amber-50',   numBorder: 'border-amber-300' },
  green:  { border: 'border-emerald-400', ring: 'ring-emerald-100', bar: 'bg-emerald-600', text: 'text-emerald-700', numBg: 'bg-emerald-50', numBorder: 'border-emerald-300' },
  indigo: { border: 'border-indigo-400',  ring: 'ring-indigo-100',  bar: 'bg-indigo-700',  text: 'text-indigo-700',  numBg: 'bg-indigo-50',  numBorder: 'border-indigo-300' },
}

// ── SubHeader — used to mark subsections inside a ToneCard ─────────────

interface SubHeaderProps {
  eyebrow: string
  subtitle?: string
  tone: Tone
}

function SubHeader({ eyebrow, subtitle, tone }: SubHeaderProps) {
  const t = TONES[tone]
  return (
    <div className="flex items-baseline gap-3">
      <span className={`text-[10px] font-bold tracking-[3px] uppercase ${t.text} shrink-0`}>{eyebrow}</span>
      {subtitle && (
        <span className="text-[10px] text-slate-500 italic truncate hidden sm:inline">
          {subtitle}
        </span>
      )}
      <span className={`h-px flex-1 ${t.bar} opacity-30`} aria-hidden="true" />
    </div>
  )
}

// ── AssessmentCard — uniform card shell for each assessment tool ───────

interface AssessmentCardProps {
  tone: Tone
  eyebrow: string
  stateLabel: 'done' | 'progress' | null
  title: string
  blurb: string
  buttonLabel: string
  onClick: () => void
  active: boolean
  buttonClass?: string
}

function AssessmentCard({
  tone, eyebrow, stateLabel, title, blurb, buttonLabel, onClick, active, buttonClass,
}: AssessmentCardProps) {
  const t = TONES[tone]
  const accentBg = tone === 'amber' ? 'bg-amber-600' : tone === 'indigo' ? 'bg-indigo-700' : tone === 'navy' ? 'bg-blue-700' : 'bg-emerald-600'
  const accentHover = tone === 'amber' ? 'hover:bg-amber-700' : tone === 'indigo' ? 'hover:bg-indigo-800' : tone === 'navy' ? 'hover:bg-blue-800' : 'hover:bg-emerald-700'
  const defaultBtn = `${accentBg} ${accentHover}`
  return (
    <div className={`relative rounded-lg border-2 ${active ? t.border + ' bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'} p-3 flex flex-col transition-all`}>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className={`text-[10px] font-bold tracking-[2px] uppercase ${t.text}`}>{eyebrow}</span>
        {stateLabel === 'done' && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Done</span>
        )}
        {stateLabel === 'progress' && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">In progress</span>
        )}
      </div>
      <div className="text-sm font-extrabold tracking-tight text-slate-900">{title}</div>
      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug flex-1">{blurb}</p>
      <button
        type="button"
        onClick={onClick}
        className={`mt-2.5 px-3 py-2 rounded-md text-xs font-bold text-white transition-colors w-full ${buttonClass ?? defaultBtn}`}
      >
        {buttonLabel}
      </button>
    </div>
  )
}

interface ToneCardProps {
  num: string
  title: string
  subtitle?: string
  tone: Tone
  framed?: boolean   // when true, renders the body without the bordered inner pad (used by ProfileGrid which has its own chrome)
  children: ReactNode
}

// ── LauncherBtn — compact dashboard-launcher button for the left rail ──

type LauncherTone = Tone | 'slate'

interface LauncherStatus {
  label: string
  tone: 'good' | 'warn' | 'muted'
}

interface LauncherBtnProps {
  icon: string
  label: string
  sub: string
  tone: LauncherTone
  status: LauncherStatus[]
  onClick: () => void
  disabled?: boolean
  disabledTitle?: string
}

const LAUNCHER_TONE: Record<Tone, { bg: string; bgHover: string; ring: string }> = {
  navy:   { bg: 'bg-blue-700',    bgHover: 'hover:bg-blue-800',    ring: 'focus:ring-blue-300' },
  amber:  { bg: 'bg-amber-600',   bgHover: 'hover:bg-amber-700',   ring: 'focus:ring-amber-300' },
  green:  { bg: 'bg-emerald-600', bgHover: 'hover:bg-emerald-700', ring: 'focus:ring-emerald-300' },
  indigo: { bg: 'bg-indigo-700',  bgHover: 'hover:bg-indigo-800',  ring: 'focus:ring-indigo-300' },
  // Slate is the executive (neutral) tone for this rail; not in TONES, so handle inline.
}

function LauncherBtn({ icon, label, sub, tone, status, onClick, disabled, disabledTitle }: LauncherBtnProps) {
  const t = (LAUNCHER_TONE as Record<string, { bg: string; bgHover: string; ring: string }>)[tone]
    ?? { bg: 'bg-slate-900', bgHover: 'hover:bg-slate-800', ring: 'focus:ring-slate-400' }
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? disabledTitle : `Open ${label} dashboard`}
      className={`w-full text-left rounded-md transition-colors flex flex-col shadow-sm overflow-hidden ${
        disabled
          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
          : `${t.bg} ${t.bgHover} text-white focus:outline-none focus:ring-2 ${t.ring}`
      }`}
    >
      {/* Top: icon + open arrow */}
      <span className="flex items-center justify-between gap-1.5 px-2.5 pt-2 pb-1">
        <span className="text-lg leading-none" aria-hidden="true">{icon}</span>
        <span className="text-[10px] leading-none opacity-70" aria-hidden="true">↗</span>
      </span>
      {/* Title */}
      <span className="px-2.5 text-[11px] font-bold leading-tight tracking-tight">{label}</span>
      <span className="px-2.5 text-[9px] uppercase tracking-wider opacity-80 mb-1">{sub}</span>
      {/* Status bullets */}
      <div className="bg-black/15 px-2.5 py-1.5 space-y-0.5">
        {status.map((s, i) => {
          const dot = s.tone === 'good' ? 'bg-emerald-300' : s.tone === 'warn' ? 'bg-amber-300' : 'bg-white/40'
          const text = s.tone === 'muted' ? 'opacity-70' : ''
          return (
            <div key={i} className={`text-[9.5px] flex items-baseline gap-1 leading-snug ${text}`}>
              <span className={`inline-block w-1 h-1 rounded-full ${dot} shrink-0 translate-y-[-1px]`} aria-hidden="true" />
              <span className="truncate">{s.label}</span>
            </div>
          )
        })}
      </div>
    </button>
  )
}

function ToneCard({ num, title, subtitle, tone, framed = false, children }: ToneCardProps) {
  const t = TONES[tone]
  return (
    <section
      className={`relative bg-white rounded-lg border-[3px] ${t.border} ring-1 ring-inset ${t.ring} overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 ${t.bar}`} aria-hidden="true" />
      <header className="px-4 sm:px-5 pt-4 pb-3 border-b-2 border-slate-100">
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
            <h3 className="font-serif text-base sm:text-lg font-extralight tracking-tight text-slate-900 leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
            )}
          </div>
        </div>
      </header>
      <div className={framed ? 'p-3 sm:p-4 flex-1' : 'px-4 sm:px-5 py-3.5 flex-1'}>
        {children}
      </div>
    </section>
  )
}
