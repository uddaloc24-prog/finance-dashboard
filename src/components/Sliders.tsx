import { useState, useEffect } from 'react'
import type { ReturnAssumptions, UserProfile } from '../types'
import { Card, CardHeader, CardTitle } from './ui/Card'
import { storage } from '../lib/storage'

interface Props {
  profile: UserProfile
  returnAssumptions: ReturnAssumptions
  onProfileChange: (p: UserProfile) => void
  onReturnsChange: (r: ReturnAssumptions) => void
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
  const min = 10_000
  const max = Math.max(500_000, Math.round(profile.corpus / 100))
  const step = 1_000

  const [localText, setLocalText] = useState(String(profile.monthlyWithdrawal))

  useEffect(() => {
    setLocalText(String(profile.monthlyWithdrawal))
  }, [profile.monthlyWithdrawal])

  const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

  function commit(raw: string) {
    const parsed = parseInt(raw.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = Math.min(max, Math.max(min, parsed))
      const updated = { ...profile, monthlyWithdrawal: clamped }
      storage.setProfile(updated)
      onProfileChange(updated)
      setLocalText(String(clamped))
    } else {
      setLocalText(String(profile.monthlyWithdrawal))
    }
  }

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseInt(e.target.value, 10)
    const updated = { ...profile, monthlyWithdrawal: v }
    storage.setProfile(updated)
    onProfileChange(updated)
    setLocalText(String(v))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-600">Monthly Withdrawal</span>
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
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={profile.monthlyWithdrawal}
        onChange={handleSlider}
        className="w-full accent-purple-600 cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{INR(min)}</span>
        <span>{INR(max)}</span>
      </div>
    </div>
  )
}

export function Sliders({ profile, returnAssumptions, onProfileChange, onReturnsChange }: Props) {
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
        <div className="md:col-span-2">
          <WithdrawalSlider profile={profile} onProfileChange={onProfileChange} />
        </div>
      </div>
    </Card>
  )
}
