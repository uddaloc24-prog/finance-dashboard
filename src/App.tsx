import { useState } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from './types'
import { storage } from './lib/storage'
import { allocateBuckets } from './lib/calculations'
import { Dashboard } from './components/Dashboard'
import { Shell } from './components/Shell'
import { WelcomePage } from './components/WelcomePage'
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

function emptySchedule() {
  return { monthly: 0, quarterly: 0, halfYearly: 0, yearly: 0 }
}

function migrateLegacyToSchedule(amount: number, freq: UserProfile['withdrawalFrequency']) {
  const s = emptySchedule()
  if (!amount || amount <= 0) return s
  switch (freq) {
    case 'monthly':     s.monthly = amount; break
    case 'quarterly':   s.quarterly = amount; break
    case 'half-yearly': s.halfYearly = amount; break
    case 'yearly':      s.yearly = amount; break
  }
  return s
}

function loadProfile(): UserProfile {
  const p = storage.getProfile()
  if (!p) {
    storage.setProfile(DEFAULT_PROFILE)
    return DEFAULT_PROFILE
  }
  const raw = p as unknown as Record<string, unknown>
  const withdrawalFrequency = (raw.withdrawalFrequency as UserProfile['withdrawalFrequency']) ?? 'monthly'
  const withdrawalAmount = (raw.withdrawalAmount as number) ?? p.monthlyWithdrawal
  const sipAmount = (raw.sipAmount as number) ?? 0
  const sipFrequency = (raw.sipFrequency as UserProfile['sipFrequency']) ?? 'monthly'
  const withdrawalSchedule = (raw.withdrawalSchedule as UserProfile['withdrawalSchedule'])
    ?? migrateLegacyToSchedule(withdrawalAmount, withdrawalFrequency)
  const sipSchedule = (raw.sipSchedule as UserProfile['sipSchedule'])
    ?? migrateLegacyToSchedule(sipAmount, sipFrequency)
  return {
    ...p,
    withdrawalFrequency,
    withdrawalAmount,
    sipAmount,
    sipFrequency,
    withdrawalSchedule,
    sipSchedule,
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

const WEEKLY_REFRESH_MS = 7 * 24 * 60 * 60 * 1000

function shouldShowWelcome(): { show: boolean; isReturning: boolean; daysSince: number } {
  const hasLaunched = storage.getHasLaunched()
  if (!hasLaunched) return { show: true, isReturning: false, daysSince: 0 }
  const last = storage.getLastWelcomed()
  if (!last) return { show: false, isReturning: false, daysSince: 0 }
  const elapsed = Date.now() - new Date(last).getTime()
  const days = Math.floor(elapsed / (24 * 60 * 60 * 1000))
  if (elapsed >= WEEKLY_REFRESH_MS) return { show: true, isReturning: true, daysSince: days }
  return { show: false, isReturning: false, daysSince: days }
}

function V1App() {
  const [welcome, setWelcome] = useState(() => shouldShowWelcome())
  const [profile, setProfile] = useState<UserProfile>(loadProfile)
  const [buckets, setBuckets] = useState<BucketState>(() => loadBuckets(profile))
  const [returnAssumptions, setReturnAssumptions] = useState<ReturnAssumptions>(
    () => storage.getReturnAssumptions()
  )

  if (welcome.show) {
    return (
      <WelcomePage
        isReturning={welcome.isReturning}
        daysSince={welcome.daysSince}
        onStart={() => {
          // Identity itself is persisted by WelcomePage before this fires
          storage.setHasLaunched(true)
          storage.setLastWelcomed(new Date().toISOString())
          setWelcome({ show: false, isReturning: false, daysSince: 0 })
        }}
      />
    )
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
    if (!confirm('Reset all values to defaults? You will return to the welcome screen.')) return
    storage.clearAll()
    const p = { ...DEFAULT_PROFILE }
    const b = allocateBuckets(p.corpus, p.bucketAllocation ?? BUCKET_ALLOCATION)
    storage.setProfile(p)
    storage.setBuckets(b)
    setProfile(p)
    setBuckets(b)
    setReturnAssumptions(DEFAULT_RETURN_ASSUMPTIONS)
    setWelcome({ show: true, isReturning: false, daysSince: 0 })
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
