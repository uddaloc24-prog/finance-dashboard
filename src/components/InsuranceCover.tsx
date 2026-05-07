// Insurance Cover — captures every relevant insurance product for an Indian
// household 50+ across 3 logical groups. Each row tracks:
//   • cover    — sum insured / sum assured
//   • premium  — annual premium (₹)
//   • active   — policy currently in force
//   • mwp      — (term plan only) held under Married Women's Property Act
//
// At the bottom, smart insights surface gaps: missing critical illness,
// inadequate health cover, term plan not under MWP, etc.

import { useEffect, useState } from 'react'
import type { InsuranceCover as InsuranceCoverT, InsuranceEntry, UserProfile } from '../types'
import { DEFAULT_INSURANCE_COVER } from '../constants'
import { storage } from '../lib/storage'
import { Card } from './ui/Card'

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const CR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  if (n > 0) return INR(n)
  return '₹0'
}

interface SubInsurance {
  key: keyof InsuranceCoverT
  label: string
  hint?: string
  mwpFlag?: boolean    // show MWP Act toggle (term plan only)
}

interface InsuranceGroup {
  key: string
  num: string
  title: string
  desc: string
  tone: GroupTone
  icon: string
  subs: SubInsurance[]
}

const GROUPS: InsuranceGroup[] = [
  {
    key: 'health', num: '01', title: 'Health & Medical', desc: 'The medical fortress — primary protection against hospital bills',
    tone: 'rose', icon: '🩺',
    subs: [
      { key: 'familyFloater',   label: 'Family Floater',         hint: 'Base health policy covering whole family · target ₹20L+' },
      { key: 'personalHealth',  label: 'Personal Health',        hint: 'Individual health policy (separate from family)' },
      { key: 'superTopUp',      label: 'Super Top-up',           hint: '₹50L+ cover with deductible — cheapest catastrophic protection' },
      { key: 'criticalIllness', label: 'Critical Illness',       hint: 'Lump sum on diagnosis · target = 2× annual income' },
      { key: 'seniorCitizen',   label: 'Senior Citizen plan',    hint: 'Star Red Carpet, etc. — buy after 60 if not already covered' },
      { key: 'corporateGroup',  label: 'Corporate / Group cover', hint: 'Employer-provided · TERMINATES at retirement' },
    ],
  },
  {
    key: 'life', num: '02', title: 'Life Insurance', desc: 'Income replacement + estate protection',
    tone: 'navy', icon: '🛡️',
    subs: [
      { key: 'termPlan',  label: 'Term Plan',           hint: 'Pure protection · sum assured pays family on death · use MWP Act',  mwpFlag: true },
      { key: 'endowment', label: 'Endowment / Money-back', hint: 'Investment + insurance · cash value also tracked in Wealth Snapshot' },
      { key: 'ulip',      label: 'ULIP',                hint: 'Unit-Linked Insurance Plan' },
      { key: 'wholeLife', label: 'Whole Life',          hint: 'Lifetime cover — pays on death whenever it occurs' },
    ],
  },
  {
    key: 'other', num: '03', title: 'Other Risk Cover', desc: 'Accident, disability, property, vehicle',
    tone: 'amber', icon: '🚨',
    subs: [
      { key: 'personalAccident', label: 'Personal Accident', hint: 'Disability + accidental death cover' },
      { key: 'disability',       label: 'Disability Income', hint: 'Ongoing income if you become disabled' },
      { key: 'homeProperty',     label: 'Home / Property',   hint: 'Fire, theft, structural damage' },
      { key: 'vehicle',          label: 'Vehicle',           hint: 'Car/bike comprehensive insurance' },
    ],
  },
]

// ── Migration ────────────────────────────────────────────────────────

function toEntry(v: unknown, fallback: InsuranceEntry): InsuranceEntry {
  if (v && typeof v === 'object') {
    const obj = v as { cover?: unknown; premium?: unknown; active?: unknown; mwp?: unknown }
    return {
      cover: typeof obj.cover === 'number' ? obj.cover : 0,
      premium: typeof obj.premium === 'number' ? obj.premium : 0,
      active: typeof obj.active === 'boolean' ? obj.active : (typeof obj.cover === 'number' && obj.cover > 0),
      mwp: typeof obj.mwp === 'boolean' ? obj.mwp : fallback.mwp,
    }
  }
  return { ...fallback }
}

function ensureInsurance(profile: UserProfile): InsuranceCoverT {
  const raw = (profile.insuranceCover ?? {}) as Record<string, unknown>
  const result: InsuranceCoverT = { ...DEFAULT_INSURANCE_COVER }
  for (const key of Object.keys(DEFAULT_INSURANCE_COVER) as Array<keyof InsuranceCoverT>) {
    result[key] = toEntry(raw[key], DEFAULT_INSURANCE_COVER[key])
  }
  return result
}

// ── Aggregation + insights ───────────────────────────────────────────

interface Totals {
  totalCover: number
  totalPremium: number
  healthCover: number
  lifeCover: number
  otherCover: number
  activeCount: number
  totalCount: number
}

function totalsOf(ic: InsuranceCoverT): Totals {
  const sumGroup = (group: InsuranceGroup) =>
    group.subs.reduce((s, sub) => s + (ic[sub.key].active ? ic[sub.key].cover : 0), 0)
  let totalCover = 0, totalPremium = 0, activeCount = 0, totalCount = 0
  for (const key of Object.keys(ic) as Array<keyof InsuranceCoverT>) {
    const e = ic[key]
    totalCount += 1
    if (e.active) {
      activeCount += 1
      totalCover += e.cover
      totalPremium += e.premium
    }
  }
  return {
    totalCover,
    totalPremium,
    healthCover: sumGroup(GROUPS[0]),
    lifeCover:   sumGroup(GROUPS[1]),
    otherCover:  sumGroup(GROUPS[2]),
    activeCount,
    totalCount,
  }
}

interface Insight {
  level: 'critical' | 'warn' | 'info' | 'good'
  text: string
}

function buildInsights(ic: InsuranceCoverT, t: Totals, monthlyBudget: number): Insight[] {
  const out: Insight[] = []
  const annualIncome = monthlyBudget * 12 || 0
  const health = ic.familyFloater.active || ic.personalHealth.active
  const top = ic.superTopUp.active
  const ci = ic.criticalIllness.active
  const term = ic.termPlan.active
  const corp = ic.corporateGroup.active

  if (!health && !corp) {
    out.push({ level: 'critical', text: 'No personal health insurance. Buy a ₹20L+ family floater before age 55 — premium roughly doubles after 60.' })
  } else if (!health && corp) {
    out.push({ level: 'warn', text: 'Only corporate health cover, which terminates at retirement. Buy a personal policy now while healthy.' })
  } else if (t.healthCover < 2_000_000) {
    out.push({ level: 'warn', text: 'Health cover under ₹20L. Recommended floor for Indian metro households.' })
  }

  if (!top) {
    out.push({ level: 'warn', text: 'No Super Top-up. Cheapest way to insure ₹50L+ catastrophic medical bills.' })
  }

  if (!ci) {
    out.push({ level: 'warn', text: 'No Critical Illness cover. Recommended sum = 2× annual income.' })
  } else if (annualIncome > 0 && ic.criticalIllness.cover < annualIncome * 2) {
    out.push({ level: 'info', text: `Critical Illness cover ${INR(ic.criticalIllness.cover)} below recommended 2× annual budget (${INR(annualIncome * 2)}).` })
  }

  if (term && !ic.termPlan.mwp) {
    out.push({ level: 'warn', text: 'Term plan is NOT under the Married Women\'s Property Act. Switch to MWP variant for creditor-proof protection.' })
  } else if (term && ic.termPlan.mwp) {
    out.push({ level: 'good', text: 'Term plan held under MWP Act — creditor-proof shield for your spouse.' })
  }

  if (ic.endowment.active || ic.wholeLife.active) {
    const surrenderHint = ic.endowment.active ? 'Endowment plans typically yield 4–5.5%; below inflation. Consider surrendering and redirecting premium to a term plan + MF SIP.' : ''
    if (surrenderHint) out.push({ level: 'info', text: surrenderHint })
  }

  if (t.activeCount === 0) {
    out.push({ level: 'critical', text: 'No active insurance. The medical / life safety net is your foundation — start with a Family Floater + Term Plan.' })
  }

  return out
}

// ── Visual primitives ────────────────────────────────────────────────

const ROW_GRID =
  'grid items-center gap-3 sm:gap-4 ' +
  'grid-cols-[1fr] ' +
  'lg:grid-cols-[minmax(0,1.8fr)_120px_160px_160px_auto]'

function ColumnHeaders() {
  return (
    <div className={`${ROW_GRID} px-5 py-2.5 bg-gradient-to-b from-slate-100 to-slate-50 border-b-2 border-slate-200 hidden lg:grid`}>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600">Policy</span>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600 text-center">Status</span>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600 text-right">Sum Insured</span>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600 text-right">Premium / yr</span>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600">Flags</span>
    </div>
  )
}

function MoneyInput({
  value, placeholder, onCommit, textColor, suffix, ariaLabel, disabled,
}: {
  value: number
  placeholder?: string
  onCommit: (v: number) => void
  textColor: string
  suffix?: string
  ariaLabel: string
  disabled?: boolean
}) {
  const [text, setText] = useState(String(value || ''))
  useEffect(() => { setText(String(value || '')) }, [value])

  function commit() {
    const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10)
    const v = !isNaN(parsed) && parsed >= 0 ? parsed : 0
    if (v !== value) onCommit(v)
    setText(String(v || ''))
  }

  if (disabled) {
    return (
      <div className="flex items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-md px-2 py-2 text-slate-400 text-xs italic">
        — inactive —
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 bg-white border-2 border-slate-200 rounded-md px-2.5 py-2 hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-colors">
      <span className="text-sm font-bold text-slate-500 shrink-0">₹</span>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        placeholder={placeholder ?? '0'}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        aria-label={ariaLabel}
        className={`flex-1 min-w-0 bg-transparent text-sm font-bold ${textColor} outline-none tabular-nums text-right`}
      />
      {suffix && <span className="text-[10px] text-slate-500 font-semibold shrink-0">{suffix}</span>}
    </div>
  )
}

// ── Insurance row ────────────────────────────────────────────────────

function InsuranceRow({
  entry, sub, textColor, onChange,
}: {
  entry: InsuranceEntry
  sub: SubInsurance
  textColor: string
  onChange: (next: InsuranceEntry) => void
}) {
  function setActive(active: boolean) {
    onChange({ ...entry, active })
  }
  function toggleMwp() {
    onChange({ ...entry, mwp: !entry.mwp })
  }
  return (
    <div className={`${ROW_GRID} px-5 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 even:bg-slate-50/30`}>
      {/* Label */}
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-900">{sub.label}</span>
          {entry.mwp && entry.active && sub.mwpFlag && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-[1.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
              🛡 MWP Act
            </span>
          )}
        </div>
        {sub.hint && (
          <div className="text-[11px] text-slate-500 leading-snug mt-0.5">{sub.hint}</div>
        )}
      </div>

      {/* Status — active toggle */}
      <div className="inline-flex bg-slate-100 rounded-md p-0.5 gap-0.5 w-full" role="group" aria-label="Policy in force">
        <button
          type="button"
          onClick={() => setActive(true)}
          aria-pressed={entry.active}
          className={[
            'flex-1 px-2 py-1.5 text-xs font-bold rounded transition-colors',
            entry.active ? 'bg-emerald-600 text-white shadow-sm'
                         : 'text-slate-600 hover:text-slate-900 hover:bg-white',
          ].join(' ')}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setActive(false)}
          aria-pressed={!entry.active}
          className={[
            'flex-1 px-2 py-1.5 text-xs font-bold rounded transition-colors',
            !entry.active ? 'bg-slate-500 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white',
          ].join(' ')}
        >
          None
        </button>
      </div>

      {/* Sum Insured */}
      <MoneyInput
        value={entry.cover}
        ariaLabel={`${sub.label} sum insured`}
        textColor={textColor}
        disabled={!entry.active}
        onCommit={(v) => onChange({ ...entry, cover: v })}
      />

      {/* Annual Premium */}
      <MoneyInput
        value={entry.premium}
        ariaLabel={`${sub.label} annual premium`}
        textColor="text-blue-700"
        suffix="/yr"
        disabled={!entry.active}
        onCommit={(v) => onChange({ ...entry, premium: v })}
      />

      {/* Flags */}
      <div className="flex flex-wrap gap-1.5 lg:flex-nowrap lg:justify-end">
        {sub.mwpFlag && (
          <button
            type="button"
            onClick={toggleMwp}
            disabled={!entry.active}
            className={[
              'px-2.5 py-1.5 text-[10px] font-bold rounded-md border-2 transition-colors whitespace-nowrap',
              entry.mwp
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
              !entry.active ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
            title="Held under Married Women's Property Act — creditor-proof for spouse"
          >
            {entry.mwp ? '🛡 MWP ✓' : '🛡 MWP Act'}
          </button>
        )}
        {!sub.mwpFlag && <span className="text-[10px] text-slate-400 italic hidden lg:block">—</span>}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────

interface Props {
  profile: UserProfile
  onProfileUpdate: (p: UserProfile) => void
  chrome?: 'default' | 'bare'
}

export function InsuranceCover({ profile, onProfileUpdate, chrome = 'default' }: Props) {
  const cover = ensureInsurance(profile)
  const totals = totalsOf(cover)
  const insights = buildInsights(cover, totals, profile.monthlyWithdrawal || 0)

  function update(key: keyof InsuranceCoverT, next: InsuranceEntry) {
    const newCover: InsuranceCoverT = { ...cover, [key]: next }
    const updatedProfile: UserProfile = { ...profile, insuranceCover: newCover }
    storage.setProfile(updatedProfile)
    onProfileUpdate(updatedProfile)
  }

  const body = (
    <>
      {chrome !== 'bare' && (
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-slate-800">Insurance Cover</h2>
          <span className="text-sm font-bold text-slate-900">{CR(totals.totalCover)} cover</span>
        </div>
      )}

      <p className="text-xs text-slate-600 leading-relaxed mb-4 max-w-4xl">
        Capture every active insurance policy across <strong>{GROUPS.reduce((n, g) => n + g.subs.length, 0)} categories</strong> in
        {' '}<strong>{GROUPS.length} groups</strong>. For each row toggle{' '}
        <strong className="text-emerald-700">Active</strong> or{' '}
        <strong className="text-slate-700">None</strong>, enter sum insured + annual premium.
        Term plans get a <strong className="text-emerald-700">🛡 MWP Act</strong> flag for creditor-proof spouse protection.
      </p>

      {/* Group cards */}
      <div className="space-y-4">
        {GROUPS.map((g) => {
          const t = TONES[g.tone]
          const groupCover = g.subs.reduce((s, sub) => s + (cover[sub.key].active ? cover[sub.key].cover : 0), 0)
          const groupPremium = g.subs.reduce((s, sub) => s + (cover[sub.key].active ? cover[sub.key].premium : 0), 0)
          return (
            <section
              key={g.key}
              className={`relative rounded-xl bg-white border-2 ${t.border} ring-1 ring-inset ${t.ring} overflow-hidden shadow-sm`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${t.bar}`} aria-hidden="true" />
              <header className={`flex items-center justify-between gap-3 px-5 py-4 ${t.bg} border-b-2 border-slate-100`}>
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className={`shrink-0 w-11 h-11 rounded-lg ${t.numBg} ${t.text} font-serif text-xl font-extralight tabular-nums flex items-center justify-center border-2 ${t.border} shadow-sm`}
                    aria-hidden="true"
                  >
                    {g.num}
                  </span>
                  <div className="min-w-0">
                    <div className={`flex items-baseline gap-2 ${t.text}`}>
                      <span className="text-[10px] font-bold tracking-[2.5px] uppercase">Group {parseInt(g.num, 10)}</span>
                      <span className="text-lg" aria-hidden="true">{g.icon}</span>
                    </div>
                    <h3 className="font-serif text-base font-extralight tracking-tight text-slate-900 leading-tight">
                      <span className="font-bold">{g.title}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{g.desc}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[9px] text-slate-500 uppercase tracking-[2px] font-bold">Active cover</div>
                  <div className={`text-lg font-extrabold tabular-nums ${t.text} leading-tight`}>{CR(groupCover)}</div>
                  {groupPremium > 0 && (
                    <div className="text-[10px] text-slate-500 tabular-nums">{INR(groupPremium)}/yr premium</div>
                  )}
                </div>
              </header>

              <ColumnHeaders />

              {g.subs.map((sub) => (
                <InsuranceRow
                  key={sub.key}
                  entry={cover[sub.key]}
                  sub={sub}
                  textColor={t.text}
                  onChange={(next) => update(sub.key, next)}
                />
              ))}
            </section>
          )
        })}
      </div>

      {/* Bottom — totals + insights */}
      <section className="mt-5 rounded-xl border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-[3px] uppercase text-slate-700">Total active cover</div>
            <div className="text-[12px] text-slate-600 mt-1 leading-snug max-w-2xl">
              Sum insured across <strong>{totals.activeCount}</strong> active{' '}
              {totals.activeCount === 1 ? 'policy' : 'policies'} (of {totals.totalCount} possible).
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums leading-none">{CR(totals.totalCover)}</div>
            <div className="text-[11px] text-slate-500 tabular-nums mt-1">
              {INR(totals.totalPremium)}/yr total premium
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <SplitCard tone="rose"    label="Health & Medical" value={totals.healthCover} />
          <SplitCard tone="navy"    label="Life Insurance"   value={totals.lifeCover} />
          <SplitCard tone="amber"   label="Other Risk Cover" value={totals.otherCover} />
        </div>

        {/* Smart insights */}
        {insights.length > 0 && (
          <div className="border-t-2 border-slate-200 pt-3 mt-3">
            <div className="text-[10px] font-bold tracking-[3px] uppercase text-slate-700 mb-2">Smart insights</div>
            <ul className="space-y-1.5">
              {insights.map((ins, i) => (
                <li
                  key={i}
                  className={[
                    'flex gap-2 items-start text-[11px] leading-snug px-3 py-2 rounded-md border',
                    ins.level === 'critical' ? 'bg-rose-50 border-rose-300 text-rose-900' :
                    ins.level === 'warn'     ? 'bg-amber-50 border-amber-300 text-amber-900' :
                    ins.level === 'info'     ? 'bg-blue-50 border-blue-300 text-blue-900' :
                                               'bg-emerald-50 border-emerald-300 text-emerald-900',
                  ].join(' ')}
                >
                  <span className="shrink-0 font-bold" aria-hidden="true">
                    {ins.level === 'critical' ? '⚠' : ins.level === 'warn' ? '⚠' : ins.level === 'info' ? 'ℹ' : '✓'}
                  </span>
                  <span>{ins.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  )

  if (chrome === 'bare') return <>{body}</>

  return (
    <Card className="p-0">
      <div className="p-4 sm:p-5">{body}</div>
    </Card>
  )
}

// ── Split card ───────────────────────────────────────────────────────

function SplitCard({ tone, label, value }: { tone: 'rose' | 'navy' | 'amber'; label: string; value: number }) {
  const t =
    tone === 'rose'  ? { border: 'border-rose-300',  ring: 'ring-rose-100',  bar: 'bg-rose-500',  text: 'text-rose-700',  bg: 'bg-rose-50/60' } :
    tone === 'navy'  ? { border: 'border-blue-300',  ring: 'ring-blue-100',  bar: 'bg-blue-600',  text: 'text-blue-700',  bg: 'bg-blue-50/60' } :
                       { border: 'border-amber-300', ring: 'ring-amber-100', bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50/60' }
  return (
    <div className={`relative rounded-lg border-2 ${t.border} ring-1 ring-inset ${t.ring} ${t.bg} px-3.5 py-3 overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${t.bar}`} aria-hidden="true" />
      <div className={`text-[10px] font-bold tracking-[2px] uppercase ${t.text}`}>{label}</div>
      <div className={`text-2xl font-extrabold tabular-nums ${t.text} leading-tight mt-0.5`}>{CR(value)}</div>
      <div className="text-[10px] text-slate-600 leading-snug mt-1">active cover</div>
    </div>
  )
}

// ── Tone palette ─────────────────────────────────────────────────────

type GroupTone = 'rose' | 'navy' | 'amber'

const TONES: Record<GroupTone, {
  border: string; ring: string; bar: string; text: string; bg: string; numBg: string
}> = {
  rose:  { border: 'border-rose-400',  ring: 'ring-rose-100',  bar: 'bg-rose-600',  text: 'text-rose-700',  bg: 'bg-rose-50/60',  numBg: 'bg-rose-50' },
  navy:  { border: 'border-blue-400',  ring: 'ring-blue-100',  bar: 'bg-blue-700',  text: 'text-blue-700',  bg: 'bg-blue-50/60',  numBg: 'bg-blue-50' },
  amber: { border: 'border-amber-400', ring: 'ring-amber-100', bar: 'bg-amber-600', text: 'text-amber-700', bg: 'bg-amber-50/60', numBg: 'bg-amber-50' },
}
