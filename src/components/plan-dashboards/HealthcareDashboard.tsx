// Healthcare & Longevity — projected health-spend curve to life
// expectancy, LTC reserve, critical-illness gap, parent-care reserve.

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

const HEALTHCARE_INFLATION = 8.5 / 100   // India healthcare CAGR ≈ 8–10%

export function HealthcareDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const monthlyHealth = profile.expenses?.healthcare ?? 0
  const annualToday = monthlyHealth * 12

  const currentAge = profile.demographics?.currentAge ?? 60
  const lifeExp    = profile.demographics?.lifeExpectancy ?? 88
  const yearsLeft  = Math.max(1, lifeExp - currentAge)

  // Spend curve
  const decades: Array<{ age: number; annual: number }> = []
  for (let yr = 0; yr <= yearsLeft; yr += Math.max(1, Math.floor(yearsLeft / 5))) {
    decades.push({ age: currentAge + yr, annual: annualToday * Math.pow(1 + HEALTHCARE_INFLATION, yr) })
  }

  // PV of total future healthcare spend (Fisher-deflated at 7% portfolio return)
  const realReturn = (1 + 7 / 100) / (1 + HEALTHCARE_INFLATION) - 1
  const r = realReturn
  const pvLifetimeHealth = Math.abs(r) < 1e-9
    ? annualToday * yearsLeft
    : annualToday * (1 - Math.pow(1 + r, -yearsLeft)) / r

  // LTC reserve — 3y of 2× healthcare spend (intensive / assisted living)
  const ltcReserve = annualToday * 2 * 3

  // Critical illness gap
  const ciCover = profile.insuranceCover?.criticalIllness?.active ? profile.insuranceCover.criticalIllness.cover : 0
  const ciBench = 2_500_000
  const ciGap = Math.max(0, ciBench - ciCover)

  // Parent-care reserve (rough — assume 2 dependents until user is 70)
  const parentYears = Math.max(0, 70 - currentAge)
  const parentReserve = parentYears > 0 ? annualToday * 1.5 * parentYears * 0.5 : 0

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setErr(null)
    try { await exportReport(fmt, { identity: storage.getIdentity(), profile, buckets, returnAssumptions: storage.getReturnAssumptions() }) }
    catch (e) { setErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`) }
    finally { setBusy(null) }
  }

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi label="Current health spend" value={fmtINR(annualToday)} sub="/ year" />
        <Kpi label="Lifetime PV"          value={fmtINR(pvLifetimeHealth)} sub={`${yearsLeft}y · ${(HEALTHCARE_INFLATION * 100).toFixed(1)}% infl`} tone="amber" />
        <Kpi label="LTC reserve"          value={fmtINR(ltcReserve)} sub="3y × 2× current" tone="rose" />
        <Kpi label="CI gap"               value={fmtINR(ciGap)} sub={ciGap > 0 ? `vs ${fmtINR(ciBench)} bench` : 'covered'} tone={ciGap > 0 ? 'rose' : 'emerald'} />
      </div>

      {/* Spend curve */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Projected annual health spend</h4>
        <SpendCurve points={decades} />
        <div className="text-[10.5px] text-slate-600 italic mt-2 leading-snug">
          At {(HEALTHCARE_INFLATION * 100).toFixed(1)}% annual healthcare inflation, today's <strong>{fmtINR(annualToday)}</strong> becomes <strong>{fmtINR(decades[decades.length - 1]?.annual ?? annualToday)}</strong> by age {decades[decades.length - 1]?.age ?? lifeExp}.
        </div>
      </section>

      {/* Reserves */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3 space-y-2">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Reserves checklist</h4>
        <Reserve label="LTC reserve (3y × 2× current burn)"   need={ltcReserve}   note="Assisted living or stroke-rehab scenarios" />
        <Reserve label="Critical illness lump-sum"             need={ciBench}      have={ciCover} note="Cancer / cardiac / transplant — one-time payout" />
        <Reserve label="Parent care (₹1.5× spend × years to 70 × 50%)" need={parentReserve} note={parentYears > 0 ? `${parentYears}y horizon at 50% assumption` : 'Already past 70 — typically funded'} />
      </section>

      <section className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-emerald-800 mb-1.5">Insights</h4>
        <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
          {monthlyHealth === 0 && <li>● Healthcare spend is ₹0 — likely missing. Add a realistic monthly figure in Step 03 Budget.</li>}
          {ciGap > 0 && <li>● Add <strong>{fmtINR(ciGap)}</strong> critical-illness rider. A single diagnosis can wipe out 1–2 years of corpus.</li>}
          {currentAge >= 60 && monthlyHealth < 10000 && <li>● Healthcare spend &lt; ₹10k/mo at 60+ looks understated. Hospital + prescription typically scales fast post-60.</li>}
          <li>● Health spend is treated as inflation-indexed at {(HEALTHCARE_INFLATION * 100).toFixed(1)}%, higher than general 6%. Allocate B2/B3 with this drag in mind.</li>
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

function Reserve({ label, need, have, note }: { label: string; need: number; have?: number; note?: string }) {
  const pct = have !== undefined && need > 0 ? Math.min(120, (have / need) * 100) : null
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] mb-0.5">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-700 tabular-nums">
          {have !== undefined && <strong className={have >= need ? 'text-emerald-700' : 'text-rose-700'}>{fmtINR(have)}</strong>}
          {have !== undefined && <span className="text-slate-400"> / </span>}
          <span className="font-semibold">{fmtINR(need)}</span>
        </span>
      </div>
      {pct !== null && (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div className="h-full" style={{ width: `${Math.min(100, pct)}%`, background: pct >= 100 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#dc2626' }} />
        </div>
      )}
      {note && <div className="text-[10px] text-slate-500 italic mt-0.5">{note}</div>}
    </div>
  )
}

function SpendCurve({ points }: { points: Array<{ age: number; annual: number }> }) {
  if (points.length < 2) return <div className="text-[11px] text-slate-500 italic">Not enough data.</div>
  const W = 480, H = 120, P = 20
  const maxY = Math.max(...points.map((p) => p.annual))
  const xs = points.map((_, i) => P + (i / (points.length - 1)) * (W - 2 * P))
  const ys = points.map((p) => H - P - (p.annual / maxY) * (H - 2 * P))
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ')
  const fill = `${d} L ${xs[xs.length - 1].toFixed(1)} ${H - P} L ${xs[0].toFixed(1)} ${H - P} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" preserveAspectRatio="none">
      <path d={fill} fill="rgba(20, 184, 166, 0.15)" />
      <path d={d} fill="none" stroke="#14b8a6" strokeWidth={2} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xs[i]} cy={ys[i]} r={3} fill="#0f766e" />
          <text x={xs[i]} y={H - 4} textAnchor="middle" style={{ fontSize: 9, fill: '#64748b' }}>{p.age}</text>
        </g>
      ))}
    </svg>
  )
}
