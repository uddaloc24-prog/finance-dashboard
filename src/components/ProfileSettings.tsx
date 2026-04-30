import { useState, useEffect } from 'react'
import type { UserProfile, PaymentFrequency } from '../types'
import { storage } from '../lib/storage'
import { allocateBuckets, totalCorpus } from '../lib/calculations'
import type { BucketState } from '../types'
import { RiskProfiler, type RiskResult } from './RiskProfiler'
import { Card } from './ui/Card'

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

const TAX_OPTIONS: Array<{ label: string; value: 0 | 5 | 20 | 30 }> = [
  { label: 'Nil (0%)', value: 0 },
  { label: '5%', value: 5 },
  { label: '20%', value: 20 },
  { label: '30%', value: 30 },
]

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

function FreqTabs({ value, onChange }: { value: PaymentFrequency; onChange: (f: PaymentFrequency) => void }) {
  return (
    <div className="flex gap-1 mb-1.5">
      {FREQ_OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
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
  profile: UserProfile
  buckets: BucketState
  onProfileUpdate: (p: UserProfile) => void
  onBucketsUpdate: (b: BucketState) => void
}

export function ProfileSettings({ profile, buckets, onProfileUpdate, onBucketsUpdate }: Props) {
  const [open, setOpen] = useState(false)
  const [showProfiler, setShowProfiler] = useState(false)
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null)

  // Local state for editable fields
  const [corpusText, setCorpusText] = useState(String(profile.corpus))
  const [withdrawalText, setWithdrawalText] = useState(String(profile.withdrawalAmount ?? profile.monthlyWithdrawal))
  const [withdrawalFreq, setWithdrawalFreq] = useState<PaymentFrequency>(profile.withdrawalFrequency ?? 'monthly')
  const [sipText, setSipText] = useState(String(profile.sipAmount ?? 0))
  const [sipFreq, setSipFreq] = useState<PaymentFrequency>(profile.sipFrequency ?? 'monthly')
  const [groqKey, setGroqKey] = useState(profile.groqApiKey ?? '')

  // Sync local state when profile changes externally (e.g. from Sliders)
  useEffect(() => {
    setWithdrawalText(String(profile.withdrawalAmount ?? profile.monthlyWithdrawal))
    setWithdrawalFreq(profile.withdrawalFrequency ?? 'monthly')
    setSipText(String(profile.sipAmount ?? 0))
    setSipFreq(profile.sipFrequency ?? 'monthly')
  }, [profile.withdrawalAmount, profile.monthlyWithdrawal, profile.withdrawalFrequency, profile.sipAmount, profile.sipFrequency])

  function update(partial: Partial<UserProfile>) {
    const updated = { ...profile, ...partial }
    storage.setProfile(updated)
    onProfileUpdate(updated)
  }

  function commitCorpus() {
    const parsed = parseInt(corpusText.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(parsed) && parsed > 0) {
      const alloc = profile.bucketAllocation ?? { b1: 0.10, b2: 0.20, b3: 0.30, b4: 0.40 }
      const newBuckets = allocateBuckets(parsed, alloc)
      update({ corpus: parsed })
      storage.setBuckets(newBuckets)
      onBucketsUpdate(newBuckets)
      setCorpusText(String(parsed))
    } else {
      setCorpusText(String(profile.corpus))
    }
  }

  function commitWithdrawal() {
    const parsed = parseInt(withdrawalText.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(parsed) && parsed > 0) {
      const monthly = toMonthly(parsed, withdrawalFreq)
      update({ withdrawalAmount: parsed, withdrawalFrequency: withdrawalFreq, monthlyWithdrawal: monthly })
      setWithdrawalText(String(parsed))
    } else {
      setWithdrawalText(String(profile.withdrawalAmount ?? profile.monthlyWithdrawal))
    }
  }

  function handleWithdrawalFreqChange(f: PaymentFrequency) {
    const currentMonthly = profile.monthlyWithdrawal
    const newMonths = FREQ_OPTIONS.find(o => o.value === f)!.months
    const newAmount = Math.round(currentMonthly * newMonths)
    setWithdrawalFreq(f)
    setWithdrawalText(String(newAmount))
    update({ withdrawalAmount: newAmount, withdrawalFrequency: f, monthlyWithdrawal: currentMonthly })
  }

  function commitSip() {
    const parsed = parseInt(sipText.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(parsed) && parsed >= 0) {
      update({ sipAmount: parsed, sipFrequency: sipFreq })
      setSipText(String(parsed))
    } else {
      setSipText(String(profile.sipAmount ?? 0))
    }
  }

  function handleSipFreqChange(f: PaymentFrequency) {
    const currentMonthly = toMonthly(profile.sipAmount ?? 0, sipFreq)
    const newMonths = FREQ_OPTIONS.find(o => o.value === f)!.months
    const newAmount = Math.round(currentMonthly * newMonths)
    setSipFreq(f)
    setSipText(String(newAmount))
    update({ sipAmount: newAmount, sipFrequency: f })
  }

  function commitGroq() {
    update({ groqApiKey: groqKey.trim() })
  }

  const corpus = totalCorpus(buckets)
  const riskLabel = profile.riskAppetite <= 2 ? 'Conservative' : profile.riskAppetite === 3 ? 'Moderate' : 'Aggressive'

  return (
    <Card>
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="profile-settings-panel"
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg" aria-hidden="true">&#9881;</span>
          <div className="text-left">
            <h2 className="text-sm font-semibold text-gray-800">Profile & Settings</h2>
            <p className="text-xs text-gray-400">
              Corpus {INR(corpus)} · Tax {profile.taxBracket}% · Risk {riskLabel} ({profile.riskAppetite}/5)
            </p>
          </div>
        </div>
        <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">&#9662;</span>
      </button>

      {/* Expanded settings */}
      {open && (
        <div id="profile-settings-panel" className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Corpus */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Total Retirement Corpus
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-500">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={corpusText}
                  onChange={e => setCorpusText(e.target.value)}
                  onBlur={commitCorpus}
                  onKeyDown={e => e.key === 'Enter' && commitCorpus()}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Changing corpus re-allocates all buckets</p>
            </div>

            {/* Tax Bracket */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Tax Bracket
              </label>
              <div className="flex gap-2">
                {TAX_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ taxBracket: opt.value })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      profile.taxBracket === opt.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Withdrawal */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Withdrawal
              </label>
              <FreqTabs value={withdrawalFreq} onChange={handleWithdrawalFreqChange} />
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-purple-600">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={withdrawalText}
                  onChange={e => setWithdrawalText(e.target.value)}
                  onBlur={commitWithdrawal}
                  onKeyDown={e => e.key === 'Enter' && commitWithdrawal()}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              {withdrawalFreq !== 'monthly' && (
                <p className="text-xs text-gray-400 mt-1">= {INR(profile.monthlyWithdrawal)}/month</p>
              )}
            </div>

            {/* SIP / Passive Income */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                SIP / Passive Income
              </label>
              <FreqTabs value={sipFreq} onChange={handleSipFreqChange} />
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-teal-600">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={sipText}
                  onChange={e => setSipText(e.target.value)}
                  onBlur={commitSip}
                  onKeyDown={e => e.key === 'Enter' && commitSip()}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              {(profile.sipAmount ?? 0) > 0 && sipFreq !== 'monthly' && (
                <p className="text-xs text-gray-400 mt-1">= {INR(toMonthly(profile.sipAmount ?? 0, sipFreq))}/month</p>
              )}
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {!showProfiler ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Risk Profile</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">
                      {riskLabel} ({profile.riskAppetite}/5)
                      {riskResult && <span className="text-xs font-medium text-green-600 ml-2">Assessed</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={profile.riskAppetite}
                      onChange={e => update({ riskAppetite: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
                      aria-label="Risk appetite"
                      className="w-32 accent-blue-600"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfiler(true)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  Take Detailed Risk Assessment
                </button>
                <p className="text-xs text-gray-400 text-center mt-1.5">
                  15 questions — auto-adjusts your bucket allocation based on your profile
                </p>
              </div>
            ) : (
              <div className="p-4">
                <RiskProfiler
                  onComplete={(result) => {
                    setRiskResult(result)
                    update({ riskAppetite: result.riskScore })
                    // Apply recommended allocation
                    const allocFractions = {
                      b1: result.allocation.b1 / 100,
                      b2: result.allocation.b2 / 100,
                      b3: result.allocation.b3 / 100,
                      b4: result.allocation.b4 / 100,
                    }
                    const newBuckets = allocateBuckets(corpus, allocFractions)
                    const updated = { ...profile, riskAppetite: result.riskScore, bucketAllocation: allocFractions }
                    storage.setProfile(updated)
                    onProfileUpdate(updated)
                    storage.setBuckets(newBuckets)
                    onBucketsUpdate(newBuckets)
                    setShowProfiler(false)
                  }}
                  onSkip={() => setShowProfiler(false)}
                />
              </div>
            )}
          </div>

          {/* Groq API Key + Refresh */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Groq API Key <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="password"
                placeholder="gsk_..."
                value={groqKey}
                onChange={e => setGroqKey(e.target.value)}
                onBlur={commitGroq}
                onKeyDown={e => e.key === 'Enter' && commitGroq()}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <p className="text-xs text-gray-400 mt-1">Stored in browser only. Sent only to api.groq.com.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Market Data Refresh
              </label>
              <div className="flex gap-2">
                {([1, 6] as const).map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => update({ refreshInterval: h })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      profile.refreshInterval === h
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Every {h}hr{h > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
