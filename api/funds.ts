import type { FundsResponse } from '../src/types/v2'
import { CURATED_FUNDS } from '../src/constants/curatedFunds'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const today = new Date().toISOString().slice(0, 10)
  const navs: FundsResponse['navs'] = {}
  for (const f of CURATED_FUNDS) {
    navs[f.schemeCode] = { nav: 0, date: today, oneYearReturn: null }
  }

  const res: FundsResponse = {
    funds: CURATED_FUNDS,
    navs,
    refreshedAt: new Date().toISOString(),
  }

  return new Response(JSON.stringify(res), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
    },
  })
}
