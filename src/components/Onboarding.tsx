import { useState } from 'react'
import type { UserProfile } from '../types'
import { storage } from '../lib/storage'
import { allocateBuckets } from '../lib/calculations'
import { Button } from './ui/Button'

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

const BUCKET_PREVIEW_CONFIG = [
  { key: 'b1' as const, pct: '10%', horizon: '0–1yr', label: 'B1 — Emergency', color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Liquid · SCSS · FD' },
  { key: 'b2' as const, pct: '20%', horizon: '1–5yr', label: 'B2 — Short Term', color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Short Debt · Corp Bond' },
  { key: 'b3' as const, pct: '30%', horizon: '5–10yr', label: 'B3 — Growth Engine', color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'BAF · Hybrid · Multi-Asset' },
  { key: 'b4' as const, pct: '40%', horizon: '10yr+', label: 'B4 — Legacy Equity', color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Flexi Cap · Large Cap' },
]

export function Onboarding({ onComplete }: Props) {
  const [corpus, setCorpus] = useState('')
  const [withdrawal, setWithdrawal] = useState('')
  const [inflation, setInflation] = useState('6.5')
  const [risk, setRisk] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [taxBracket, setTaxBracket] = useState<0 | 5 | 20 | 30>(20)
  const [refreshInterval, setRefreshInterval] = useState<1 | 6>(6)
  const [groqKey, setGroqKey] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const corpusNum = parseFloat(corpus.replace(/,/g, '')) || 0
  const withdrawalNum = parseFloat(withdrawal.replace(/,/g, '')) || 0

  const bucketPreview = corpusNum > 0 ? allocateBuckets(corpusNum) : null

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (corpusNum <= 0) e.corpus = 'Enter a valid corpus amount'
    if (withdrawalNum <= 0) e.withdrawal = 'Enter a valid monthly withdrawal'
    if (withdrawalNum > corpusNum / 12) e.withdrawal = 'Withdrawal seems too high relative to corpus'
    const inf = parseFloat(inflation)
    if (isNaN(inf) || inf < 2 || inf > 15) e.inflation = 'Inflation should be between 2% and 15%'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const profile: UserProfile = {
      corpus: corpusNum,
      monthlyWithdrawal: withdrawalNum,
      inflationRate: parseFloat(inflation),
      riskAppetite: risk,
      taxBracket,
      refreshInterval,
      groqApiKey: groqKey.trim(),
    }

    storage.setProfile(profile)
    storage.setBuckets(allocateBuckets(corpusNum))
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

          {/* Monthly Withdrawal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Withdrawal (₹)
            </label>
            <input
              type="text"
              placeholder="e.g. 1,00,000"
              value={withdrawal}
              onChange={(e) => setWithdrawal(e.target.value)}
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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

          {/* Risk Appetite */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Risk Appetite — {risk}/5
              <span className="font-normal text-gray-400 ml-2">
                {risk <= 2 ? 'Conservative' : risk === 3 ? 'Moderate' : 'Aggressive'}
              </span>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={risk}
              onChange={(e) => setRisk(parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5)}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Conservative</span>
              <span>Aggressive</span>
            </div>
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

          {/* 4-Bucket preview */}
          {bucketPreview && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Your corpus will be split across 4 buckets:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {BUCKET_PREVIEW_CONFIG.map(({ key, pct, horizon, label, color, bg, desc }) => (
                  <div key={key} className={`rounded-lg p-3 ${bg}`}>
                    <div className={`font-bold text-base ${color}`}>{INR(bucketPreview[key])}</div>
                    <div className={`text-xs font-semibold ${color} mt-0.5`}>{label}</div>
                    <div className="text-xs text-gray-500">{pct} · {horizon}</div>
                    <div className="text-xs text-gray-400 mt-1">{desc}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                B4 (equity) compounds freely → feeds B3 (hybrid) → feeds B2 (debt) → feeds B1 (liquid) → you
              </p>
            </div>
          )}

          <Button type="submit" className="w-full justify-center py-3">
            Launch Dashboard →
          </Button>
        </form>
      </div>
    </div>
  )
}
