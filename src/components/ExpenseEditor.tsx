import { useState, useEffect } from 'react'
import type {
  ExpenseBreakdown,
  ExpenseEntry,
  ExpenseProfile,
  UserProfile,
  FrequencySchedule,
  PaymentFrequency,
} from '../types'
import { DEFAULT_EXPENSES, DEFAULT_EXPENSE_BREAKDOWN } from '../constants'
import { Card } from './ui/Card'

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

const MONTHS_PER: Record<PaymentFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  'half-yearly': 6,
  yearly: 12,
}

const FREQ_LABEL_SHORT: Record<PaymentFrequency, string> = {
  monthly: 'Mo',
  quarterly: 'Qtr',
  'half-yearly': '6Mo',
  yearly: 'Yr',
}

const FREQ_SUFFIX: Record<PaymentFrequency, string> = {
  monthly: '/mo',
  quarterly: '/qtr',
  'half-yearly': '/6mo',
  yearly: '/yr',
}

const FREQ_OPTIONS: PaymentFrequency[] = ['monthly', 'quarterly', 'half-yearly', 'yearly']

type GroupKey = 'essential' | 'lifestyle' | 'healthcare' | 'education'

interface SubCat {
  key: keyof ExpenseBreakdown
  label: string
  hint?: string
}

interface Group {
  key: GroupKey
  num: string
  label: string
  desc: string
  // Tailwind class atoms for the group's tone
  text: string          // primary text colour
  bg: string            // soft background
  bgStrong: string      // for active pill, accent bar
  border: string        // soft border (interior)
  borderStrong: string  // thick border (card)
  ring: string          // ring colour
  subs: SubCat[]
}

const GROUPS: Group[] = [
  {
    key: 'essential', num: '01', label: 'Essential', desc: 'Must-haves — keep the lights on',
    text: 'text-blue-700', bg: 'bg-blue-50', bgStrong: 'bg-blue-600',
    border: 'border-blue-200', borderStrong: 'border-blue-400', ring: 'ring-blue-100',
    subs: [
      { key: 'rent',           label: 'Rent / Housing',  hint: 'Rent or home-loan EMI' },
      { key: 'food',           label: 'Food & Groceries' },
      { key: 'utilities',      label: 'Utilities',       hint: 'Electricity, water, gas, internet, phone' },
      { key: 'domesticHelp',   label: 'Domestic help',   hint: 'Cook, maid, driver, gardener' },
      { key: 'transportation', label: 'Transportation',  hint: 'Fuel, transit, taxi' },
    ],
  },
  {
    key: 'lifestyle', num: '02', label: 'Lifestyle', desc: 'Discretionary — quality of life',
    text: 'text-purple-700', bg: 'bg-purple-50', bgStrong: 'bg-purple-600',
    border: 'border-purple-200', borderStrong: 'border-purple-400', ring: 'ring-purple-100',
    subs: [
      { key: 'diningOut',     label: 'Dining & Entertainment' },
      { key: 'travel',        label: 'Travel & Vacations' },
      { key: 'subscriptions', label: 'Subscriptions',          hint: 'Streaming, gym, newspapers' },
      { key: 'personalCare',  label: 'Personal care',          hint: 'Salon, clothing, shopping' },
      { key: 'giftsMisc',     label: 'Gifts & Misc',           hint: 'Celebrations, donations' },
    ],
  },
  {
    key: 'healthcare', num: '03', label: 'Healthcare', desc: 'Medical, premiums & supplements',
    text: 'text-rose-700', bg: 'bg-rose-50', bgStrong: 'bg-rose-600',
    border: 'border-rose-200', borderStrong: 'border-rose-400', ring: 'ring-rose-100',
    subs: [
      { key: 'insurancePremium', label: 'Insurance premium' },
      { key: 'doctorVisits',     label: 'Doctor & Hospital' },
      { key: 'medicines',        label: 'Medicines & Supplements' },
      { key: 'diagnostics',      label: 'Diagnostics & Tests' },
    ],
  },
  {
    key: 'education', num: '04', label: 'Education', desc: 'Grandchildren & lifelong learning',
    text: 'text-amber-700', bg: 'bg-amber-50', bgStrong: 'bg-amber-600',
    border: 'border-amber-200', borderStrong: 'border-amber-400', ring: 'ring-amber-100',
    subs: [
      { key: 'tuition',  label: 'Tuition / School fees' },
      { key: 'books',    label: 'Books & Supplies' },
      { key: 'courses',  label: 'Online courses' },
      { key: 'coaching', label: 'Coaching / Tutoring' },
    ],
  },
]

// ── Migration helpers ─────────────────────────────────────────────────

function toEntry(v: unknown, fallback: ExpenseEntry): ExpenseEntry {
  if (typeof v === 'number') return { amount: v, frequency: 'monthly' }
  if (
    v && typeof v === 'object' &&
    'amount' in v && typeof (v as { amount: unknown }).amount === 'number' &&
    'frequency' in v && typeof (v as { frequency: unknown }).frequency === 'string'
  ) {
    return { amount: (v as ExpenseEntry).amount, frequency: (v as ExpenseEntry).frequency }
  }
  return fallback
}

function ensureBreakdown(expenses: ExpenseProfile): ExpenseBreakdown {
  const raw = (expenses.breakdown ?? {}) as Record<string, unknown>
  const result: ExpenseBreakdown = { ...DEFAULT_EXPENSE_BREAKDOWN }
  for (const key of Object.keys(DEFAULT_EXPENSE_BREAKDOWN) as Array<keyof ExpenseBreakdown>) {
    result[key] = toEntry(raw[key], DEFAULT_EXPENSE_BREAKDOWN[key])
  }
  if (!expenses.breakdown) {
    if (expenses.essential)  result.rent             = { amount: expenses.essential,  frequency: 'monthly' }
    if (expenses.lifestyle)  result.diningOut        = { amount: expenses.lifestyle,  frequency: 'monthly' }
    if (expenses.healthcare) result.insurancePremium = { amount: expenses.healthcare, frequency: 'monthly' }
    if (expenses.education)  result.tuition          = { amount: expenses.education,  frequency: 'monthly' }
  }
  return result
}

function monthlyEquivalent(e: ExpenseEntry): number {
  return e.amount / MONTHS_PER[e.frequency]
}

function groupMonthlyTotal(b: ExpenseBreakdown, g: Group): number {
  return g.subs.reduce((s, sub) => s + monthlyEquivalent(b[sub.key]), 0)
}

function grandMonthlyTotal(b: ExpenseBreakdown): number {
  return GROUPS.reduce((s, g) => s + groupMonthlyTotal(b, g), 0)
}

function buildSchedule(b: ExpenseBreakdown): FrequencySchedule {
  const s: FrequencySchedule = { monthly: 0, quarterly: 0, halfYearly: 0, yearly: 0 }
  for (const key of Object.keys(b) as Array<keyof ExpenseBreakdown>) {
    const e = b[key]
    if (!e || !e.amount) continue
    if (e.frequency === 'monthly')        s.monthly    += e.amount
    else if (e.frequency === 'quarterly') s.quarterly  += e.amount
    else if (e.frequency === 'half-yearly') s.halfYearly += e.amount
    else if (e.frequency === 'yearly')    s.yearly     += e.amount
  }
  return {
    monthly:    Math.round(s.monthly),
    quarterly:  Math.round(s.quarterly),
    halfYearly: Math.round(s.halfYearly),
    yearly:     Math.round(s.yearly),
  }
}

// ── Sub-row UI ────────────────────────────────────────────────────────

interface SubRowProps {
  entry: ExpenseEntry
  label: string
  hint?: string
  group: Group
  onChange: (next: ExpenseEntry) => void
}

function SubRow({ entry, label, hint, group, onChange }: SubRowProps) {
  const [text, setText] = useState(String(entry.amount || ''))

  useEffect(() => { setText(String(entry.amount || '')) }, [entry.amount])

  function commit() {
    const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10)
    const v = !isNaN(parsed) && parsed >= 0 ? parsed : 0
    if (v !== entry.amount) onChange({ ...entry, amount: v })
    setText(String(v || ''))
  }

  function setFreq(f: PaymentFrequency) {
    if (f !== entry.frequency) onChange({ ...entry, frequency: f })
  }

  const monthlyEq = monthlyEquivalent(entry)
  const showMonthlyEq = entry.amount > 0 && entry.frequency !== 'monthly'

  return (
    <div className="grid items-center gap-x-3 gap-y-1.5 py-2.5
                    grid-cols-[1fr] sm:grid-cols-[minmax(0,1fr)_auto_minmax(140px,180px)]">
      {/* Label */}
      <div className="min-w-0 sm:pr-1">
        <div className="text-[12px] font-bold text-slate-800 truncate" title={label}>
          {label}
        </div>
        {hint && (
          <div className="text-[10px] text-slate-500 truncate -mt-0.5" title={hint}>
            {hint}
          </div>
        )}
      </div>

      {/* Segmented frequency picker */}
      <div
        role="group"
        aria-label="Payment frequency"
        className="inline-flex shrink-0 bg-slate-100 rounded-md p-0.5 gap-0.5 self-start sm:self-center"
      >
        {FREQ_OPTIONS.map((f) => {
          const active = entry.frequency === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFreq(f)}
              aria-pressed={active}
              title={f === 'half-yearly' ? 'Half-yearly' : f.charAt(0).toUpperCase() + f.slice(1)}
              className={[
                'min-w-[34px] px-1.5 py-1 text-[10px] font-bold tabular-nums rounded transition-colors',
                active
                  ? `${group.bgStrong} text-white shadow-sm`
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white',
              ].join(' ')}
            >
              {FREQ_LABEL_SHORT[f]}
            </button>
          )
        })}
      </div>

      {/* Amount input + monthly-equivalent caption */}
      <div className="flex flex-col items-stretch gap-0.5 shrink-0">
        <div className="flex items-center gap-1 bg-white border-2 border-slate-200 rounded-md px-2 py-1 hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-colors">
          <span className="text-xs font-bold text-slate-500">₹</span>
          <input
            type="text"
            inputMode="numeric"
            value={text}
            placeholder="0"
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            aria-label={`${label} amount`}
            className={`flex-1 min-w-0 bg-transparent text-sm font-bold ${group.text} outline-none tabular-nums text-right`}
          />
          <span className="text-[10px] text-slate-500 font-semibold tabular-nums shrink-0 w-10 text-right">
            {FREQ_SUFFIX[entry.frequency]}
          </span>
        </div>
        <div className="text-[9px] text-slate-400 tabular-nums text-right pr-1 h-3 leading-3">
          {showMonthlyEq ? `≈ ${INR(monthlyEq)}/mo` : ''}
        </div>
      </div>
    </div>
  )
}

// ── Editor ────────────────────────────────────────────────────────────

interface Props {
  profile: UserProfile
  onProfileUpdate: (p: UserProfile) => void
  chrome?: 'default' | 'bare'
}

export function ExpenseEditor({ profile, onProfileUpdate, chrome = 'default' }: Props) {
  const expenses = profile.expenses ?? DEFAULT_EXPENSES
  const breakdown = ensureBreakdown(expenses)
  const total = grandMonthlyTotal(breakdown)

  function updateEntry(key: keyof ExpenseBreakdown, next: ExpenseEntry) {
    const newBreakdown: ExpenseBreakdown = { ...breakdown, [key]: next }
    const newEssential  = groupMonthlyTotal(newBreakdown, GROUPS[0])
    const newLifestyle  = groupMonthlyTotal(newBreakdown, GROUPS[1])
    const newHealthcare = groupMonthlyTotal(newBreakdown, GROUPS[2])
    const newEducation  = groupMonthlyTotal(newBreakdown, GROUPS[3])
    const newTotal = newEssential + newLifestyle + newHealthcare + newEducation
    const newSchedule = buildSchedule(newBreakdown)

    const updated: UserProfile = {
      ...profile,
      expenses: {
        ...expenses,
        essential:  Math.round(newEssential),
        lifestyle:  Math.round(newLifestyle),
        healthcare: Math.round(newHealthcare),
        education:  Math.round(newEducation),
        breakdown:  newBreakdown,
      },
      monthlyWithdrawal: Math.round(newTotal),
      withdrawalAmount:  Math.round(newTotal),
      withdrawalFrequency: 'monthly',
      withdrawalSchedule: newSchedule,
    }
    onProfileUpdate(updated)
  }

  function projectAtYear(years: number): number {
    const ess = groupMonthlyTotal(breakdown, GROUPS[0]) * Math.pow(1 + expenses.generalInflation / 100, years)
    const lif = groupMonthlyTotal(breakdown, GROUPS[1]) * Math.pow(1 + expenses.generalInflation / 100, years)
    const hc  = groupMonthlyTotal(breakdown, GROUPS[2]) * Math.pow(1 + expenses.healthcareInflation / 100, years)
    const ed  = groupMonthlyTotal(breakdown, GROUPS[3]) * Math.pow(1 + expenses.educationInflation / 100, years)
    return ess + lif + hc + ed
  }

  const in10 = projectAtYear(10)
  const in20 = projectAtYear(20)
  const schedulePreview = buildSchedule(breakdown)

  const body = (
    <>
      {chrome !== 'bare' && (
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-gray-800">Monthly Budget</h2>
          <span className="text-sm font-bold text-gray-900">{INR(total)}/mo</span>
        </div>
      )}

      <p className="text-[11px] text-slate-600 leading-snug mb-4">
        Pick a payment frequency for each row, then enter the amount paid at that frequency.
        Entries flow into <strong className="text-slate-900">Profile & Settings → Withdrawal</strong> at
        matching frequency slots.
      </p>

      {/* Group cards */}
      <div className="space-y-3">
        {GROUPS.map((g) => {
          const gt = groupMonthlyTotal(breakdown, g)
          const pct = total > 0 ? (gt / total) * 100 : 0
          return (
            <section
              key={g.key}
              className={`relative rounded-xl bg-white border-2 ${g.borderStrong} ring-1 ring-inset ${g.ring} overflow-hidden shadow-sm`}
            >
              {/* Tone-coloured top accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${g.bgStrong}`} aria-hidden="true" />

              {/* Group header */}
              <header className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${g.bg} border-b ${g.border}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`shrink-0 w-7 h-7 rounded-md ${g.bg} ${g.text} font-serif text-sm font-extralight tabular-nums flex items-center justify-center border-2 ${g.borderStrong}`}
                    aria-hidden="true"
                  >
                    {g.num}
                  </span>
                  <div className="min-w-0">
                    <div className={`text-[10px] font-bold tracking-[2px] uppercase ${g.text}`}>
                      {g.label}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{g.desc}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wide">Subtotal</div>
                  <div className={`text-base font-extrabold tabular-nums ${g.text} leading-tight`}>
                    {INR(gt)}<span className="text-[10px] font-semibold ml-0.5">/mo</span>
                  </div>
                </div>
              </header>

              {/* Sub-row list */}
              <div className="px-3.5 py-1 divide-y divide-slate-100">
                {g.subs.map((sub) => (
                  <SubRow
                    key={sub.key}
                    entry={breakdown[sub.key]}
                    label={sub.label}
                    hint={sub.hint}
                    group={g}
                    onChange={(next) => updateEntry(sub.key, next)}
                  />
                ))}
              </div>

              {/* Group share-of-total bar */}
              {total > 0 && (
                <div className="px-3.5 py-2 border-t border-slate-100 bg-slate-50/40 flex items-center gap-2.5">
                  <div className="flex-1 bg-white border border-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`${g.bgStrong} h-full rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-600 tabular-nums shrink-0 font-semibold">
                    {Math.round(pct)}% of total
                  </span>
                </div>
              )}
            </section>
          )
        })}
      </div>

      {/* Withdrawal schedule preview */}
      <section className="mt-4 rounded-xl border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-[3px] uppercase text-slate-700">
              Withdrawal schedule
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Auto-filled in <strong className="text-slate-800">Profile & Settings → Withdrawal</strong>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-slate-500 uppercase tracking-wide tabular-nums">Monthly equiv.</div>
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums leading-none">
              {INR(total)}
            </div>
            <div className="text-[10px] text-slate-500 tabular-nums mt-0.5">{INR(total * 12)}/yr</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <SchedulePill label="Monthly"     value={schedulePreview.monthly} />
          <SchedulePill label="Quarterly"   value={schedulePreview.quarterly} />
          <SchedulePill label="Half-Yearly" value={schedulePreview.halfYearly} />
          <SchedulePill label="Yearly"      value={schedulePreview.yearly} />
        </div>
      </section>

      {/* Projection preview */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">In 10 yrs</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5 tabular-nums">{INR(in10)}/mo</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">In 20 yrs</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5 tabular-nums">{INR(in20)}/mo</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Annual today</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5 tabular-nums">{INR(total * 12)}/yr</p>
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

function SchedulePill({ label, value }: { label: string; value: number }) {
  const empty = value === 0
  return (
    <div
      className={[
        'rounded-lg border-2 px-3 py-2 text-center transition-colors',
        empty
          ? 'bg-white border-slate-200 text-slate-400'
          : 'bg-white border-blue-300 ring-1 ring-blue-100 text-slate-900',
      ].join(' ')}
    >
      <div className={`text-[9px] font-bold uppercase tracking-[2px] ${empty ? 'text-slate-400' : 'text-blue-700'}`}>
        {label}
      </div>
      <div className={`text-sm font-extrabold tabular-nums mt-0.5 ${empty ? 'text-slate-400' : 'text-slate-900'}`}>
        {empty ? '—' : INR(value)}
      </div>
    </div>
  )
}
