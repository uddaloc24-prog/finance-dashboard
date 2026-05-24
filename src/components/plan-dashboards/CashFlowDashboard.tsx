// Cash Flow Dashboard — monthly inflow (passive income from invested
// assets + SIP/passive) vs monthly outflow (budget + active loan EMIs),
// surplus / deficit, and deployment plan. Complements (but does not
// replace) the always-on CashflowSummary card.

import type { UserProfile, BucketState, AssetEntry, LoanEntry } from '../../types'
import { DownloadRow } from './NetWorthDashboard'
import { useState } from 'react'
import type { ExportFormat } from '../../lib/exporters'
import { exportReport } from '../../lib/exporters'
import { storage } from '../../lib/storage'

interface Props {
  profile: UserProfile
  buckets: BucketState
}

function fmtINR(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)}k`
  return `${sign}₹${Math.round(abs)}`
}

export function CashFlowDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [exportErr, setExportErr] = useState<string | null>(null)

  // Inflows
  const inv = profile.assetInventory
  const passiveFromAssets = inv
    ? (Object.values(inv) as AssetEntry[]).filter(Boolean).reduce((s, e) => s + (e.monthlyIncome || 0), 0)
    : 0
  const sipPassive = profile.sipAmount ?? 0  // already monthly equivalent
  const withdrawal = profile.monthlyWithdrawal ?? 0
  const totalInflow = passiveFromAssets + sipPassive + withdrawal

  // Outflows — budget
  const exp = profile.expenses
  const budgetMonthly = exp ? (exp.essential ?? 0) + (exp.lifestyle ?? 0) + (exp.healthcare ?? 0) + (exp.education ?? 0) : 0
  // Outflows — active loan EMIs
  const lp = profile.loanProfile
  const emiMonthly = lp
    ? (Object.entries(lp).filter(([k]) => k !== 'strategy') as Array<[string, LoanEntry]>)
        .filter(([, l]) => l && l.active)
        .reduce((s, [, l]) => s + (l.emi || 0), 0)
    : 0
  const totalOutflow = budgetMonthly + emiMonthly

  const netSurplus = totalInflow - totalOutflow

  // Budget breakdown for the inner chart
  const budgetSlices = exp ? [
    { label: 'Essential',  v: exp.essential ?? 0,  color: '#ef4444' },
    { label: 'Lifestyle',  v: exp.lifestyle ?? 0,  color: '#a855f7' },
    { label: 'Healthcare', v: exp.healthcare ?? 0, color: '#10b981' },
    { label: 'Education',  v: exp.education ?? 0,  color: '#f59e0b' },
  ].filter((s) => s.v > 0) : []

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setExportErr(null)
    try {
      await exportReport(fmt, { identity: storage.getIdentity(), profile, buckets, returnAssumptions: storage.getReturnAssumptions() })
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`)
    } finally { setBusy(null) }
  }

  return (
    <section className="space-y-3">
      {/* Top tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi label="Inflow / mo"   value={fmtINR(totalInflow)}  tone="emerald" />
        <Kpi label="Outflow / mo"  value={fmtINR(totalOutflow)} tone="rose" />
        <Kpi label="Net surplus"   value={fmtINR(netSurplus)}   tone={netSurplus >= 0 ? 'emerald' : 'rose'} />
        <Kpi label="Burn coverage" value={withdrawal > 0 ? `${Math.round((passiveFromAssets / withdrawal) * 100)}%` : '—'} sub="passive ÷ withdrawal" tone="navy" />
      </div>

      {/* Inflow breakdown */}
      <section className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-emerald-800">Monthly inflow</h4>
        <FlowRow label="Passive income from invested assets" value={passiveFromAssets} max={totalInflow} color="#10b981" />
        <FlowRow label="SIP / other passive income"          value={sipPassive}        max={totalInflow} color="#34d399" />
        <FlowRow label="Withdrawal from corpus"              value={withdrawal}        max={totalInflow} color="#6ee7b7" />
      </section>

      {/* Outflow breakdown */}
      <section className="rounded-md border-2 border-rose-200 bg-rose-50/40 p-3 space-y-2">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-rose-800">Monthly outflow</h4>
        {budgetSlices.length > 0 ? (
          budgetSlices.map((b) => <FlowRow key={b.label} label={b.label} value={b.v} max={totalOutflow} color={b.color} />)
        ) : (
          <div className="text-[11px] text-slate-500 italic">Add budget categories under Step 03 Monthly Budget.</div>
        )}
        {emiMonthly > 0 && <FlowRow label="Loan EMIs (active)" value={emiMonthly} max={totalOutflow} color="#dc2626" />}
      </section>

      {/* Net surplus deployment */}
      <section className={`rounded-md border-2 p-3 ${netSurplus >= 0 ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'}`}>
        <div className="flex items-baseline justify-between mb-1.5">
          <h4 className={`text-[10px] font-bold tracking-[2px] uppercase ${netSurplus >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
            Net surplus deployment plan
          </h4>
          <span className="text-[11px] tabular-nums font-bold">{netSurplus >= 0 ? '+' : ''}{fmtINR(netSurplus)} / mo</span>
        </div>
        {netSurplus >= 0 ? (
          <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
            <li>● <strong>40%</strong> ≈ {fmtINR(netSurplus * 0.4)} → B4 equity (long-horizon refill engine)</li>
            <li>● <strong>30%</strong> ≈ {fmtINR(netSurplus * 0.3)} → B3 hybrid / BAF (stability layer)</li>
            <li>● <strong>20%</strong> ≈ {fmtINR(netSurplus * 0.2)} → B2 short-debt / SCSS top-up</li>
            <li>● <strong>10%</strong> ≈ {fmtINR(netSurplus * 0.1)} → B1 liquid buffer</li>
            <li className="pt-1 text-slate-500 italic">Adjust ratios via the Risk Profile dashboard for your specific match.</li>
          </ul>
        ) : (
          <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
            <li>● <strong>Deficit of {fmtINR(Math.abs(netSurplus))} / mo</strong> — your withdrawal + passive income don't yet cover the budget.</li>
            <li>● Options: cut budget (Step 03), increase withdrawal (Step 04), add part-time income, or extend retirement age (Step 05).</li>
            <li>● A persistent deficit at retirement age = corpus depletes faster than the Readiness dashboard projects.</li>
          </ul>
        )}
      </section>

      {/* Inflow vs Outflow bar */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Inflow vs Outflow</h4>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-emerald-700 w-16 tabular-nums">{fmtINR(totalInflow)}</span>
          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200 relative">
            <div className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${(totalInflow / Math.max(totalInflow, totalOutflow, 1)) * 100}%` }} />
            <div className="absolute inset-y-0 right-0 bg-rose-500 opacity-60" style={{ width: `${(totalOutflow / Math.max(totalInflow, totalOutflow, 1)) * 100}%` }} />
          </div>
          <span className="text-rose-700 w-16 tabular-nums text-right">{fmtINR(totalOutflow)}</span>
        </div>
      </section>

      <DownloadRow busy={busy} onExport={handleExport} err={exportErr} profile={profile} buckets={buckets} />
    </section>
  )
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'emerald' | 'rose' | 'navy' }) {
  const bg = tone === 'emerald' ? 'bg-emerald-50' : tone === 'rose' ? 'bg-rose-50' : tone === 'navy' ? 'bg-blue-50' : 'bg-white'
  const fg = tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : tone === 'navy' ? 'text-blue-700' : 'text-slate-700'
  return (
    <div className={`rounded-md border-2 border-slate-200 ${bg} px-2.5 py-2`}>
      <div className={`text-[9px] font-bold tracking-[1.5px] uppercase ${fg}`}>{label}</div>
      <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5 leading-tight">{value}</div>
      {sub && <div className="text-[9px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function FlowRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] mb-0.5">
        <span className="text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900 tabular-nums">{fmtINR(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/60 overflow-hidden border border-slate-200">
        <div className="h-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
    </div>
  )
}
