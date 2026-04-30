import { useState, lazy, Suspense } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from '../types'
import type { TabId } from '../constants'
import { totalCorpus, b1RunwayMonths } from '../lib/calculations'
import { useMarketData } from '../hooks/useMarketData'
import { BucketCard } from './BucketCard'
import { RefillAlert } from './RefillAlert'
import { Sliders } from './Sliders'
import { ProfileSettings } from './ProfileSettings'
import { DemographicsForm } from './DemographicsForm'
import { ExpenseEditor } from './ExpenseEditor'
import { TabNav } from './TabNav'
import { TabNavFooter } from './TabNavFooter'
import { Button } from './ui/Button'
import { TAB_ITEMS } from '../constants'
import { storage } from '../lib/storage'

// Lazy-load heavy components (Recharts, AI)
const CorpusPreservation = lazy(() => import('./CorpusPreservation').then(m => ({ default: m.CorpusPreservation })))
const SWPSimulator = lazy(() => import('./SWPSimulator').then(m => ({ default: m.SWPSimulator })))
const YearSimulator = lazy(() => import('./YearSimulator').then(m => ({ default: m.YearSimulator })))
const AIPortfolioOptimizer = lazy(() => import('./AIPortfolioOptimizer').then(m => ({ default: m.AIPortfolioOptimizer })))
const StrategiesPanel = lazy(() => import('./strategies/StrategiesPanel').then(m => ({ default: m.StrategiesPanel })))
const ProfilesPanel = lazy(() => import('./profiles/ProfilesPanel').then(m => ({ default: m.ProfilesPanel })))
const MonteCarloPanel = lazy(() => import('./montecarlo/MonteCarloPanel').then(m => ({ default: m.MonteCarloPanel })))
const TaxPanel = lazy(() => import('./tax/TaxPanel').then(m => ({ default: m.TaxPanel })))
const SummaryPanel = lazy(() => import('./summary/SummaryPanel').then(m => ({ default: m.SummaryPanel })))
const BucketFundsExplorer = lazy(() => import('./buckets/BucketFundsExplorer').then(m => ({ default: m.BucketFundsExplorer })))

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

interface Props {
  profile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
  onBucketsUpdate: (b: BucketState) => void
  onProfileUpdate: (p: UserProfile) => void
  onReturnsUpdate: (r: ReturnAssumptions) => void
  onReset: () => void
}

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'half-yearly': 'Half-Yearly',
  yearly: 'Yearly',
}

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const CR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return INR(n)
}

export function Dashboard({
  profile,
  buckets,
  returnAssumptions,
  onBucketsUpdate,
  onProfileUpdate,
  onReturnsUpdate,
  onReset,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('plan')
  const { data: marketData } = useMarketData(profile.refreshInterval)
  const runway = b1RunwayMonths(buckets.b1, profile.monthlyWithdrawal)
  const total = totalCorpus(buckets)

  async function handleExportPDF() {
    // Comprehensive personalised report — multi-page, user-name in filename
    const { exportComprehensiveReport } = await import('../lib/comprehensiveReport')
    await exportComprehensiveReport({
      identity: storage.getIdentity(),
      profile,
      buckets,
      returnAssumptions,
    })
  }

  const wr = ((profile.monthlyWithdrawal * 12) / Math.max(1, total)) * 100
  const wrTone = wr <= 5 ? 'text-green-700' : wr <= 7 ? 'text-amber-700' : 'text-red-700'
  const runwayTone = runway < 6 ? 'text-red-700' : runway < 12 ? 'text-amber-700' : 'text-gray-900'

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Persistent progress bar — flush at the very top */}
      <ProgressBar activeTab={activeTab} />

      {/* Compact sticky header — title + actions in one slim bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-semibold text-gray-900 text-sm tracking-tight truncate">
              <span className="hidden sm:inline">Retirement Planner</span>
              <UserGreeting />
            </h1>
            <StepLabel activeTab={activeTab} />
          </div>
          <div className="flex items-center gap-1">
            {activeTab !== 'summary' && (
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('summary')}>
                <span className="hidden sm:inline">Skip to summary</span>
                <span className="sm:hidden">Summary</span>
                <span className="ml-1" aria-hidden="true">→</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleExportPDF}>Export</Button>
            <Button variant="ghost" size="sm" onClick={onReset}>Reset</Button>
          </div>
        </div>
        {/* Dense KPI strip — 4 inline metrics, no card chrome */}
        <div className="border-t border-gray-100 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 grid grid-cols-4 gap-4 text-center sm:text-left">
            <KpiCell label="Corpus" value={CR(total)} />
            <KpiCell
              label={`${FREQ_LABELS[profile.withdrawalFrequency ?? 'monthly']} draw`}
              value={INR(profile.withdrawalAmount ?? profile.monthlyWithdrawal)}
              sub={(profile.withdrawalFrequency ?? 'monthly') !== 'monthly' ? `${INR(profile.monthlyWithdrawal)}/mo` : undefined}
            />
            <KpiCell label="Withdrawal rate" value={`${wr.toFixed(2)}%`} valueClass={wrTone} sub="annual" />
            <KpiCell label="B1 runway" value={`${runway}mo`} valueClass={runwayTone} />
          </div>
        </div>
        {/* Tab nav — desktop pills inline; mobile renders a fixed bottom bar via TabNav internals */}
        <div className="border-t border-gray-100 bg-white">
          <div className="max-w-6xl mx-auto px-2 sm:px-4 py-1.5">
            <TabNav activeTab={activeTab} onChange={setActiveTab} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {profile.sipAmount > 0 && (
          <div className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-2 text-xs text-teal-800 flex items-center justify-between">
            <span><strong>{FREQ_LABELS[profile.sipFrequency ?? 'monthly']} SIP/income:</strong> {INR(profile.sipAmount)}</span>
          </div>
        )}

        {/* Tab Content — only render the active tab */}
        {activeTab === 'plan' && (
          <div role="tabpanel" id="tabpanel-plan" aria-labelledby="tab-plan" className="space-y-6">
            <ProfileSettings
              profile={profile}
              buckets={buckets}
              onProfileUpdate={onProfileUpdate}
              onBucketsUpdate={onBucketsUpdate}
            />
            <DemographicsForm
              profile={profile}
              onProfileUpdate={onProfileUpdate}
            />
            <ExpenseEditor
              profile={profile}
              onProfileUpdate={onProfileUpdate}
            />
          </div>
        )}

        {activeTab === 'assets' && (
          <div role="tabpanel" id="tabpanel-assets" aria-labelledby="tab-assets" className="space-y-6">
            {/* Refill alerts */}
            <RefillAlert
              buckets={buckets}
              monthlyWithdrawal={profile.monthlyWithdrawal}
              returnAssumptions={returnAssumptions}
              onBucketsUpdate={onBucketsUpdate}
            />

            {/* Buckets */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <BucketCard id="b1" value={buckets.b1} total={total} returnAssumption={returnAssumptions.b1} runway={runway} />
              <BucketCard id="b2" value={buckets.b2} total={total} returnAssumption={returnAssumptions.b2} />
              <BucketCard id="b3" value={buckets.b3} total={total} returnAssumption={returnAssumptions.b3} />
              <BucketCard id="b4" value={buckets.b4} total={total} returnAssumption={returnAssumptions.b4} />
            </div>

            {/* Sliders */}
            <Sliders
              profile={profile}
              buckets={buckets}
              returnAssumptions={returnAssumptions}
              onProfileChange={onProfileUpdate}
              onReturnsChange={onReturnsUpdate}
              onBucketsUpdate={onBucketsUpdate}
            />

            {/* Asset class explorer — dropdown per bucket + detailed analysis */}
            <Suspense fallback={<TabLoading />}>
              <BucketFundsExplorer bucketValues={buckets} />
            </Suspense>
          </div>
        )}

        {activeTab === 'profiles' && (
          <div role="tabpanel" id="tabpanel-profiles" aria-labelledby="tab-profiles" className="space-y-6">
            <Suspense fallback={<TabLoading />}>
              <ProfilesPanel userProfile={profile} />
            </Suspense>
          </div>
        )}

        {activeTab === 'strategies' && (
          <div role="tabpanel" id="tabpanel-strategies" aria-labelledby="tab-strategies" className="space-y-6">
            <Suspense fallback={<TabLoading />}>
              <StrategiesPanel
                profile={profile}
                buckets={buckets}
                returnAssumptions={returnAssumptions}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'simulate' && (
          <div role="tabpanel" id="tabpanel-simulate" aria-labelledby="tab-simulate" className="space-y-4">
            <Suspense fallback={<TabLoading />}>
              <CorpusPreservation
                profile={profile}
                buckets={buckets}
                returnAssumptions={returnAssumptions}
              />
              <MonteCarloPanel
                profile={profile}
                buckets={buckets}
                returnAssumptions={returnAssumptions}
              />
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
        )}

        {activeTab === 'tax' && (
          <div role="tabpanel" id="tabpanel-tax" aria-labelledby="tab-tax" className="space-y-4">
            <Suspense fallback={<TabLoading />}>
              <TaxPanel
                profile={profile}
                buckets={buckets}
                returnAssumptions={returnAssumptions}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'ai' && (
          <div role="tabpanel" id="tabpanel-ai" aria-labelledby="tab-ai" className="space-y-6">
            <Suspense fallback={<TabLoading />}>
              <AIPortfolioOptimizer
                profile={profile}
                buckets={buckets}
                marketData={marketData}
                onReturnsUpdate={onReturnsUpdate}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'summary' && (
          <div role="tabpanel" id="tabpanel-summary" aria-labelledby="tab-summary" className="space-y-4">
            <Suspense fallback={<TabLoading />}>
              <SummaryPanel
                profile={profile}
                buckets={buckets}
                returnAssumptions={returnAssumptions}
                onChangeTab={(t) => setActiveTab(t as TabId)}
              />
            </Suspense>
          </div>
        )}

        {/* Step navigation — Previous / Next between tabs */}
        <TabNavFooter activeTab={activeTab} onChange={setActiveTab} />
      </main>
    </div>
  )
}

function UserGreeting() {
  const id = storage.getIdentity()
  const first = id?.fullName?.trim().split(/\s+/)[0]
  if (!first || first === 'Anonymous') return null
  return (
    <span className="text-slate-500 font-normal hidden md:inline">
      <span className="hidden sm:inline mx-1.5 text-slate-300">·</span>
      {first}'s plan
    </span>
  )
}

function ProgressBar({ activeTab }: { activeTab: TabId }) {
  const idx = TAB_ITEMS.findIndex((t) => t.id === activeTab)
  const pct = ((idx + 1) / TAB_ITEMS.length) * 100
  return (
    <div
      className="h-1 bg-slate-200/60 sticky top-0 z-30"
      role="progressbar"
      aria-valuenow={idx + 1}
      aria-valuemin={1}
      aria-valuemax={TAB_ITEMS.length}
      aria-label={`Step ${idx + 1} of ${TAB_ITEMS.length}`}
    >
      <div
        className="h-full bg-blue-600 transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function StepLabel({ activeTab }: { activeTab: TabId }) {
  const idx = TAB_ITEMS.findIndex((t) => t.id === activeTab)
  const tab = TAB_ITEMS[idx]
  return (
    <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-500 border-l border-slate-200 pl-3">
      <span className="font-medium text-slate-700 tabular-nums">{idx + 1}/{TAB_ITEMS.length}</span>
      <span className="text-slate-400">·</span>
      <span>{tab?.label ?? ''}</span>
    </span>
  )
}

function KpiCell({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{label}</div>
      <div className={`text-base sm:text-lg font-semibold tabular-nums truncate ${valueClass ?? 'text-gray-900'}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-400 tabular-nums">{sub}</div>}
    </div>
  )
}
