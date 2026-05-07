// Loans & Liabilities — captures outstanding loans across 4 logical groups
// (Secured · Vehicle · Unsecured · Business) and offers three repayment
// strategy options:
//   • Avalanche — pay highest-interest loan first (saves the most interest)
//   • Snowball  — pay smallest-balance first (psychological wins)
//   • MaxGain   — park surplus in SBI-MaxGain home-loan OD (interest savings + liquidity)
//
// Home loan row carries a "🔄 MaxGain" toggle for the SBI overdraft variant.

import { useEffect, useState } from 'react'
import type { LoanEntry, LoanProfile, RepaymentStrategy, UserProfile } from '../types'
import { DEFAULT_LOAN_PROFILE } from '../constants'
import { storage } from '../lib/storage'
import { Card } from './ui/Card'

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const CR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  if (n > 0) return INR(n)
  return '₹0'
}

interface SubLoan {
  key: keyof LoanProfile
  label: string
  hint?: string
  maxGainFlag?: boolean   // show 🔄 MaxGain toggle (home loan only)
}

interface LoanGroup {
  key: string
  num: string
  title: string
  desc: string
  tone: GroupTone
  icon: string
  subs: SubLoan[]
}

const GROUPS: LoanGroup[] = [
  {
    key: 'secured', num: '01', title: 'Secured Loans', desc: 'Backed by collateral — typically the lowest rates',
    tone: 'navy', icon: '🏠',
    subs: [
      { key: 'homeLoan',              label: 'Home Loan',                 hint: 'Primary residence loan · use 🔄 MaxGain (SBI) to park surplus and reduce interest', maxGainFlag: true },
      { key: 'loanAgainstProperty',   label: 'Loan Against Property',    hint: 'LAP — against existing property (residential or commercial)' },
      { key: 'plotLoan',              label: 'Plot Loan',                hint: 'Land or undeveloped plot loan' },
      { key: 'goldLoan',              label: 'Gold Loan',                hint: 'Loan secured against gold' },
      { key: 'loanAgainstSecurities', label: 'Loan Against Securities',  hint: 'Pledge of shares / MFs / FDs / insurance' },
    ],
  },
  {
    key: 'vehicle', num: '02', title: 'Vehicle Loans', desc: 'Auto loans — moderate rates, depreciating asset',
    tone: 'amber', icon: '🚗',
    subs: [
      { key: 'carLoan',        label: 'Car Loan' },
      { key: 'twoWheelerLoan', label: 'Two-wheeler Loan' },
    ],
  },
  {
    key: 'unsecured', num: '03', title: 'Unsecured Loans', desc: 'No collateral — highest rates · clear these first',
    tone: 'rose', icon: '⚠️',
    subs: [
      { key: 'personalLoan',          label: 'Personal Loan',         hint: 'Bank / NBFC personal loan' },
      { key: 'creditCardOutstanding', label: 'Credit Card outstanding', hint: 'Carry-over balance · 36–48% effective rate · clear immediately' },
      { key: 'familyLoan',            label: 'Family / Friends Loan' },
      { key: 'educationLoan',         label: 'Education Loan',        hint: 'Self / children — interest deductible under Sec 80E' },
    ],
  },
  {
    key: 'business', num: '04', title: 'Business Loans', desc: 'Working capital · term · enterprise debt',
    tone: 'purple', icon: '🏢',
    subs: [
      { key: 'businessWorkingCapital', label: 'Working Capital' },
      { key: 'businessTermLoan',       label: 'Business Term Loan' },
    ],
  },
]

// ── Migration ────────────────────────────────────────────────────────

function toEntry(v: unknown, fallback: LoanEntry): LoanEntry {
  if (v && typeof v === 'object') {
    const obj = v as { active?: unknown; outstanding?: unknown; interestRate?: unknown; emi?: unknown; maxGain?: unknown }
    return {
      active:       typeof obj.active === 'boolean' ? obj.active
                  : typeof obj.outstanding === 'number' && obj.outstanding > 0,
      outstanding:  typeof obj.outstanding === 'number'  ? obj.outstanding  : 0,
      interestRate: typeof obj.interestRate === 'number' ? obj.interestRate : 0,
      emi:          typeof obj.emi === 'number'          ? obj.emi          : 0,
      maxGain:      typeof obj.maxGain === 'boolean' ? obj.maxGain : fallback.maxGain,
    }
  }
  return { ...fallback }
}

function ensureLoans(profile: UserProfile): LoanProfile {
  const raw = (profile.loanProfile ?? {}) as Record<string, unknown>
  const result: LoanProfile = { ...DEFAULT_LOAN_PROFILE }
  for (const key of Object.keys(DEFAULT_LOAN_PROFILE) as Array<keyof LoanProfile>) {
    if (key === 'strategy') continue
    result[key] = toEntry(raw[key], DEFAULT_LOAN_PROFILE[key] as LoanEntry) as never
  }
  const s = raw.strategy
  result.strategy = s === 'snowball' || s === 'maxgain' ? s : 'avalanche'
  return result
}

// ── Calculations ────────────────────────────────────────────────────

/** Solve for tenure (months) given outstanding P, monthly rate r/12, and EMI. */
function monthsToClose(outstanding: number, annualRate: number, emi: number): number | null {
  if (outstanding <= 0 || emi <= 0) return null
  if (annualRate === 0) return Math.ceil(outstanding / emi)
  const r = annualRate / 100 / 12
  const monthlyInterest = outstanding * r
  if (emi <= monthlyInterest) return null  // EMI doesn't cover interest — never closes
  return Math.ceil(Math.log(emi / (emi - outstanding * r)) / Math.log(1 + r))
}

interface Totals {
  totalOutstanding: number
  totalEmi: number
  weightedRate: number
  activeCount: number
  longestMonths: number
  totalInterestRemaining: number
  hasHomeLoan: boolean
  hasMaxGain: boolean
}

function totalsOf(lp: LoanProfile): Totals {
  let totalOutstanding = 0, totalEmi = 0, weightedSum = 0, activeCount = 0, longestMonths = 0, interestRemaining = 0
  let hasHomeLoan = false, hasMaxGain = false
  for (const key of Object.keys(lp) as Array<keyof LoanProfile>) {
    if (key === 'strategy') continue
    const e = lp[key] as LoanEntry
    if (!e.active) continue
    activeCount += 1
    totalOutstanding += e.outstanding
    totalEmi += e.emi
    weightedSum += e.outstanding * e.interestRate
    const months = monthsToClose(e.outstanding, e.interestRate, e.emi)
    if (months != null) {
      longestMonths = Math.max(longestMonths, months)
      interestRemaining += Math.max(0, e.emi * months - e.outstanding)
    }
    if (key === 'homeLoan') {
      hasHomeLoan = true
      if (e.maxGain) hasMaxGain = true
    }
  }
  const weightedRate = totalOutstanding > 0 ? weightedSum / totalOutstanding : 0
  return { totalOutstanding, totalEmi, weightedRate, activeCount, longestMonths, totalInterestRemaining: interestRemaining, hasHomeLoan, hasMaxGain }
}

interface Insight {
  level: 'critical' | 'warn' | 'info' | 'good'
  text: string
}

function buildInsights(lp: LoanProfile, t: Totals): Insight[] {
  const out: Insight[] = []
  const cc = lp.creditCardOutstanding
  const personal = lp.personalLoan
  const home = lp.homeLoan

  if (cc.active && cc.outstanding > 0) {
    out.push({ level: 'critical', text: 'Credit card balance carries 36–48% effective interest. Clear it before any other prepayment — every ₹1 cleared saves ₹3 over 5 years.' })
  }
  if (personal.active && personal.interestRate >= 12) {
    out.push({ level: 'warn', text: `Personal loan at ${personal.interestRate}% — second-priority for prepayment after credit-card dues.` })
  }
  if (home.active && !home.maxGain && home.outstanding > 1_00_00_000) {
    out.push({ level: 'info', text: 'Large home loan without MaxGain. Consider switching to an SBI-MaxGain / similar overdraft variant — surplus parked reduces effective interest while staying liquid.' })
  }
  if (t.activeCount === 0) {
    out.push({ level: 'good', text: 'No active loans. ✓ Zero-debt is the ideal Phase 1 milestone — protect it.' })
  } else if (t.totalEmi > 0) {
    const burdenLabel = t.totalEmi >= 50000 ? 'high' : t.totalEmi >= 25000 ? 'moderate' : 'manageable'
    out.push({ level: 'info', text: `Monthly EMI burden ${INR(t.totalEmi)} (${burdenLabel}). Target zero-debt by age 55, hard limit at 58.` })
  }
  if (lp.educationLoan.active && lp.educationLoan.outstanding > 0) {
    out.push({ level: 'info', text: 'Education loan interest is deductible under Section 80E for up to 8 years. Don\'t prepay aggressively.' })
  }
  return out
}

// ── Strategy ranking ─────────────────────────────────────────────────

interface Ranked {
  key: keyof LoanProfile
  label: string
  outstanding: number
  rate: number
  emi: number
  months: number | null
}

function rankLoans(lp: LoanProfile, strategy: RepaymentStrategy): Ranked[] {
  const list: Ranked[] = []
  for (const g of GROUPS) for (const s of g.subs) {
    const e = lp[s.key] as LoanEntry
    if (!e.active || e.outstanding <= 0) continue
    list.push({
      key: s.key, label: s.label,
      outstanding: e.outstanding, rate: e.interestRate, emi: e.emi,
      months: monthsToClose(e.outstanding, e.interestRate, e.emi),
    })
  }
  if (strategy === 'avalanche') list.sort((a, b) => b.rate - a.rate)
  else if (strategy === 'snowball') list.sort((a, b) => a.outstanding - b.outstanding)
  else if (strategy === 'maxgain') {
    // Surface home-loan first (so user can park surplus there), then by rate
    list.sort((a, b) => {
      if (a.key === 'homeLoan' && b.key !== 'homeLoan') return -1
      if (b.key === 'homeLoan' && a.key !== 'homeLoan') return 1
      return b.rate - a.rate
    })
  }
  return list
}

// ── Visual primitives ────────────────────────────────────────────────

const ROW_GRID =
  'grid items-center gap-3 sm:gap-4 ' +
  'grid-cols-[1fr] ' +
  'lg:grid-cols-[minmax(0,1.6fr)_110px_150px_100px_140px_auto]'

function ColumnHeaders() {
  return (
    <div className={`${ROW_GRID} px-5 py-2.5 bg-gradient-to-b from-slate-100 to-slate-50 border-b-2 border-slate-200 hidden lg:grid`}>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600">Loan</span>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600 text-center">Active</span>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600 text-right">Outstanding</span>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600 text-right">Rate %</span>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600 text-right">EMI / mo</span>
      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-slate-600">Flags</span>
    </div>
  )
}

function NumberInput({
  value, placeholder, onCommit, textColor, suffix, ariaLabel, disabled, prefix,
}: {
  value: number
  placeholder?: string
  onCommit: (v: number) => void
  textColor: string
  suffix?: string
  prefix?: string
  ariaLabel: string
  disabled?: boolean
}) {
  const [text, setText] = useState(String(value || ''))
  useEffect(() => { setText(String(value || '')) }, [value])

  function commit() {
    const cleaned = text.replace(/[^\d.]/g, '')
    const parsed = parseFloat(cleaned)
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
      {prefix && <span className="text-sm font-bold text-slate-500 shrink-0">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
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

// ── Loan row ─────────────────────────────────────────────────────────

function LoanRow({
  entry, sub, textColor, onChange,
}: {
  entry: LoanEntry
  sub: SubLoan
  textColor: string
  onChange: (next: LoanEntry) => void
}) {
  const months = entry.active ? monthsToClose(entry.outstanding, entry.interestRate, entry.emi) : null
  return (
    <div className={`${ROW_GRID} px-5 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 even:bg-slate-50/30`}>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-900">{sub.label}</span>
          {entry.maxGain && entry.active && sub.maxGainFlag && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-[1.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
              🔄 MaxGain
            </span>
          )}
          {months != null && entry.active && entry.outstanding > 0 && (
            <span className="shrink-0 text-[9px] font-bold tabular-nums text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
              {months >= 12 ? `~${(months / 12).toFixed(1)} yr left` : `${months} mo left`}
            </span>
          )}
        </div>
        {sub.hint && (
          <div className="text-[11px] text-slate-500 leading-snug mt-0.5">{sub.hint}</div>
        )}
      </div>

      {/* Active toggle */}
      <div className="inline-flex bg-slate-100 rounded-md p-0.5 gap-0.5 w-full" role="group" aria-label="Loan status">
        <button
          type="button"
          onClick={() => onChange({ ...entry, active: true })}
          aria-pressed={entry.active}
          className={[
            'flex-1 px-2 py-1.5 text-xs font-bold rounded transition-colors',
            entry.active ? 'bg-rose-600 text-white shadow-sm'
                         : 'text-slate-600 hover:text-slate-900 hover:bg-white',
          ].join(' ')}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...entry, active: false })}
          aria-pressed={!entry.active}
          className={[
            'flex-1 px-2 py-1.5 text-xs font-bold rounded transition-colors',
            !entry.active ? 'bg-slate-500 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white',
          ].join(' ')}
        >
          No
        </button>
      </div>

      {/* Outstanding */}
      <NumberInput
        value={entry.outstanding}
        prefix="₹"
        ariaLabel={`${sub.label} outstanding`}
        textColor={textColor}
        disabled={!entry.active}
        onCommit={(v) => onChange({ ...entry, outstanding: v })}
      />

      {/* Rate */}
      <NumberInput
        value={entry.interestRate}
        suffix="%"
        ariaLabel={`${sub.label} interest rate`}
        textColor="text-amber-700"
        disabled={!entry.active}
        onCommit={(v) => onChange({ ...entry, interestRate: v })}
      />

      {/* EMI */}
      <NumberInput
        value={entry.emi}
        prefix="₹"
        suffix="/mo"
        ariaLabel={`${sub.label} EMI`}
        textColor="text-blue-700"
        disabled={!entry.active}
        onCommit={(v) => onChange({ ...entry, emi: v })}
      />

      {/* Flags */}
      <div className="flex flex-wrap gap-1.5 lg:flex-nowrap lg:justify-end">
        {sub.maxGainFlag && (
          <button
            type="button"
            onClick={() => onChange({ ...entry, maxGain: !entry.maxGain })}
            disabled={!entry.active}
            className={[
              'px-2.5 py-1.5 text-[10px] font-bold rounded-md border-2 transition-colors whitespace-nowrap',
              entry.maxGain
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
              !entry.active ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
            title="SBI MaxGain / overdraft variant — surplus parked reduces effective interest"
          >
            {entry.maxGain ? '🔄 MaxGain ✓' : '🔄 MaxGain'}
          </button>
        )}
        {!sub.maxGainFlag && <span className="text-[10px] text-slate-400 italic hidden lg:block">—</span>}
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

export function LoansLiabilities({ profile, onProfileUpdate, chrome = 'default' }: Props) {
  const lp = ensureLoans(profile)
  const totals = totalsOf(lp)
  const insights = buildInsights(lp, totals)
  const strategy: RepaymentStrategy = lp.strategy ?? 'avalanche'
  const ranked = rankLoans(lp, strategy)

  function update(key: keyof LoanProfile, next: LoanEntry) {
    const newLp: LoanProfile = { ...lp, [key]: next }
    storage.setProfile({ ...profile, loanProfile: newLp })
    onProfileUpdate({ ...profile, loanProfile: newLp })
  }
  function setStrategy(s: RepaymentStrategy) {
    const newLp: LoanProfile = { ...lp, strategy: s }
    storage.setProfile({ ...profile, loanProfile: newLp })
    onProfileUpdate({ ...profile, loanProfile: newLp })
  }

  const body = (
    <>
      {chrome !== 'bare' && (
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-slate-800">Loans &amp; Liabilities</h2>
          <span className="text-sm font-bold text-slate-900">{CR(totals.totalOutstanding)} outstanding</span>
        </div>
      )}

      <p className="text-xs text-slate-600 leading-relaxed mb-4 max-w-4xl">
        Capture every active loan across <strong>{GROUPS.reduce((n, g) => n + g.subs.length, 0)} categories</strong> in{' '}
        <strong>{GROUPS.length} groups</strong> — Secured · Vehicle · Unsecured · Business. For each, toggle{' '}
        <strong className="text-rose-700">Yes</strong> / <strong className="text-slate-700">No</strong> and enter Outstanding ·
        Rate · EMI. The home loan supports a <strong className="text-emerald-700">🔄 MaxGain</strong> flag — the SBI
        overdraft variant where surplus parked reduces effective interest while staying liquid.
      </p>

      {/* Group cards */}
      <div className="space-y-4">
        {GROUPS.map((g) => {
          const t = TONES[g.tone]
          const groupOutstanding = g.subs.reduce((s, sub) => s + ((lp[sub.key] as LoanEntry).active ? (lp[sub.key] as LoanEntry).outstanding : 0), 0)
          const groupEmi = g.subs.reduce((s, sub) => s + ((lp[sub.key] as LoanEntry).active ? (lp[sub.key] as LoanEntry).emi : 0), 0)
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
                  <div className="text-[9px] text-slate-500 uppercase tracking-[2px] font-bold">Outstanding</div>
                  <div className={`text-lg font-extrabold tabular-nums ${t.text} leading-tight`}>{CR(groupOutstanding)}</div>
                  {groupEmi > 0 && <div className="text-[10px] text-slate-500 tabular-nums">{INR(groupEmi)}/mo EMI</div>}
                </div>
              </header>

              <ColumnHeaders />

              {g.subs.map((sub) => (
                <LoanRow
                  key={sub.key}
                  entry={lp[sub.key] as LoanEntry}
                  sub={sub}
                  textColor={t.text}
                  onChange={(next) => update(sub.key, next)}
                />
              ))}
            </section>
          )
        })}
      </div>

      {/* Repayment Strategy + ranked priorities */}
      <section className="mt-5 rounded-xl border-2 border-slate-300 bg-gradient-to-br from-amber-50/40 to-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-[3px] uppercase text-amber-700">Repayment strategy</div>
            <div className="text-[12px] text-slate-600 mt-0.5 leading-snug max-w-2xl">
              Pick how you want surplus directed to loans. The priority order recomputes accordingly.
            </div>
          </div>
        </div>
        {/* Strategy picker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          <StrategyButton
            active={strategy === 'avalanche'}
            onClick={() => setStrategy('avalanche')}
            tone="amber"
            title="Avalanche"
            sub="Highest interest rate first · saves the most ₹ overall"
            badge="recommended"
          />
          <StrategyButton
            active={strategy === 'snowball'}
            onClick={() => setStrategy('snowball')}
            tone="rose"
            title="Snowball"
            sub="Smallest balance first · momentum & psychological wins"
          />
          <StrategyButton
            active={strategy === 'maxgain'}
            onClick={() => setStrategy('maxgain')}
            tone="emerald"
            title="MaxGain"
            sub="Park surplus in home-loan OD · cut interest, keep liquidity"
            badge={totals.hasMaxGain ? 'available' : 'needs MaxGain home loan'}
            disabled={!totals.hasHomeLoan}
          />
        </div>

        {/* Ranked priority list */}
        {ranked.length > 0 ? (
          <div className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden">
            <div className="px-3.5 py-2 bg-slate-50 border-b-2 border-slate-200">
              <span className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">
                Priority order — direct surplus here, in this sequence
              </span>
            </div>
            <ol className="divide-y divide-slate-100">
              {ranked.map((r, i) => (
                <li key={r.key} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50/60 transition-colors">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-amber-600 text-white text-xs font-bold tabular-nums flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-slate-900 truncate">{r.label}</div>
                    <div className="text-[11px] text-slate-600 tabular-nums">
                      {CR(r.outstanding)} @ {r.rate}% · EMI {INR(r.emi)}/mo
                      {r.months != null && (r.months >= 12 ? ` · ~${(r.months / 12).toFixed(1)} yr left` : ` · ${r.months} mo left`)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="text-[12px] text-slate-500 italic px-3 py-2 bg-slate-50 rounded">
            No active loans — nothing to rank yet.
          </div>
        )}
      </section>

      {/* Bottom — totals + insights */}
      <section className="mt-4 rounded-xl border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-[3px] uppercase text-slate-700">Total outstanding</div>
            <div className="text-[12px] text-slate-600 mt-1 leading-snug max-w-2xl">
              Across <strong>{totals.activeCount}</strong> active{' '}
              {totals.activeCount === 1 ? 'loan' : 'loans'}.{' '}
              Weighted average rate <strong className="tabular-nums">{totals.weightedRate.toFixed(2)}%</strong> ·
              total interest still owed <strong className="tabular-nums">{CR(totals.totalInterestRemaining)}</strong>.
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums leading-none">{CR(totals.totalOutstanding)}</div>
            <div className="text-[11px] text-slate-500 tabular-nums mt-1">
              {INR(totals.totalEmi)}/mo EMI · {totals.longestMonths >= 12 ? `~${(totals.longestMonths / 12).toFixed(1)} yr` : `${totals.longestMonths} mo`} to clear
            </div>
          </div>
        </div>

        {insights.length > 0 && (
          <div className="border-t-2 border-slate-200 pt-3">
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
                    {ins.level === 'critical' || ins.level === 'warn' ? '⚠' : ins.level === 'info' ? 'ℹ' : '✓'}
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

// ── Strategy button ──────────────────────────────────────────────────

function StrategyButton({
  active, onClick, tone, title, sub, badge, disabled,
}: {
  active: boolean
  onClick: () => void
  tone: 'amber' | 'rose' | 'emerald'
  title: string
  sub: string
  badge?: string
  disabled?: boolean
}) {
  const t =
    tone === 'amber'   ? { activeBg: 'bg-amber-600',   activeText: 'text-white', activeBorder: 'border-amber-700',  ring: 'ring-amber-200',   text: 'text-amber-700' } :
    tone === 'rose'    ? { activeBg: 'bg-rose-600',    activeText: 'text-white', activeBorder: 'border-rose-700',   ring: 'ring-rose-200',    text: 'text-rose-700' } :
                         { activeBg: 'bg-emerald-600', activeText: 'text-white', activeBorder: 'border-emerald-700', ring: 'ring-emerald-200', text: 'text-emerald-700' }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'relative text-left px-3.5 py-2.5 rounded-lg border-2 transition-all',
        active
          ? `${t.activeBg} ${t.activeText} ${t.activeBorder} shadow-md ring-2 ring-inset ${t.ring}`
          : 'bg-white border-slate-300 hover:border-slate-400 hover:shadow-sm',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
      aria-pressed={active}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-sm font-extrabold ${active ? '' : t.text}`}>{title}</span>
        {badge && (
          <span className={[
            'text-[8px] font-bold uppercase tracking-[1.5px] rounded px-1.5 py-0.5',
            active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
          ].join(' ')}>
            {badge}
          </span>
        )}
      </div>
      <div className={`text-[11px] leading-snug mt-1 ${active ? 'text-white/90' : 'text-slate-600'}`}>
        {sub}
      </div>
    </button>
  )
}

// ── Tone palette ─────────────────────────────────────────────────────

type GroupTone = 'navy' | 'amber' | 'rose' | 'purple'

const TONES: Record<GroupTone, {
  border: string; ring: string; bar: string; text: string; bg: string; numBg: string
}> = {
  navy:   { border: 'border-blue-400',    ring: 'ring-blue-100',    bar: 'bg-blue-700',    text: 'text-blue-700',    bg: 'bg-blue-50/60',    numBg: 'bg-blue-50' },
  amber:  { border: 'border-amber-400',   ring: 'ring-amber-100',   bar: 'bg-amber-600',   text: 'text-amber-700',   bg: 'bg-amber-50/60',   numBg: 'bg-amber-50' },
  rose:   { border: 'border-rose-400',    ring: 'ring-rose-100',    bar: 'bg-rose-600',    text: 'text-rose-700',    bg: 'bg-rose-50/60',    numBg: 'bg-rose-50' },
  purple: { border: 'border-purple-400',  ring: 'ring-purple-100',  bar: 'bg-purple-600',  text: 'text-purple-700',  bg: 'bg-purple-50/60',  numBg: 'bg-purple-50' },
}
