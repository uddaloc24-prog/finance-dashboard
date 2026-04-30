import { useState, useEffect } from 'react'
import type { ReturnAssumptions, UserProfile, BucketState, PaymentFrequency } from '../types'
import { Card, CardHeader, CardTitle } from './ui/Card'
import { storage } from '../lib/storage'
import { totalCorpus, allocateBuckets } from '../lib/calculations'
import { BUCKET_ALLOCATION } from '../constants'

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
  returnAssumptions: ReturnAssumptions
  onProfileChange: (p: UserProfile) => void
  onReturnsChange: (r: ReturnAssumptions) => void
  onBucketsUpdate: (b: BucketState) => void
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  color: string
  unit?: string
  onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, step, color, unit = '%', onChange }: SliderRowProps) {
  const [localText, setLocalText] = useState(String(value))

  useEffect(() => {
    setLocalText(String(value))
  }, [value])

  function commitText() {
    const parsed = parseFloat(localText)
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed))
      onChange(clamped)
      setLocalText(String(clamped))
    } else {
      setLocalText(String(value))
    }
  }

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value)
    onChange(v)
    setLocalText(String(v))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={localText}
            min={min}
            max={max}
            step={step}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => e.key === 'Enter' && commitText()}
            className={`w-20 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 ${color}`}
          />
          <span className={`text-sm font-bold ${color}`}>{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSlider}
        aria-label={label}
        className="w-full accent-blue-600 cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

interface WithdrawalSliderProps {
  profile: UserProfile
  onProfileChange: (p: UserProfile) => void
}

function WithdrawalSlider({ profile, onProfileChange }: WithdrawalSliderProps) {
  const freq = profile.withdrawalFrequency ?? 'monthly'
  const freqMonths = FREQ_OPTIONS.find(f => f.value === freq)!.months
  const freqLabel = FREQ_OPTIONS.find(f => f.value === freq)!.label

  // Slider operates on the amount at the chosen frequency
  const displayAmount = profile.withdrawalAmount ?? profile.monthlyWithdrawal
  const min = 10_000
  const max = Math.max(500_000, Math.round(profile.corpus / 100)) * freqMonths
  const step = freqMonths >= 6 ? 5_000 : 1_000

  const [localText, setLocalText] = useState(String(displayAmount))

  useEffect(() => {
    setLocalText(String(profile.withdrawalAmount ?? profile.monthlyWithdrawal))
  }, [profile.withdrawalAmount, profile.monthlyWithdrawal])

  const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

  function applyAmount(amount: number, newFreq?: PaymentFrequency) {
    const f = newFreq ?? freq
    const monthly = toMonthly(amount, f)
    const updated = { ...profile, withdrawalAmount: amount, withdrawalFrequency: f, monthlyWithdrawal: monthly }
    storage.setProfile(updated)
    onProfileChange(updated)
  }

  function commit(raw: string) {
    const parsed = parseInt(raw.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = Math.min(max, Math.max(min, parsed))
      applyAmount(clamped)
      setLocalText(String(clamped))
    } else {
      setLocalText(String(displayAmount))
    }
  }

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseInt(e.target.value, 10)
    applyAmount(v)
    setLocalText(String(v))
  }

  function handleFreqChange(f: PaymentFrequency) {
    // Convert current monthly equivalent to new frequency amount
    const monthly = profile.monthlyWithdrawal
    const newMonths = FREQ_OPTIONS.find(o => o.value === f)!.months
    const newAmount = Math.round(monthly * newMonths)
    applyAmount(newAmount, f)
    setLocalText(String(newAmount))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-600">{freqLabel} Withdrawal</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-purple-700">₹</span>
          <input
            type="text"
            inputMode="numeric"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit(localText)}
            placeholder="e.g. 100000"
            className="w-28 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>
      <FreqTabs value={freq} onChange={handleFreqChange} />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={displayAmount}
        onChange={handleSlider}
        className="w-full accent-purple-600 cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{INR(min)}</span>
        <span>{INR(max)}</span>
      </div>
      {freq !== 'monthly' && (
        <p className="text-xs text-gray-400">= {INR(profile.monthlyWithdrawal)}/month</p>
      )}
    </div>
  )
}

interface SIPSliderProps {
  profile: UserProfile
  onProfileChange: (p: UserProfile) => void
}

function SIPSlider({ profile, onProfileChange }: SIPSliderProps) {
  const freq = profile.sipFrequency ?? 'monthly'
  const freqLabel = FREQ_OPTIONS.find(f => f.value === freq)!.label
  const freqMonths = FREQ_OPTIONS.find(f => f.value === freq)!.months
  const sipAmount = profile.sipAmount ?? 0

  const min = 0
  const max = Math.max(200_000, Math.round(profile.corpus / 200)) * freqMonths
  const step = freqMonths >= 6 ? 5_000 : 1_000

  const [localText, setLocalText] = useState(String(sipAmount))

  useEffect(() => {
    setLocalText(String(profile.sipAmount ?? 0))
  }, [profile.sipAmount])

  const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

  function applyAmount(amount: number, newFreq?: PaymentFrequency) {
    const f = newFreq ?? freq
    const updated = { ...profile, sipAmount: amount, sipFrequency: f }
    storage.setProfile(updated)
    onProfileChange(updated)
  }

  function commit(raw: string) {
    const parsed = parseInt(raw.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(parsed) && parsed >= 0) {
      const clamped = Math.min(max, Math.max(min, parsed))
      applyAmount(clamped)
      setLocalText(String(clamped))
    } else {
      setLocalText(String(sipAmount))
    }
  }

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseInt(e.target.value, 10)
    applyAmount(v)
    setLocalText(String(v))
  }

  function handleFreqChange(f: PaymentFrequency) {
    const monthlySip = toMonthly(sipAmount, freq)
    const newMonths = FREQ_OPTIONS.find(o => o.value === f)!.months
    const newAmount = Math.round(monthlySip * newMonths)
    applyAmount(newAmount, f)
    setLocalText(String(newAmount))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-600">{freqLabel} SIP / Passive Income</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-teal-700">₹</span>
          <input
            type="text"
            inputMode="numeric"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit(localText)}
            placeholder="e.g. 10000"
            className="w-28 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
      </div>
      <FreqTabs value={freq} onChange={handleFreqChange} />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sipAmount}
        onChange={handleSlider}
        className="w-full accent-teal-600 cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{INR(min)}</span>
        <span>{INR(max)}</span>
      </div>
      {sipAmount > 0 && freq !== 'monthly' && (
        <p className="text-xs text-gray-400">= {INR(toMonthly(sipAmount, freq))}/month</p>
      )}
    </div>
  )
}

const REALLOC_CONFIG = [
  { key: 'b1' as const, label: 'B1 — Liquid', color: 'text-blue-600', accent: 'accent-blue-500', barColor: 'bg-blue-500', min: 5, max: 30 },
  { key: 'b2' as const, label: 'B2 — Fixed Income', color: 'text-amber-600', accent: 'accent-amber-500', barColor: 'bg-amber-400', min: 10, max: 60 },
  { key: 'b3' as const, label: 'B3 — Hybrid/BAF', color: 'text-emerald-600', accent: 'accent-emerald-500', barColor: 'bg-emerald-500', min: 10, max: 50 },
  { key: 'b4' as const, label: 'B4 — Equity', color: 'text-purple-600', accent: 'accent-purple-500', barColor: 'bg-purple-500', min: 10, max: 60 },
]

function toIntPct(allocation: { b1: number; b2: number; b3: number; b4: number }) {
  return {
    b1: Math.round(allocation.b1 * 100),
    b2: Math.round(allocation.b2 * 100),
    b3: Math.round(allocation.b3 * 100),
    b4: Math.round(allocation.b4 * 100),
  }
}

interface BucketAllocProps {
  profile: UserProfile
  buckets: BucketState
  onProfileChange: (p: UserProfile) => void
  onBucketsUpdate: (b: BucketState) => void
}

function BucketAllocationSliders({ profile, buckets, onProfileChange, onBucketsUpdate }: BucketAllocProps) {
  const currentAlloc = profile.bucketAllocation ?? BUCKET_ALLOCATION
  const [alloc, setAlloc] = useState(() => toIntPct(currentAlloc))
  const corpus = totalCorpus(buckets)
  const allocSum = alloc.b1 + alloc.b2 + alloc.b3 + alloc.b4
  const allocValid = allocSum === 100

  const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
  const CR = (n: number) => {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
    return INR(n)
  }

  function handleRebalance() {
    if (!allocValid) return
    const newAllocation = { b1: alloc.b1 / 100, b2: alloc.b2 / 100, b3: alloc.b3 / 100, b4: alloc.b4 / 100 }
    const newBuckets = allocateBuckets(corpus, newAllocation)
    const updatedProfile = { ...profile, bucketAllocation: newAllocation }
    storage.setProfile(updatedProfile)
    storage.setBuckets(newBuckets)
    onProfileChange(updatedProfile)
    onBucketsUpdate(newBuckets)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Bucket Rebalance</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${allocValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {allocSum}% {allocValid ? '✓' : '≠ 100%'}
        </span>
      </div>

      {/* Stacked bar */}
      <div className="flex rounded-full overflow-hidden h-2.5 w-full">
        {REALLOC_CONFIG.map(c => (
          <div key={c.key} className={`${c.barColor} transition-all`} style={{ width: `${alloc[c.key]}%` }} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REALLOC_CONFIG.map(({ key, label, color, accent, min, max }) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${color}`}>{label}</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold ${color}`}>{alloc[key]}%</span>
                <span className="text-xs text-gray-400">({CR(corpus * alloc[key] / 100)})</span>
              </div>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={1}
              value={alloc[key]}
              onChange={e => setAlloc(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
              className={`w-full cursor-pointer ${accent}`}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-xs text-gray-400">
          Rebalancing redistributes your current {CR(corpus)} corpus across buckets.
        </p>
        <button
          onClick={handleRebalance}
          disabled={!allocValid}
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shrink-0"
        >
          Rebalance Now
        </button>
      </div>
    </div>
  )
}

export function Sliders({ profile, buckets, returnAssumptions, onProfileChange, onReturnsChange, onBucketsUpdate }: Props) {
  function updateReturns(key: keyof ReturnAssumptions, val: number) {
    onReturnsChange({ ...returnAssumptions, [key]: val })
  }

  function updateInflation(val: number) {
    const updated = { ...profile, inflationRate: val }
    storage.setProfile(updated)
    onProfileChange(updated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assumption Sliders</CardTitle>
        <p className="text-xs text-gray-400 mt-0.5">
          Drag or type — charts update live
        </p>
      </CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <SliderRow
            label="Inflation Rate"
            value={profile.inflationRate}
            min={3}
            max={12}
            step={0.5}
            color="text-orange-600"
            onChange={updateInflation}
          />
          <SliderRow
            label="B1 Return (Liquid / SCSS / FD)"
            value={returnAssumptions.b1}
            min={5}
            max={9}
            step={0.5}
            color="text-blue-700"
            onChange={(v) => updateReturns('b1', v)}
          />
          <SliderRow
            label="B2 Return (Short Debt / Corp Bond)"
            value={returnAssumptions.b2}
            min={6}
            max={10}
            step={0.5}
            color="text-amber-700"
            onChange={(v) => updateReturns('b2', v)}
          />
        </div>
        <div className="space-y-5">
          <SliderRow
            label="B3 Return (BAF / Hybrid / Multi-Asset)"
            value={returnAssumptions.b3}
            min={7}
            max={12}
            step={0.5}
            color="text-emerald-700"
            onChange={(v) => updateReturns('b3', v)}
          />
          <SliderRow
            label="B4 Return (Equity / Flexi Cap)"
            value={returnAssumptions.b4}
            min={8}
            max={18}
            step={0.5}
            color="text-purple-700"
            onChange={(v) => updateReturns('b4', v)}
          />
        </div>
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <WithdrawalSlider profile={profile} onProfileChange={onProfileChange} />
          <SIPSlider profile={profile} onProfileChange={onProfileChange} />
        </div>
        <div className="md:col-span-2 border-t border-gray-100 pt-5">
          <BucketAllocationSliders
            profile={profile}
            buckets={buckets}
            onProfileChange={onProfileChange}
            onBucketsUpdate={onBucketsUpdate}
          />
        </div>
      </div>
    </Card>
  )
}
