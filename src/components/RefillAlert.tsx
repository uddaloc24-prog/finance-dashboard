import type { BucketState } from '../types'
import {
  b1RunwayMonths,
  shouldRefillB1,
  refillB1Amount,
  shouldRefillB2,
  refillB2Amount,
  transferBucket,
  totalCorpus,
} from '../lib/calculations'
import { Button } from './ui/Button'

interface Props {
  buckets: BucketState
  monthlyWithdrawal: number
  onBucketsUpdate: (b: BucketState) => void
}

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

export function RefillAlert({ buckets, monthlyWithdrawal, onBucketsUpdate }: Props) {
  const runway = b1RunwayMonths(buckets.b1, monthlyWithdrawal)
  const corpus = totalCorpus(buckets)
  const needsB1Refill = shouldRefillB1(runway)
  const needsB2Refill = shouldRefillB2(buckets.b2, corpus)

  if (!needsB1Refill && !needsB2Refill) return null

  function handleRefillB1() {
    const amount = refillB1Amount(buckets.b1, monthlyWithdrawal)
    onBucketsUpdate(transferBucket(buckets, 'b2', 'b1', amount))
  }

  function handleRefillB2() {
    const amount = refillB2Amount(buckets.b2, corpus)
    onBucketsUpdate(transferBucket(buckets, 'b3', 'b2', amount))
  }

  return (
    <div className="space-y-3">
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
            Confirm Transfer
          </Button>
        </div>
      )}

      {needsB2Refill && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-semibold text-amber-800">B2 running low</p>
              <p className="text-sm text-amber-600">
                Transfer {INR(refillB2Amount(buckets.b2, corpus))} from B3 to restore B2
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRefillB2}
            disabled={buckets.b3 <= 0}
            className="bg-amber-500 hover:bg-amber-600"
          >
            Confirm Transfer
          </Button>
        </div>
      )}
    </div>
  )
}
