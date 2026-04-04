import { useState, useCallback } from 'react'
import { storage } from '../lib/storage'
import type { BucketState, ReturnAssumptions } from '../types'

export function useBuckets() {
  const [buckets, setBucketsState] = useState<BucketState | null>(() => storage.getBuckets())

  const setBuckets = useCallback((b: BucketState) => {
    storage.setBuckets(b)
    setBucketsState(b)
  }, [])

  return { buckets, setBuckets }
}

export function useReturnAssumptions() {
  const [returns, setReturnsState] = useState<ReturnAssumptions>(() =>
    storage.getReturnAssumptions()
  )

  const setReturns = useCallback((r: ReturnAssumptions) => {
    storage.setReturnAssumptions(r)
    setReturnsState(r)
  }, [])

  return { returns, setReturns }
}
