import type { BucketState, ReturnAssumptions } from '../types'
import {
  b1RunwayMonths,
  shouldRefillB1,
  refillB1Amount,
  shouldRefillB2Emergency,
  refillB2EmergencyAmount,
  transferBucket,
  totalCorpus,
} from '../lib/calculations'
import { Button } from './ui/Button'

interface Props {
  buckets: BucketState
  monthlyWithdrawal: number
  returnAssumptions: ReturnAssumptions
  onBucketsUpdate: (b: BucketState) => void
}

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const CR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return INR(n)
}

export function RefillAlert({ buckets, monthlyWithdrawal, returnAssumptions, onBucketsUpdate }: Props) {
  const runway = b1RunwayMonths(buckets.b1, monthlyWithdrawal)
  const corpus = totalCorpus(buckets)
  const needsB1Refill = shouldRefillB1(runway)
  const needsB2Emergency = shouldRefillB2Emergency(buckets.b2, monthlyWithdrawal)

  // Annual interest each bucket earns (for display)
  const b4Interest = Math.round(buckets.b4 * returnAssumptions.b4 / 100)
  const b3Interest = Math.round(buckets.b3 * returnAssumptions.b3 / 100)
  const b2Interest = Math.round(buckets.b2 * returnAssumptions.b2 / 100)
  const b1Interest = Math.round(buckets.b1 * returnAssumptions.b1 / 100)
  const totalAnnualCascade = b4Interest + b3Interest + b2Interest + b1Interest
  const safeMonthly = Math.floor(totalAnnualCascade / 12 / 500) * 500

  function handleManualB2ToB1() {
    // Manual trigger: transfer B2 interest to B1 (simulate the annual SWP arriving early)
    const amount = refillB1Amount(buckets.b1, monthlyWithdrawal)
    onBucketsUpdate(transferBucket(buckets, 'b2', 'b1', amount))
  }

  function handleEmergencyB2Principal() {
    // Last resort: break into B2 principal (SCSS/FD early withdrawal)
    const amount = refillB2EmergencyAmount(buckets.b2, corpus)
    onBucketsUpdate(transferBucket(buckets, 'b2', 'b1', amount))
  }

  return (
    <div className="space-y-3">
      {/* ── Annual cascade summary (always shown) ── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Annual Interest Cascade</p>
          <span className="text-xs text-gray-400 bg-white border border-gray-200 px-2 py-1 rounded-full">
            Auto-SWP between buckets
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="bg-purple-50 rounded-lg p-2 text-center">
            <p className="text-xs text-purple-500 font-medium">B4 sends</p>
            <p className="text-sm font-bold text-purple-700">{CR(b4Interest)}/yr</p>
            <p className="text-xs text-purple-400">{returnAssumptions.b4}% of {CR(buckets.b4)}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2 text-center">
            <p className="text-xs text-emerald-500 font-medium">B3 cascades</p>
            <p className="text-sm font-bold text-emerald-700">{CR(b3Interest + b4Interest)}/yr</p>
            <p className="text-xs text-emerald-400">own + B4 interest</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-2 text-center">
            <p className="text-xs text-amber-500 font-medium">B2 sends to B1</p>
            <p className="text-sm font-bold text-amber-700">{CR(b2Interest + b3Interest + b4Interest)}/yr</p>
            <p className="text-xs text-amber-400">SCSS/FD + cascade</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <p className="text-xs text-blue-500 font-medium">B1 receives</p>
            <p className="text-sm font-bold text-blue-700">{CR(totalAnnualCascade)}/yr</p>
            <p className="text-xs text-blue-400">≈ {CR(safeMonthly)}/month</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center">
          All principals stay locked. Only interest flows: B4 → B3 → B2 → B1 → you.
          {monthlyWithdrawal > safeMonthly && (
            <span className="text-red-500 font-medium ml-1">
              You're withdrawing {INR(monthlyWithdrawal)}/month but interest only covers {INR(safeMonthly)}/month.
            </span>
          )}
        </p>
      </div>

      {/* ── B1 low runway alert ── */}
      {needsB1Refill && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-red-800">B1 liquid pool low — only {runway} months left</p>
              <p className="text-sm text-red-600">
                Move {INR(refillB1Amount(buckets.b1, monthlyWithdrawal))} from B2 interest/balance to B1
              </p>
              <p className="text-xs text-red-400 mt-0.5">In auto-mode this happens annually. Manual trigger pulls it now.</p>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={handleManualB2ToB1} disabled={buckets.b2 <= 0}>
            Pull B2 → B1 now
          </Button>
        </div>
      )}

      {/* ── B2 emergency: break into SCSS/FD principal ── */}
      {needsB2Emergency && (
        <div className="flex items-center justify-between bg-red-50 border border-red-300 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-semibold text-red-900">Emergency: B2 principal critically low</p>
              <p className="text-sm text-red-700">
                SCSS/FD interest alone isn't covering withdrawals. Break {INR(refillB2EmergencyAmount(buckets.b2, corpus))} of principal into B1.
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                Last resort — early FD/SCSS withdrawal may incur penalty. Reduces future interest income permanently.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleEmergencyB2Principal}
            disabled={buckets.b2 <= 0}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Break B2 Principal
          </Button>
        </div>
      )}
    </div>
  )
}
