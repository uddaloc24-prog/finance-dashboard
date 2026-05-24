// Engine tab — placeholder surface for the Plan + Profile orchestration
// engine. Pre-launch (Phase 5 design), this tab shows:
//   • Phase tracker (where we are in the roadmap)
//   • The current design memo, rendered inline
// Post-launch (Phase 6+), it will additionally show:
//   • Live ranked-goal list from the engine
//   • Per-criterion score breakdown
//   • Strategy-fitter output
// Reusing the AdminPage's MarkdownView so memo + future "engine explain"
// docs render with the same typography.

import type { UserProfile, BucketState } from '../types'
import { MarkdownView } from './admin/MarkdownView'

import engineMemo from '../../tasks/engine-design-memo-2026-05-24.md?raw'

interface Props {
  profile: UserProfile
  buckets: BucketState
}

interface Phase { id: string; title: string; status: 'done' | 'active' | 'planned' }

const PHASES: Phase[] = [
  { id: 'P1-3', title: 'Cosmetic trim (KPI cuts · insights · constants)',  status: 'done' },
  { id: 'P4',   title: 'Plumbing — Plan↔Profile bridge · GD→Goals projector', status: 'planned' },
  { id: 'P5',   title: 'Goal Ranking Engine — design memo',                  status: 'active' },
  { id: 'P6',   title: 'Strategy Fitter',                                    status: 'planned' },
  { id: 'P7',   title: 'Rewire GoalTracker / PlanExec / AssetAllocation',    status: 'planned' },
  { id: 'P8',   title: 'Engine Explain dashboard',                           status: 'planned' },
  { id: 'P9',   title: 'Snapshot + report integration',                      status: 'planned' },
]

export function EnginePage({ profile: _profile, buckets: _buckets }: Props) {
  void _profile; void _buckets

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

      {/* Live engine output — placeholder */}
      <section className="rounded-md border-2 border-dashed border-slate-300 bg-slate-50/60 p-4 text-center">
        <div className="text-[10px] font-bold tracking-[3px] uppercase text-slate-500">Live engine output</div>
        <div className="font-serif italic text-base text-slate-700 mt-1">
          Ranked goals · per-criterion scores · strategy fit
        </div>
        <div className="text-[11px] text-slate-500 mt-1.5 max-w-xl mx-auto">
          Will render here once Phase 6 lands. Until then, the memo below is the source of truth.
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
