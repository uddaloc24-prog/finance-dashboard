// InflationAssumptions — split out from ExpenseEditor so the Plan tab
// has four equally-weighted subsections rather than nesting inflation
// inside the expense card.

import type { ExpenseProfile, UserProfile } from '../types'
import { DEFAULT_EXPENSES } from '../constants'
import { Card } from './ui/Card'

interface Props {
  profile: UserProfile
  onProfileUpdate: (p: UserProfile) => void
  chrome?: 'default' | 'bare'
}

export function InflationAssumptions({ profile, onProfileUpdate, chrome = 'default' }: Props) {
  const expenses = profile.expenses ?? DEFAULT_EXPENSES

  function update(partial: Partial<ExpenseProfile>) {
    const updated: UserProfile = {
      ...profile,
      expenses: { ...expenses, ...partial },
    }
    onProfileUpdate(updated)
  }

  const body = (
    <>
      {chrome !== 'bare' && (
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-gray-800">Inflation Assumptions</h2>
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Annual rates</span>
        </div>
      )}
      <p className="text-[11px] text-gray-500 mb-4 leading-snug">
        Healthcare and education historically inflate faster than the CPI basket — split rates let the projection
        model purchasing-power decay realistically.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InflationSlider
            label="General"
            helper="Essentials & lifestyle"
            value={expenses.generalInflation}
            onChange={(v) => update({ generalInflation: v })}
          />
          <InflationSlider
            label="Healthcare"
            helper="Medical & insurance"
            value={expenses.healthcareInflation}
            onChange={(v) => update({ healthcareInflation: v })}
            color="text-red-600"
          />
        <InflationSlider
          label="Education"
          helper="Grandchildren & courses"
          value={expenses.educationInflation}
          onChange={(v) => update({ educationInflation: v })}
          color="text-amber-600"
        />
      </div>
    </>
  )

  if (chrome === 'bare') return <>{body}</>

  return (
    <Card className="p-0">
      <div className="p-4 sm:p-5">{body}</div>
    </Card>
  )
}

function InflationSlider({
  label,
  helper,
  value,
  onChange,
  color = 'text-blue-600',
}: {
  label: string
  helper?: string
  value: number
  onChange: (v: number) => void
  color?: string
}) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <span className="text-xs font-semibold text-gray-700">{label}</span>
          {helper && <p className="text-[10px] text-gray-400 leading-tight">{helper}</p>}
        </div>
        <span className={`text-sm font-bold tabular-nums ${color}`}>{value}%</span>
      </div>
      <input
        type="range"
        min={2}
        max={15}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={`${label} inflation rate`}
        className="w-full accent-blue-600 mt-1"
      />
      <div className="flex justify-between text-[9px] text-gray-400 mt-1 tabular-nums">
        <span>2%</span>
        <span>15%</span>
      </div>
    </div>
  )
}
