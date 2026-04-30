import { useState, lazy, Suspense } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from '../types'
import type { TabId } from '../constants'
import { totalCorpus, b1RunwayMonths, simulateSWP } from '../lib/calculations'
import { useMarketData } from '../hooks/useMarketData'
import { BucketCard } from './BucketCard'
import { RefillAlert } from './RefillAlert'
import { Sliders } from './Sliders'
import { ProfileSettings } from './ProfileSettings'
import { DemographicsForm } from './DemographicsForm'
import { ExpenseEditor } from './ExpenseEditor'
import { TabNav } from './TabNav'
import { Button } from './ui/Button'

// Lazy-load heavy components (Recharts, AI)
const CorpusPreservation = lazy(() => import('./CorpusPreservation').then(m => ({ default: m.CorpusPreservation })))
const SWPSimulator = lazy(() => import('./SWPSimulator').then(m => ({ default: m.SWPSimulator })))
const YearSimulator = lazy(() => import('./YearSimulator').then(m => ({ default: m.YearSimulator })))
const AIPortfolioOptimizer = lazy(() => import('./AIPortfolioOptimizer').then(m => ({ default: m.AIPortfolioOptimizer })))

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
    const { exportPDF } = await import('../lib/pdf')
    const rows = simulateSWP({ buckets, monthlyWithdrawal: profile.monthlyWithdrawal, inflationRate: profile.inflationRate, returnAssumptions })
    await exportPDF(profile, buckets, returnAssumptions, rows)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">🪣</span>
            <h1 className="font-bold text-gray-800 text-base">Retirement Planner</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleExportPDF}>
              Export PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={onReset}>
              Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className={`grid gap-4 ${profile.sipAmount > 0 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Corpus</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{CR(total)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {FREQ_LABELS[profile.withdrawalFrequency ?? 'monthly']} Withdrawal
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{INR(profile.withdrawalAmount ?? profile.monthlyWithdrawal)}</p>
            {(profile.withdrawalFrequency ?? 'monthly') !== 'monthly' && (
              <p className="text-xs text-gray-400 mt-0.5">= {INR(profile.monthlyWithdrawal)}/mo</p>
            )}
          </div>
          {profile.sipAmount > 0 && (
            <div className="bg-teal-50 rounded-xl border border-teal-200 p-4">
              <p className="text-xs text-teal-500 font-medium uppercase tracking-wide">
                {FREQ_LABELS[profile.sipFrequency ?? 'monthly']} SIP/Income
              </p>
              <p className="text-2xl font-bold text-teal-700 mt-1">{INR(profile.sipAmount)}</p>
            </div>
          )}
          <div className={`rounded-xl border p-4 ${runway < 6 ? 'bg-red-50 border-red-200' : runway < 12 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">B1 Runway</p>
            <p className={`text-2xl font-bold mt-1 ${runway < 6 ? 'text-red-700' : runway < 12 ? 'text-amber-700' : 'text-gray-900'}`}>
              {runway} months
            </p>
          </div>
        </div>

        {/* Tab Navigation — desktop pills */}
        <TabNav activeTab={activeTab} onChange={setActiveTab} />

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
          </div>
        )}

        {activeTab === 'tax' && (
          <div role="tabpanel" id="tabpanel-tax" aria-labelledby="tab-tax" className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
              <span className="text-4xl">🧾</span>
              <h2 className="text-sm font-semibold text-gray-800 mt-3">Tax Optimizer</h2>
              <p className="text-xs text-gray-400 mt-1">
                Old vs New regime comparison with full deduction logic — coming in Phase 3
              </p>
            </div>
          </div>
        )}

        {activeTab === 'simulate' && (
          <div role="tabpanel" id="tabpanel-simulate" aria-labelledby="tab-simulate" className="space-y-6">
            <Suspense fallback={<TabLoading />}>
              <CorpusPreservation
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
      </main>
    </div>
  )
}
