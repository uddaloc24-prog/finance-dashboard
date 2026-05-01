import type { UserProfile, BucketState, MarketData, ReturnAssumptions, AISuggestion } from '../types'
import type { Goal, PlanResult, InterviewSession } from '../types/v2'
import type { QuizState, RiskProfileId } from '../types/profiles'
import type { UserIdentity } from '../types/identity'
import { SCHEMA_VERSION } from '../types/v2'
import { DEFAULT_RETURN_ASSUMPTIONS, BUCKET_ALLOCATION } from '../constants'

const KEYS = {
  PROFILE: 'rp_profile',
  BUCKETS: 'rp_buckets',
  MARKET: 'rp_market',
  RETURNS: 'rp_returns',
  AI_SUGGESTIONS: 'rp_ai',
  AI_LAST_FETCHED: 'rp_ai_ts',
  SCSS_OVERRIDE: 'rp_scss',
  FD_OVERRIDE: 'rp_fd',
  GOALS: 'rp_v2_goals',
  ACTIVE_PLAN: 'rp_v2_plan',
  INTERVIEW: 'rp_v2_interview',
  SCHEMA_VERSION: 'rp_schema_version',
  QUIZ_STATE: 'rp_quiz_state',
  RISK_PROFILE: 'rp_risk_profile',
  HAS_LAUNCHED: 'rp_has_launched',
  LAST_WELCOMED: 'rp_last_welcomed',  // ISO timestamp of last welcome view
  IDENTITY: 'rp_identity',
  GUIDE_SEEN: 'rp_guide_seen',
} as const

export function migrateV1toV2(profile: UserProfile): { goals: Goal[] } {
  const storedVersion = (() => {
    try {
      const raw = localStorage.getItem(KEYS.SCHEMA_VERSION)
      return raw ? (JSON.parse(raw) as number) : null
    } catch { return null }
  })()

  if (storedVersion === SCHEMA_VERSION) {
    const existing = (() => {
      try {
        const raw = localStorage.getItem(KEYS.GOALS)
        return raw ? (JSON.parse(raw) as Goal[]) : []
      } catch { return [] }
    })()
    return { goals: existing }
  }

  const goals: Goal[] = []
  if (profile.monthlyWithdrawal > 0) {
    goals.push({
      id: 'default-income',
      label: 'Monthly retirement income',
      kind: 'income',
      amount: profile.monthlyWithdrawal,
      priority: 'must-have',
      inflationCategory: 'general',
      notes: 'Migrated from v1 monthlyWithdrawal',
    })
  }
  localStorage.setItem(KEYS.GOALS, JSON.stringify(goals))
  localStorage.setItem(KEYS.SCHEMA_VERSION, JSON.stringify(SCHEMA_VERSION))
  return { goals }
}

function get<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function remove(key: string): void {
  localStorage.removeItem(key)
}

export const storage = {
  getProfile: () => get<UserProfile>(KEYS.PROFILE),
  setProfile: (p: UserProfile) => set(KEYS.PROFILE, p),

  getBuckets: (): BucketState | null => {
    const stored = get<BucketState>(KEYS.BUCKETS)
    if (!stored) return null
    // Migrate 3-bucket → 4-bucket: if b4 is missing, derive it from remaining corpus
    if (stored.b4 === undefined) {
      const total = stored.b1 + stored.b2 + stored.b3
      return {
        b1: Math.round(total * BUCKET_ALLOCATION.b1),
        b2: Math.round(total * BUCKET_ALLOCATION.b2),
        b3: Math.round(total * BUCKET_ALLOCATION.b3),
        b4: Math.round(total * BUCKET_ALLOCATION.b4),
      }
    }
    return stored
  },
  setBuckets: (b: BucketState) => set(KEYS.BUCKETS, b),

  getMarket: () => get<MarketData>(KEYS.MARKET),
  setMarket: (m: MarketData) => set(KEYS.MARKET, m),

  getReturnAssumptions: (): ReturnAssumptions => {
    const stored = get<ReturnAssumptions>(KEYS.RETURNS)
    if (!stored) return DEFAULT_RETURN_ASSUMPTIONS
    // Migrate 3-bucket → 4-bucket: merge so b4 is always present
    return { ...DEFAULT_RETURN_ASSUMPTIONS, ...stored }
  },
  setReturnAssumptions: (r: ReturnAssumptions) => set(KEYS.RETURNS, r),

  getAISuggestions: () => get<AISuggestion[]>(KEYS.AI_SUGGESTIONS),
  setAISuggestions: (s: AISuggestion[]) => set(KEYS.AI_SUGGESTIONS, s),

  getAILastFetched: () => get<string>(KEYS.AI_LAST_FETCHED),
  setAILastFetched: (ts: string) => set(KEYS.AI_LAST_FETCHED, ts),

  getScssOverride: () => get<number>(KEYS.SCSS_OVERRIDE),
  setScssOverride: (r: number) => set(KEYS.SCSS_OVERRIDE, r),

  getFdOverride: () => get<{ SBI: number; HDFC: number; ICICI: number }>(KEYS.FD_OVERRIDE),
  setFdOverride: (r: { SBI: number; HDFC: number; ICICI: number }) => set(KEYS.FD_OVERRIDE, r),

  getSchemaVersion: () => get<number>(KEYS.SCHEMA_VERSION),
  setSchemaVersion: (v: number) => set(KEYS.SCHEMA_VERSION, v),

  getGoals: (): Goal[] => get<Goal[]>(KEYS.GOALS) ?? [],
  setGoals: (g: Goal[]) => set(KEYS.GOALS, g),

  getActivePlan: () => get<PlanResult>(KEYS.ACTIVE_PLAN),
  setActivePlan: (p: PlanResult) => set(KEYS.ACTIVE_PLAN, p),
  clearActivePlan: () => remove(KEYS.ACTIVE_PLAN),

  getInterviewSession: () => get<InterviewSession>(KEYS.INTERVIEW),
  setInterviewSession: (s: InterviewSession) => set(KEYS.INTERVIEW, s),
  clearInterviewSession: () => remove(KEYS.INTERVIEW),

  getQuizState: () => get<QuizState>(KEYS.QUIZ_STATE),
  setQuizState: (s: QuizState) => set(KEYS.QUIZ_STATE, s),

  getRiskProfile: () => get<RiskProfileId>(KEYS.RISK_PROFILE),
  setRiskProfile: (id: RiskProfileId) => set(KEYS.RISK_PROFILE, id),

  getHasLaunched: (): boolean => get<boolean>(KEYS.HAS_LAUNCHED) === true,
  setHasLaunched: (v: boolean) => set(KEYS.HAS_LAUNCHED, v),

  getLastWelcomed: () => get<string>(KEYS.LAST_WELCOMED),
  setLastWelcomed: (iso: string) => set(KEYS.LAST_WELCOMED, iso),

  getIdentity: () => get<UserIdentity>(KEYS.IDENTITY),
  setIdentity: (i: UserIdentity) => set(KEYS.IDENTITY, i),

  getGuideSeen: (): boolean => get<boolean>(KEYS.GUIDE_SEEN) === true,
  setGuideSeen: (v: boolean) => set(KEYS.GUIDE_SEEN, v),

  clearAll: () => Object.values(KEYS).forEach(remove),
}
