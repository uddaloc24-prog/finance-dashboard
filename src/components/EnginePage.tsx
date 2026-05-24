// Engine tab — surface for the Plan + Profile orchestration engine.
//   • Phase tracker
//   • Phase 4 live preview — what `buildOrchestrationInputs` produces
//   • Design memo (Phase 5) rendered inline
// Post-Phase-6 will additionally render: live ranked-goal list, per-
// criterion score breakdown, strategy-fitter output.

import type { UserProfile, BucketState } from '../types'
import { MarkdownView } from './admin/MarkdownView'
import { useFittedStrategy } from '../hooks/useFittedStrategy'
import type { EngineInput, EngineOutput, RankedGoal, CriterionWeights, StrategyFit, FittedGoal, FitAction } from '../types/orchestration'

import engineMemo from '../../tasks/engine-design-memo-2026-05-24.md?raw'

interface Props {
  profile: UserProfile
  buckets: BucketState
}

interface Phase { id: string; title: string; status: 'done' | 'active' | 'planned' }

const PHASES: Phase[] = [
  { id: 'P1-3', title: 'Cosmetic trim (KPI cuts · insights · constants)',           status: 'done' },
  { id: 'P4',   title: 'Plumbing — Plan↔Profile bridge · GD→Goals projector',       status: 'done' },
  { id: 'P5',   title: 'Goal Ranking Engine — shipped · tests pending',             status: 'done' },
  { id: 'P6',   title: 'Strategy Fitter — shipped (corpus alloc · SIP · buckets · actions)', status: 'done' },
  { id: 'P7',   title: 'Rewire GoalTracker / PlanExec / AssetAllocation onto engine output', status: 'done' },
  { id: 'P8',   title: 'Engine Explain dashboard — weights · pre-emption · derivation · sensitivity', status: 'done' },
  { id: 'P9',   title: 'Snapshot + report integration — engine output in PDF · DOCX · PPTX · MD · CSV', status: 'done' },
]

function fmtINR(n: number): string {
  const abs = Math.abs(n), sign = n < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)}k`
  return `${sign}₹${Math.round(abs)}`
}

export function EnginePage({ profile, buckets }: Props) {
  const { input, ranked: output, fit } = useFittedStrategy(profile, buckets)

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

      {/* Phase 5 live ranking — engine output */}
      <RankedGoalsView output={output} fit={fit} />

      {/* Phase 6 live fitted strategy */}
      <FittedStrategyView fit={fit} output={output} />

      {/* Phase 4 input preview (collapsible) */}
      <details className="rounded-md border-2 border-emerald-200 bg-emerald-50/30 overflow-hidden">
        <summary className="cursor-pointer px-4 py-2.5 text-[11px] font-bold tracking-[2px] uppercase text-emerald-800 hover:bg-emerald-100/40 transition-colors">
          Phase 4 · EngineInput preview (what the engine consumed)
        </summary>
        <div className="p-4 pt-2">
          <EngineInputPreview input={input} />
        </div>
      </details>

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

// ─── Ranked goals view (Phase 5 — live engine output) ────────────────

function RankedGoalsView({ output, fit }: { output: EngineOutput; fit: StrategyFit }) {
  const { ranked, weightsUsed, trace, emittedAt, inputsHash } = output
  const fitByGoal: Record<string, FittedGoal> = Object.fromEntries(fit.goals.map((g) => [g.goalId, g]))

  return (
    <section className="rounded-md border-2 border-indigo-200 bg-indigo-50/30 p-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-[3px] uppercase text-indigo-800">Phase 5 · live engine</div>
          <div className="font-serif italic text-lg font-extrabold text-slate-900 leading-tight">Ranked goals</div>
        </div>
        <span className="text-[10px] text-slate-500 italic">{ranked.length} total · persona <strong>{trace.personaUsed}</strong> · weights <strong>{trace.weightDerivation}</strong></span>
      </div>

      {/* Weights bar */}
      <WeightBar weights={weightsUsed} />

      {/* Ranked-goal cards (with inline fit summary chip per goal) */}
      {ranked.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-white p-4 mt-3 text-center text-[11px] text-slate-500 italic">
          No goals to rank yet. Add goals via Goal Discovery (Profile tab) or the legacy Goals editor — they'll appear here ranked automatically.
        </div>
      ) : (
        <ol className="space-y-2 mt-3">
          {ranked.slice(0, 10).map((r, i) => (
            <RankedGoalCard
              key={r.goal.id}
              rank={i + 1}
              rg={r}
              trace={trace.goalRationale[r.goal.id] ?? []}
              fit={fitByGoal[r.goal.id]}
            />
          ))}
          {ranked.length > 10 && <li className="text-[10px] text-slate-500 italic text-center pt-1">…and {ranked.length - 10} more (engine ranked all {ranked.length})</li>}
        </ol>
      )}

      {/* Footer — emission metadata */}
      <div className="mt-3 pt-2 border-t border-indigo-200/60 flex items-baseline justify-between flex-wrap gap-2 text-[10px] text-slate-500">
        <span>Emitted {new Date(emittedAt).toLocaleString('en-IN')}</span>
        <span className="font-mono">inputsHash: <code className="text-slate-700">{inputsHash}</code></span>
      </div>
    </section>
  )
}

function WeightBar({ weights }: { weights: CriterionWeights }) {
  const items: Array<{ k: keyof CriterionWeights; label: string; color: string }> = [
    { k: 'importance',    label: 'Importance',    color: '#6366f1' },
    { k: 'urgency',       label: 'Urgency',       color: '#f59e0b' },
    { k: 'affordability', label: 'Affordability', color: '#10b981' },
    { k: 'riskFit',       label: 'Risk-fit',      color: '#ec4899' },
  ]
  return (
    <div>
      <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1">Criterion weights (in effect)</div>
      <div className="flex h-2.5 rounded-full overflow-hidden border border-slate-200">
        {items.map((i) => (
          <div key={i.k} style={{ background: i.color, width: `${weights[i.k] * 100}%` }} title={`${i.label}: ${(weights[i.k] * 100).toFixed(0)}%`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px]">
        {items.map((i) => (
          <span key={i.k} className="inline-flex items-baseline gap-1">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: i.color }} />
            <span className="text-slate-700">{i.label}</span>
            <span className="font-bold text-slate-900 tabular-nums">{(weights[i.k] * 100).toFixed(0)}%</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function RankedGoalCard({ rank, rg, trace, fit }: { rank: number; rg: RankedGoal; trace: string[]; fit?: FittedGoal }) {
  const sourceTone = rg.goal.source === 'system' ? 'rose' : rg.goal.source === 'gd-projection' ? 'indigo' : 'slate'
  const sourceBg = sourceTone === 'rose' ? 'bg-rose-100 text-rose-700' : sourceTone === 'indigo' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
  const statusColor = fit?.status === 'funded' ? '#16a34a' : fit?.status === 'partial' ? '#f59e0b' : '#dc2626'
  return (
    <li className="rounded-md border-2 border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <span className={`shrink-0 w-9 h-9 rounded-md flex items-center justify-center font-serif font-extrabold text-base tabular-nums ${rank === 1 ? 'bg-amber-500 text-white' : rank <= 3 ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
          {rank}
        </span>

        {/* Main */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <span className="font-serif italic text-sm font-extrabold text-slate-900 leading-tight">{rg.goal.label}</span>
              <span className={`ml-2 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${sourceBg}`}>{rg.goal.source}</span>
              {rg.goal.priority === 'must-have' && <span className="ml-1 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-amber-100 text-amber-800">must</span>}
              {fit && <span className="ml-1 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5" style={{ background: `${statusColor}18`, color: statusColor }}>{fit.status}</span>}
            </div>
            <div className="text-right shrink-0">
              <div className="font-extrabold text-slate-900 tabular-nums text-[14px]">{Math.round(rg.composite)}<span className="text-[9px] text-slate-500 font-normal">/100</span></div>
              <div className="text-[10px] text-slate-500 tabular-nums">{(rg.priorityWeight * 100).toFixed(1)}% of weight</div>
            </div>
          </div>

          <div className="text-[10.5px] text-slate-500 mt-0.5">
            ₹{rg.goal.amount.toLocaleString('en-IN')} target · {rg.goal.kind} · {rg.goal.inflationCategory} infl · FY {rg.goal.startYear ?? '—'}
          </div>

          {/* Per-criterion mini bars */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            <ScoreBar label="IMP" v={rg.scores.importance}    color="#6366f1" />
            <ScoreBar label="URG" v={rg.scores.urgency}       color="#f59e0b" />
            <ScoreBar label="AFF" v={rg.scores.affordability} color="#10b981" />
            <ScoreBar label="RSK" v={rg.scores.riskFit}       color="#ec4899" />
          </div>

          {/* Fit chip — corpus + SIP allocation */}
          {fit && (fit.corpusAllocated > 0 || fit.monthlySipAffordable > 0) && (
            <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10.5px] grid grid-cols-2 sm:grid-cols-4 gap-2">
              <FitChip label="Corpus alloc" value={`₹${fmtINR(fit.corpusAllocated)}`} />
              <FitChip label="SIP need / afford" value={`${fmtINR(fit.monthlySipNeeded)} / ${fmtINR(fit.monthlySipAffordable)}`} />
              <FitChip label="Projected"   value={`₹${fmtINR(fit.projectedAtTarget)}`} />
              <FitChip label="Shortfall"   value={fit.shortfall > 0 ? `₹${fmtINR(fit.shortfall)}` : '—'} tone={fit.shortfall > 0 ? 'rose' : undefined} />
            </div>
          )}

          {/* Rationale */}
          {trace.length > 0 && (
            <ul className="mt-1.5 text-[10px] text-slate-500 leading-snug">
              {trace.map((b, i) => <li key={i}>• {b}</li>)}
            </ul>
          )}
        </div>
      </div>
    </li>
  )
}

function FitChip({ label, value, tone }: { label: string; value: string; tone?: 'rose' }) {
  const fg = tone === 'rose' ? 'text-rose-700' : 'text-slate-900'
  return (
    <div>
      <div className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`font-bold tabular-nums ${fg}`}>{value}</div>
    </div>
  )
}

function ScoreBar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[9px] mb-0.5">
        <span className="text-slate-500 font-bold tracking-wider">{label}</span>
        <span className="text-slate-900 font-bold tabular-nums">{Math.round(v)}</span>
      </div>
      <div className="h-1 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
        <div className="h-full" style={{ width: `${Math.min(100, v)}%`, background: color }} />
      </div>
    </div>
  )
}

// ─── Fitted strategy view (Phase 6) ──────────────────────────────────

function FittedStrategyView({ fit, output }: { fit: StrategyFit; output: EngineOutput }) {
  const { totals, bucketTargets, actions } = fit
  void output

  return (
    <section className="rounded-md border-2 border-emerald-200 bg-emerald-50/30 p-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-[3px] uppercase text-emerald-800">Phase 6 · live fitter</div>
          <div className="font-serif italic text-lg font-extrabold text-slate-900 leading-tight">Fitted strategy</div>
        </div>
        <span className="text-[10px] text-slate-500 italic">
          {totals.goalsFunded}/{fit.goals.length} funded · {totals.goalsPartial} partial · {totals.goalsUnfunded} unfunded
        </span>
      </div>

      {/* Top tiles — capacity vs use */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Corpus used"   value={`₹${fmtINR(totals.corpusUsed)}`}   sub={`of ₹${fmtINR(totals.corpus)}`} />
        <Tile label="Corpus free"   value={`₹${fmtINR(totals.corpusFree)}`}   sub="surplus after goal alloc" tone={totals.corpusFree > 0 ? 'emerald' : undefined} />
        <Tile label="SIP used"      value={`₹${fmtINR(totals.sipUsed)}/mo`}   sub={`of ₹${fmtINR(totals.sipCapacity)}/mo`} />
        <Tile label="SIP shortfall" value={totals.sipShortfall > 0 ? `₹${fmtINR(totals.sipShortfall)}/mo` : '—'} sub="goals can't fully fund" tone={totals.sipShortfall > 0 ? 'rose' : undefined} />
      </div>

      {/* Bucket target bar */}
      {totals.corpusUsed > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1">4-bucket allocation (weighted by goal horizons)</div>
          <div className="flex h-3 rounded-full overflow-hidden border border-slate-200">
            <div style={{ background: '#10b981', width: `${bucketTargets.b1Pct * 100}%` }} title={`B1 ${(bucketTargets.b1Pct*100).toFixed(0)}%`} />
            <div style={{ background: '#3b82f6', width: `${bucketTargets.b2Pct * 100}%` }} title={`B2 ${(bucketTargets.b2Pct*100).toFixed(0)}%`} />
            <div style={{ background: '#a855f7', width: `${bucketTargets.b3Pct * 100}%` }} title={`B3 ${(bucketTargets.b3Pct*100).toFixed(0)}%`} />
            <div style={{ background: '#f59e0b', width: `${bucketTargets.b4Pct * 100}%` }} title={`B4 ${(bucketTargets.b4Pct*100).toFixed(0)}%`} />
          </div>
          <div className="grid grid-cols-4 gap-2 text-[10.5px] mt-1">
            <BucketLabel name="B1 · Liquid"  pct={bucketTargets.b1Pct} amount={bucketTargets.b1} color="#10b981" />
            <BucketLabel name="B2 · Debt"    pct={bucketTargets.b2Pct} amount={bucketTargets.b2} color="#3b82f6" />
            <BucketLabel name="B3 · Hybrid"  pct={bucketTargets.b3Pct} amount={bucketTargets.b3} color="#a855f7" />
            <BucketLabel name="B4 · Equity"  pct={bucketTargets.b4Pct} amount={bucketTargets.b4} color="#f59e0b" />
          </div>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1.5">Recommended actions</div>
          <ol className="space-y-1.5">
            {actions.map((a) => <ActionRow key={a.priority} action={a} />)}
          </ol>
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-emerald-200/60 text-[10px] text-slate-500 flex justify-between flex-wrap gap-2">
        <span>Strategy emitted {new Date(fit.emittedAt).toLocaleString('en-IN')}</span>
        <span className="font-mono">fit hash: <code className="text-slate-700">{fit.inputsHash}</code></span>
      </div>
    </section>
  )
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'emerald' | 'rose' }) {
  const bg = tone === 'emerald' ? 'bg-emerald-50 border-emerald-300' : tone === 'rose' ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'
  const fg = tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : 'text-slate-700'
  return (
    <div className={`rounded-md border-2 ${bg} px-2.5 py-2`}>
      <div className={`text-[9px] font-bold tracking-[1.5px] uppercase ${fg}`}>{label}</div>
      <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5 leading-tight">{value}</div>
      {sub && <div className="text-[9px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function BucketLabel({ name, pct, amount, color }: { name: string; pct: number; amount: number; color: string }) {
  return (
    <div className="flex flex-col">
      <span className="inline-flex items-baseline gap-1">
        <span className="w-2 h-2 rounded-sm inline-block" style={{ background: color }} />
        <span className="text-slate-700">{name}</span>
      </span>
      <span className="font-bold text-slate-900 tabular-nums">{(pct * 100).toFixed(0)}% <span className="text-[10px] text-slate-500 font-normal">· ₹{fmtINR(amount)}</span></span>
    </div>
  )
}

function ActionRow({ action }: { action: FitAction }) {
  const categoryColor: Record<FitAction['category'], string> = {
    reserve: '#dc2626', allocate: '#10b981', sip: '#f59e0b', rebalance: '#3b82f6', flag: '#dc2626',
  }
  const c = categoryColor[action.category]
  return (
    <li className="grid grid-cols-[26px_1fr] gap-2 items-baseline">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold tabular-nums" style={{ background: `${c}18`, color: c }}>{action.priority}</span>
      <div>
        <div className="text-[12px] font-semibold text-slate-900">{action.title}</div>
        <div className="text-[10.5px] text-slate-600 italic mt-0.5 leading-snug">{action.detail}</div>
      </div>
    </li>
  )
}

// ─── Engine input preview (Phase 4) ───────────────────────────────────

function EngineInputPreview({ input }: { input: EngineInput }) {
  const { plan, preferences, goals } = input
  return (
    <div>
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
      </div>
    </div>
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
