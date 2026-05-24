// Engine Explain dashboard — Phase 8.
// Trust + debugging surface for the orchestration engine. Shows the
// user *why* their goals rank the way they do:
//   1. Active configuration   — persona, weights, derivation
//   2. Pre-emption events     — which system goals fired and why
//   3. Per-goal derivation    — score-by-score breakdown of top goals
//   4. Weight sensitivity     — current ranking vs equal-weight baseline

import type { UserProfile, BucketState } from '../../types'
import type { CriterionWeights, RawGoal, RankedGoal } from '../../types/orchestration'
import { useFittedStrategy } from '../../hooks/useFittedStrategy'
import { rankGoals } from '../../lib/orchestration/rankGoals'
import { PERSONA_WEIGHTS } from '../../lib/orchestration/personaWeights'
import { DownloadRow } from './NetWorthDashboard'
import { storage } from '../../lib/storage'
import { useState, useMemo } from 'react'
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

const CRITERION_COLOR: Record<keyof CriterionWeights, string> = {
  importance: '#6366f1', urgency: '#f59e0b', affordability: '#10b981', riskFit: '#ec4899',
}

export function EngineExplainDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { input, ranked, fit } = useFittedStrategy(profile, buckets)

  // Counterfactual: re-rank with equal weights so user can see how
  // the persona is shaping the ranking. Memoised on input to stay fast.
  const equalRanked = useMemo(() => {
    const equalInput = {
      ...input,
      preferences: {
        ...input.preferences,
        weightOverrides: { importance: 0.25, urgency: 0.25, affordability: 0.25, riskFit: 0.25 } as CriterionWeights,
      },
    }
    // Use a fixed Date so equal+current outputs share a clock
    return rankGoals(equalInput, new Date(ranked.emittedAt))
  }, [input, ranked.emittedAt])

  // Build rank-change map: goal id → { old rank, new rank, delta }
  const rankChanges = useMemo(() => {
    const currentRanks = new Map(ranked.ranked.map((r, i) => [r.goal.id, i + 1]))
    const equalRanks = new Map(equalRanked.ranked.map((r, i) => [r.goal.id, i + 1]))
    return new Map(
      ranked.ranked.map((r) => {
        const curr = currentRanks.get(r.goal.id) ?? 0
        const eq = equalRanks.get(r.goal.id) ?? 0
        return [r.goal.id, { current: curr, equal: eq, delta: eq - curr }]
      })
    )
  }, [ranked, equalRanked])

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setErr(null)
    try { await exportReport(fmt, { identity: storage.getIdentity(), profile, buckets, returnAssumptions: storage.getReturnAssumptions() }) }
    catch (e) { setErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`) }
    finally { setBusy(null) }
  }

  const systemGoals = ranked.ranked.filter((r) => r.goal.source === 'system').map((r) => r.goal)
  const userGoals = ranked.ranked.filter((r) => r.goal.source !== 'system')

  return (
    <section className="space-y-3">
      {/* 1. Active configuration */}
      <ConfigSection
        personaUsed={ranked.trace.personaUsed}
        personaConfidence={input.preferences.personaConfidence}
        moneyScript={input.preferences.moneyScript}
        riskProfile={input.preferences.riskProfile}
        weights={ranked.weightsUsed}
        derivation={ranked.trace.weightDerivation}
      />

      {/* 2. Pre-emption events */}
      <PreemptionSection systemGoals={systemGoals} />

      {/* 3. Per-goal derivation */}
      <DerivationSection
        ranked={ranked.ranked.slice(0, 8)}
        weights={ranked.weightsUsed}
        trace={ranked.trace.goalRationale}
      />

      {/* 4. Sensitivity vs equal weights */}
      <SensitivitySection ranked={ranked.ranked.slice(0, 8)} rankChanges={rankChanges} />

      {/* Bottom strip: provenance */}
      <section className="rounded-md border border-slate-200 bg-slate-50/60 p-2.5 text-[10px] text-slate-500 flex justify-between flex-wrap gap-2">
        <span>{ranked.ranked.length} goals ranked · {userGoals.length} user · {systemGoals.length} system · fitter ran {fit.goals.length} allocations</span>
        <span className="font-mono">engine hash: <code className="text-slate-700">{ranked.inputsHash}</code> · fit hash: <code className="text-slate-700">{fit.inputsHash}</code></span>
      </section>

      <DownloadRow busy={busy} onExport={handleExport} err={err} profile={profile} buckets={buckets} />
    </section>
  )
}

// ─── 1. Active configuration ──────────────────────────────────────────

function ConfigSection({ personaUsed, personaConfidence, moneyScript, riskProfile, weights, derivation }: {
  personaUsed: string; personaConfidence: string; moneyScript: string | null; riskProfile: number | null
  weights: CriterionWeights; derivation: string
}) {
  return (
    <section className="rounded-md border-2 border-indigo-200 bg-indigo-50/30 p-3">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-[3px] uppercase text-indigo-800">1 · Active configuration</div>
          <div className="font-serif italic text-base font-extrabold text-slate-900 leading-tight">Why these weights?</div>
        </div>
        <span className="text-[10px] text-slate-500 italic">Resolved from persona + any user overrides.</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded border border-slate-200 bg-white p-2.5">
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1.5">Persona signals</div>
          <Row k="Persona"           v={personaUsed} />
          <Row k="Confidence"        v={personaConfidence} />
          <Row k="Risk profile"      v={riskProfile != null ? `${Math.round(riskProfile)}/100` : '—'} />
          <Row k="Money script"      v={moneyScript ?? '—'} />
          <Row k="Weight derivation" v={derivation} />
        </div>

        <div className="rounded border border-slate-200 bg-white p-2.5">
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1.5">Criterion weights in effect</div>
          {(Object.keys(weights) as Array<keyof CriterionWeights>).map((k) => (
            <div key={k} className="grid grid-cols-[90px_1fr_44px] gap-2 items-center text-[11px] py-0.5">
              <span className="text-slate-700 capitalize">{k === 'riskFit' ? 'Risk-fit' : k}</span>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div className="h-full" style={{ width: `${weights[k] * 100}%`, background: CRITERION_COLOR[k] }} />
              </div>
              <span className="text-slate-900 font-bold tabular-nums text-right">{(weights[k] * 100).toFixed(0)}%</span>
            </div>
          ))}
          <div className="text-[10px] text-slate-500 italic mt-1.5">
            Sum: {(Object.values(weights).reduce((s, v) => s + v, 0) * 100).toFixed(0)}% (always 100% — re-normalised on override)
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 2. Pre-emption events ────────────────────────────────────────────

function PreemptionSection({ systemGoals }: { systemGoals: RawGoal[] }) {
  return (
    <section className="rounded-md border-2 border-rose-200 bg-rose-50/30 p-3">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-[3px] uppercase text-rose-800">2 · Pre-emption events</div>
          <div className="font-serif italic text-base font-extrabold text-slate-900 leading-tight">Mandatory floors fired</div>
        </div>
        <span className="text-[10px] text-slate-500 italic">System goals are added to the rank before user goals.</span>
      </div>

      {systemGoals.length === 0 ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] text-emerald-800">
          ✓ All protection floors pass — no system pre-emption fired.
        </div>
      ) : (
        <ul className="space-y-1.5 text-[11px]">
          {systemGoals.map((g) => (
            <li key={g.id} className="grid grid-cols-[18px_1fr_auto] gap-2 items-baseline border-b border-rose-200/40 last:border-b-0 pb-1.5 last:pb-0">
              <span className="text-rose-700 text-base leading-none">⚑</span>
              <div className="min-w-0">
                <div className="font-bold text-slate-900">{g.label}</div>
                <div className="text-[10px] text-slate-600 italic">
                  {g.id === 'sys-term-life'      && 'Trigger: lifeCover < 5× annualBurn AND age < 70'}
                  {g.id === 'sys-health-cover'   && 'Trigger: healthCover < ₹15L × age-uplift multiplier'}
                  {g.id === 'sys-emergency-fund' && 'Trigger: liquidCorpus < 6× monthlyBurn'}
                </div>
              </div>
              <span className="text-rose-700 font-bold tabular-nums shrink-0">{fmtINR(g.amount)} gap</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── 3. Per-goal derivation ───────────────────────────────────────────

function DerivationSection({ ranked, weights, trace }: { ranked: RankedGoal[]; weights: CriterionWeights; trace: Record<string, string[]> }) {
  return (
    <section className="rounded-md border-2 border-slate-200 bg-white p-3">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-[3px] uppercase text-slate-700">3 · Per-goal derivation</div>
          <div className="font-serif italic text-base font-extrabold text-slate-900 leading-tight">How each composite was built</div>
        </div>
        <span className="text-[10px] text-slate-500 italic">composite = Σ(score × weight)</span>
      </div>

      <ol className="space-y-2">
        {ranked.map((r, i) => <DerivationCard key={r.goal.id} rank={i + 1} rg={r} weights={weights} bullets={trace[r.goal.id] ?? []} />)}
      </ol>
    </section>
  )
}

function DerivationCard({ rank, rg, weights, bullets }: { rank: number; rg: RankedGoal; weights: CriterionWeights; bullets: string[] }) {
  const parts = (Object.keys(weights) as Array<keyof CriterionWeights>).map((k) => ({
    key: k,
    score: rg.scores[k],
    weight: weights[k],
    contribution: rg.scores[k] * weights[k],
  }))
  return (
    <li className="rounded-md border border-slate-200 bg-slate-50/40 p-2.5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1.5">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] font-bold text-slate-500 tabular-nums">#{rank}</span>
          <span className="font-serif italic text-sm font-extrabold text-slate-900">{rg.goal.label}</span>
        </div>
        <span className="text-[11px] tabular-nums">
          composite <strong className="text-slate-900">{Math.round(rg.composite)}</strong><span className="text-slate-500">/100</span>
        </span>
      </div>

      <table className="w-full text-[10.5px] tabular-nums">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left font-semibold py-0.5">Criterion</th>
            <th className="text-right font-semibold py-0.5">Score</th>
            <th className="text-right font-semibold py-0.5">×</th>
            <th className="text-right font-semibold py-0.5">Weight</th>
            <th className="text-right font-semibold py-0.5">=</th>
            <th className="text-right font-semibold py-0.5">Contribution</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((p) => (
            <tr key={p.key} className="border-t border-slate-200/60">
              <td className="py-0.5 capitalize">
                <span className="inline-block w-2 h-2 rounded-sm mr-1.5" style={{ background: CRITERION_COLOR[p.key] }} />
                {p.key === 'riskFit' ? 'Risk-fit' : p.key}
              </td>
              <td className="text-right">{Math.round(p.score)}</td>
              <td className="text-right text-slate-400">×</td>
              <td className="text-right">{(p.weight * 100).toFixed(0)}%</td>
              <td className="text-right text-slate-400">=</td>
              <td className="text-right font-bold text-slate-900">{p.contribution.toFixed(1)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-300 font-bold">
            <td colSpan={5} className="text-right py-0.5">Composite</td>
            <td className="text-right text-slate-900">{rg.composite.toFixed(1)}</td>
          </tr>
        </tbody>
      </table>

      {bullets.length > 0 && (
        <ul className="text-[10px] text-slate-500 italic mt-1.5 leading-snug">
          {bullets.map((b, i) => <li key={i}>· {b}</li>)}
        </ul>
      )}
    </li>
  )
}

// ─── 4. Sensitivity vs equal weights ──────────────────────────────────

function SensitivitySection({ ranked, rankChanges }: { ranked: RankedGoal[]; rankChanges: Map<string, { current: number; equal: number; delta: number }> }) {
  return (
    <section className="rounded-md border-2 border-amber-200 bg-amber-50/30 p-3">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-[3px] uppercase text-amber-800">4 · Sensitivity</div>
          <div className="font-serif italic text-base font-extrabold text-slate-900 leading-tight">vs equal-weight baseline (25/25/25/25)</div>
        </div>
        <span className="text-[10px] text-slate-500 italic">Shows how the persona is shaping the order.</span>
      </div>

      <ol className="space-y-1 text-[11px]">
        {ranked.map((r) => {
          const change = rankChanges.get(r.goal.id)
          if (!change) return null
          const delta = change.delta
          const arrow = delta === 0 ? '–' : delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`
          const arrowColor = delta === 0 ? '#94a3b8' : delta > 0 ? '#16a34a' : '#dc2626'
          return (
            <li key={r.goal.id} className="grid grid-cols-[40px_1fr_60px_60px_50px] gap-2 items-baseline border-b border-amber-200/40 last:border-b-0 py-0.5">
              <span className="font-mono text-[10px] font-bold text-slate-500 tabular-nums">#{change.current}</span>
              <span className="text-slate-800 truncate">{r.goal.label}</span>
              <span className="text-[10px] text-slate-500 text-right">eq: #{change.equal}</span>
              <span className="font-bold tabular-nums text-right" style={{ color: arrowColor }}>{arrow}</span>
              <span className="text-[10px] text-slate-500 text-right">{delta === 0 ? 'no shift' : delta > 0 ? 'boosted' : 'demoted'}</span>
            </li>
          )
        })}
      </ol>

      <div className="text-[10px] text-slate-500 italic mt-2 pt-1.5 border-t border-amber-200/40 leading-snug">
        Equal-weight baseline removes the persona's tilt. ↑ means current weights boost this goal vs. a neutral ranking;
        ↓ means current weights demote it. Big shifts indicate the persona is making a real difference for that goal.
      </div>
    </section>
  )
}

// ─── Shared row ───────────────────────────────────────────────────────

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 items-baseline text-[11px] py-0.5">
      <span className="text-slate-500">{k}</span>
      <span className="font-semibold text-slate-900 tabular-nums">{v}</span>
    </div>
  )
}

// Persona table reference — exported for any consumer that wants it
export { PERSONA_WEIGHTS }
