// Full Goal-Discovery dashboard. Equivalent in spirit to the V10
// CompositesDashboard, but for the intermediate stage after Goal
// Discovery has been processed (and before — or independent of — the
// 74-item psychometric quiz).
//
// Shows: persona, stat row, all 12 inferred signals, dominant money
// script (from v10 composites if any), partner divergence, captured
// goals, scene tags, bridge sentence, action recommendations, and a
// full export row (PDF / DOCX / PPTX / MD / CSV / JSON).

import { useState } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from '../../types'
import type { GoalDiscoveryState, V10QuizState, SignalId } from '../../types/psychometric'
import { storage } from '../../lib/storage'
import { downloadV10Json } from '../../lib/exporters/v10Json'
import { exportReport, FORMATS, type ExportFormat } from '../../lib/exporters'
import { GD_GOAL_TYPES, GD_SCENE_TAGS } from '../../lib/data/goalDiscovery'
import { BehaviouralActions } from './BehaviouralActions'

interface Props {
  gdState: GoalDiscoveryState | null
  v10State: V10QuizState | null
  userProfile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
}

const SIGNAL_LABELS: Record<SignalId, string> = {
  money_script_avoidance:    'Money Avoidance',
  money_script_worship:      'Money Worship',
  money_script_status:       'Money Status',
  money_script_vigilance:    'Money Vigilance',
  time_orientation_present:  'Present-bias',
  locus_of_control_internal: 'Internal Locus',
  self_efficacy:             'Self-Efficacy',
  family_obligation_weight:  'Family Obligation',
  protection_to_aspiration:  'Aspiration vs Protection',
  financial_anxiety_marker:  'Financial Anxiety',
  herding_susceptibility:    'Herd-Susceptibility',
  overconfidence_marker:     'Overconfidence',
}

const SCRIPT_LABELS = {
  avoidance: 'Money Avoidance',
  worship:   'Money Worship',
  status:    'Money Status',
  vigilance: 'Money Vigilance',
}

const CONFIDENCE_TONE = {
  high:         { fg: '#3730a3', bg: '#eef2ff', border: '#c7d2fe' },
  medium:       { fg: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  low:          { fg: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  unclassified: { fg: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
} as const

interface GoalEntry { name: string; type: string; amount: string; horizon: string; priority: string }

function readGoals(gd: GoalDiscoveryState): GoalEntry[] {
  const raw = gd.answers['block-1']?.['goals']
  return Array.isArray(raw) && typeof raw[0] === 'object' ? (raw as unknown as GoalEntry[]) : []
}

function readTags(gd: GoalDiscoveryState): string[] {
  const t = gd.answers['block-0']?.['tags']
  return Array.isArray(t) ? (t as string[]) : []
}

export function GoalDiscoveryDashboard({
  gdState, v10State, userProfile, buckets, returnAssumptions,
}: Props) {
  const inference = gdState?.inference ?? null
  const composites = v10State?.composites ?? null
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [exportErr, setExportErr] = useState<string | null>(null)

  if (!inference && !composites) return null

  const persona = inference?.persona.primary ?? null
  const confidence = inference?.persona.confidence ?? 'unclassified'
  const confTone = CONFIDENCE_TONE[confidence]
  const goals = gdState ? readGoals(gdState) : []
  const tags = gdState ? readTags(gdState) : []
  const namedGoals = goals.filter((g) => g.name.trim().length > 0)

  const signalEntries = inference
    ? (Object.entries(inference.signals)
        .map(([id, sig]) => ({ id: id as SignalId, score: sig.score, evidence: sig.evidence[0] ?? '' }))
        .sort((a, b) => (b.score ?? -1) - (a.score ?? -1)))
    : []
  const activeCount = signalEntries.filter((s) => s.score != null && s.score >= 0.7).length

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt)
    setExportErr(null)
    try {
      await exportReport(fmt, {
        identity: storage.getIdentity(),
        profile: userProfile,
        buckets,
        returnAssumptions,
      })
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="mt-3 rounded-lg border-2 border-indigo-300 bg-white p-4 space-y-4 ring-1 ring-indigo-100 shadow-sm">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <span className="inline-block bg-indigo-100 text-indigo-800 text-[10px] font-bold tracking-[2px] uppercase px-2.5 py-0.5 rounded-full">
            Goal Discovery dashboard
          </span>
          <p className="text-[10px] text-slate-500 italic mt-1">
            Intermediate report — refines once the v10 psychometric assessment completes.
          </p>
        </div>
        {inference && (
          <span className="text-[10px] text-slate-500 tabular-nums">
            Updated {new Date(inference.computedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        )}
      </div>

      {/* ── Top row: persona card + stat row ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
        {persona ? (
          <div className="rounded-md border-2 border-indigo-200 bg-indigo-50/60 p-3">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-bold tracking-[2px] uppercase text-indigo-700">Inferred persona</span>
              <span
                className="text-[9px] font-bold tracking-[1.5px] uppercase px-1.5 py-0.5 rounded border"
                style={{ color: confTone.fg, background: confTone.bg, borderColor: confTone.border }}
              >
                {confidence} confidence
              </span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-extralight tracking-tight text-slate-900 mt-1">
              {persona.name}
            </h3>
            {inference?.persona.secondary && (
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                Secondary: <strong className="text-slate-800">{inference.persona.secondary.name}</strong>
              </p>
            )}
            {persona.evidence.length > 0 && (
              <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                Evidence: {persona.evidence.slice(0, 5).join(' · ')}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-md border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-3 text-center">
            <div className="text-[10px] font-bold tracking-[2px] uppercase text-indigo-700">No persona yet</div>
            <p className="text-[11px] text-slate-600 mt-1 leading-snug">
              Add scene tags and at least one goal in Goal Discovery, then click "Process & apply" to infer a persona.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Active signals" value={`${activeCount}/${signalEntries.length}`} />
          <Stat label="Goals captured" value={String(namedGoals.length)} />
          <Stat label="Scene tags"     value={String(tags.length)} />
          <Stat label="v10 score"      value={composites ? `${Math.round(composites.riskProfile)}/100` : '—'} />
        </div>
      </div>

      {/* ── Dominant money script (from v10 composites) ──────── */}
      {composites?.dominantMoneyScript && (
        <section className="rounded-md border-2 border-slate-200 p-3">
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="text-xs font-bold tracking-[2px] uppercase text-slate-700">Money Scripts</h4>
            <span className="text-[11px] text-slate-500">
              Dominant:{' '}
              <strong className="text-slate-900">{SCRIPT_LABELS[composites.dominantMoneyScript]}</strong>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(composites.moneyScripts) as (keyof typeof composites.moneyScripts)[]).map((id) => (
              <ScriptBar
                key={id}
                label={SCRIPT_LABELS[id]}
                value={composites.moneyScripts[id]}
                flagged={composites.dominantMoneyScript === id}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Signal grid ───────────────────────────────────────── */}
      {signalEntries.length > 0 && (
        <section className="rounded-md border-2 border-slate-200 p-3">
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="text-xs font-bold tracking-[2px] uppercase text-slate-700">Behavioural signals</h4>
            <span className="text-[10px] text-slate-500 italic">{activeCount} active · {signalEntries.length - activeCount} latent</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {signalEntries.map((s) => (
              <SignalRow key={s.id} label={SIGNAL_LABELS[s.id]} score={s.score} evidence={s.evidence} />
            ))}
          </div>
        </section>
      )}

      {/* ── Partner divergence ────────────────────────────────── */}
      {inference?.partnerDivergence && (
        <section
          className={`rounded-md border-2 p-3 ${
            inference.partnerDivergence.diverged ? 'border-rose-200 bg-rose-50/60' : 'border-emerald-200 bg-emerald-50/60'
          }`}
        >
          <h4 className={`text-xs font-bold tracking-[2px] uppercase ${
            inference.partnerDivergence.diverged ? 'text-rose-700' : 'text-emerald-700'
          }`}>
            Partner alignment {inference.partnerDivergence.diverged ? '· divergent' : '· aligned'}
          </h4>
          {inference.partnerDivergence.diverged ? (
            <p className="text-[12px] text-slate-700 mt-1 leading-snug">
              You would drop <strong>"{inference.partnerDivergence.userPick}"</strong> first; you think your partner would drop{' '}
              <strong>"{inference.partnerDivergence.partnerPick}"</strong>. v10 flags this as the most diagnostic question in the flow —
              an open conversation here often surfaces misalignment higher up the list too.
            </p>
          ) : (
            <p className="text-[12px] text-slate-700 mt-1 leading-snug">
              You and your partner would both drop <strong>"{inference.partnerDivergence.userPick}"</strong> first — your priorities on the trade-off are aligned.
            </p>
          )}
        </section>
      )}

      {/* ── Goals captured ────────────────────────────────────── */}
      {namedGoals.length > 0 && (
        <section className="rounded-md border-2 border-slate-200 p-3">
          <h4 className="text-xs font-bold tracking-[2px] uppercase text-slate-700 mb-2">Goals captured</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {namedGoals.map((g, i) => (
              <div key={i} className="flex items-baseline gap-2 text-[11px]">
                <span className="text-slate-400 tabular-nums w-5 shrink-0">{i + 1}.</span>
                <span className="text-slate-900 font-medium truncate">{g.name}</span>
                {g.type && (
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">
                    {GD_GOAL_TYPES.find((t) => t.value === g.type)?.label.split(' ')[0] ?? g.type}
                  </span>
                )}
                {g.priority && (
                  <span className={`text-[9px] font-bold uppercase ${
                    g.priority === 'must' ? 'text-rose-700' : 'text-emerald-700'
                  }`}>
                    {g.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Scene tags ────────────────────────────────────────── */}
      {tags.length > 0 && (
        <section className="rounded-md border-2 border-slate-200 p-3">
          <h4 className="text-xs font-bold tracking-[2px] uppercase text-slate-700 mb-2">Life context</h4>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => {
              const opt = GD_SCENE_TAGS.find((o) => o.value === t)
              return (
                <span key={t} className="text-[11px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  {opt?.icon && <span className="mr-1">{opt.icon}</span>}
                  {opt?.label ?? t}
                </span>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Bridge sentence ───────────────────────────────────── */}
      {inference?.bridgeSentence && (
        <blockquote className="text-[12px] text-slate-700 italic leading-relaxed border-l-4 border-indigo-300 bg-indigo-50/30 pl-3 py-2 pr-2 rounded-r">
          {inference.bridgeSentence}
        </blockquote>
      )}

      {/* ── Action recommendations (rule-driven) ──────────────── */}
      <section className="rounded-md border-2 border-slate-200 p-3">
        <h4 className="text-xs font-bold tracking-[2px] uppercase text-slate-700 mb-2">Action recommendations</h4>
        <BehaviouralActions />
      </section>

      {/* ── Export row ────────────────────────────────────────── */}
      <section className="rounded-md border-2 border-indigo-200 bg-indigo-50/30 p-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
          <h4 className="text-xs font-bold tracking-[2px] uppercase text-indigo-700">Download report</h4>
          <span className="text-[10px] text-slate-500 italic">
            Same envelope used by the v10 dashboard. Useful for advisor handoff.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadV10Json(gdState, v10State)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold text-indigo-800 bg-white border border-indigo-200 hover:bg-indigo-50 transition-colors"
            title="Bundles GD + v10 + inference into a single JSON envelope"
          >
            <span aria-hidden="true">⬇</span> JSON
          </button>
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleExport(f.id)}
              disabled={busy != null}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
              title={f.hint}
            >
              <span aria-hidden="true">⬇</span> {busy === f.id ? `${f.label}…` : f.label}
            </button>
          ))}
        </div>
        {exportErr && (
          <div className="mt-2 text-[11px] text-rose-700">{exportErr}</div>
        )}
      </section>
    </section>
  )
}

// ─── small subcomponents ────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border-2 border-slate-200 px-2.5 py-1.5 text-center">
      <div className="text-[8px] font-bold tracking-[1.5px] uppercase text-slate-500">{label}</div>
      <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5">{value}</div>
    </div>
  )
}

function ScriptBar({ label, value, flagged }: { label: string; value: number; flagged: boolean }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={`rounded p-2 ${flagged ? 'bg-indigo-50 border-2 border-indigo-200' : 'border border-slate-200'}`}>
      <div className="flex items-baseline justify-between">
        <span className={`text-[10px] ${flagged ? 'font-bold text-indigo-900' : 'text-slate-600'} truncate`}>
          {flagged && '★ '}{label}
        </span>
        <span className="text-[10px] tabular-nums text-slate-700">{Math.round(value)}</span>
      </div>
      <div className="h-1 rounded-full bg-slate-100 overflow-hidden mt-1">
        <div className="h-full" style={{ width: `${pct}%`, background: flagged ? '#4338ca' : '#64748b' }} />
      </div>
    </div>
  )
}

function SignalRow({ label, score, evidence }: { label: string; score: number | null; evidence: string }) {
  const isActive = score != null && score >= 0.7
  const pct = score != null ? Math.max(0, Math.min(100, score * 100)) : 0
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-[11px] ${isActive ? 'font-semibold text-indigo-900' : 'text-slate-500'}`}>
          {isActive && '● '}{label}
        </span>
        <span className="text-[10px] tabular-nums text-slate-500">
          {score == null ? '—' : score.toFixed(2)}
        </span>
      </div>
      <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, background: isActive ? '#4338ca' : score == null ? '#cbd5e1' : '#94a3b8' }}
        />
      </div>
      {isActive && evidence && (
        <div className="text-[10px] text-slate-500 italic truncate">"{evidence}"</div>
      )}
    </div>
  )
}
