import { useState } from 'react'
import type { UserProfile, MarketData, AISuggestion } from '../types'
import { storage } from '../lib/storage'
import { Card, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'

interface Props {
  profile: UserProfile
  marketData: MarketData | null
}

function buildPrompt(profile: UserProfile, market: MarketData | null): string {
  const niftyStr = market?.nifty ? `Nifty 50 at ${market.nifty.toLocaleString()}` : 'Nifty data unavailable'
  const goldStr = market?.gold ? `Gold at ₹${market.gold.toLocaleString('en-IN')}/10g` : 'Gold data unavailable'
  const navStr = market?.mfNavs?.length
    ? market.mfNavs
        .map((m) => `${m.schemeName} (${m.bucket.toUpperCase()}): NAV ₹${m.nav.toFixed(2)}, 1yr return ${m.oneYearReturn !== null ? m.oneYearReturn + '%' : 'N/A'}`)
        .join('\n')
    : 'No MF NAV data available'

  return `You are a knowledgeable Indian financial planner (not SEBI-registered). Provide specific mutual fund and instrument recommendations for an Indian retiree using the 3-bucket drawdown strategy.

User profile:
- Risk appetite: ${profile.riskAppetite}/5 (${profile.riskAppetite <= 2 ? 'Conservative' : profile.riskAppetite === 3 ? 'Moderate' : 'Aggressive'})
- Tax bracket: ${profile.taxBracket}%
- Monthly withdrawal: ₹${profile.monthlyWithdrawal.toLocaleString('en-IN')}
- Inflation assumption: ${profile.inflationRate}%

Current market context:
- ${niftyStr}
- ${goldStr}

Current MF NAVs being tracked:
${navStr}

Bucket strategy:
- B1 (0–3yr, 21%): SCSS, Senior FD, Liquid MF — funds SWP
- B2 (3–10yr, 32%): Debt MF, BAF, Corporate Bonds — refills B1
- B3 (10–20yr, 47%): Equity MF, Gold ETF — refills B2

Provide specific fund recommendations for each bucket. For each recommendation, respond in this exact format (one per line):
FUND: [fund name] | BUCKET: [B1/B2/B3] | NAV: [current NAV or "see mfapi.in"] | 1YR: [1yr return % or "N/A"] | ALLOC: [suggested % within bucket] | REASON: [1-sentence rationale]

Give 2-3 recommendations per bucket (6-9 total). Focus on real AMFI-registered funds. End with a one-paragraph overall note on market timing if relevant (e.g. whether to tilt equity/gold given Nifty levels).`
}

function parseSuggestions(text: string): AISuggestion[] {
  const lines = text.split('\n').filter((l) => l.startsWith('FUND:'))
  return lines.map((line) => {
    const parts: Record<string, string> = {}
    line.split('|').forEach((part) => {
      const [k, ...v] = part.split(':')
      if (k && v.length) parts[k.trim()] = v.join(':').trim()
    })
    return {
      fund: parts['FUND'] || 'Unknown',
      bucket: (parts['BUCKET'] as 'B1' | 'B2' | 'B3') || 'B1',
      nav: parts['NAV'] || '—',
      oneYearReturn: parts['1YR'] || '—',
      suggestedAllocation: parts['ALLOC'] || '—',
      rationale: parts['REASON'] || '',
    }
  })
}

const BUCKET_BADGE: Record<string, 'blue' | 'amber' | 'green'> = {
  B1: 'blue', B2: 'amber', B3: 'green',
}

export function AIPanel({ profile, marketData }: Props) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>(
    () => storage.getAISuggestions() ?? []
  )
  const [rawNote, setRawNote] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<string | null>(() => storage.getAILastFetched())

  const hasKey = !!profile.claudeApiKey

  async function fetchSuggestions() {
    if (!hasKey) return
    setLoading(true)
    setError(null)

    try {
      const prompt = buildPrompt(profile, marketData)
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': profile.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
      }

      const json = await res.json() as { content: Array<{ type: string; text: string }> }
      const text = json.content.find((c) => c.type === 'text')?.text ?? ''

      const parsed = parseSuggestions(text)
      // Extract note paragraph (lines not starting with FUND:)
      const note = text.split('\n').filter((l) => !l.startsWith('FUND:') && l.trim().length > 40).slice(-3).join(' ')

      setSuggestions(parsed)
      setRawNote(note)
      storage.setAISuggestions(parsed)
      const ts = new Date().toISOString()
      storage.setAILastFetched(ts)
      setLastFetched(ts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch AI suggestions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Fund Recommendations</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Powered by Claude · Not SEBI-registered advice
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastFetched && (
              <span className="text-xs text-gray-400">
                {new Date(lastFetched).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button
              size="sm"
              onClick={fetchSuggestions}
              disabled={loading || !hasKey}
              title={!hasKey ? 'Add Claude API key in settings' : undefined}
            >
              {loading ? 'Fetching…' : '✦ Get Recommendations'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!hasKey && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">🔑</p>
          <p className="text-sm">Add your Claude API key in onboarding to enable AI recommendations.</p>
          <p className="text-xs mt-1">Settings → Reset → re-enter profile with API key</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 font-medium">Fund</th>
                  <th className="pb-2 font-medium">Bucket</th>
                  <th className="pb-2 font-medium">NAV</th>
                  <th className="pb-2 font-medium">1yr Return</th>
                  <th className="pb-2 font-medium">Allocation</th>
                  <th className="pb-2 font-medium">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-800">{s.fund}</td>
                    <td className="py-2.5">
                      <Badge variant={BUCKET_BADGE[s.bucket] ?? 'gray'}>{s.bucket}</Badge>
                    </td>
                    <td className="py-2.5 text-gray-600">{s.nav}</td>
                    <td className="py-2.5 text-gray-600">{s.oneYearReturn}</td>
                    <td className="py-2.5 font-semibold text-blue-700">{s.suggestedAllocation}</td>
                    <td className="py-2.5 text-xs text-gray-500 max-w-xs">{s.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rawNote && (
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">Market Note</p>
              <p>{rawNote}</p>
            </div>
          )}
        </>
      )}

      {hasKey && suggestions.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">✦</p>
          <p className="text-sm">Click "Get Recommendations" to fetch AI-powered fund suggestions based on your profile and current market data.</p>
        </div>
      )}
    </Card>
  )
}
