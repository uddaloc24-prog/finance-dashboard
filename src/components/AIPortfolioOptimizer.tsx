import { useState } from 'react'
import type { UserProfile, MarketData, ReturnAssumptions, BucketState } from '../types'
import { Card, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { simulateSWP, totalCorpus } from '../lib/calculations'
import { BUCKET_ALLOCATION, PRESERVATION_YEARS } from '../constants'

interface Instrument {
  name: string
  allocationPct: number
  expectedReturnPct: number
  taxNote: string
  rationale: string
}

interface BucketRec {
  instruments: Instrument[]
  blendedReturnPct: number
  rationale: string
}

interface PortfolioRec {
  buckets: { b1: BucketRec; b2: BucketRec; b3: BucketRec; b4: BucketRec }
  corpusPreservationNote: string
  taxOptimizationNote: string
  marketContextNote: string
}

interface Props {
  profile: UserProfile
  buckets: BucketState
  marketData: MarketData | null
  onReturnsUpdate?: (r: ReturnAssumptions) => void
}

const BUCKET_META = {
  b1: { label: 'B1 — Liquid', horizon: '0–1yr', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', bar: 'bg-blue-500' },
  b2: { label: 'B2 — Fixed Income', horizon: '1–5yr', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-400' },
  b3: { label: 'B3 — Hybrid / BAF', horizon: '5–10yr', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500' },
  b4: { label: 'B4 — Equity', horizon: '10yr+', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', bar: 'bg-purple-500' },
}

const CR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

function buildPrompt(profile: UserProfile, buckets: BucketState, market: MarketData | null): string {
  const alloc = profile.bucketAllocation ?? BUCKET_ALLOCATION
  const corpus = totalCorpus(buckets)
  const annualWithdrawal = profile.monthlyWithdrawal * 12
  const withdrawalRate = ((annualWithdrawal / corpus) * 100).toFixed(1)

  const scssRate = market?.scssRate ?? 8.2
  const fdAvg = market
    ? ((market.fdRates.SBI + market.fdRates.HDFC + market.fdRates.ICICI) / 3).toFixed(2)
    : '7.35'
  const niftyStr = market?.nifty ? `Nifty 50 at ${market.nifty.toLocaleString()}` : 'Nifty 50 data unavailable'
  const goldStr = market?.gold ? `Gold at ₹${market.gold.toLocaleString('en-IN')}/10g` : 'Gold data unavailable'

  return `You are an expert Indian retirement portfolio architect. Your ONLY goal is corpus preservation — the retiree must exit retirement with at least as much corpus as they started with.

RETIREE PROFILE:
- Total corpus: ${CR(corpus)} (₹${Math.round(corpus).toLocaleString('en-IN')})
- Monthly withdrawal: ₹${profile.monthlyWithdrawal.toLocaleString('en-IN')} (Annual: ₹${Math.round(annualWithdrawal).toLocaleString('en-IN')}, withdrawal rate: ${withdrawalRate}%)
- Inflation: ${profile.inflationRate}%
- Risk appetite: ${profile.riskAppetite}/5 (${profile.riskAppetite <= 2 ? 'Conservative' : profile.riskAppetite === 3 ? 'Moderate' : 'Aggressive'})
- Tax bracket: ${profile.taxBracket}% income slab

BUCKET ALLOCATION (% of corpus):
- B1 Liquid: ${Math.round(alloc.b1 * 100)}% = ${CR(corpus * alloc.b1)}
- B2 Fixed Income: ${Math.round(alloc.b2 * 100)}% = ${CR(corpus * alloc.b2)}
- B3 Hybrid/BAF: ${Math.round(alloc.b3 * 100)}% = ${CR(corpus * alloc.b3)}
- B4 Equity: ${Math.round(alloc.b4 * 100)}% = ${CR(corpus * alloc.b4)}

INTEREST-ONLY CASCADE MODEL (principals NEVER deplete):
- B4 equity earns returns → full return sent to B3 each year
- B3 hybrid earns returns + receives B4 income → all sent to B2
- B2 fixed income earns returns + receives B3 income → all sent to B1
- B1 liquid earns returns + receives all cascade → funds monthly withdrawal
- Principals of B3 and B4 are PERMANENTLY LOCKED
- B2 (SCSS/FD) principal is locked unless emergency
- Corpus preservation means: total (B1+B2+B3+B4) must stay ≥ initial corpus forever

CURRENT MARKET DATA:
- SCSS rate: ${scssRate}% (quarterly payout, max ₹30L per person, max ₹60L for couple)
- Senior Citizen FD avg: ${fdAvg}% (SBI ${market?.fdRates.SBI ?? 7.25}%, HDFC ${market?.fdRates.HDFC ?? 7.40}%, ICICI ${market?.fdRates.ICICI ?? 7.35}%)
- ${niftyStr}
- ${goldStr}
- RBI Floating Rate Bonds: ~8.05% (taxed at slab)
- InvIT avg yield: ~8.5% (Embassy REIT ~7.5%, IRB InvIT ~9%)

LEGAL INSTRUMENTS AVAILABLE (India only):
B1 (liquid, capital safety): Liquid MF, Overnight MF, Money Market MF, SCSS (if not already in B2)
B2 (fixed income, locked principal): SCSS, Bank FD (senior citizen rates), RBI Floating Rate Bonds, Post Office Time Deposit, Short Duration MF, Corporate Bond MF, InvIT
B3 (hybrid, auto-rebalancing): Balanced Advantage Fund (BAF), Aggressive Hybrid MF, Multi-Asset Allocation MF, Dynamic Asset Allocation MF
B4 (equity, long-term growth): Nifty 50 Index Fund, Nifty Next 50 Index Fund, Flexi Cap MF, Gold ETF (10-20% of B4 as hedge), International ETF (only for aggressive risk)

TASK: Recommend optimal instruments for each bucket. Prioritize:
1. Corpus preservation (return > inflation + withdrawal rate pressure)
2. Legal and tax efficiency for a ${profile.taxBracket}% slab taxpayer
3. Diversification within each bucket
4. Real AMFI-registered funds or government schemes only

Return ONLY valid JSON (no markdown, no code fences, no explanation):
{
  "buckets": {
    "b1": {
      "instruments": [
        {"name": "exact fund/scheme name", "allocationPct": 60, "expectedReturnPct": 7.0, "taxNote": "short tax note", "rationale": "1 sentence why"},
        {"name": "...", "allocationPct": 40, "expectedReturnPct": 8.2, "taxNote": "...", "rationale": "..."}
      ],
      "blendedReturnPct": 7.48,
      "rationale": "1 sentence on B1 strategy"
    },
    "b2": { "instruments": [...], "blendedReturnPct": 7.9, "rationale": "..." },
    "b3": { "instruments": [...], "blendedReturnPct": 10.5, "rationale": "..." },
    "b4": { "instruments": [...], "blendedReturnPct": 12.0, "rationale": "..." }
  },
  "corpusPreservationNote": "2-3 sentences: will corpus be preserved? What is the projected corpus in 10 and 20 years?",
  "taxOptimizationNote": "2-3 sentences on tax efficiency for this user's slab",
  "marketContextNote": "2-3 sentences on current market conditions and any tactical tilts"
}`
}

function parseResult(raw: string): PortfolioRec {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const data = JSON.parse(cleaned)

  // Validate and normalize
  const buckets = data.buckets
  if (!buckets?.b1 || !buckets?.b2 || !buckets?.b3 || !buckets?.b4) {
    throw new Error('Invalid response structure')
  }

  return {
    buckets: {
      b1: normalizeBucket(buckets.b1),
      b2: normalizeBucket(buckets.b2),
      b3: normalizeBucket(buckets.b3),
      b4: normalizeBucket(buckets.b4),
    },
    corpusPreservationNote: String(data.corpusPreservationNote ?? ''),
    taxOptimizationNote: String(data.taxOptimizationNote ?? ''),
    marketContextNote: String(data.marketContextNote ?? ''),
  }
}

function normalizeBucket(raw: { instruments?: unknown; blendedReturnPct?: unknown; rationale?: unknown }): BucketRec {
  const instruments: Instrument[] = Array.isArray(raw.instruments)
    ? raw.instruments.map((i: Record<string, unknown>) => ({
        name: String(i.name ?? ''),
        allocationPct: Number(i.allocationPct ?? 50),
        expectedReturnPct: Number(i.expectedReturnPct ?? 7),
        taxNote: String(i.taxNote ?? ''),
        rationale: String(i.rationale ?? ''),
      }))
    : []

  // Calculate blended return from instruments if AI didn't provide it
  const derived = instruments.reduce((sum, i) => sum + (i.expectedReturnPct * i.allocationPct) / 100, 0)

  return {
    instruments,
    blendedReturnPct: Number(raw.blendedReturnPct ?? derived.toFixed(2)),
    rationale: String(raw.rationale ?? ''),
  }
}

function CorpusStatus({ rec, profile, buckets }: { rec: PortfolioRec; profile: UserProfile; buckets: BucketState }) {
  const aiReturns: ReturnAssumptions = {
    b1: rec.buckets.b1.blendedReturnPct,
    b2: rec.buckets.b2.blendedReturnPct,
    b3: rec.buckets.b3.blendedReturnPct,
    b4: rec.buckets.b4.blendedReturnPct,
  }
  const initialCorpus = totalCorpus(buckets)
  const rows = simulateSWP({
    buckets,
    monthlyWithdrawal: profile.monthlyWithdrawal,
    inflationRate: profile.inflationRate,
    returnAssumptions: aiReturns,
    initialCorpus,
  })

  const yr10 = rows[9]
  const yr20 = rows[Math.min(19, rows.length - 1)]
  const breaches = rows.slice(0, PRESERVATION_YEARS).filter(r => r.corpusBelowInitial).length
  const preserved = breaches === 0

  return (
    <div className={`rounded-xl border p-4 ${preserved ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{preserved ? '✅' : '⚠️'}</span>
        <p className={`font-semibold ${preserved ? 'text-green-800' : 'text-amber-800'}`}>
          {preserved
            ? `Corpus preserved for all ${PRESERVATION_YEARS} years`
            : `Corpus dips below initial in ${breaches} of ${PRESERVATION_YEARS} years`}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Initial Corpus</p>
          <p className="font-bold text-gray-800">{CR(initialCorpus)}</p>
        </div>
        {yr10 && (
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Year 10</p>
            <p className={`font-bold ${yr10.totalCorpus >= initialCorpus ? 'text-green-700' : 'text-amber-700'}`}>
              {CR(yr10.totalCorpus)}
            </p>
          </div>
        )}
        {yr20 && (
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Year 20</p>
            <p className={`font-bold ${yr20.totalCorpus >= initialCorpus ? 'text-green-700' : 'text-amber-700'}`}>
              {CR(yr20.totalCorpus)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function BucketCard({ id, rec, buckets, profile }: { id: 'b1' | 'b2' | 'b3' | 'b4'; rec: BucketRec; buckets: BucketState; profile: UserProfile }) {
  const meta = BUCKET_META[id]
  const alloc = profile.bucketAllocation ?? BUCKET_ALLOCATION
  const corpusAmt = totalCorpus(buckets) * alloc[id]

  return (
    <div className={`rounded-xl border p-4 ${meta.bg} ${meta.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className={`text-sm font-bold ${meta.color}`}>{meta.label}</p>
          <p className="text-xs text-gray-500">{meta.horizon} · {CR(corpusAmt)}</p>
        </div>
        <div className={`text-sm font-bold px-2 py-0.5 rounded-full bg-white border ${meta.border} ${meta.color}`}>
          {rec.blendedReturnPct.toFixed(1)}% blended
        </div>
      </div>

      <div className="space-y-2.5">
        {rec.instruments.map((inst, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-gray-700 truncate max-w-[60%]" title={inst.name}>{inst.name}</span>
              <span className="font-bold text-gray-600 shrink-0 ml-1">{inst.allocationPct}% · {inst.expectedReturnPct}%</span>
            </div>
            <div className="w-full bg-white/60 rounded-full h-1.5">
              <div className={`${meta.bar} h-1.5 rounded-full`} style={{ width: `${inst.allocationPct}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400 mt-0.5">
              <span className="italic">{inst.taxNote}</span>
            </div>
            {inst.rationale && (
              <p className="text-xs text-gray-500 mt-0.5">{inst.rationale}</p>
            )}
          </div>
        ))}
      </div>

      {rec.rationale && (
        <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-white/60 italic">{rec.rationale}</p>
      )}
    </div>
  )
}

export function AIPortfolioOptimizer({ profile, buckets, marketData, onReturnsUpdate }: Props) {
  const [result, setResult] = useState<PortfolioRec | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  const hasKey = !!profile.groqApiKey

  async function runOptimization() {
    if (!hasKey) return
    setLoading(true)
    setError(null)
    setApplied(false)

    try {
      const prompt = buildPrompt(profile, buckets, marketData)
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${profile.groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 2500,
          temperature: 0.3,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
      }

      const json = await res.json() as { choices: Array<{ message: { content: string } }> }
      const text = json.choices[0]?.message?.content ?? ''

      const parsed = parseResult(text)
      setResult(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get AI recommendations')
    } finally {
      setLoading(false)
    }
  }

  function applyReturns() {
    if (!result || !onReturnsUpdate) return
    onReturnsUpdate({
      b1: result.buckets.b1.blendedReturnPct,
      b2: result.buckets.b2.blendedReturnPct,
      b3: result.buckets.b3.blendedReturnPct,
      b4: result.buckets.b4.blendedReturnPct,
    })
    setApplied(true)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>AI Portfolio Optimizer</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Groq · Llama 3.3 70B · Optimized for Indian markets &amp; corpus preservation
            </p>
          </div>
          <Button
            size="sm"
            onClick={runOptimization}
            disabled={loading || !hasKey}
            title={!hasKey ? 'Add Groq API key in settings to enable' : undefined}
          >
            {loading ? 'Analysing…' : '✦ Optimize Portfolio'}
          </Button>
        </div>
      </CardHeader>

      {!hasKey && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">🔑</p>
          <p className="text-sm">Add your Groq API key in onboarding to enable AI optimization.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {hasKey && !result && !loading && !error && (
        <div className="text-center py-10 text-gray-400">
          <p className="text-3xl mb-3">🏛️</p>
          <p className="text-sm font-medium text-gray-500 mb-1">AI Portfolio Architect</p>
          <p className="text-xs max-w-sm mx-auto">
            The AI will analyse your corpus, withdrawal rate, and risk appetite to recommend
            specific Indian instruments for each bucket — and verify corpus is never depleted.
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-5 mt-2">
          {/* 4 bucket cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['b1', 'b2', 'b3', 'b4'] as const).map(id => (
              <BucketCard key={id} id={id} rec={result.buckets[id]} buckets={buckets} profile={profile} />
            ))}
          </div>

          {/* Corpus preservation simulation */}
          <CorpusStatus rec={result} profile={profile} buckets={buckets} />

          {/* Notes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {result.corpusPreservationNote && (
              <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-green-700 mb-1">📊 Corpus Outlook</p>
                <p className="text-xs text-green-800">{result.corpusPreservationNote}</p>
              </div>
            )}
            {result.taxOptimizationNote && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">💰 Tax Efficiency</p>
                <p className="text-xs text-blue-800">{result.taxOptimizationNote}</p>
              </div>
            )}
            {result.marketContextNote && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">📈 Market Context</p>
                <p className="text-xs text-amber-800">{result.marketContextNote}</p>
              </div>
            )}
          </div>

          {/* Apply returns button */}
          {onReturnsUpdate && (
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Apply AI returns to simulation</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Updates the assumption sliders: B1 {result.buckets.b1.blendedReturnPct.toFixed(1)}% ·
                  B2 {result.buckets.b2.blendedReturnPct.toFixed(1)}% ·
                  B3 {result.buckets.b3.blendedReturnPct.toFixed(1)}% ·
                  B4 {result.buckets.b4.blendedReturnPct.toFixed(1)}%
                </p>
              </div>
              <Button
                variant={applied ? 'secondary' : 'primary'}
                size="sm"
                onClick={applyReturns}
                disabled={applied}
              >
                {applied ? '✓ Applied' : 'Apply Returns'}
              </Button>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            Not SEBI-registered advice. Verify instruments and returns with a qualified financial advisor before investing.
          </p>
        </div>
      )}
    </Card>
  )
}
