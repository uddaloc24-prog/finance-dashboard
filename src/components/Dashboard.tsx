import type { UserProfile, BucketState, MarketData, ReturnAssumptions } from '../types'
import { totalCorpus, b1RunwayMonths } from '../lib/calculations'
import { storage } from '../lib/storage'
import { useMarketData } from '../hooks/useMarketData'
import { BucketCard } from './BucketCard'
import { RefillAlert } from './RefillAlert'
import { SWPSimulator } from './SWPSimulator'
import { MarketPanel } from './MarketPanel'
import { AIPanel } from './AIPanel'
import { TaxOverlay } from './TaxOverlay'
import { Sliders } from './Sliders'
import { YearSimulator } from './YearSimulator'
import { Button } from './ui/Button'
import { exportPDF } from '../lib/pdf'
import { simulateSWP } from '../lib/calculations'

interface Props {
  profile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
  onBucketsUpdate: (b: BucketState) => void
  onProfileUpdate: (p: UserProfile) => void
  onReturnsUpdate: (r: ReturnAssumptions) => void
  onReset: () => void
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
  const { data: marketData, loading: marketLoading, refresh: refreshMarket } = useMarketData(profile.refreshInterval)
  const runway = b1RunwayMonths(buckets.b1, profile.monthlyWithdrawal)
  const total = totalCorpus(buckets)

  function handleMarketDataChange(d: MarketData) {
    storage.setMarket(d)
  }

  async function handleExportPDF() {
    const rows = simulateSWP({ buckets, monthlyWithdrawal: profile.monthlyWithdrawal, inflationRate: profile.inflationRate, returnAssumptions })
    await exportPDF(profile, buckets, returnAssumptions, rows)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪣</span>
            <span className="font-bold text-gray-800">3-Bucket Retirement Planner</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleExportPDF}>
              📄 Export PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={onReset}>
              Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Corpus</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{CR(total)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Monthly Withdrawal</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{INR(profile.monthlyWithdrawal)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${runway < 6 ? 'bg-red-50 border-red-200' : runway < 12 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">B1 Runway</p>
            <p className={`text-2xl font-bold mt-1 ${runway < 6 ? 'text-red-700' : runway < 12 ? 'text-amber-700' : 'text-gray-900'}`}>
              {runway} months
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Market Refresh</p>
            <p className="text-sm font-medium text-gray-700 mt-1">
              {marketData?.lastRefreshed
                ? new Date(marketData.lastRefreshed).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                : marketLoading ? 'Refreshing…' : 'Never'}
            </p>
          </div>
        </div>

        {/* Refill alerts */}
        <RefillAlert
          buckets={buckets}
          monthlyWithdrawal={profile.monthlyWithdrawal}
          returnAssumptions={returnAssumptions}
          onBucketsUpdate={onBucketsUpdate}
        />

        {/* Bucket cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BucketCard id="b1" value={buckets.b1} total={total} returnAssumption={returnAssumptions.b1} runway={runway} />
          <BucketCard id="b2" value={buckets.b2} total={total} returnAssumption={returnAssumptions.b2} />
          <BucketCard id="b3" value={buckets.b3} total={total} returnAssumption={returnAssumptions.b3} />
        </div>

        {/* Assumption sliders */}
        <Sliders
          profile={profile}
          returnAssumptions={returnAssumptions}
          onProfileChange={onProfileUpdate}
          onReturnsChange={onReturnsUpdate}
        />

        {/* Year-by-Year Bucket Flow Simulator */}
        <YearSimulator
          buckets={buckets}
          monthlyWithdrawal={profile.monthlyWithdrawal}
          inflationRate={profile.inflationRate}
          returnAssumptions={returnAssumptions}
        />

        {/* SWP Simulator */}
        <SWPSimulator
          buckets={buckets}
          monthlyWithdrawal={profile.monthlyWithdrawal}
          inflationRate={profile.inflationRate}
          returnAssumptions={returnAssumptions}
        />

        {/* Market Data */}
        <MarketPanel
          data={marketData}
          loading={marketLoading}
          onRefresh={refreshMarket}
          onDataChange={handleMarketDataChange}
        />

        {/* AI Suggestions */}
        <AIPanel profile={profile} marketData={marketData} />

        {/* Tax Overlay */}
        <TaxOverlay
          returnAssumptions={returnAssumptions}
          taxBracket={profile.taxBracket}
          scssRate={marketData?.scssRate ?? 8.2}
          fdRates={marketData?.fdRates ?? { SBI: 7.25, HDFC: 7.40, ICICI: 7.35 }}
          annualCorpus={total}
        />
      </main>
    </div>
  )
}
