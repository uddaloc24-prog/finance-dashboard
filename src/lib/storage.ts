import type { UserProfile, BucketState, MarketData, ReturnAssumptions, AISuggestion } from '../types'
import { DEFAULT_RETURN_ASSUMPTIONS } from '../constants'

const KEYS = {
  PROFILE: 'rp_profile',
  BUCKETS: 'rp_buckets',
  MARKET: 'rp_market',
  RETURNS: 'rp_returns',
  AI_SUGGESTIONS: 'rp_ai',
  AI_LAST_FETCHED: 'rp_ai_ts',
  SCSS_OVERRIDE: 'rp_scss',
  FD_OVERRIDE: 'rp_fd',
} as const

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

  getBuckets: () => get<BucketState>(KEYS.BUCKETS),
  setBuckets: (b: BucketState) => set(KEYS.BUCKETS, b),

  getMarket: () => get<MarketData>(KEYS.MARKET),
  setMarket: (m: MarketData) => set(KEYS.MARKET, m),

  getReturnAssumptions: (): ReturnAssumptions =>
    get<ReturnAssumptions>(KEYS.RETURNS) ?? DEFAULT_RETURN_ASSUMPTIONS,
  setReturnAssumptions: (r: ReturnAssumptions) => set(KEYS.RETURNS, r),

  getAISuggestions: () => get<AISuggestion[]>(KEYS.AI_SUGGESTIONS),
  setAISuggestions: (s: AISuggestion[]) => set(KEYS.AI_SUGGESTIONS, s),

  getAILastFetched: () => get<string>(KEYS.AI_LAST_FETCHED),
  setAILastFetched: (ts: string) => set(KEYS.AI_LAST_FETCHED, ts),

  getScssOverride: () => get<number>(KEYS.SCSS_OVERRIDE),
  setScssOverride: (r: number) => set(KEYS.SCSS_OVERRIDE, r),

  getFdOverride: () => get<{ SBI: number; HDFC: number; ICICI: number }>(KEYS.FD_OVERRIDE),
  setFdOverride: (r: { SBI: number; HDFC: number; ICICI: number }) => set(KEYS.FD_OVERRIDE, r),

  clearAll: () => Object.values(KEYS).forEach(remove),
}
