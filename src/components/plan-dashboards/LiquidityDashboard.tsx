// Liquidity & Emergency — how much can the user touch in 30 / 180 / 365
// days, runway at current burn, and the lockup ladder of long-tenor
// instruments (PPF, EPF, NPS, tax-saver FDs).

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

/** Bucket by accessibility horizon. */
const TENOR_MAP: Record<string, '0-30d' | '31-180d' | '181-365d' | '1-3y' | '3-5y' | '5y+'> = {
  // Instant
  savings: '0-30d', cashOnHand: '0-30d', sweepFdr: '0-30d',
  // Short (< 1y)
  bankFds: '31-180d', bankRds: '31-180d', mutualFunds: '0-30d', stocksIndia: '0-30d', stocksIntl: '0-30d',
  reits: '0-30d', invits: '0-30d', physicalGold: '0-30d', sgb: '181-365d', silver: '0-30d', crypto: '0-30d',
  // 1-5y
  scss: '1-3y', pomis: '1-3y', pmvvy: '1-3y', corporateBonds: '1-3y', govtBonds: '3-5y', rbiFrb: '3-5y',
  // 5y+
  ppf: '5y+', epfVpf: '5y+', npsTier1: '5y+', npsTier2: '0-30d', sukanya: '5y+',
  // Real estate / other lumpy
  selfOccupiedHome: '5y+', secondHome: '5y+', commercialProperty: '5y+', landPlot: '5y+',
  ulipsEndowment: '5y+', businessEquity: '5y+', foreignAssets: '5y+', collectibles: '5y+',
}

const TENOR_ORDER: Array<keyof typeof TENOR_COLORS> = ['0-30d', '31-180d', '181-365d', '1-3y', '3-5y', '5y+']
const TENOR_COLORS = {
  '0-30d': '#10b981', '31-180d': '#22d3ee', '181-365d': '#3b82f6',
  '1-3y': '#a855f7', '3-5y': '#f59e0b', '5y+': '#94a3b8',
}

export function LiquidityDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const inv = (profile.assetInventory ?? {}) as Record<string, AssetEntry>
  const assetTotal = Object.values(inv).reduce((s, e) => s + (e?.amount || 0), 0)

  const tenorTotals = TENOR_ORDER.reduce<Record<string, number>>((acc, t) => { acc[t] = 0; return acc }, {})
  Object.entries(inv).forEach(([key, e]) => {
    if (!e?.amount) return
    const t = TENOR_MAP[key] ?? '5y+'
    tenorTotals[t] += e.amount
  })

  const liquid = tenorTotals['0-30d'] + tenorTotals['31-180d'] + tenorTotals['181-365d']
  const longLock = tenorTotals['5y+']

  const exp = profile.expenses
  const monthlyBurn = exp ? (exp.essential ?? 0) + (exp.lifestyle ?? 0) + (exp.healthcare ?? 0) + (exp.education ?? 0) : 0
  const runwayMonths = monthlyBurn > 0 ? liquid / monthlyBurn : Infinity

  // Lockup ladder — list big locked instruments with rough unlock year
  const currentAge = profile.demographics?.currentAge ?? 60
  const retireAge = profile.demographics?.retirementAge ?? 60
  const ladder: Array<{ name: string; amount: number; unlock: string; rationale: string }> = []
  if ((inv.ppf?.amount ?? 0) > 0) ladder.push({ name: 'PPF', amount: inv.ppf.amount, unlock: '15y from open', rationale: 'Partial withdrawals from year 7' })
  if ((inv.epfVpf?.amount ?? 0) > 0) ladder.push({ name: 'EPF / VPF', amount: inv.epfVpf.amount, unlock: `Age ${Math.max(retireAge, currentAge)} or 5y after exit`, rationale: 'Tax-free on retirement / 58' })
  if ((inv.npsTier1?.amount ?? 0) > 0) ladder.push({ name: 'NPS Tier-1', amount: inv.npsTier1.amount, unlock: 'Age 60', rationale: '60% lump-sum, 40% mandatory annuity' })
  if ((inv.sukanya?.amount ?? 0) > 0) ladder.push({ name: 'Sukanya', amount: inv.sukanya.amount, unlock: 'Child 21y / 18y partial', rationale: 'Tied to daughter\'s milestones' })
  if ((inv.scss?.amount ?? 0) > 0) ladder.push({ name: 'SCSS', amount: inv.scss.amount, unlock: '5y (extend +3y)', rationale: 'Premature: 1.5% penalty after 1y' })

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setErr(null)
    try { await exportReport(fmt, { identity: storage.getIdentity(), profile, buckets, returnAssumptions: storage.getReturnAssumptions() }) }
    catch (e) { setErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`) }
    finally { setBusy(null) }
  }

  const runwayTone = runwayMonths >= 12 ? '#16a34a' : runwayMonths >= 6 ? '#84cc16' : runwayMonths >= 3 ? '#f59e0b' : '#dc2626'

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi label="Liquid (≤1y)"   value={fmtINR(liquid)}   sub={`${pct(liquid, assetTotal)} of gross`} tone="emerald" />
        <Kpi label="Locked (5y+)"   value={fmtINR(longLock)} sub={`${pct(longLock, assetTotal)} of gross`} tone="slate" />
        <Kpi label="Emergency runway" value={runwayMonths === Infinity ? '∞' : `${runwayMonths.toFixed(1)}m`} sub="liquid ÷ monthly burn" />
        <Kpi label="Monthly burn"   value={fmtINR(monthlyBurn)} sub="essential+life+health+edu" />
      </div>

      {/* Runway gauge */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Emergency runway</h4>
          <span className="text-[11px] tabular-nums">{runwayMonths === Infinity ? '∞' : runwayMonths.toFixed(1)} months</span>
        </div>
        <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div className="absolute inset-y-0 left-0 bg-rose-200" style={{ width: '25%' }} />
          <div className="absolute inset-y-0 bg-amber-200" style={{ left: '25%', width: '25%' }} />
          <div className="absolute inset-y-0 bg-lime-200" style={{ left: '50%', width: '50%' }} />
          <div className="absolute inset-y-0" style={{ width: `${Math.min(100, (runwayMonths / 12) * 100)}%`, background: runwayTone, opacity: 0.85 }} />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500 mt-1 tabular-nums">
          <span>0m</span><span>3m</span><span>6m</span><span>12m+</span>
        </div>
      </section>

      {/* Tenor ladder */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Accessibility by tenor</h4>
        <ul className="space-y-1.5 text-[11.5px]">
          {TENOR_ORDER.map((t) => (
            <li key={t} className="grid grid-cols-[80px_1fr_80px] items-baseline gap-2">
              <span className="text-slate-700 font-semibold tabular-nums">{t}</span>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div className="h-full" style={{ width: `${(tenorTotals[t] / Math.max(1, assetTotal)) * 100}%`, background: TENOR_COLORS[t] }} />
              </div>
              <span className="text-slate-900 font-bold tabular-nums text-right">{fmtINR(tenorTotals[t])}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Lockup ladder */}
      {ladder.length > 0 && (
        <section className="rounded-md border-2 border-slate-200 bg-white p-3">
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Long-lockup instruments</h4>
          <ul className="text-[11.5px] space-y-1">
            {ladder.map((l, i) => (
              <li key={i} className="grid grid-cols-[1fr_auto_auto] gap-3 items-baseline border-b border-slate-100 last:border-b-0 py-1">
                <span className="text-slate-800 font-semibold">{l.name} <span className="text-[10px] text-slate-500 italic">— {l.rationale}</span></span>
                <span className="text-slate-700 tabular-nums">{l.unlock}</span>
                <span className="text-slate-900 font-bold tabular-nums">{fmtINR(l.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-emerald-800 mb-1.5">Insights</h4>
        <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
          {runwayMonths < 3 && <li>● Runway &lt; 3 months — critical. Build to at least 6× monthly burn before adding to long-tenor assets.</li>}
          {runwayMonths >= 3 && runwayMonths < 6 && <li>● Runway 3–6 months — adequate for a short job-loss / medical event. Target 6–12.</li>}
          {runwayMonths >= 12 && <li>● Runway ≥ 12 months — strong. Excess liquid above 18m is drag; consider moving to B2/B3.</li>}
          {longLock / Math.max(1, assetTotal) > 0.6 && <li>● {Math.round((longLock / assetTotal) * 100)}% locked beyond 5 years — review whether near-term goals are funded.</li>}
          {liquid / Math.max(1, assetTotal) < 0.05 && <li>● Liquid &lt; 5% of gross — even minor shocks force a withdrawal from invested corpus.</li>}
        </ul>
      </section>

      <DownloadRow busy={busy} onExport={handleExport} err={err} profile={profile} buckets={buckets} />
    </section>
  )
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return '0%'
  return `${Math.round((part / whole) * 100)}%`
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'emerald' | 'slate' }) {
  const bg = tone === 'emerald' ? 'bg-emerald-50' : tone === 'slate' ? 'bg-slate-50' : 'bg-white'
  const fg = tone === 'emerald' ? 'text-emerald-700' : tone === 'slate' ? 'text-slate-700' : 'text-slate-700'
  return (
    <div className={`rounded-md border-2 border-slate-200 ${bg} px-2.5 py-2`}>
      <div className={`text-[9px] font-bold tracking-[1.5px] uppercase ${fg}`}>{label}</div>
      <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5 leading-tight">{value}</div>
      {sub && <div className="text-[9px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}
