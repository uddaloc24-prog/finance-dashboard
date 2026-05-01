import { lazy, Suspense, type ReactNode } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from '../types'
import { totalCorpus, b1RunwayMonths } from '../lib/calculations'
import { useMarketData } from '../hooks/useMarketData'
import { ProfileSettings } from './ProfileSettings'
import { DemographicsForm } from './DemographicsForm'
import { ExpenseEditor } from './ExpenseEditor'
import { RefillAlert } from './RefillAlert'
import { Sliders } from './Sliders'
import { BucketCard } from './BucketCard'

// Heavy panels stay lazy
const ProfilesPanel = lazy(() => import('./profiles/ProfilesPanel').then((m) => ({ default: m.ProfilesPanel })))
const StrategiesPanel = lazy(() => import('./strategies/StrategiesPanel').then((m) => ({ default: m.StrategiesPanel })))
const BucketFundsExplorer = lazy(() => import('./buckets/BucketFundsExplorer').then((m) => ({ default: m.BucketFundsExplorer })))
const CorpusPreservation = lazy(() => import('./CorpusPreservation').then((m) => ({ default: m.CorpusPreservation })))
const MonteCarloPanel = lazy(() => import('./montecarlo/MonteCarloPanel').then((m) => ({ default: m.MonteCarloPanel })))
const YearSimulator = lazy(() => import('./YearSimulator').then((m) => ({ default: m.YearSimulator })))
const SWPSimulator = lazy(() => import('./SWPSimulator').then((m) => ({ default: m.SWPSimulator })))

interface Props {
  profile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
  onBucketsUpdate: (b: BucketState) => void
  onProfileUpdate: (p: UserProfile) => void
  onReturnsUpdate: (r: ReturnAssumptions) => void
}

export function OverviewPage({
  profile,
  buckets,
  returnAssumptions,
  onBucketsUpdate,
  onProfileUpdate,
  onReturnsUpdate,
}: Props) {
  useMarketData(profile.refreshInterval)
  const total = totalCorpus(buckets)
  const runway = b1RunwayMonths(buckets.b1, profile.monthlyWithdrawal)

  return (
    <div className="overview-page">
      <PageHero />

      <SectionNav />

      <div className="space-y-16 sm:space-y-20 mt-10">
        {/* 01 — Inputs */}
        <Section
          id="sec-inputs"
          num="01"
          eyebrow="Inputs"
          title={<>Set up <em>your plan</em>.</>}
          tagline="Corpus, monthly draw target, demographics, and expense profile. Every other section flows from these numbers."
        >
          <div className="space-y-3">
            <ProfileSettings
              profile={profile}
              buckets={buckets}
              onProfileUpdate={onProfileUpdate}
              onBucketsUpdate={onBucketsUpdate}
            />
            <DemographicsForm profile={profile} onProfileUpdate={onProfileUpdate} />
            <ExpenseEditor profile={profile} onProfileUpdate={onProfileUpdate} />
          </div>
        </Section>

        <Divider />

        {/* 02 — Risk profile */}
        <Section
          id="sec-profile"
          num="02"
          eyebrow="Risk profile"
          title={<>Find <em>your match</em>.</>}
          tagline="A 90-second quiz scores you 10–50 and maps you to one of five risk profiles. Drives every recommendation downstream."
        >
          <Suspense fallback={<SectionLoading />}>
            <ProfilesPanel
              userProfile={profile}
              buckets={buckets}
              onProfileUpdate={onProfileUpdate}
              onBucketsUpdate={onBucketsUpdate}
            />
          </Suspense>
        </Section>

        <Divider />

        {/* 03 — Strategies */}
        <Section
          id="sec-compare"
          num="03"
          eyebrow="Compare"
          title={<>Ten strategies, <em>scored.</em></>}
          tagline="From the 4% Rule to the India 4-Bucket SWP — every framework run on your inputs, with Indian tax applied to compute post-tax monthly income."
        >
          <Suspense fallback={<SectionLoading />}>
            <StrategiesPanel
              profile={profile}
              buckets={buckets}
              returnAssumptions={returnAssumptions}
            />
          </Suspense>
        </Section>

        <Divider />

        {/* 04 — Buckets */}
        <Section
          id="sec-buckets"
          num="04"
          eyebrow="Buckets"
          title={<>Allocate <em>the corpus</em>.</>}
          tagline="Four buckets with their own time horizons. The asset class explorer below picks the optimal mix per bucket for your risk profile."
        >
          <div className="space-y-3">
            <RefillAlert
              buckets={buckets}
              monthlyWithdrawal={profile.monthlyWithdrawal}
              returnAssumptions={returnAssumptions}
              onBucketsUpdate={onBucketsUpdate}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <BucketCard id="b1" value={buckets.b1} total={total} returnAssumption={returnAssumptions.b1} runway={runway} />
              <BucketCard id="b2" value={buckets.b2} total={total} returnAssumption={returnAssumptions.b2} />
              <BucketCard id="b3" value={buckets.b3} total={total} returnAssumption={returnAssumptions.b3} />
              <BucketCard id="b4" value={buckets.b4} total={total} returnAssumption={returnAssumptions.b4} />
            </div>
            <Sliders
              profile={profile}
              buckets={buckets}
              returnAssumptions={returnAssumptions}
              onProfileChange={onProfileUpdate}
              onReturnsChange={onReturnsUpdate}
              onBucketsUpdate={onBucketsUpdate}
            />
            <Suspense fallback={<SectionLoading />}>
              <BucketFundsExplorer bucketValues={buckets} />
            </Suspense>
          </div>
        </Section>

        <Divider />

        {/* 05 — Stress test */}
        <Section
          id="sec-simulate"
          num="05"
          eyebrow="Stress test"
          title={<>Verify it <em>survives</em>.</>}
          tagline="Monte Carlo across 200 paths, the corpus-preservation calculator, year-by-year cascade, and a 25-year line chart. Confidence — not just numbers."
        >
          <div className="space-y-3">
            <Suspense fallback={<SectionLoading />}>
              <CorpusPreservation profile={profile} buckets={buckets} returnAssumptions={returnAssumptions} />
              <MonteCarloPanel profile={profile} buckets={buckets} returnAssumptions={returnAssumptions} />
              <YearSimulator
                buckets={buckets}
                monthlyWithdrawal={profile.monthlyWithdrawal}
                inflationRate={profile.inflationRate}
                returnAssumptions={returnAssumptions}
              />
              <SWPSimulator
                buckets={buckets}
                monthlyWithdrawal={profile.monthlyWithdrawal}
                inflationRate={profile.inflationRate}
                returnAssumptions={returnAssumptions}
              />
            </Suspense>
          </div>
        </Section>

        <Divider final />

        <PageFooter />
      </div>
    </div>
  )
}

// ── Section primitives ──────────────────────────────────────────────────

function Section({
  id,
  num,
  eyebrow,
  title,
  tagline,
  children,
}: {
  id: string
  num: string
  eyebrow: string
  title: ReactNode
  tagline: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-32">
      <header className="mb-6 sm:mb-8">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-[11px] font-bold tracking-[3px] uppercase text-amber-700 tabular-nums">
            {num}
          </span>
          <span className="h-[1px] flex-1 bg-gradient-to-r from-amber-500/60 to-transparent" aria-hidden="true" />
          <span className="text-[11px] font-bold tracking-[3px] uppercase text-amber-700">
            {eyebrow}
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extralight tracking-tight text-slate-900 leading-[1.1]">
          {title}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
          {tagline}
        </p>
      </header>
      {children}
    </section>
  )
}

function Divider({ final }: { final?: boolean } = {}) {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-[1px] flex-1 bg-slate-200" />
      <span className={`w-1.5 h-1.5 rounded-full ${final ? 'bg-amber-500' : 'bg-slate-300'}`} />
      <span className="h-[1px] flex-1 bg-slate-200" />
    </div>
  )
}

function SectionLoading() {
  return (
    <div className="flex items-center justify-center py-12 bg-white border border-slate-200 rounded-lg">
      <div className="w-5 h-5 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin" />
    </div>
  )
}

function PageHero() {
  return (
    <header className="text-center pt-4 pb-10 sm:pt-8 sm:pb-12">
      <div className="text-[11px] font-bold tracking-[4px] uppercase text-amber-700 mb-3">
        Indian Retirement Plan · Overview
      </div>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extralight tracking-tight text-slate-900 leading-[1.05]">
        Five steps. <em className="font-extrabold not-italic text-slate-900">One page.</em>
      </h1>
      <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
        From corpus inputs to the final stress test — your entire plan, top-to-bottom, on a single scroll.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <span className="h-px w-12 bg-amber-500/60" aria-hidden="true" />
        <span className="text-amber-700 text-xs">◆</span>
        <span className="h-px w-12 bg-amber-500/60" aria-hidden="true" />
      </div>
    </header>
  )
}

function PageFooter() {
  return (
    <footer className="text-center pt-6 pb-12 text-[11px] text-slate-500 leading-relaxed">
      <p>Need more depth? Use the dedicated Tax, AI, and Summary tabs above.</p>
      <p className="mt-1.5 text-slate-400">
        Indian Retirement Planner · Version 2.0 · Validate any major action with a SEBI-registered advisor or CA.
      </p>
    </footer>
  )
}

function SectionNav() {
  const items = [
    { id: 'sec-inputs',   num: '01', label: 'Inputs' },
    { id: 'sec-profile',  num: '02', label: 'Risk profile' },
    { id: 'sec-compare',  num: '03', label: 'Compare' },
    { id: 'sec-buckets',  num: '04', label: 'Buckets' },
    { id: 'sec-simulate', num: '05', label: 'Stress test' },
  ]
  return (
    <nav aria-label="Page sections" className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
      <div className="flex gap-2 sm:gap-3 sm:justify-center min-w-max sm:min-w-0">
        {items.map((it) => (
          <a
            key={it.id}
            href={`#${it.id}`}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50 transition-colors text-xs font-medium text-slate-700 hover:text-amber-800 whitespace-nowrap"
          >
            <span className="text-[10px] font-bold tracking-wider text-amber-700 tabular-nums">{it.num}</span>
            <span>{it.label}</span>
          </a>
        ))}
      </div>
    </nav>
  )
}
