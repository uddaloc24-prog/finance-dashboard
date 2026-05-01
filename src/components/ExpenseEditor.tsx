import { useState, useEffect } from 'react'
import type { ExpenseProfile, UserProfile } from '../types'
import { DEFAULT_EXPENSES } from '../constants'
import { Card } from './ui/Card'

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

const EXPENSE_CATEGORIES = [
  { key: 'essential' as const, label: 'Essential', desc: 'Rent, food, utilities, insurance', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', inflationKey: 'generalInflation' as const },
  { key: 'lifestyle' as const, label: 'Lifestyle', desc: 'Travel, dining, subscriptions', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', inflationKey: 'generalInflation' as const },
  { key: 'healthcare' as const, label: 'Healthcare', desc: 'Medical, insurance premiums', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', inflationKey: 'healthcareInflation' as const },
  { key: 'education' as const, label: 'Education', desc: 'Grandchildren, courses', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', inflationKey: 'educationInflation' as const },
]

interface AmountInputProps {
  value: number
  color: string
  onChange: (v: number) => void
}

function AmountInput({ value, color, onChange }: AmountInputProps) {
  const [text, setText] = useState(String(value))

  useEffect(() => { setText(String(value)) }, [value])

  function commit() {
    const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed)
      setText(String(parsed))
    } else {
      setText(String(value))
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span className={`text-sm font-bold ${color}`}>₹</span>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        className={`w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold ${color} focus:outline-none focus:ring-2 focus:ring-blue-400`}
      />
      <span className="text-xs text-gray-400">/mo</span>
    </div>
  )
}

interface Props {
  profile: UserProfile
  onProfileUpdate: (p: UserProfile) => void
  chrome?: 'default' | 'bare'
}

export function ExpenseEditor({ profile, onProfileUpdate, chrome = 'default' }: Props) {
  const expenses = profile.expenses ?? DEFAULT_EXPENSES
  const totalMonthly = expenses.essential + expenses.lifestyle + expenses.healthcare + expenses.education

  function update(partial: Partial<ExpenseProfile>) {
    const updated: UserProfile = {
      ...profile,
      expenses: { ...expenses, ...partial },
    }
    onProfileUpdate(updated)
  }

  function projectAtYear(years: number): number {
    const essAtYear = expenses.essential * Math.pow(1 + expenses.generalInflation / 100, years)
    const lifAtYear = expenses.lifestyle * Math.pow(1 + expenses.generalInflation / 100, years)
    const hcAtYear = expenses.healthcare * Math.pow(1 + expenses.healthcareInflation / 100, years)
    const edAtYear = expenses.education * Math.pow(1 + expenses.educationInflation / 100, years)
    return essAtYear + lifAtYear + hcAtYear + edAtYear
  }

  const in10 = projectAtYear(10)
  const in20 = projectAtYear(20)

  const body = (
    <>
      {chrome !== 'bare' && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Monthly Expenses</h2>
          <span className="text-sm font-bold text-gray-900">{INR(totalMonthly)}/mo</span>
        </div>
      )}

      {/* Category cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EXPENSE_CATEGORIES.map(cat => (
            <div key={cat.key} className={`${cat.bg} ${cat.border} border rounded-xl p-3`}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className={`text-xs font-semibold ${cat.color}`}>{cat.label}</p>
                  <p className="text-[10px] text-gray-400">{cat.desc}</p>
                </div>
                <AmountInput
                  value={expenses[cat.key]}
                  color={cat.color}
                  onChange={v => update({ [cat.key]: v })}
                />
              </div>
              {/* Expense bar proportion */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 bg-white/60 rounded-full h-1.5">
                  <div
                    className={`${cat.border.replace('border-', 'bg-')} h-1.5 rounded-full transition-all`}
                    style={{ width: `${totalMonthly > 0 ? (expenses[cat.key] / totalMonthly) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 tabular-nums">
                  {totalMonthly > 0 ? Math.round((expenses[cat.key] / totalMonthly) * 100) : 0}%
                </span>
              </div>
            </div>
          ))}
        </div>

      {/* Projection preview */}
      <div className="mt-4 flex gap-3">
        <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">In 10 Years</p>
          <p className="text-sm font-bold text-gray-800 mt-0.5">{INR(in10)}/mo</p>
        </div>
        <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">In 20 Years</p>
          <p className="text-sm font-bold text-gray-800 mt-0.5">{INR(in20)}/mo</p>
        </div>
        <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Annual Today</p>
          <p className="text-sm font-bold text-gray-800 mt-0.5">{INR(totalMonthly * 12)}/yr</p>
        </div>
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

