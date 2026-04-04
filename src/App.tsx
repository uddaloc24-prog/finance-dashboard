import { useState } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from './types'
import { storage } from './lib/storage'
import { allocateBuckets } from './lib/calculations'
import { Onboarding } from './components/Onboarding'
import { Dashboard } from './components/Dashboard'
import { DEFAULT_RETURN_ASSUMPTIONS } from './constants'

export function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => storage.getProfile())
  const [buckets, setBuckets] = useState<BucketState | null>(() => storage.getBuckets())
  const [returnAssumptions, setReturnAssumptions] = useState<ReturnAssumptions>(
    () => storage.getReturnAssumptions()
  )

  function handleOnboardingComplete(p: UserProfile) {
    setProfile(p)
    setBuckets(allocateBuckets(p.corpus))
  }

  function handleBucketsUpdate(b: BucketState) {
    storage.setBuckets(b)
    setBuckets(b)
  }

  function handleProfileUpdate(p: UserProfile) {
    storage.setProfile(p)
    setProfile(p)
  }

  function handleReturnsUpdate(r: ReturnAssumptions) {
    storage.setReturnAssumptions(r)
    setReturnAssumptions(r)
  }

  function handleReset() {
    if (!confirm('Reset all data and start over?')) return
    storage.clearAll()
    setProfile(null)
    setBuckets(null)
    setReturnAssumptions(DEFAULT_RETURN_ASSUMPTIONS)
  }

  if (!profile || !buckets) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <Dashboard
      profile={profile}
      buckets={buckets}
      returnAssumptions={returnAssumptions}
      onBucketsUpdate={handleBucketsUpdate}
      onProfileUpdate={handleProfileUpdate}
      onReturnsUpdate={handleReturnsUpdate}
      onReset={handleReset}
    />
  )
}
