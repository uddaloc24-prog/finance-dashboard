import type { BucketState, ReturnAssumptions } from '../types'
import {
  b1RunwayMonths,
  shouldRefillB1,
  refillB1Amount,
  shouldRefillB2Emergency,
  refillB2EmergencyAmount,
  transferBucket,
  totalCorpus,
  b3ProfitHarvest,
  harvestB3ToB2,
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
  const b3Profit = b3ProfitHarvest(buckets.b3, returnAssumptions.b3)

  function handleHarvestB3() {
    onBucketsUpdate(harvestB3ToB2(buckets, returnAssumptions.b3))
  }

  function handleRefillB1() {
    const amount = refillB1Amount(buckets.b1, monthlyWithdrawal)
    onBucketsUpdate(transferBucket(buckets, 'b2', 'b1', amount))
  }

  function handleEmergencyB2() {
    const amount = refillB2EmergencyAmount(buckets.b2, corpus)
    onBucketsUpdate(transferBucket(buckets, 'b3', 'b2', amount))
  }

  return (
    <div className="space-y-3">
      {/* ── B3 Profit Harvest (always shown) ── */}
      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <p className="font-semibold text-green-800">
              B3 Annual Profit Available: {INR(b3Profit)}
            </p>
            <p className="text-sm text-green-600">
              {returnAssumptions.b3}% on {INR(buckets.b3)} — B3 principal stays untouched
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={handleHarvestB3}
          disabled={b3Profit <= 0}
        >
          Harvest → B2
        </Button>
      </div>

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

      {/* ── B2 emergency (last resort — touches B3 principal) ── */}
      {needsB2Emergency && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-semibold text-amber-800">B2 critically low — emergency refill needed</p>
              <p className="text-sm text-amber-600">
                Transfer {INR(refillB2EmergencyAmount(buckets.b2, corpus))} of B3 <strong>principal</strong> to B2
              </p>
              <p className="text-xs text-amber-500 mt-0.5">This reduces your long-term growth engine — use only if necessary</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleEmergencyB2}
            disabled={buckets.b3 <= 0}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            Emergency: B3 → B2
          </Button>
        </div>
      )}
    </div>
  )
}
