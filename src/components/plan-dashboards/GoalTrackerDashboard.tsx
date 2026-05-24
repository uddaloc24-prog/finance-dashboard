// Goal Tracker — each user-defined Goal as a progress bar with the SIP
// required to reach it, on-track / behind / ahead status, milestone
// calendar.

import type { UserProfile, BucketState } from '../../types'
import type { Goal } from '../../types/v2'
import { DownloadRow } from './NetWorthDashboard'
import { totalCorpus } from '../../lib/calculations'
import { blendedReturn } from '../../lib/blendedReturn'
import { storage } from '../../lib/storage'
import { useState } from 'react'
import type { ExportFormat } from '../../lib/exporters'
import { exportReport } from '../../lib/exporters'

interface Props { profile: UserProfile; buckets: BucketState }

function fmtINR(n: number): string {
  const abs = Math.abs(n), sign = n < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)}k`
  return `${sign}₹${Math.round(abs)}`
}

/** SIP per month needed to reach `fv` in `months` at monthly rate `r`. */
function sipRequired(fv: number, months: number, monthlyRate: number): number {
  if (months <= 0) return fv
  if (Math.abs(monthlyRate) < 1e-9) return fv / months
  return fv * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1)
}

export function GoalTrackerDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const goals: Goal[] = storage.getGoals()
  const corpus = totalCorpus(buckets) || profile.corpus || 0
  const today = new Date()
  const thisYear = today.getFullYear()

  const inflation = (profile.inflationRate ?? 6) / 100
  // Blended return read from the user's ReturnAssumptions × bucket allocation
  const NOMINAL_RETURN = blendedReturn(storage.getReturnAssumptions(), profile.bucketAllocation) / 100
  const monthlyRate = NOMINAL_RETURN / 12

  const enriched = goals.map((g) => {
    const targetYear = g.startYear ?? thisYear + 5
    const yearsOut = Math.max(0, targetYear - thisYear)
    const months = yearsOut * 12
    const inflated = g.amount * Math.pow(1 + inflation, yearsOut)
    const assumedAllocation = corpus / Math.max(1, goals.length)  // naive equal split
    const projectedAtTarget = assumedAllocation * Math.pow(1 + NOMINAL_RETURN, yearsOut)
    const sip = sipRequired(Math.max(0, inflated - projectedAtTarget), months, monthlyRate)
    const ratio = inflated > 0 ? projectedAtTarget / inflated : 0
    const status = ratio >= 1 ? 'ahead' : ratio >= 0.8 ? 'on-track' : 'behind'
    return { g, targetYear, yearsOut, inflated, projectedAtTarget, sip, ratio, status }
  })

  const totalRequiredSip = enriched.reduce((s, e) => s + e.sip, 0)

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setErr(null)
    try { await exportReport(fmt, { identity: storage.getIdentity(), profile, buckets, returnAssumptions: storage.getReturnAssumptions() }) }
    catch (e) { setErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`) }
    finally { setBusy(null) }
  }

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi label="Total goals"        value={`${goals.length}`} />
        <Kpi label="On-track"           value={`${enriched.filter((e) => e.status === 'on-track' || e.status === 'ahead').length}`} tone="emerald" />
        <Kpi label="Behind"             value={`${enriched.filter((e) => e.status === 'behind').length}`} tone="rose" />
        <Kpi label="SIP required"       value={fmtINR(totalRequiredSip)} sub="/ month, blended" tone="amber" />
      </div>

      {goals.length === 0 ? (
        <section className="rounded-md border-2 border-slate-200 bg-slate-50/40 p-4 text-center">
          <div className="text-[12px] text-slate-600 italic">
            No structured goals yet. Add goals via the Goal Discovery module on the Profile tab, or via the legacy Goals editor.
          </div>
        </section>
      ) : (
        <>
          {/* Per-goal cards */}
          <section className="space-y-2">
            {enriched.map(({ g, targetYear, yearsOut, inflated, projectedAtTarget, sip, ratio, status }) => {
              const fill = status === 'ahead' ? '#10b981' : status === 'on-track' ? '#84cc16' : '#dc2626'
              return (
                <div key={g.id} className="rounded-md border-2 border-slate-200 bg-white p-2.5">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                    <span className="font-serif italic text-sm font-extrabold text-slate-900">{g.label}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: fill }}>
                      {status}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-[10.5px] text-slate-600 mb-1.5">
                    <span>Target FY {targetYear} · {yearsOut}y · {g.priority}</span>
                    <span className="tabular-nums">{fmtINR(projectedAtTarget)} / {fmtINR(inflated)}</span>
                  </div>
                  <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200 mb-1">
                    <div className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, ratio * 100)}%`, background: fill }} />
                  </div>
                  <div className="text-[10.5px] text-slate-600 italic">
                    SIP gap: <strong className="tabular-nums">{fmtINR(sip)}/mo</strong> (target inflated at {((profile.inflationRate ?? 6))}% / yr)
                  </div>
                </div>
              )
            })}
          </section>

          {/* Milestone calendar */}
          <section className="rounded-md border-2 border-slate-200 bg-white p-3">
            <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Milestone calendar</h4>
            <ul className="text-[11.5px] space-y-1">
              {[...enriched].sort((a, b) => a.targetYear - b.targetYear).map(({ g, targetYear, yearsOut }) => (
                <li key={g.id} className="grid grid-cols-[60px_60px_1fr] items-baseline gap-3 border-b border-slate-100 last:border-b-0 py-1">
                  <span className="font-bold text-slate-900 tabular-nums">FY {targetYear}</span>
                  <span className="text-slate-500 tabular-nums">{yearsOut}y</span>
                  <span className="text-slate-700">{g.label} <span className="text-slate-500 italic">· {g.kind}</span></span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section className="rounded-md border-2 border-slate-200 bg-slate-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-1.5">Observations</h4>
        <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
          {goals.length > 0 && totalRequiredSip > 0 && (profile.sipAmount ?? 0) < totalRequiredSip && (
            <li>● Current SIP <strong>{fmtINR(profile.sipAmount ?? 0)}</strong>/mo is short of the blended need by <strong>{fmtINR(totalRequiredSip - (profile.sipAmount ?? 0))}</strong>/mo.</li>
          )}
          {enriched.filter((e) => e.status === 'behind').length > 0 && <li>● Behind-status goals dominate the list.</li>}
          <li>● Assumed blended return: {(NOMINAL_RETURN * 100).toFixed(1)}%. Corpus is currently split equally across goals (naive baseline — engine will replace).</li>
        </ul>
        <div className="text-[10px] text-slate-500 italic mt-2 border-t border-slate-200/60 pt-2">
          Per-goal SIP and allocation will come from the orchestration engine (Phase 5/6). Today's numbers use a naive equal-split.
        </div>
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
