import { useState, useEffect, type ReactNode } from 'react'
import type { UserProfile, FrequencySchedule } from '../types'
import { storage } from '../lib/storage'
import { allocateBuckets, totalCorpus } from '../lib/calculations'
import type { BucketState } from '../types'
import { Card } from './ui/Card'

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

const SLOTS: Array<{ key: keyof FrequencySchedule; label: string; helper: string }> = [
  { key: 'monthly',    label: 'Monthly',     helper: 'Pension, rent, salary' },
  { key: 'quarterly',  label: 'Quarterly',   helper: 'SCSS, dividend' },
  { key: 'halfYearly', label: 'Half-Yearly', helper: 'Bond coupon' },
  { key: 'yearly',     label: 'Yearly',      helper: 'FD interest, bonus' },
]

const EMPTY_SCHEDULE: FrequencySchedule = { monthly: 0, quarterly: 0, halfYearly: 0, yearly: 0 }

function totalMonthly(s?: FrequencySchedule): number {
  if (!s) return 0
  return s.monthly + s.quarterly / 3 + s.halfYearly / 6 + s.yearly / 12
}

const TAX_OPTIONS: Array<{ label: string; value: 0 | 5 | 20 | 30 }> = [
  { label: 'Nil', value: 0 },
  { label: '5%', value: 5 },
  { label: '20%', value: 20 },
  { label: '30%', value: 30 },
]

// ── Section primitive ────────────────────────────────────────────────

type Tone = 'blue' | 'slate' | 'emerald' | 'amber'

const TONES: Record<Tone, {
  border: string; ring: string; bar: string; text: string; bg: string
}> = {
  blue:    { border: 'border-blue-300',    ring: 'ring-blue-100',    bar: 'bg-blue-600',    text: 'text-blue-700',    bg: 'bg-blue-50/60' },
  slate:   { border: 'border-slate-300',   ring: 'ring-slate-100',   bar: 'bg-slate-600',   text: 'text-slate-700',   bg: 'bg-slate-50' },
  emerald: { border: 'border-emerald-300', ring: 'ring-emerald-100', bar: 'bg-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50/60' },
  amber:   { border: 'border-amber-300',   ring: 'ring-amber-100',   bar: 'bg-amber-600',   text: 'text-amber-700',   bg: 'bg-amber-50/60' },
}

interface SectionProps {
  num: string
  tone: Tone
  title: string
  subtitle?: string
  status?: ReactNode
  children: ReactNode
}

function Section({ num, tone, title, subtitle, status, children }: SectionProps) {
  const t = TONES[tone]
  return (
    <section className={`relative rounded-xl bg-white border-2 ${t.border} ring-1 ring-inset ${t.ring} overflow-hidden shadow-sm`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${t.bar}`} aria-hidden="true" />
      <header className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${t.bg} border-b ${t.border}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`shrink-0 w-7 h-7 rounded-md ${t.bg} ${t.text} font-serif text-sm font-extralight tabular-nums flex items-center justify-center border-2 ${t.border}`}
            aria-hidden="true"
          >
            {num}
          </span>
          <div className="min-w-0">
            <div className={`text-[10px] font-bold tracking-[2px] uppercase ${t.text}`}>{title}</div>
            {subtitle && <div className="text-[10px] text-slate-500 truncate">{subtitle}</div>}
          </div>
        </div>
        {status && <div className="shrink-0">{status}</div>}
      </header>
      <div className="p-3.5">{children}</div>
    </section>
  )
}

// ── Read-only schedule display ───────────────────────────────────────

function ScheduleReadOnly({ schedule, accent }: { schedule: FrequencySchedule; accent: string }) {
  const total = totalMonthly(schedule)
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SLOTS.map((slot) => {
          const v = schedule[slot.key]
          const empty = v === 0
          return (
            <div
              key={slot.key}
              className={[
                'rounded-lg border-2 px-3 py-2 text-center transition-colors',
                empty
                  ? 'bg-slate-50 border-slate-200'
                  : `bg-white ${accent} ring-1 ring-inset ring-slate-100`,
              ].join(' ')}
            >
              <div className={`text-[9px] font-bold uppercase tracking-[2px] ${empty ? 'text-slate-400' : 'text-slate-600'}`}>
                {slot.label}
              </div>
              <div className={`text-sm font-extrabold tabular-nums mt-0.5 ${empty ? 'text-slate-400' : 'text-slate-900'}`}>
                {empty ? '—' : INR(v)}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-2 px-1">
        <span className="text-[10px] font-bold tracking-[2px] uppercase text-slate-500">
          Combined monthly equivalent
        </span>
        <span className="text-base font-extrabold tabular-nums text-slate-900">
          {INR(total)}<span className="text-[10px] font-semibold text-slate-500 ml-0.5">/mo</span>
        </span>
      </div>
    </>
  )
}

// ── Editable schedule (for SIP / Passive Income) ─────────────────────

interface ScheduleEditorProps {
  schedule: FrequencySchedule
  onChange: (next: FrequencySchedule) => void
  accentText: string
}

function ScheduleEditor({ schedule, onChange, accentText }: ScheduleEditorProps) {
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
    if (v !== schedule[key]) onChange({ ...schedule, [key]: v })
    setText((t) => ({ ...t, [key]: String(v || '') }))
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SLOTS.map((slot) => (
          <div
            key={slot.key}
            className="bg-white border-2 border-slate-200 rounded-lg p-2.5 hover:border-slate-300 transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"
          >
            <div className="text-[9px] font-bold uppercase tracking-[2px] text-slate-500">
              {slot.label}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-bold text-slate-400">₹</span>
              <input
                type="text"
                inputMode="numeric"
                value={text[slot.key]}
                placeholder="0"
                onChange={(e) => setText((t) => ({ ...t, [slot.key]: e.target.value }))}
                onBlur={commit(slot.key)}
                onKeyDown={(e) => e.key === 'Enter' && commit(slot.key)()}
                aria-label={`${slot.label} amount`}
                className={`flex-1 min-w-0 bg-transparent text-sm font-bold ${accentText} outline-none tabular-nums text-right`}
              />
            </div>
            <div className="text-[9px] text-slate-400 mt-1 leading-tight truncate" title={slot.helper}>
              {slot.helper}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-2 px-1">
        <span className="text-[10px] font-bold tracking-[2px] uppercase text-slate-500">
          Combined monthly equivalent
        </span>
        <span className={`text-base font-extrabold tabular-nums ${accentText}`}>
          {INR(total)}<span className="text-[10px] font-semibold text-slate-500 ml-0.5">/mo</span>
        </span>
      </div>
    </>
  )
}

// ── Main component ───────────────────────────────────────────────────

interface Props {
  profile: UserProfile
  buckets: BucketState
  onProfileUpdate: (p: UserProfile) => void
  onBucketsUpdate: (b: BucketState) => void
  chrome?: 'default' | 'bare'
}

export function ProfileSettings({ profile, buckets, onProfileUpdate, onBucketsUpdate, chrome = 'default' }: Props) {
  const [open, setOpen] = useState(false)

  const [corpusText, setCorpusText] = useState(String(profile.corpus))
  const [groqKey, setGroqKey] = useState(profile.groqApiKey ?? '')

  const withdrawalSchedule = profile.withdrawalSchedule ?? EMPTY_SCHEDULE
  const sipSchedule = profile.sipSchedule ?? EMPTY_SCHEDULE

  useEffect(() => { setCorpusText(String(profile.corpus)) }, [profile.corpus])

  function update(partial: Partial<UserProfile>) {
    const updated = { ...profile, ...partial }
    storage.setProfile(updated)
    onProfileUpdate(updated)
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
  const withdrawalMonthly = totalMonthly(withdrawalSchedule)
  const sipMonthly = totalMonthly(sipSchedule)

  const body = (
    <div className="space-y-3">
      {/* ── Section 01 — Corpus & Tax ─────────────────────────── */}
      <Section
        num="01"
        tone="blue"
        title="Corpus & Tax"
        subtitle="Total retirement savings + your tax slab"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Corpus */}
          <div>
            <label className="block text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1">
              Total Retirement Corpus
            </label>
            <div className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-md px-2.5 py-1.5 hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-colors">
              <span className="text-sm font-bold text-slate-500">₹</span>
              <input
                type="text"
                inputMode="numeric"
                value={corpusText}
                onChange={e => setCorpusText(e.target.value)}
                onBlur={commitCorpus}
                onKeyDown={e => e.key === 'Enter' && commitCorpus()}
                aria-label="Total retirement corpus"
                className="flex-1 min-w-0 bg-transparent text-sm font-bold text-slate-900 outline-none tabular-nums text-right"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              Changing corpus re-allocates all buckets.
            </p>
          </div>

          {/* Tax Bracket */}
          <div>
            <label className="block text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1">
              Tax Bracket
            </label>
            <div className="inline-flex bg-slate-100 rounded-md p-0.5 gap-0.5 w-full">
              {TAX_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ taxBracket: opt.value })}
                  aria-pressed={profile.taxBracket === opt.value}
                  className={[
                    'flex-1 px-2 py-1.5 text-xs font-bold tabular-nums rounded transition-colors',
                    profile.taxBracket === opt.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-white',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              Used by the tax engine for LTCG / slab calculations.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Section 02 — Withdrawal (read-only) ──────────────── */}
      <Section
        num="02"
        tone="slate"
        title="Withdrawal"
        subtitle="Auto-filled from Monthly Budget · per-frequency aggregates"
        status={
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 border border-slate-300 text-[9px] font-bold uppercase tracking-[1.5px] text-slate-700">
            <span aria-hidden="true">🔒</span> Read-only
          </div>
        }
      >
        <p className="text-[10px] text-slate-500 leading-snug mb-2.5">
          Each Monthly Budget sub-category contributes to the slot matching its chosen frequency.
          To change these numbers, edit the Monthly Budget section.
        </p>
        <ScheduleReadOnly schedule={withdrawalSchedule} accent="border-blue-300" />
      </Section>

      {/* ── Section 03 — SIP / Passive Income ────────────────── */}
      <Section
        num="03"
        tone="emerald"
        title="SIP / Passive Income"
        subtitle="Pension, rental, dividend, interest — netted against withdrawals"
        status={
          sipMonthly > 0 ? (
            <span className="text-[10px] font-bold tabular-nums text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {INR(sipMonthly)}/mo
            </span>
          ) : null
        }
      >
        <ScheduleEditor
          schedule={sipSchedule}
          onChange={handleSipChange}
          accentText="text-emerald-700"
        />
      </Section>

      {/* ── Section 04 — Advanced Settings ───────────────────── */}
      <Section
        num="04"
        tone="amber"
        title="Advanced Settings"
        subtitle="Optional API key + market-data refresh cadence"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1">
              Groq API Key <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="password"
              placeholder="gsk_..."
              value={groqKey}
              onChange={e => setGroqKey(e.target.value)}
              onBlur={commitGroq}
              onKeyDown={e => e.key === 'Enter' && commitGroq()}
              className="w-full bg-white border-2 border-slate-200 rounded-md px-2.5 py-1.5 text-sm font-mono text-slate-900 hover:border-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
            />
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              Stored in browser only. Sent only to api.groq.com.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1">
              Market Data Refresh
            </label>
            <div className="inline-flex bg-slate-100 rounded-md p-0.5 gap-0.5 w-full">
              {([1, 6] as const).map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => update({ refreshInterval: h })}
                  aria-pressed={profile.refreshInterval === h}
                  className={[
                    'flex-1 px-2 py-1.5 text-xs font-bold tabular-nums rounded transition-colors',
                    profile.refreshInterval === h
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-white',
                  ].join(' ')}
                >
                  Every {h}hr{h > 1 ? 's' : ''}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              How often live NAVs / rates are refreshed from the API.
            </p>
          </div>
        </div>
      </Section>
    </div>
  )

  if (chrome === 'bare') return body

  return (
    <Card>
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
              Corpus {INR(corpus)} · Tax {profile.taxBracket}% · Withdrawal {INR(withdrawalMonthly)}/mo
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
