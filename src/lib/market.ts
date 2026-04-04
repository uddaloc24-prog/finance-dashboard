import type { MFNav, MarketData } from '../types'
import { MF_SCHEMES, FD_RATES_DEFAULT, SCSS_RATE_DEFAULT } from '../constants'
import { storage } from './storage'

// ── MF NAVs via mfapi.in ──────────────────────────────────────────

interface MFApiResponse {
  meta: { scheme_name: string }
  data: Array<{ date: string; nav: string }>
  status: string
}

async function fetchMFNav(
  schemeCode: string,
  schemeName: string,
  bucket: 'b1' | 'b2' | 'b3'
): Promise<MFNav | null> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`)
    if (!res.ok) return null
    const json: MFApiResponse = await res.json()
    if (json.status !== 'SUCCESS' || !json.data?.length) return null

    const latest = json.data[0]
    const nav = parseFloat(latest.nav)

    // 1-year return: compare today's NAV vs ~252 trading days ago
    let oneYearReturn: number | null = null
    if (json.data.length > 250) {
      const oldNav = parseFloat(json.data[250].nav)
      if (oldNav > 0) {
        oneYearReturn = parseFloat((((nav - oldNav) / oldNav) * 100).toFixed(2))
      }
    }

    return { schemeCode, schemeName, nav, date: latest.date, oneYearReturn, bucket }
  } catch {
    return null
  }
}

// ── Nifty / Sensex via NSE ────────────────────────────────────────
// NSE blocks direct browser requests. We use a lightweight CORS proxy.
// Falls back to null (displays "unavailable" in UI).

async function fetchNiftyAndSensex(): Promise<{
  nifty: number | null
  niftyChange: number | null
  sensex: number | null
  sensexChange: number | null
}> {
  const CORS_PROXY = 'https://corsproxy.io/?url='
  const NSE_URL = encodeURIComponent('https://www.nseindia.com/api/allIndices')

  try {
    const res = await fetch(CORS_PROXY + NSE_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { nifty: null, niftyChange: null, sensex: null, sensexChange: null }

    const json: { data: Array<{ indexSymbol: string; last: number; percentChange: number }> } =
      await res.json()

    const niftyRow = json.data?.find((r) => r.indexSymbol === 'NIFTY 50')
    const sensexRow = json.data?.find((r) => r.indexSymbol === 'SENSEX')

    return {
      nifty: niftyRow?.last ?? null,
      niftyChange: niftyRow?.percentChange ?? null,
      sensex: sensexRow?.last ?? null,
      sensexChange: sensexRow?.percentChange ?? null,
    }
  } catch {
    return { nifty: null, niftyChange: null, sensex: null, sensexChange: null }
  }
}

// ── Gold price via metals.live ────────────────────────────────────
// Free tier, no API key, returns price in USD/oz. Convert to ₹/10g.

async function fetchGoldPrice(): Promise<number | null> {
  const USD_TO_INR = 84.5  // approximate; no live forex needed for retirement planning
  const TROY_OZ_TO_10G = 10 / 31.1035

  try {
    const res = await fetch('https://api.metals.live/v1/spot/gold', {
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const json: Array<{ gold: number }> = await res.json()
    const usdPerOz = json[0]?.gold
    if (!usdPerOz) return null
    return Math.round(usdPerOz * USD_TO_INR * TROY_OZ_TO_10G)
  } catch {
    return null
  }
}

// ── Main refresh function ─────────────────────────────────────────

export async function refreshMarketData(): Promise<MarketData> {
  const scssRate = storage.getScssOverride() ?? SCSS_RATE_DEFAULT
  const fdRates = storage.getFdOverride() ?? FD_RATES_DEFAULT

  // Fetch all concurrently
  const [indices, gold, ...navResults] = await Promise.all([
    fetchNiftyAndSensex(),
    fetchGoldPrice(),
    ...Object.entries(MF_SCHEMES).flatMap(([bucket, schemes]) =>
      schemes.map((s) => fetchMFNav(s.code, s.name, bucket as 'b1' | 'b2' | 'b3'))
    ),
  ])

  const mfNavs = navResults.filter((n): n is MFNav => n !== null)

  const data: MarketData = {
    nifty: indices.nifty,
    niftChange: indices.niftyChange,
    sensex: indices.sensex,
    sensexChange: indices.sensexChange,
    gold,
    scssRate,
    fdRates,
    mfNavs,
    lastRefreshed: new Date().toISOString(),
  }

  storage.setMarket(data)
  return data
}
