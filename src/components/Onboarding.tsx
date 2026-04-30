import { useState } from 'react'
import type { UserProfile, PaymentFrequency } from '../types'
import { storage } from '../lib/storage'
import { allocateBuckets } from '../lib/calculations'
import { Button } from './ui/Button'
import { RiskProfiler, type RiskResult } from './RiskProfiler'

const FREQ_OPTIONS: Array<{ label: string; value: PaymentFrequency; months: number }> = [
  { label: 'Monthly', value: 'monthly', months: 1 },
  { label: 'Quarterly', value: 'quarterly', months: 3 },
  { label: 'Half-Yearly', value: 'half-yearly', months: 6 },
  { label: 'Yearly', value: 'yearly', months: 12 },
]

function toMonthly(amount: number, freq: PaymentFrequency): number {
  const opt = FREQ_OPTIONS.find(f => f.value === freq)!
  return amount / opt.months
}

function FreqTabs({ value, onChange }: { value: PaymentFrequency; onChange: (f: PaymentFrequency) => void }) {
  return (
    <div className="flex gap-1 mb-2">
      {FREQ_OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

interface Props {
  onComplete: (profile: UserProfile) => void
}

const TAX_OPTIONS: Array<{ label: string; value: 0 | 5 | 20 | 30 }> = [
  { label: 'Nil (0%)', value: 0 },
  { label: '5%', value: 5 },
  { label: '20%', value: 20 },
  { label: '30%', value: 30 },
]

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const CR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return INR(n)
}

const ALLOC_CONFIG = [
  { key: 'b1' as const, label: 'B1 — Liquid', horizon: '0–1yr', desc: 'Liquid MF · Money Market · Overnight', color: 'text-blue-600', bg: 'bg-blue-50', accent: 'accent-blue-500', barColor: 'bg-blue-500', min: 5, max: 30 },
  { key: 'b2' as const, label: 'B2 — Fixed Income', horizon: '1–5yr', desc: 'SCSS · Senior FD · Short Debt · InvIT', color: 'text-amber-600', bg: 'bg-amber-50', accent: 'accent-amber-500', barColor: 'bg-amber-400', min: 10, max: 60 },
  { key: 'b3' as const, label: 'B3 — Hybrid/BAF', horizon: '5–10yr', desc: 'BAF · Aggressive Hybrid · Multi-Asset', color: 'text-emerald-600', bg: 'bg-emerald-50', accent: 'accent-emerald-500', barColor: 'bg-emerald-500', min: 10, max: 50 },
  { key: 'b4' as const, label: 'B4 — Equity', horizon: '10yr+', desc: 'Flexi Cap · Large Cap · Nifty 50 · Gold ETF', color: 'text-purple-600', bg: 'bg-purple-50', accent: 'accent-purple-500', barColor: 'bg-purple-500', min: 10, max: 60 },
]

export function Onboarding({ onComplete }: Props) {
  const [corpus, setCorpus] = useState('')
  const [withdrawal, setWithdrawal] = useState('')
  const [withdrawalFreq, setWithdrawalFreq] = useState<PaymentFrequency>('monthly')
  const [sip, setSip] = useState('')
  const [sipFreq, setSipFreq] = useState<PaymentFrequency>('monthly')
  const [inflation, setInflation] = useState('6.5')
  const [risk, setRisk] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [taxBracket, setTaxBracket] = useState<0 | 5 | 20 | 30>(20)
  const [refreshInterval, setRefreshInterval] = useState<1 | 6>(6)
  const [groqKey, setGroqKey] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [alloc, setAlloc] = useState({ b1: 10, b2: 20, b3: 30, b4: 40 })
  const [showProfiler, setShowProfiler] = useState(false)
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null)

  const corpusNum = parseFloat(corpus.replace(/,/g, '')) || 0
  const withdrawalNum = parseFloat(withdrawal.replace(/,/g, '')) || 0
  const sipNum = parseFloat(sip.replace(/,/g, '')) || 0
  const monthlyWithdrawal = toMonthly(withdrawalNum, withdrawalFreq)
  const allocSum = alloc.b1 + alloc.b2 + alloc.b3 + alloc.b4
  const allocValid = allocSum === 100

  function setAllocKey(key: keyof typeof alloc, val: number) {
    setAlloc(prev => ({ ...prev, [key]: val }))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (corpusNum <= 0) e.corpus = 'Enter a valid corpus amount'
    if (withdrawalNum <= 0) e.withdrawal = 'Enter a valid withdrawal amount'
    if (monthlyWithdrawal > corpusNum / 12) e.withdrawal = 'Withdrawal seems too high relative to corpus'
    const inf = parseFloat(inflation)
    if (isNaN(inf) || inf < 2 || inf > 15) e.inflation = 'Inflation should be between 2% and 15%'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !allocValid) return

    const bucketAllocation = {
      b1: alloc.b1 / 100,
      b2: alloc.b2 / 100,
      b3: alloc.b3 / 100,
      b4: alloc.b4 / 100,
    }

    const profile: UserProfile = {
      corpus: corpusNum,
      monthlyWithdrawal,
      withdrawalFrequency: withdrawalFreq,
      withdrawalAmount: withdrawalNum,
      sipAmount: sipNum,
      sipFrequency: sipFreq,
      inflationRate: parseFloat(inflation),
      riskAppetite: risk,
      taxBracket,
      refreshInterval,
      groqApiKey: groqKey.trim(),
      bucketAllocation,
    }

    storage.setProfile(profile)
    storage.setBuckets(allocateBuckets(corpusNum, bucketAllocation))
    onComplete(profile)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white text-2xl mb-4">
            🪣
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Retirement Planner</h1>
          <p className="text-gray-500 mt-2">4-Bucket Strategy · HDFC Model · Indian Retirees</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-3">Your Profile</h2>

          {/* Corpus */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Retirement Corpus (₹)
            </label>
            <input
              type="text"
              placeholder="e.g. 2,00,00,000"
              value={corpus}
              onChange={(e) => setCorpus(e.target.value)}
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.corpus && <p className="text-red-500 text-xs mt-1">{errors.corpus}</p>}
          </div>

          {/* SIP / Passive Income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SIP / Passive Income (₹)
              <span className="text-gray-400 font-normal ml-1">— optional additional inflow</span>
            </label>
            <FreqTabs value={sipFreq} onChange={setSipFreq} />
            <input
              type="text"
              placeholder="e.g. 10,000"
              value={sip}
              onChange={(e) => setSip(e.target.value)}
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {sipNum > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                = {INR(toMonthly(sipNum, sipFreq))}/month
              </p>
            )}
          </div>

          {/* Withdrawal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Withdrawal (₹)
            </label>
            <FreqTabs value={withdrawalFreq} onChange={setWithdrawalFreq} />
            <input
              type="text"
              placeholder="e.g. 1,00,000"
              value={withdrawal}
              onChange={(e) => setWithdrawal(e.target.value)}
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {withdrawalNum > 0 && withdrawalFreq !== 'monthly' && (
              <p className="text-xs text-gray-400 mt-1">
                = {INR(monthlyWithdrawal)}/month
              </p>
            )}
            {errors.withdrawal && <p className="text-red-500 text-xs mt-1">{errors.withdrawal}</p>}
          </div>

          {/* Inflation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Inflation Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="2"
              max="15"
              value={inflation}
              onChange={(e) => setInflation(e.target.value)}
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.inflation && <p className="text-red-500 text-xs mt-1">{errors.inflation}</p>}
          </div>

          {/* Risk Profiling */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {!showProfiler ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Risk Appetite — {risk}/5
                    <span className="font-normal text-gray-400 ml-2">
                      {risk <= 2 ? 'Conservative' : risk === 3 ? 'Moderate' : 'Aggressive'}
                    </span>
                  </label>
                  {riskResult && (
                    <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Assessed
                    </span>
                  )}
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={risk}
                  onChange={(e) => setRisk(parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Conservative</span>
                  <span>Aggressive</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfiler(true)}
                  className="w-full mt-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  Take Risk Assessment (recommended)
                </button>
                <p className="text-xs text-gray-400 text-center">
                  15 questions across 5 categories — auto-adjusts your bucket allocation
                </p>
              </div>
            ) : (
              <div className="p-4">
                <RiskProfiler
                  onComplete={(result) => {
                    setRiskResult(result)
                    setRisk(result.riskScore)
                    setAlloc(result.allocation)
                    setShowProfiler(false)
                  }}
                  onSkip={() => setShowProfiler(false)}
                />
              </div>
            )}
          </div>

          {/* Tax Bracket */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax Bracket</label>
            <div className="flex gap-3">
              {TAX_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tax"
                    value={opt.value}
                    checked={taxBracket === opt.value}
                    onChange={() => setTaxBracket(opt.value)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Refresh Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Market Data Refresh Interval
            </label>
            <div className="flex gap-4">
              {([1, 6] as const).map((h) => (
                <label key={h} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="refresh"
                    value={h}
                    checked={refreshInterval === h}
                    onChange={() => setRefreshInterval(h)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Every {h} hour{h > 1 ? 's' : ''}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Groq API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Groq API Key{' '}
              <span className="text-gray-400 font-normal">(optional — free AI fund recommendations)</span>
            </label>
            <input
              type="password"
              placeholder="gsk_..."
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              className="w-full border rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Stored only in your browser's localStorage. Sent only to api.groq.com.
            </p>
          </div>

          {/* Bucket Allocation sliders */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Bucket Allocation
              </p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${allocValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                Sum: {allocSum}% {allocValid ? '✓' : '— must equal 100%'}
              </span>
            </div>

            {/* Stacked bar */}
            <div className="flex rounded-full overflow-hidden h-3 w-full">
              {ALLOC_CONFIG.map(c => (
                <div key={c.key} className={`${c.barColor} transition-all`} style={{ width: `${alloc[c.key]}%` }} />
              ))}
            </div>

            {/* Per-bucket sliders */}
            {ALLOC_CONFIG.map(({ key, label, horizon, desc, color, accent, min, max }) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-semibold ${color}`}>{label}</span>
                    <span className="text-xs text-gray-400 ml-1">· {horizon}</span>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-sm font-bold ${color}`}>{alloc[key]}%</span>
                    {corpusNum > 0 && (
                      <span className="text-xs text-gray-400 ml-1">({CR(corpusNum * alloc[key] / 100)})</span>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={1}
                  value={alloc[key]}
                  onChange={e => setAllocKey(key, parseInt(e.target.value))}
                  className={`w-full cursor-pointer ${accent}`}
                />
              </div>
            ))}

            <p className="text-xs text-gray-400 text-center">
              Drag to set custom splits. Default is HDFC 10/20/30/40. HNI investors often use 15/40/25/20.
            </p>
          </div>

          <Button type="submit" disabled={!allocValid} className="w-full justify-center py-3">
            {allocValid ? 'Launch Dashboard →' : `Fix allocation (${allocSum}% / 100%)`}
          </Button>
        </form>
      </div>
    </div>
  )
}
