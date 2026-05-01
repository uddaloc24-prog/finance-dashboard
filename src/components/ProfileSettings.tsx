import { useState, useEffect } from 'react'
import type { UserProfile, FrequencySchedule } from '../types'
import { storage } from '../lib/storage'
import { allocateBuckets, totalCorpus } from '../lib/calculations'
import type { BucketState } from '../types'
import { Card } from './ui/Card'

const SLOTS: Array<{ key: keyof FrequencySchedule; label: string; months: number; helper: string }> = [
  { key: 'monthly',    label: 'Monthly',     months: 1,  helper: 'Pension, rent, salary' },
  { key: 'quarterly',  label: 'Quarterly',   months: 3,  helper: 'SCSS, dividend' },
  { key: 'halfYearly', label: 'Half-Yearly', months: 6,  helper: 'Bond coupon' },
  { key: 'yearly',     label: 'Yearly',      months: 12, helper: 'FD interest, bonus' },
]

const EMPTY_SCHEDULE: FrequencySchedule = { monthly: 0, quarterly: 0, halfYearly: 0, yearly: 0 }

function totalMonthly(s?: FrequencySchedule): number {
  if (!s) return 0
  return s.monthly + s.quarterly / 3 + s.halfYearly / 6 + s.yearly / 12
}

const TAX_OPTIONS: Array<{ label: string; value: 0 | 5 | 20 | 30 }> = [
  { label: 'Nil (0%)', value: 0 },
  { label: '5%', value: 5 },
  { label: '20%', value: 20 },
  { label: '30%', value: 30 },
]

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

interface ScheduleEditorProps {
  label: string
  helper?: string
  schedule: FrequencySchedule
  onChange: (next: FrequencySchedule) => void
  accentText: string   // tailwind text class for accent (e.g., 'text-purple-700')
  accentRing: string   // tailwind focus ring class
}

function ScheduleEditor({ label, helper, schedule, onChange, accentText, accentRing }: ScheduleEditorProps) {
  // Local text state per slot — persists typing UX while parsing on blur
  const [text, setText] = useState<Record<keyof FrequencySchedule, string>>(() => ({
    monthly:    String(schedule.monthly || ''),
    quarterly:  String(schedule.quarterly || ''),
    halfYearly: String(schedule.halfYearly || ''),
    yearly:     String(schedule.yearly || ''),
  }))

  useEffect(() => {
    setText({
      monthly:    String(schedule.monthly || ''),
      quarterly:  String(schedule.quarterly || ''),
      halfYearly: String(schedule.halfYearly || ''),
      yearly:     String(schedule.yearly || ''),
    })
  }, [schedule.monthly, schedule.quarterly, schedule.halfYearly, schedule.yearly])

  const total = totalMonthly(schedule)

  const commit = (key: keyof FrequencySchedule) => () => {
    const parsed = parseInt((text[key] || '0').replace(/[^0-9]/g, ''), 10)
    const v = !isNaN(parsed) && parsed >= 0 ? parsed : 0
    if (v !== schedule[key]) {
      onChange({ ...schedule, [key]: v })
    } else {
      // Re-sync local text in case user typed garbage
      setText((t) => ({ ...t, [key]: String(v || '') }))
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
          {helper && <p className="text-[11px] text-gray-400 mt-0.5">{helper}</p>}
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Combined</div>
          <div className={`text-sm font-bold tabular-nums ${accentText}`}>{INR(total)}/mo</div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SLOTS.map((slot) => (
          <div key={slot.key} className="bg-white border border-gray-200 rounded-lg p-2.5 hover:border-gray-300 transition-colors focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide leading-tight">
              {slot.label}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-bold text-gray-400">₹</span>
              <input
                type="text"
                inputMode="numeric"
                value={text[slot.key]}
                placeholder="0"
                onChange={(e) => setText((t) => ({ ...t, [slot.key]: e.target.value }))}
                onBlur={commit(slot.key)}
                onKeyDown={(e) => e.key === 'Enter' && commit(slot.key)()}
                className={`flex-1 min-w-0 bg-transparent text-sm font-semibold ${accentText} outline-none focus:${accentRing} tabular-nums`}
              />
            </div>
            <div className="text-[9px] text-gray-400 mt-1 leading-tight truncate">
              {slot.helper}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface Props {
  profile: UserProfile
  buckets: BucketState
  onProfileUpdate: (p: UserProfile) => void
  onBucketsUpdate: (b: BucketState) => void
  // 'bare' renders just the form fields with no outer Card / collapsible chrome —
  // used when an external wrapper (e.g. PlanSection) provides those.
  chrome?: 'default' | 'bare'
}

export function ProfileSettings({ profile, buckets, onProfileUpdate, onBucketsUpdate, chrome = 'default' }: Props) {
  const [open, setOpen] = useState(false)

  // Local state for editable fields
  const [corpusText, setCorpusText] = useState(String(profile.corpus))
  const [groqKey, setGroqKey] = useState(profile.groqApiKey ?? '')

  const withdrawalSchedule = profile.withdrawalSchedule ?? EMPTY_SCHEDULE
  const sipSchedule = profile.sipSchedule ?? EMPTY_SCHEDULE

  // Track corpus changes from elsewhere (e.g. Sliders)
  useEffect(() => {
    setCorpusText(String(profile.corpus))
  }, [profile.corpus])

  function update(partial: Partial<UserProfile>) {
    const updated = { ...profile, ...partial }
    storage.setProfile(updated)
    onProfileUpdate(updated)
  }

  function handleWithdrawalChange(next: FrequencySchedule) {
    const monthly = totalMonthly(next)
    update({
      withdrawalSchedule: next,
      monthlyWithdrawal: monthly,
      // Keep legacy fields populated as monthly equivalents for backward-compat
      withdrawalAmount: Math.round(monthly),
      withdrawalFrequency: 'monthly',
    })
  }

  function handleSipChange(next: FrequencySchedule) {
    const monthly = totalMonthly(next)
    update({
      sipSchedule: next,
      sipAmount: Math.round(monthly),
      sipFrequency: 'monthly',
    })
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

  function commitGroq() {
    update({ groqApiKey: groqKey.trim() })
  }

  const corpus = totalCorpus(buckets)

  const body = (
    <div className="space-y-5">
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

          </div>

          {/* Withdrawal — 4 simultaneous frequency slots */}
          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-100">
            <ScheduleEditor
              label="Withdrawal"
              helper="Enter amounts in any of the four frequency slots — they all combine"
              schedule={withdrawalSchedule}
              onChange={handleWithdrawalChange}
              accentText="text-purple-700"
              accentRing="ring-purple-300"
            />
          </div>

          {/* SIP / Passive Income — 4 simultaneous frequency slots */}
          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-100">
            <ScheduleEditor
              label="SIP / Passive income"
              helper="Pension, rental, dividend, interest — combined and netted against withdrawals"
              schedule={sipSchedule}
              onChange={handleSipChange}
              accentText="text-teal-700"
              accentRing="ring-teal-300"
            />
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
  )

  if (chrome === 'bare') return body

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
              Corpus {INR(corpus)} · Tax {profile.taxBracket}% · Refresh every {profile.refreshInterval}hr{profile.refreshInterval > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">&#9662;</span>
      </button>

      {open && (
        <div id="profile-settings-panel" className="px-5 pb-5 border-t border-gray-100 pt-4">
          {body}
        </div>
      )}
    </Card>
  )
}
