import { useState, useEffect, useCallback, useRef } from 'react'
import type { MarketData } from '../types'
import { refreshMarketData } from '../lib/market'
import { storage } from '../lib/storage'

export function useMarketData(refreshIntervalHours: 1 | 6 = 6) {
  const [data, setData] = useState<MarketData | null>(() => storage.getMarket())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const fresh = await refreshMarketData()
      setData(fresh)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch market data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Auto-refresh if stale
    const cached = storage.getMarket()
    if (cached?.lastRefreshed) {
      const age = Date.now() - new Date(cached.lastRefreshed).getTime()
      const maxAge = refreshIntervalHours * 60 * 60 * 1000
      if (age > maxAge) refresh()
    } else {
      refresh()
    }

    // Set interval
    const ms = refreshIntervalHours * 60 * 60 * 1000
    timerRef.current = setInterval(refresh, ms)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [refresh, refreshIntervalHours])

  return { data, loading, error, refresh }
}
