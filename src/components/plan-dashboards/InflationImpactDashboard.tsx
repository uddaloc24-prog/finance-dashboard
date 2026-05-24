// Inflation Impact — purchasing-power erosion 10 / 20 / 30 years out,
// real-return calculator, category-wise inflation drag.

import type { UserProfile, BucketState } from '../../types'
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

const HORIZONS = [10, 20, 30]
const CATEGORY_INFLATION = {
  general:    6.0,   // CPI-ish
  healthcare: 8.5,   // hospital + pharma drift
  education:  10.0,  // school + college fee creep
}

function realReturn(nominal: number, infl: number): number {
  return ((1 + nominal / 100) / (1 + infl / 100) - 1) * 100
}

export function InflationImpactDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const baseInfl = profile.inflationRate ?? 6
  const exp = profile.expenses
  const monthlyBurn = exp ? (exp.essential ?? 0) + (exp.lifestyle ?? 0) + (exp.healthcare ?? 0) + (exp.education ?? 0) : 0
  const annualBurn = monthlyBurn * 12

  const todaysCrore = 1_00_00_000  // ₹1 Cr today, for the headline calc

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setErr(null)
    try { await exportReport(fmt, { identity: storage.getIdentity(), profile, buckets, returnAssumptions: storage.getReturnAssumptions() }) }
    catch (e) { setErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`) }
    finally { setBusy(null) }
  }

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi label="Your inflation"   value={`${baseInfl.toFixed(1)}%`} sub="general (Step 06)" />
        <Kpi label="Annual burn"      value={fmtINR(annualBurn)} sub="current price" />
        <Kpi label="Burn at +20y"     value={fmtINR(annualBurn * Math.pow(1 + baseInfl / 100, 20))} sub={`@ ${baseInfl}%`} tone="rose" />
        <Kpi label="Real return 10%"  value={`${realReturn(10, baseInfl).toFixed(1)}%`} sub={`nominal − ${baseInfl}% infl`} tone="emerald" />
      </div>

      {/* ₹1 Cr erosion table */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">What ₹1 Crore today is worth …</h4>
        <div className="grid grid-cols-3 gap-2">
          {HORIZONS.map((y) => {
            const remaining = todaysCrore / Math.pow(1 + baseInfl / 100, y)
            const erosion = ((1 - remaining / todaysCrore) * 100).toFixed(0)
            return (
              <div key={y} className="text-center rounded-md border border-slate-200 bg-slate-50 p-2.5">
                <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600">In {y} years</div>
                <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-1">{fmtINR(remaining)}</div>
                <div className="text-[10px] text-rose-700 mt-0.5">−{erosion}% purchasing power</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Category drag bars */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Category-wise inflation drag</h4>
        <ul className="space-y-2 text-[11.5px]">
          {(Object.entries(CATEGORY_INFLATION) as Array<[keyof typeof CATEGORY_INFLATION, number]>).map(([cat, rate]) => {
            const tone = rate > 8 ? '#dc2626' : rate > 6 ? '#f59e0b' : '#10b981'
            return (
              <li key={cat}>
                <div className="flex items-baseline justify-between mb-0.5">
                  <span className="text-slate-700 capitalize font-semibold">{cat}</span>
                  <span className="tabular-nums" style={{ color: tone }}><strong>{rate.toFixed(1)}%</strong> / yr</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <div className="h-full" style={{ width: `${(rate / 12) * 100}%`, background: tone }} />
                </div>
                <div className="text-[10px] text-slate-500 italic mt-0.5">
                  ₹100 today → ₹{Math.round(100 * Math.pow(1 + rate / 100, 20))} in 20 years
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Real return calculator */}
      <section className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-emerald-800 mb-2">Real return calculator (Fisher)</h4>
        <div className="grid grid-cols-3 gap-2 text-[11.5px]">
          {[6, 8, 10, 12, 14, 7].map((nom) => (
            <div key={nom} className="rounded border border-emerald-200 bg-white p-2 text-center">
              <div className="text-[10px] text-slate-500">Nominal</div>
              <div className="font-bold text-slate-900 tabular-nums">{nom}%</div>
              <div className="text-[10px] text-slate-500 mt-1">Real</div>
              <div className={`font-extrabold tabular-nums ${realReturn(nom, baseInfl) <= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {realReturn(nom, baseInfl).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-emerald-800 mb-1.5">Insights</h4>
        <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
          <li>● Use category-specific inflation for goal sizing: education + healthcare goals should not use the 6% general default.</li>
          <li>● Real return below 1.5% (typical for FD-only portfolios after tax + inflation) means corpus shrinks in real terms despite "growing" on paper.</li>
          {baseInfl < 5 && <li>● Your assumed {baseInfl}% inflation is below the historical Indian CPI average (~5.5–6.5%). Consider stress-testing at 7%.</li>}
          {baseInfl > 7 && <li>● Your assumed {baseInfl}% inflation is conservative-high — corpus targets will be aggressive. Fine for planning, validate quarterly.</li>}
        </ul>
      </section>

      <DownloadRow busy={busy} onExport={handleExport} err={err} profile={profile} buckets={buckets} />
    </section>
  )
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'emerald' | 'rose' }) {
  const bg = tone === 'emerald' ? 'bg-emerald-50' : tone === 'rose' ? 'bg-rose-50' : 'bg-white'
  const fg = tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : 'text-slate-700'
  return (
    <div className={`rounded-md border-2 border-slate-200 ${bg} px-2.5 py-2`}>
      <div className={`text-[9px] font-bold tracking-[1.5px] uppercase ${fg}`}>{label}</div>
      <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5 leading-tight">{value}</div>
      {sub && <div className="text-[9px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}
