import { useState } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from './types'
import { storage } from './lib/storage'
import { allocateBuckets } from './lib/calculations'
import { Dashboard } from './components/Dashboard'
import { Shell } from './components/Shell'
import { DEFAULT_RETURN_ASSUMPTIONS, BUCKET_ALLOCATION, DEFAULT_DEMOGRAPHICS, DEFAULT_EXPENSES } from './constants'

const V2_FLAG_ENV = (import.meta.env.VITE_V2_ENABLED as string | undefined) === 'true'

function isV2Enabled(): boolean {
  if (typeof window === 'undefined') return V2_FLAG_ENV
  const url = new URL(window.location.href)
  if (url.searchParams.get('v2') === '1') return true
  if (url.searchParams.get('v2') === '0') return false
  if (url.pathname.startsWith('/v2')) return true
  return V2_FLAG_ENV
}

const DEFAULT_PROFILE: UserProfile = {
  corpus: 1_00_00_000,
  monthlyWithdrawal: 60_000,
  withdrawalFrequency: 'monthly',
  withdrawalAmount: 60_000,
  sipAmount: 0,
  sipFrequency: 'monthly',
  inflationRate: 6.5,
  riskAppetite: 3,
  taxBracket: 20,
  refreshInterval: 6,
  groqApiKey: '',
  bucketAllocation: { ...BUCKET_ALLOCATION },
  demographics: { ...DEFAULT_DEMOGRAPHICS },
  expenses: { ...DEFAULT_EXPENSES },
}

function loadProfile(): UserProfile {
  const p = storage.getProfile()
  if (!p) {
    storage.setProfile(DEFAULT_PROFILE)
    return DEFAULT_PROFILE
  }
  // Migrate old profiles without frequency fields
  const raw = p as unknown as Record<string, unknown>
  return {
    ...p,
    withdrawalFrequency: (raw.withdrawalFrequency as UserProfile['withdrawalFrequency']) ?? 'monthly',
    withdrawalAmount: (raw.withdrawalAmount as number) ?? p.monthlyWithdrawal,
    sipAmount: (raw.sipAmount as number) ?? 0,
    sipFrequency: (raw.sipFrequency as UserProfile['sipFrequency']) ?? 'monthly',
  }
}

function loadBuckets(profile: UserProfile): BucketState {
  const stored = storage.getBuckets()
  if (stored) return stored
  const b = allocateBuckets(profile.corpus, profile.bucketAllocation ?? BUCKET_ALLOCATION)
  storage.setBuckets(b)
  return b
}

export function App() {
  if (isV2Enabled()) {
    return <Shell />
  }
  return <V1App />
}

function V1App() {
  const [profile, setProfile] = useState<UserProfile>(loadProfile)
  const [buckets, setBuckets] = useState<BucketState>(() => loadBuckets(profile))
  const [returnAssumptions, setReturnAssumptions] = useState<ReturnAssumptions>(
    () => storage.getReturnAssumptions()
  )

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
    if (!confirm('Reset all values to defaults?')) return
    storage.clearAll()
    const p = { ...DEFAULT_PROFILE }
    const b = allocateBuckets(p.corpus, p.bucketAllocation ?? BUCKET_ALLOCATION)
    storage.setProfile(p)
    storage.setBuckets(b)
    setProfile(p)
    setBuckets(b)
    setReturnAssumptions(DEFAULT_RETURN_ASSUMPTIONS)
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
