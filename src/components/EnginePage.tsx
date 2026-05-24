// Engine tab — surface for the Plan + Profile orchestration engine.
//   • Phase tracker
//   • Phase 4 live preview — what `buildOrchestrationInputs` produces
//   • Design memo (Phase 5) rendered inline
// Post-Phase-6 will additionally render: live ranked-goal list, per-
// criterion score breakdown, strategy-fitter output.

import type { UserProfile, BucketState } from '../types'
import { MarkdownView } from './admin/MarkdownView'
import { buildOrchestrationInputsFromStorage } from '../lib/orchestration/inputs'
import type { EngineInput } from '../types/orchestration'

import engineMemo from '../../tasks/engine-design-memo-2026-05-24.md?raw'

interface Props {
  profile: UserProfile
  buckets: BucketState
}

interface Phase { id: string; title: string; status: 'done' | 'active' | 'planned' }

const PHASES: Phase[] = [
  { id: 'P1-3', title: 'Cosmetic trim (KPI cuts · insights · constants)',     status: 'done' },
  { id: 'P4',   title: 'Plumbing — Plan↔Profile bridge · GD→Goals projector', status: 'done' },
  { id: 'P5',   title: 'Goal Ranking Engine — design memo + scorers + tests', status: 'active' },
  { id: 'P6',   title: 'Strategy Fitter',                                     status: 'planned' },
  { id: 'P7',   title: 'Rewire GoalTracker / PlanExec / AssetAllocation',     status: 'planned' },
  { id: 'P8',   title: 'Engine Explain dashboard',                            status: 'planned' },
  { id: 'P9',   title: 'Snapshot + report integration',                       status: 'planned' },
]

function fmtINR(n: number): string {
  const abs = Math.abs(n), sign = n < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)}k`
  return `${sign}₹${Math.round(abs)}`
}

export function EnginePage({ profile, buckets }: Props) {
  const input: EngineInput = buildOrchestrationInputsFromStorage(profile, buckets)

  return (
    <section className="space-y-3">
      {/* Hero band */}
      <div className="rounded-xl p-4 sm:p-5" style={{ background: 'linear-gradient(135deg, #f59e0b22, #f59e0b05)', border: '2px solid #f59e0b40' }}>
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700">Orchestration</span>
          <span className="h-px flex-1 bg-gradient-to-r from-amber-500/60 to-transparent" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-[2px] text-amber-800 bg-amber-100 border border-amber-300 rounded px-2 py-0.5">Phase 5 — design</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
          The <em className="not-italic font-extrabold text-amber-700">Engine</em>.
        </h2>
        <p className="text-[12px] sm:text-[13px] text-slate-700 mt-2 leading-snug max-w-3xl">
          The orchestration engine takes every Plan input (constraints) and every Profile input (preferences) and produces a
          single ranked list of goals with priority weights, plus the trace data a downstream Strategy Fitter needs to
          allocate corpus &amp; SIP. It does not exist yet — this tab will show its live output once Phase 6 ships. Today it
          carries the design memo so the contract is fully visible before code lands.
        </p>
      </div>

      {/* Phase tracker */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <h3 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Roadmap</h3>
        <ol className="space-y-1.5 text-[12px]">
          {PHASES.map((p) => {
            const dot = p.status === 'done' ? '#16a34a' : p.status === 'active' ? '#f59e0b' : '#cbd5e1'
            const fg  = p.status === 'done' ? 'text-emerald-700' : p.status === 'active' ? 'text-amber-800' : 'text-slate-600'
            return (
              <li key={p.id} className="grid grid-cols-[18px_56px_1fr_auto] gap-2 items-baseline">
                <span aria-hidden="true" className="inline-block w-2.5 h-2.5 rounded-full mt-1" style={{ background: dot }} />
                <span className="font-mono text-[10px] font-bold text-slate-500 tabular-nums">{p.id}</span>
                <span className={`font-semibold ${fg}`}>{p.title}</span>
                <span className={`text-[9px] font-bold uppercase tracking-[2px] ${fg}`}>{p.status}</span>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Phase 4 live preview — what the aggregator produces from current state */}
      <EngineInputPreview input={input} />

      {/* Ranked-goal output placeholder (Phase 5/6) */}
      <section className="rounded-md border-2 border-dashed border-slate-300 bg-slate-50/60 p-4 text-center">
        <div className="text-[10px] font-bold tracking-[3px] uppercase text-slate-500">Ranked-goal output</div>
        <div className="font-serif italic text-base text-slate-700 mt-1">
          Per-criterion scores · priority weights · strategy fit
        </div>
        <div className="text-[11px] text-slate-500 mt-1.5 max-w-xl mx-auto">
          Will render here once Phase 5 lands the ranker (and Phase 6 lands the strategy fitter).
        </div>
      </section>

      {/* Design memo */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3 pb-2 border-b border-slate-200 flex items-baseline justify-between flex-wrap gap-2">
          <h3 className="text-[10px] font-bold tracking-[3px] uppercase text-slate-700">Design memo</h3>
          <span className="text-[10px] font-mono text-slate-400">tasks/engine-design-memo-2026-05-24.md</span>
        </div>
        <MarkdownView source={engineMemo} />
      </section>
    </section>
  )
}

// ─── Engine input preview (Phase 4) ───────────────────────────────────

function EngineInputPreview({ input }: { input: EngineInput }) {
  const { plan, preferences, goals } = input
  return (
    <section className="rounded-md border-2 border-emerald-200 bg-emerald-50/30 p-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-[3px] uppercase text-emerald-800">Phase 4 · live</div>
          <div className="font-serif italic text-lg font-extrabold text-slate-900 leading-tight">Aggregated EngineInput</div>
        </div>
        <span className="text-[10px] text-slate-500 italic">What the ranker will receive — live from your current Plan + Profile state.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Plan facts */}
        <div className="rounded border border-slate-200 bg-white p-2.5">
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-1.5">Plan facts</div>
          <Row k="Corpus"          v={fmtINR(plan.corpus)} />
          <Row k="Net worth"       v={fmtINR(plan.netWorth)} />
          <Row k="Liquid corpus"   v={fmtINR(plan.liquidCorpus)} />
          <Row k="Monthly burn"    v={`${fmtINR(plan.monthlyBurn)}/mo`} />
          <Row k="Monthly EMI"     v={`${fmtINR(plan.monthlyEMI)}/mo`} />
          <Row k="Passive income"  v={`${fmtINR(plan.passiveIncome)}/mo`} />
          <Row k="SIP · Withdraw"  v={`${fmtINR(plan.monthlySIP)} · ${fmtINR(plan.monthlyWithdrawal)}`} />
          <Row k="Age / retire / life" v={`${plan.currentAge} → ${plan.retireAge} → ${plan.lifeExpectancy}`} />
          <Row k="Inflation"       v={`${plan.inflation.general}% · H ${plan.inflation.healthcare}% · E ${plan.inflation.education}%`} />
          <Row k="Blended return"  v={`${plan.blendedReturn.toFixed(2)}%`} />
          <Row k="Tax · Risk"      v={`${plan.taxBracket}% · ${plan.riskAppetite}/5`} />
        </div>

        {/* Insurance + preferences */}
        <div className="rounded border border-slate-200 bg-white p-2.5">
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-1.5">Insurance</div>
          <Row k="Health cover"    v={fmtINR(plan.insurance.healthCover)} />
          <Row k="Life cover"      v={fmtINR(plan.insurance.lifeCover)} />
          <Row k="CI cover"        v={fmtINR(plan.insurance.ciCover)} />
          <Row k="Term · MWP"      v={`${plan.insurance.termActive ? 'active' : 'none'}${plan.insurance.termMwp ? ' · MWP ✓' : ''}`} />

          <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mt-3 mb-1.5">Preferences</div>
          <Row k="Persona"         v={preferences.personaPrimary ?? '—'} />
          <Row k="Confidence"      v={preferences.personaConfidence} />
          <Row k="Risk profile"    v={preferences.riskProfile != null ? `${Math.round(preferences.riskProfile)}/100` : '—'} />
          <Row k="Money script"    v={preferences.moneyScript ?? '—'} />
          <Row k="Weight overrides" v={preferences.weightOverrides ? 'present' : 'persona defaults'} />
        </div>

        {/* Goals */}
        <div className="rounded border border-slate-200 bg-white p-2.5">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Goals ({goals.length})</span>
            <span className="text-[10px] text-slate-500 italic">manual + GD-projected</span>
          </div>
          {goals.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic py-2">No goals yet — add via Goal Discovery (Profile tab) or the legacy Goals editor.</div>
          ) : (
            <ul className="space-y-1 text-[11px]">
              {goals.slice(0, 8).map((g) => (
                <li key={g.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-baseline border-b border-slate-100 last:border-b-0 py-1">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{g.label}</div>
                    <div className="text-[10px] text-slate-500">{g.kind} · {g.inflationCategory} · {g.priority} <span className="text-slate-400">· {g.source}</span></div>
                  </div>
                  <span className="text-slate-700 tabular-nums">{fmtINR(g.amount)}</span>
                  <span className="text-slate-500 tabular-nums">{g.startYear ?? '—'}</span>
                </li>
              ))}
              {goals.length > 8 && <li className="text-[10px] text-slate-500 italic py-1">…and {goals.length - 8} more</li>}
            </ul>
          )}
        </div>
      </div>

      <div className="text-[10px] text-emerald-800/70 italic mt-3 leading-snug">
        ✓ Aggregator (<code className="font-mono text-emerald-900">src/lib/orchestration/inputs.ts</code>) +
        GD projector (<code className="font-mono text-emerald-900">goalsFromGd.ts</code>) +
        type contract (<code className="font-mono text-emerald-900">src/types/orchestration.ts</code>) are live.
        Phase 5 will take this exact <code className="font-mono text-emerald-900">EngineInput</code> and emit ranked goals.
      </div>
    </section>
  )
}

function Row({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 items-baseline text-[11px] py-0.5">
      <span className="text-slate-500">{k}</span>
      <span className="font-semibold text-slate-900 tabular-nums">{v}</span>
    </div>
  )
}
