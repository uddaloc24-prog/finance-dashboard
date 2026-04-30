import { useState, useEffect } from 'react'
import type { Demographics, UserProfile } from '../types'
import { CITY_OPTIONS, DEFAULT_DEMOGRAPHICS } from '../constants'
import { Card } from './ui/Card'

interface NumFieldProps {
  label: string
  value: number
  min: number
  max: number
  suffix?: string
  onChange: (v: number) => void
}

function NumField({ label, value, min, max, suffix = 'yrs', onChange }: NumFieldProps) {
  const [text, setText] = useState(String(value))

  useEffect(() => { setText(String(value)) }, [value])

  function commit() {
    const parsed = parseInt(text, 10)
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed)
    } else {
      setText(String(value))
    }
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={e => {
            const v = parseInt(e.target.value, 10)
            onChange(v)
            setText(String(v))
          }}
          className="flex-1 accent-blue-600"
        />
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && commit()}
            className="w-14 text-center border border-gray-200 rounded-lg px-1 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="text-xs text-gray-400">{suffix}</span>
        </div>
      </div>
    </div>
  )
}

interface Props {
  profile: UserProfile
  onProfileUpdate: (p: UserProfile) => void
}

export function DemographicsForm({ profile, onProfileUpdate }: Props) {
  const demo = profile.demographics ?? DEFAULT_DEMOGRAPHICS
  const isRetired = demo.currentAge >= demo.retirementAge
  const yearsToRetirement = Math.max(0, demo.retirementAge - demo.currentAge)
  const retirementHorizon = Math.max(0, demo.lifeExpectancy - demo.currentAge)

  function update(partial: Partial<Demographics>) {
    const updated: UserProfile = {
      ...profile,
      demographics: { ...demo, ...partial },
    }
    onProfileUpdate(updated)
  }

  return (
    <Card className="p-0">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Demographics & Longevity</h2>
          <div className="flex items-center gap-2">
            {isRetired ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Retired</span>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {yearsToRetirement}yr to retirement
              </span>
            )}
            <span className="text-xs text-gray-400">{retirementHorizon}yr horizon</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <NumField
            label="Current Age"
            value={demo.currentAge}
            min={30}
            max={85}
            onChange={v => update({ currentAge: v })}
          />
          <NumField
            label="Retirement Age"
            value={demo.retirementAge}
            min={demo.currentAge}
            max={75}
            onChange={v => update({ retirementAge: v })}
          />
          <NumField
            label="Life Expectancy"
            value={demo.lifeExpectancy}
            min={demo.currentAge + 5}
            max={105}
            onChange={v => update({ lifeExpectancy: v })}
          />
          {/* City Tier */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              City Tier
            </label>
            <div className="flex gap-2 flex-wrap">
              {CITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ city: opt.value })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    demo.city === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Spouse section — progressive disclosure */}
        <details className="mt-5">
          <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 transition-colors">
            Spouse Details (optional)
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
            <NumField
              label="Spouse Age"
              value={demo.spouseAge ?? demo.currentAge - 3}
              min={30}
              max={85}
              onChange={v => update({ spouseAge: v })}
            />
            <NumField
              label="Spouse Life Expectancy"
              value={demo.spouseLifeExpectancy ?? 90}
              min={(demo.spouseAge ?? 50) + 5}
              max={105}
              onChange={v => update({ spouseLifeExpectancy: v })}
            />
          </div>
        </details>
      </div>
    </Card>
  )
}
