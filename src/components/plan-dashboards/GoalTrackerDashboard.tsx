// Goal Tracker — engine-driven (Phase 7).
// Renders the merged goal pile (manual + GD-projected + system-preempted)
// in rank order from the Goal Ranking Engine, with per-goal funding
// from the Strategy Fitter (corpus allocated, SIP, projected, status).

import type { UserProfile, BucketState } from '../../types'
import type { FittedGoal } from '../../types/orchestration'
import { DownloadRow } from './NetWorthDashboard'
import { useFittedStrategy } from '../../hooks/useFittedStrategy'
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

export function GoalTrackerDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { ranked, fit } = useFittedStrategy(profile, buckets)
  const fitById: Record<string, FittedGoal> = Object.fromEntries(fit.goals.map((g) => [g.goalId, g]))
  const { totals } = fit
  const goalCount = ranked.ranked.length

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setErr(null)
    try { await exportReport(fmt, { identity: storage.getIdentity(), profile, buckets, returnAssumptions: storage.getReturnAssumptions() }) }
    catch (e) { setErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`) }
    finally { setBusy(null) }
  }

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi label="Total goals"   value={`${goalCount}`} />
        <Kpi label="Funded"        value={`${totals.goalsFunded}`}   tone="emerald" />
        <Kpi label="Partial"       value={`${totals.goalsPartial}`}  tone="amber" />
        <Kpi label="Unfunded"      value={`${totals.goalsUnfunded}`} tone={totals.goalsUnfunded > 0 ? 'rose' : 'emerald'} />
      </div>

      {/* Capacity vs requirement */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1">Corpus</div>
          <div className="text-[12px] tabular-nums">
            <strong className="text-slate-900">{fmtINR(totals.corpusUsed)}</strong> allocated
            <span className="text-slate-500"> of {fmtINR(totals.corpus)}</span>
          </div>
          <div className="text-[11px] text-slate-500 italic mt-0.5">
            {totals.corpusFree > 0 ? `${fmtINR(totals.corpusFree)} free for buffer / future goals` : 'fully deployed'}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1">Monthly SIP</div>
          <div className="text-[12px] tabular-nums">
            <strong className="text-slate-900">{fmtINR(totals.sipUsed)}/mo</strong> used
            <span className="text-slate-500"> of {fmtINR(totals.sipCapacity)}/mo capacity</span>
          </div>
          <div className={`text-[11px] italic mt-0.5 ${totals.sipShortfall > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            {totals.sipShortfall > 0 ? `${fmtINR(totals.sipShortfall)}/mo shortfall — lift SIP or accept partial funding` : 'capacity covers all engine SIPs'}
          </div>
        </div>
      </section>

      {goalCount === 0 ? (
        <section className="rounded-md border-2 border-slate-200 bg-slate-50/40 p-4 text-center">
          <div className="text-[12px] text-slate-600 italic">
            No goals yet. Add via Goal Discovery (Profile tab) or the legacy Goals editor — the engine ranks and funds them automatically here.
          </div>
        </section>
      ) : (
        <>
          {/* Per-goal cards in engine rank order */}
          <section className="space-y-2">
            {ranked.ranked.map((r, i) => {
              const f = fitById[r.goal.id]
              return <GoalCard key={r.goal.id} rank={i + 1} label={r.goal.label} kind={r.goal.kind} priority={r.goal.priority} source={r.goal.source} targetYear={r.goal.startYear} composite={r.composite} fit={f} />
            })}
          </section>

          {/* Milestone calendar */}
          <section className="rounded-md border-2 border-slate-200 bg-white p-3">
            <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Milestone calendar</h4>
            <ul className="text-[11.5px] space-y-1">
              {[...ranked.ranked].sort((a, b) => (a.goal.startYear ?? 9999) - (b.goal.startYear ?? 9999)).map((r) => {
                const targetYear = r.goal.startYear ?? '—'
                const yrs = r.goal.startYear ? r.goal.startYear - ranked.ranked[0].goal.startYear! : 0
                return (
                  <li key={r.goal.id} className="grid grid-cols-[70px_60px_1fr_auto] items-baseline gap-3 border-b border-slate-100 last:border-b-0 py-1">
                    <span className="font-bold text-slate-900 tabular-nums">FY {targetYear}</span>
                    <span className="text-slate-500 tabular-nums">{yrs >= 0 ? `${yrs}y` : '—'}</span>
                    <span className="text-slate-700 truncate">{r.goal.label} <span className="text-slate-500 italic">· {r.goal.kind}</span></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider tabular-nums" style={{ color: statusColor(fitById[r.goal.id]?.status) }}>{fitById[r.goal.id]?.status ?? '—'}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}

      <section className="rounded-md border-2 border-slate-200 bg-slate-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-1.5">Observations</h4>
        <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
          {totals.sipShortfall > 0 && <li>● Monthly SIP capacity falls short of engine's per-goal SIP need by <strong>{fmtINR(totals.sipShortfall)}/mo</strong>.</li>}
          {totals.goalsUnfunded > 0 && <li>● {totals.goalsUnfunded} goal{totals.goalsUnfunded > 1 ? 's' : ''} currently unfunded — engine flags these in the Actions list.</li>}
          {totals.corpusFree > 0 && totals.corpus > 0 && <li>● <strong>{fmtINR(totals.corpusFree)}</strong> of corpus is free after goal allocation — available for buffer or new goals.</li>}
          {totals.goalsFunded === goalCount && goalCount > 0 && <li>● All goals fully funded at the current trajectory.</li>}
        </ul>
        <div className="text-[10px] text-emerald-700 italic mt-2 border-t border-slate-200/60 pt-2">
          ✓ Engine-driven: per-goal corpus and SIP come from the Strategy Fitter (Phase 6). See the Engine tab for the full picture.
        </div>
      </section>

      <DownloadRow busy={busy} onExport={handleExport} err={err} profile={profile} buckets={buckets} />
    </section>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────

function statusColor(s: FittedGoal['status'] | undefined): string {
  return s === 'funded' ? '#16a34a' : s === 'partial' ? '#f59e0b' : s === 'unfunded' ? '#dc2626' : '#94a3b8'
}

function GoalCard({ rank, label, kind, priority, source, targetYear, composite, fit }: {
  rank: number; label: string; kind: string; priority: string; source: string; targetYear?: number; composite: number; fit?: FittedGoal
}) {
  const sCol = statusColor(fit?.status)
  const ratio = fit && fit.inflatedCost > 0 ? Math.min(1, fit.projectedAtTarget / fit.inflatedCost) : 0
  const sourceLabel = source === 'system' ? 'SYS' : source === 'gd-projection' ? 'GD' : 'MAN'
  return (
    <div className="rounded-md border-2 border-slate-200 bg-white p-2.5">
      <div className="flex items-start gap-3">
        <span className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center font-serif font-extrabold text-sm tabular-nums ${rank === 1 ? 'bg-amber-500 text-white' : rank <= 3 ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}>{rank}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 flex-wrap mb-0.5">
            <div className="min-w-0">
              <span className="font-serif italic text-sm font-extrabold text-slate-900">{label}</span>
              <span className="ml-2 text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{sourceLabel}</span>
              {priority === 'must-have' && <span className="ml-1 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded px-1.5 py-0.5">must</span>}
              <span className="ml-1 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5" style={{ background: `${sCol}18`, color: sCol }}>{fit?.status ?? '—'}</span>
            </div>
            <span className="text-[10px] text-slate-500 tabular-nums shrink-0">composite {Math.round(composite)}/100</span>
          </div>
          <div className="text-[10.5px] text-slate-500 mb-1">
            {kind} · FY {targetYear ?? '—'} · target {fit ? fmtINR(fit.inflatedCost) : '—'} (inflation-adj)
          </div>
          {fit && (
            <>
              <div className="flex items-baseline justify-between text-[10.5px] text-slate-600 mb-1">
                <span>Projected at target: <strong className="text-slate-900 tabular-nums">{fmtINR(fit.projectedAtTarget)}</strong></span>
                <span className={fit.shortfall > 0 ? 'text-rose-700' : 'text-emerald-700'}>{fit.shortfall > 0 ? `shortfall ${fmtINR(fit.shortfall)}` : 'fully funded'}</span>
              </div>
              <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200 mb-1">
                <div className="absolute inset-y-0 left-0" style={{ width: `${ratio * 100}%`, background: sCol }} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10.5px] mt-1">
                <FitMicro label="Corpus alloc" value={fmtINR(fit.corpusAllocated)} />
                <FitMicro label="SIP afford / need" value={`${fmtINR(fit.monthlySipAffordable)} / ${fmtINR(fit.monthlySipNeeded)}/mo`} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function FitMicro({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="font-bold text-slate-900 tabular-nums">{value}</div>
    </div>
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
