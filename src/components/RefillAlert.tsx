import type { BucketState, ReturnAssumptions } from '../types'
import {
  b1RunwayMonths,
  shouldRefillB1,
  refillB1Amount,
  shouldRefillB2Emergency,
  refillB2EmergencyAmount,
  transferBucket,
  totalCorpus,
  b4ProfitHarvest,
  harvestB4ToB3,
} from '../lib/calculations'
import { Button } from './ui/Button'

interface Props {
  buckets: BucketState
  monthlyWithdrawal: number
  returnAssumptions: ReturnAssumptions
  onBucketsUpdate: (b: BucketState) => void
}

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

export function RefillAlert({ buckets, monthlyWithdrawal, returnAssumptions, onBucketsUpdate }: Props) {
  const runway = b1RunwayMonths(buckets.b1, monthlyWithdrawal)
  const corpus = totalCorpus(buckets)
  const needsB1Refill = shouldRefillB1(runway)
  const needsB2Emergency = shouldRefillB2Emergency(buckets.b2, monthlyWithdrawal)
  const b4Profit = b4ProfitHarvest(buckets.b4, returnAssumptions.b4)

  // B3 needs replenishment if it has dropped below 12 months of expenses
  const needsB3Refill = buckets.b3 < monthlyWithdrawal * 12

  function handleHarvestB4() {
    onBucketsUpdate(harvestB4ToB3(buckets, returnAssumptions.b4))
  }

  function handleRefillB1() {
    const amount = refillB1Amount(buckets.b1, monthlyWithdrawal)
    onBucketsUpdate(transferBucket(buckets, 'b2', 'b1', amount))
  }

  function handleRefillB2FromB3() {
    const amount = refillB2EmergencyAmount(buckets.b2, corpus)
    onBucketsUpdate(transferBucket(buckets, 'b3', 'b2', amount))
  }

  function handleEmergencyB3() {
    // Emergency: transfer B4 principal into B3
    const needed = Math.min(monthlyWithdrawal * 24, buckets.b4)
    onBucketsUpdate(transferBucket(buckets, 'b4', 'b3', needed))
  }

  return (
    <div className="space-y-3">
      {/* ── B4 Annual Profit Harvest (always shown) ── */}
      <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📈</span>
          <div>
            <p className="font-semibold text-purple-800">
              B4 Annual Profit Available: {INR(b4Profit)}
            </p>
            <p className="text-sm text-purple-600">
              {returnAssumptions.b4}% on {INR(buckets.b4)} — B4 principal stays invested
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white"
          onClick={handleHarvestB4}
          disabled={b4Profit <= 0}
        >
          Harvest → B3
        </Button>
      </div>

      {/* ── B3 low — refill from B4 ── */}
      {needsB3Refill && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <div>
              <p className="font-semibold text-emerald-800">B3 growth engine running low</p>
              <p className="text-sm text-emerald-600">
                Transfer B4 profits to B3 to keep the cascade running
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleHarvestB4}
            disabled={buckets.b4 <= 0}
          >
            B4 profit → B3
          </Button>
        </div>
      )}

      {/* ── B1 low runway alert ── */}
      {needsB1Refill && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-red-800">B1 runway low — only {runway} months left</p>
              <p className="text-sm text-red-600">
                Transfer {INR(refillB1Amount(buckets.b1, monthlyWithdrawal))} from B2 to refill to 24 months
              </p>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={handleRefillB1} disabled={buckets.b2 <= 0}>
            Refill B1 from B2
          </Button>
        </div>
      )}

      {/* ── B2 emergency — refill from B3 ── */}
      {needsB2Emergency && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-semibold text-amber-800">B2 critically low — refill from B3</p>
              <p className="text-sm text-amber-600">
                Transfer {INR(refillB2EmergencyAmount(buckets.b2, corpus))} from B3 (hybrid) to B2
              </p>
              <p className="text-xs text-amber-500 mt-0.5">Normal: B3 should refill B2. Harvest B4 → B3 first to avoid depleting B3.</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleRefillB2FromB3}
            disabled={buckets.b3 <= 0}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            B3 → B2
          </Button>
        </div>
      )}

      {/* ── Emergency: B4 principal → B3 (last resort) ── */}
      {buckets.b3 < monthlyWithdrawal * 3 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-300 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🆘</span>
            <div>
              <p className="font-semibold text-red-900">Emergency: B4 principal needed</p>
              <p className="text-sm text-red-700">
                B3 critically low — liquidating B4 equity principal into B3
              </p>
              <p className="text-xs text-red-500 mt-0.5">Last resort — reduces long-term growth engine permanently</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleEmergencyB3}
            disabled={buckets.b4 <= 0}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Emergency: B4 → B3
          </Button>
        </div>
      )}
    </div>
  )
}
