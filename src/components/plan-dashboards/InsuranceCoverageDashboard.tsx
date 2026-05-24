// Insurance Coverage Gap — health vs benchmark, life vs income, MWP
// utilisation, critical-illness gap, premium burden, recommended top-ups.

import type { UserProfile, BucketState, InsuranceEntry } from '../../types'
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

interface Bench { health: number; life: number; ci: number }
function benchmarkFor(age: number, city: string): Bench {
  // Health cover benchmark — base, with metro multiplier and age uplift
  const cityMult = city === 'metro' ? 1.0 : city === 'tier1' ? 0.85 : city === 'tier2' ? 0.7 : 0.55
  const ageUplift = age < 50 ? 1.0 : age < 60 ? 1.4 : age < 70 ? 1.8 : 2.2
  const baseHealth = 1_500_000   // ₹15 L base
  return {
    health: Math.round(baseHealth * cityMult * ageUplift),    // ₹15 L → ₹40-50 L for metro seniors
    life:   age < 50 ? 12_500_000 : age < 60 ? 8_000_000 : age < 70 ? 3_000_000 : 0,  // 10x income proxy; less past 60
    ci:     2_500_000,  // ₹25 L lump sum
  }
}

function safeEntry(e: InsuranceEntry | undefined): InsuranceEntry {
  return e ?? { cover: 0, premium: 0, active: false }
}

export function InsuranceCoverageDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [exportErr, setExportErr] = useState<string | null>(null)
  const ins = profile.insuranceCover
  const age = profile.demographics?.currentAge ?? 60
  const city = profile.demographics?.city ?? 'metro'
  const bench = benchmarkFor(age, city)

  // Roll-ups
  const healthCover = (safeEntry(ins?.familyFloater).active ? safeEntry(ins?.familyFloater).cover : 0)
                    + (safeEntry(ins?.personalHealth).active ? safeEntry(ins?.personalHealth).cover : 0)
                    + (safeEntry(ins?.superTopUp).active ? safeEntry(ins?.superTopUp).cover : 0)
                    + (safeEntry(ins?.seniorCitizen).active ? safeEntry(ins?.seniorCitizen).cover : 0)
                    + (safeEntry(ins?.corporateGroup).active ? safeEntry(ins?.corporateGroup).cover : 0)

  const lifeCover  = (safeEntry(ins?.termPlan).active ? safeEntry(ins?.termPlan).cover : 0)
                   + (safeEntry(ins?.wholeLife).active ? safeEntry(ins?.wholeLife).cover : 0)

  const ciCover    = safeEntry(ins?.criticalIllness).active ? safeEntry(ins?.criticalIllness).cover : 0

  const annualPremium = Object.entries(ins ?? {})
    .map(([, v]) => v as InsuranceEntry)
    .filter((e) => e && e.active)
    .reduce((s, e) => s + (e.premium || 0), 0)

  const termMwp = !!ins?.termPlan?.mwp

  // Gaps
  const healthGap = Math.max(0, bench.health - healthCover)
  const lifeGap   = Math.max(0, bench.life - lifeCover)
  const ciGap     = Math.max(0, bench.ci - ciCover)

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
        <Kpi label="Health cover"   value={fmtINR(healthCover)} sub={`vs ₹${(bench.health / 1e5).toFixed(0)}L bench`} tone={healthGap > 0 ? 'rose' : 'emerald'} />
        <Kpi label="Life cover"     value={fmtINR(lifeCover)}   sub={age >= 70 ? 'less critical past 70' : `vs ${fmtINR(bench.life)} bench`} tone={lifeGap > 0 && age < 70 ? 'rose' : 'emerald'} />
        <Kpi label="Critical illness" value={fmtINR(ciCover)} sub={`vs ${fmtINR(bench.ci)} bench`} tone={ciGap > 0 ? 'amber' : 'emerald'} />
        <Kpi label="Annual premium" value={fmtINR(annualPremium)} sub="all active policies" tone="navy" />
      </div>

      {/* Gap bars */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3 space-y-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Coverage vs benchmark</h4>
        <GapBar label="Health"   have={healthCover} need={bench.health} suggest={healthGap > 0 ? `Add ${fmtINR(healthGap)} via super top-up` : 'Adequate for the age + city benchmark'} />
        {age < 70 && <GapBar label="Life (Term)" have={lifeCover} need={bench.life} suggest={lifeGap > 0 ? `Add ${fmtINR(lifeGap)} via term plan${!termMwp ? ' (under MWP Act)' : ''}` : 'Adequate'} />}
        <GapBar label="Critical illness" have={ciCover} need={bench.ci} suggest={ciGap > 0 ? `Add ${fmtINR(ciGap)} as a lump-sum CI rider` : 'Adequate lump-sum cover'} />
      </section>

      {/* Flags */}
      <section className="rounded-md border-2 border-amber-200 bg-amber-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-amber-800 mb-1.5">Smart insights</h4>
        <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
          {!ins?.termPlan?.active && age < 70 && <li>● No active term plan — at {age} you should hold ≥{fmtINR(bench.life)} pure-protection cover.</li>}
          {ins?.termPlan?.active && !termMwp && <li>● Term plan is active but NOT under MWP Act — proceeds may be claimed by creditors. Re-issue MWP-tagged ASAP.</li>}
          {age >= 60 && !ins?.seniorCitizen?.active && healthCover < bench.health && <li>● 60+ without senior-specific cover — premiums climb yearly; lock in NOW before pre-existing waiting periods stack up.</li>}
          {ciCover === 0 && <li>● No critical-illness cover — a single diagnosis can wipe out 1–2 years of corpus. Lump-sum CI riders are cheap.</li>}
          {annualPremium > 0 && profile.expenses && annualPremium / 12 > 0.15 * ((profile.expenses.essential ?? 0) + (profile.expenses.lifestyle ?? 0)) && <li>● Premium burden is &gt; 15% of monthly outflow — audit overlapping ULIPs / endowments.</li>}
          {ins?.endowment?.active && (ins.endowment.cover / Math.max(1, ins.endowment.premium)) < 20 && <li>● Endowment / money-back policies typically yield 4–6% — consider surrender + reinvest if &gt; 3 years held.</li>}
          {healthGap === 0 && lifeGap === 0 && ciGap === 0 && <li>● Coverage looks broadly adequate vs the age + city benchmark. Annual review is still worth scheduling.</li>}
        </ul>
      </section>

      {/* Policy-by-policy compact list */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Active policies</h4>
        {ins ? (
          <ul className="text-[11px] space-y-1">
            {(Object.entries(ins) as Array<[string, InsuranceEntry]>).filter(([, v]) => v && v.active).map(([k, v]) => (
              <li key={k} className="grid grid-cols-[1fr_auto_auto] gap-3 items-baseline border-b border-slate-100 last:border-b-0 py-1">
                <span className="text-slate-800 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}{v.mwp ? ' · MWP ✓' : ''}</span>
                <span className="text-slate-700 tabular-nums">cover {fmtINR(v.cover)}</span>
                <span className="text-slate-500 tabular-nums">premium {fmtINR(v.premium)}/yr</span>
              </li>
            ))}
            {(Object.entries(ins) as Array<[string, InsuranceEntry]>).filter(([, v]) => v && v.active).length === 0 && (
              <li className="text-slate-500 italic">No active policies recorded.</li>
            )}
          </ul>
        ) : (
          <div className="text-[11px] text-slate-500 italic">Add policies under Step 07 Insurance Cover.</div>
        )}
      </section>

      <DownloadRow busy={busy} onExport={handleExport} err={exportErr} profile={profile} buckets={buckets} />
    </section>
  )
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'emerald' | 'rose' | 'amber' | 'navy' }) {
  const bg = tone === 'emerald' ? 'bg-emerald-50' : tone === 'rose' ? 'bg-rose-50' : tone === 'amber' ? 'bg-amber-50' : tone === 'navy' ? 'bg-blue-50' : 'bg-white'
  const fg = tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : tone === 'amber' ? 'text-amber-700' : tone === 'navy' ? 'text-blue-700' : 'text-slate-700'
  return (
    <div className={`rounded-md border-2 border-slate-200 ${bg} px-2.5 py-2`}>
      <div className={`text-[9px] font-bold tracking-[1.5px] uppercase ${fg}`}>{label}</div>
      <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5 leading-tight">{value}</div>
      {sub && <div className="text-[9px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function GapBar({ label, have, need, suggest }: { label: string; have: number; need: number; suggest: string }) {
  const pct = need > 0 ? Math.min(120, (have / need) * 100) : 0
  const okay = have >= need
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] mb-0.5">
        <span className="text-slate-800 font-semibold">{label}</span>
        <span className="text-slate-500 tabular-nums">{fmtINR(have)} <span className="text-slate-400">/ {fmtINR(need)}</span></span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
        <div className="h-full" style={{ width: `${Math.min(100, pct)}%`, background: okay ? '#10b981' : pct >= 60 ? '#f59e0b' : '#dc2626' }} />
      </div>
      <div className="text-[10.5px] text-slate-600 italic mt-0.5">{suggest}</div>
    </div>
  )
}
