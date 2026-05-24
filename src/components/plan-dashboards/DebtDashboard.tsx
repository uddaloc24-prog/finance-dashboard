// Debt / Liability Dashboard — DTI, per-loan inventory, payoff timeline
// under Avalanche / Snowball / MaxGain, lifetime interest paid.

import type { UserProfile, BucketState, LoanEntry } from '../../types'
import { DownloadRow } from './NetWorthDashboard'
import { useState } from 'react'
import type { ExportFormat } from '../../lib/exporters'
import { exportReport } from '../../lib/exporters'
import { storage } from '../../lib/storage'

interface Props { profile: UserProfile; buckets: BucketState }

function fmtINR(n: number): string {
  const abs = Math.abs(n), sign = n < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)}k`
  return `${sign}₹${Math.round(abs)}`
}

interface LoanRow { key: string; label: string; entry: LoanEntry }

const LOAN_LABELS: Record<string, string> = {
  homeLoan: 'Home Loan',
  loanAgainstProperty: 'Loan Against Property',
  plotLoan: 'Plot Loan',
  goldLoan: 'Gold Loan',
  loanAgainstSecurities: 'Loan Against Securities',
  carLoan: 'Car Loan',
  twoWheelerLoan: 'Two-Wheeler Loan',
  personalLoan: 'Personal Loan',
  creditCardOutstanding: 'Credit Card',
  familyLoan: 'Family Loan',
  educationLoan: 'Education Loan',
  businessWorkingCapital: 'Business Working Capital',
  businessTermLoan: 'Business Term Loan',
}

function tenureMonths(outstanding: number, emi: number, annualRate: number): number {
  if (emi <= 0 || outstanding <= 0) return 0
  const r = (annualRate / 100) / 12
  if (Math.abs(r) < 1e-9) return outstanding / emi
  const inner = 1 - (r * outstanding) / emi
  if (inner <= 0) return 600
  return Math.min(600, -Math.log(inner) / Math.log(1 + r))
}

export function DebtDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const lp = profile.loanProfile
  const rows: LoanRow[] = lp
    ? (Object.entries(lp).filter(([k]) => k !== 'strategy') as Array<[string, LoanEntry]>)
        .filter(([, l]) => l && l.active)
        .map(([k, l]) => ({ key: k, label: LOAN_LABELS[k] ?? k, entry: l }))
    : []

  const totalOutstanding = rows.reduce((s, r) => s + (r.entry.outstanding || 0), 0)
  const totalEMI = rows.reduce((s, r) => s + (r.entry.emi || 0), 0)
  const lifetimeInterest = rows.reduce((s, r) => {
    const t = tenureMonths(r.entry.outstanding || 0, r.entry.emi || 0, r.entry.interestRate || 0)
    return s + Math.max(0, (r.entry.emi || 0) * t - (r.entry.outstanding || 0))
  }, 0)

  const inv = (profile.assetInventory ?? {}) as Record<string, { monthlyIncome?: number }>
  const passiveIncome = Object.values(inv).reduce((s, e) => s + (e?.monthlyIncome || 0), 0)
  const monthlyIncomeProxy = (profile.monthlyWithdrawal ?? 0) + passiveIncome + (profile.sipAmount ?? 0)
  const dti = monthlyIncomeProxy > 0 ? (totalEMI / monthlyIncomeProxy) * 100 : 0

  const avalanche = [...rows].sort((a, b) => (b.entry.interestRate || 0) - (a.entry.interestRate || 0))
  const snowball = [...rows].sort((a, b) => (a.entry.outstanding || 0) - (b.entry.outstanding || 0))
  const homeLoan = rows.find((r) => r.key === 'homeLoan')
  const strategy = lp?.strategy ?? 'auto'

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setErr(null)
    try { await exportReport(fmt, { identity: storage.getIdentity(), profile, buckets, returnAssumptions: storage.getReturnAssumptions() }) }
    catch (e) { setErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`) }
    finally { setBusy(null) }
  }

  return (
    <section className="space-y-3">
      {/* Lifetime-interest tile dropped — now shown per-loan in the list below */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Kpi label="Total outstanding" value={fmtINR(totalOutstanding)} tone={totalOutstanding > 0 ? 'rose' : 'emerald'} />
        <Kpi label="Monthly EMI"       value={fmtINR(totalEMI)} />
        <Kpi label="DTI ratio"         value={dti > 0 ? `${dti.toFixed(1)}%` : '—'} sub={dti < 35 ? 'comfortable' : dti < 50 ? 'stretched' : 'unsustainable'} tone={dti < 35 ? 'emerald' : dti < 50 ? 'amber' : 'rose'} />
      </div>

      {rows.length === 0 ? (
        <section className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-4 text-center">
          <div className="font-serif italic text-lg text-emerald-700">Debt-free ✓</div>
          <div className="text-[11px] text-slate-600 mt-1">No active loans recorded. Outstanding interest = 0.</div>
        </section>
      ) : (
        <>
          <section className="rounded-md border-2 border-slate-200 bg-white p-3">
            <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Debt-to-income ratio</h4>
            <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div className="absolute inset-y-0 left-0 bg-emerald-200" style={{ width: '35%' }} />
              <div className="absolute inset-y-0 bg-amber-200" style={{ left: '35%', width: '15%' }} />
              <div className="absolute inset-y-0 bg-rose-200" style={{ left: '50%', width: '50%' }} />
              <div className="absolute inset-y-0 bg-slate-700" style={{ width: `${Math.min(100, dti)}%`, opacity: 0.6 }} />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 mt-1 tabular-nums">
              <span>0%</span><span>35</span><span>50</span><span>100%</span>
            </div>
          </section>

          <section className="rounded-md border-2 border-slate-200 bg-white p-3">
            <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Active loans</h4>
            <ul className="text-[11.5px] space-y-1.5">
              {rows.map((r) => {
                const months = tenureMonths(r.entry.outstanding || 0, r.entry.emi || 0, r.entry.interestRate || 0)
                return (
                  <li key={r.key} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-baseline border-b border-slate-100 last:border-b-0 py-1.5">
                    <span className="text-slate-800 font-semibold">{r.label}{r.entry.maxGain ? ' · MaxGain' : ''}</span>
                    <span className="text-slate-600 tabular-nums">{(r.entry.interestRate || 0).toFixed(2)}%</span>
                    <span className="text-slate-700 tabular-nums">EMI {fmtINR(r.entry.emi || 0)}</span>
                    <span className="text-slate-500 tabular-nums">{months === 0 ? '—' : months >= 600 ? '∞' : `${Math.round(months)}m`}</span>
                    <span className="text-slate-900 font-bold tabular-nums">{fmtINR(r.entry.outstanding || 0)}</span>
                  </li>
                )
              })}
            </ul>
            <div className="text-[10px] text-slate-500 italic mt-1">Lifetime interest at current EMI ≈ <strong>{fmtINR(lifetimeInterest)}</strong></div>
          </section>

          <section className="rounded-md border-2 border-amber-200 bg-amber-50/40 p-3 space-y-2">
            <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-amber-800">Payoff strategy comparison</h4>
            <Strat title="Avalanche (highest rate first)"
                   detail={`Attack ${avalanche[0]?.label ?? 'first'} @ ${(avalanche[0]?.entry.interestRate ?? 0).toFixed(2)}% → saves the most interest mathematically.`} />
            <Strat title="Snowball (smallest balance first)"
                   detail={`Clear ${snowball[0]?.label ?? 'first'} (${fmtINR(snowball[0]?.entry.outstanding || 0)}) → quick psychological win, momentum.`} />
            <Strat title="MaxGain (home-loan offset)"
                   detail={homeLoan?.entry.maxGain
                     ? `Park surplus in MaxGain account → reduces interest on ${homeLoan.label} (₹${((homeLoan.entry.outstanding || 0) / 1e5).toFixed(1)}L) while staying liquid.`
                     : homeLoan ? 'Convert to MaxGain variant to combine liquidity + offset.' : 'Not applicable — no home loan recorded.'} />
            <div className="text-[10px] text-slate-600 italic pt-1 border-t border-amber-200/60">
              Current strategy preference: <strong>{strategy}</strong>
            </div>
          </section>
        </>
      )}

      <section className="rounded-md border-2 border-slate-200 bg-slate-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-1.5">Observations</h4>
        <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
          {dti > 50 && <li>● DTI is above 50% — corpus is funding interest rather than life.</li>}
          {dti > 35 && dti <= 50 && <li>● DTI is in the 35–50% band — manageable but SIP capacity is constrained.</li>}
          {rows.some((r) => (r.entry.interestRate || 0) >= 15) && <li>● You hold debt at ≥15% rate (likely credit card or personal).</li>}
          {homeLoan && (homeLoan.entry.interestRate || 0) < 9 && <li>● Home-loan rate is {(homeLoan.entry.interestRate || 0).toFixed(2)}% — below the typical equity-return assumption.</li>}
          {rows.length > 0 && <li>● Lifetime interest at current EMIs ≈ <strong>{fmtINR(lifetimeInterest)}</strong>.</li>}
        </ul>
      </section>

      <DownloadRow busy={busy} onExport={handleExport} err={err} profile={profile} buckets={buckets} />
    </section>
  )
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'emerald' | 'rose' | 'amber' }) {
  const bg = tone === 'emerald' ? 'bg-emerald-50' : tone === 'rose' ? 'bg-rose-50' : tone === 'amber' ? 'bg-amber-50' : 'bg-white'
  const fg = tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-700'
  return (
    <div className={`rounded-md border-2 border-slate-200 ${bg} px-2.5 py-2`}>
      <div className={`text-[9px] font-bold tracking-[1.5px] uppercase ${fg}`}>{label}</div>
      <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5 leading-tight">{value}</div>
      {sub && <div className="text-[9px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function Strat({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-slate-800">{title}</div>
      <div className="text-[10.5px] text-slate-600 leading-snug">{detail}</div>
    </div>
  )
}
