// Asset Allocation / Diversification — current Equity / Debt / Gold / RE
// / Cash split vs the matched risk profile's target, drift, rebalancing
// actions, and concentration flags.

import type { UserProfile, BucketState, AssetEntry } from '../../types'
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

type ClassKey = 'equity' | 'debt' | 'gold' | 'realestate' | 'cash'

const CLASS_MAP: Record<string, ClassKey> = {
  // Equity
  mutualFunds: 'equity', stocksIndia: 'equity', stocksIntl: 'equity',
  // Debt / fixed-income
  bankFds: 'debt', bankRds: 'debt', corporateBonds: 'debt', govtBonds: 'debt', rbiFrb: 'debt',
  scss: 'debt', pomis: 'debt', pmvvy: 'debt', ppf: 'debt', epfVpf: 'debt', npsTier1: 'debt', npsTier2: 'debt', sukanya: 'debt',
  ulipsEndowment: 'debt',
  // Gold
  physicalGold: 'gold', sgb: 'gold', silver: 'gold',
  // Real estate
  selfOccupiedHome: 'realestate', secondHome: 'realestate', commercialProperty: 'realestate', landPlot: 'realestate',
  reits: 'realestate', invits: 'realestate',
  // Cash & alt
  savings: 'cash', cashOnHand: 'cash', sweepFdr: 'cash',
  crypto: 'equity', businessEquity: 'equity', foreignAssets: 'equity', collectibles: 'gold',
}

const CLASS_LABEL: Record<ClassKey, string> = {
  equity: 'Equity', debt: 'Debt / FI', gold: 'Gold', realestate: 'Real Estate', cash: 'Cash',
}
const CLASS_COLOR: Record<ClassKey, string> = {
  equity: '#f59e0b', debt: '#3b82f6', gold: '#eab308', realestate: '#f43f5e', cash: '#10b981',
}

/** Crude target picker from riskAppetite 1–5. */
function targetFor(riskAppetite: number): Record<ClassKey, number> {
  if (riskAppetite <= 1) return { equity: 0.10, debt: 0.65, gold: 0.10, realestate: 0.10, cash: 0.05 }
  if (riskAppetite === 2) return { equity: 0.25, debt: 0.55, gold: 0.10, realestate: 0.07, cash: 0.03 }
  if (riskAppetite === 3) return { equity: 0.40, debt: 0.40, gold: 0.10, realestate: 0.07, cash: 0.03 }
  if (riskAppetite === 4) return { equity: 0.55, debt: 0.25, gold: 0.10, realestate: 0.07, cash: 0.03 }
  return                  { equity: 0.65, debt: 0.20, gold: 0.05, realestate: 0.07, cash: 0.03 }
}

export function AssetAllocationDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const inv = (profile.assetInventory ?? {}) as Record<string, AssetEntry>
  const totals: Record<ClassKey, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, cash: 0 }
  Object.entries(inv).forEach(([key, e]) => {
    if (!e?.amount) return
    const c = CLASS_MAP[key] ?? 'debt'
    totals[c] += e.amount
  })
  const grand = (['equity', 'debt', 'gold', 'realestate', 'cash'] as ClassKey[]).reduce((s, k) => s + totals[k], 0)

  const target = targetFor(profile.riskAppetite ?? 3)
  const rows = (['equity', 'debt', 'gold', 'realestate', 'cash'] as ClassKey[]).map((k) => {
    const have = grand > 0 ? totals[k] / grand : 0
    const want = target[k]
    const driftPct = (have - want) * 100
    const driftValue = (have - want) * grand
    return { key: k, have, want, driftPct, driftValue }
  })

  const actions = rows
    .filter((r) => Math.abs(r.driftPct) >= 3)
    .map((r) => r.driftValue > 0
      ? `Reduce ${CLASS_LABEL[r.key]} by ${fmtINR(Math.abs(r.driftValue))} (${r.driftPct.toFixed(1)} pp over)`
      : `Add ${fmtINR(Math.abs(r.driftValue))} to ${CLASS_LABEL[r.key]} (${Math.abs(r.driftPct).toFixed(1)} pp under)`)

  // Geographic concentration within equity
  const intl = inv.stocksIntl?.amount ?? 0
  const intlShare = totals.equity > 0 ? (intl / totals.equity) * 100 : 0

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setErr(null)
    try { await exportReport(fmt, { identity: storage.getIdentity(), profile, buckets, returnAssumptions: storage.getReturnAssumptions() }) }
    catch (e) { setErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`) }
    finally { setBusy(null) }
  }

  return (
    <section className="space-y-3">
      {/* Per-class KPI tiles dropped — donuts + drift bars below show the same info more vividly */}

      {/* Side-by-side donuts */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <div className="grid grid-cols-2 gap-3">
          <Donut title="CURRENT" rows={rows.map((r) => ({ label: CLASS_LABEL[r.key], v: r.have, color: CLASS_COLOR[r.key] }))} />
          <Donut title="TARGET"  rows={rows.map((r) => ({ label: CLASS_LABEL[r.key], v: r.want, color: CLASS_COLOR[r.key] }))} />
        </div>
        <div className="text-[10px] text-slate-500 italic text-center mt-2">Target based on Risk Appetite {profile.riskAppetite ?? 3} / 5 (set in Step 04).</div>
      </section>

      {/* Drift bars */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3 space-y-1.5">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-1">Drift vs target</h4>
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[80px_1fr_70px] items-baseline gap-2 text-[11.5px]">
            <span className="text-slate-700 font-semibold">{CLASS_LABEL[r.key]}</span>
            <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-400" />
              <div className="absolute inset-y-0" style={{
                left: r.driftPct < 0 ? `${50 + r.driftPct}%` : '50%',
                width: `${Math.min(50, Math.abs(r.driftPct))}%`,
                background: r.driftPct >= 0 ? '#ef4444' : '#3b82f6',
              }} />
            </div>
            <span className={`tabular-nums text-right font-bold ${Math.abs(r.driftPct) >= 5 ? 'text-rose-700' : 'text-slate-700'}`}>
              {r.driftPct >= 0 ? '+' : ''}{r.driftPct.toFixed(1)} pp
            </span>
          </div>
        ))}
      </section>

      {/* Actions */}
      <section className="rounded-md border-2 border-amber-200 bg-amber-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-amber-800 mb-1.5">Rebalancing actions</h4>
        {actions.length > 0 ? (
          <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
            {actions.map((a, i) => <li key={i}>● {a}</li>)}
          </ul>
        ) : (
          <div className="text-[11px] text-slate-700">● All classes within 3 pp of target — no rebalancing needed today.</div>
        )}
      </section>

      <section className="rounded-md border-2 border-slate-200 bg-slate-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-1.5">Observations</h4>
        <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
          {totals.equity / Math.max(1, grand) > target.equity + 0.10 && <li>● Equity is {Math.round((totals.equity / grand - target.equity) * 100)} pp above target allocation.</li>}
          {totals.realestate / Math.max(1, grand) > 0.4 && <li>● Real estate exceeds 40% of net worth — rebalancing options are slow.</li>}
          {intlShare < 10 && totals.equity > 0 && <li>● International equity is {intlShare.toFixed(0)}% of equity — below the 15–25% diversification norm.</li>}
          {totals.gold > 0 && totals.gold / Math.max(1, grand) > 0.15 && <li>● Gold is {Math.round((totals.gold / grand) * 100)}% — above the 5–10% portfolio-insurance norm.</li>}
          {grand === 0 && <li>● No asset inventory yet.</li>}
        </ul>
        <div className="text-[10px] text-slate-500 italic mt-2 border-t border-slate-200/60 pt-2">
          Target allocation is a hand-coded table keyed off Risk Appetite. The orchestration engine (Phase 7) will replace this with a strategy-fitter output.
        </div>
      </section>

      <DownloadRow busy={busy} onExport={handleExport} err={err} profile={profile} buckets={buckets} />
    </section>
  )
}

function Donut({ title, rows }: { title: string; rows: Array<{ label: string; v: number; color: string }> }) {
  const cx = 70, cy = 70, R = 60, r = 36
  let angle = -90
  function arc(frac: number): string {
    if (frac <= 0) return ''
    const start = angle
    const sweep = frac * 360
    angle += sweep
    const a1 = (start * Math.PI) / 180, a2 = ((start + sweep) * Math.PI) / 180
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1)
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2)
    const x3 = cx + r * Math.cos(a2), y3 = cy + r * Math.sin(a2)
    const x4 = cx + r * Math.cos(a1), y4 = cy + r * Math.sin(a1)
    return `M ${x1} ${y1} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 0 ${x4} ${y4} Z`
  }
  return (
    <div className="text-center">
      <div className="text-[10px] font-bold tracking-[3px] uppercase text-slate-600 mb-1">{title}</div>
      <svg viewBox="0 0 140 140" className="block w-full max-w-[140px] mx-auto h-auto">
        {rows.map((row, i) => <path key={i} d={arc(row.v)} fill={row.color} stroke="white" strokeWidth={1.5} />)}
      </svg>
    </div>
  )
}
