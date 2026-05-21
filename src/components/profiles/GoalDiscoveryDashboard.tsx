// Goal Discovery Dashboard — graphical, professional, layman-friendly.
// Equivalent in spirit to the V10 CompositesDashboard but for the
// intermediate stage after Goal Discovery has been processed.
//
// Renders: persona portrait card, summary strip, signal heatmap, active
// signals with plain-English watch-fors, money-scripts donut, goal-mix
// chart, partner divergence, captured goals, life context, bridge
// sentence, action recommendations, full export row.

import { useState } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from '../../types'
import type {
  GoalDiscoveryState,
  V10QuizState,
  SignalId,
  PersonaId,
  MoneyScriptId,
} from '../../types/psychometric'
import { storage } from '../../lib/storage'
import { downloadV10Json } from '../../lib/exporters/v10Json'
import { exportReport, FORMATS, type ExportFormat } from '../../lib/exporters'
import { GD_GOAL_TYPES, GD_SCENE_TAGS } from '../../lib/data/goalDiscovery'
import { PERSONAS } from '../../lib/data/personas'
import { BehaviouralActions } from './BehaviouralActions'

interface Props {
  gdState: GoalDiscoveryState | null
  v10State: V10QuizState | null
  userProfile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
}

// ─── Persona portraits + layman takeaways ───────────────────────────────

const PERSONA_ICON: Record<PersonaId, string> = {
  P1: '🏛️', P2: '🏢', P3: '💼', P4: '🩺', P5: '📈',
  P6: '🪙', P7: '✈️', P8: '🕊️', P9: '👫',
}

const PERSONA_TAKEAWAY: Record<PersonaId, string> = {
  P1: 'Stable inflation-indexed income gives you a floor most retirees don\'t have. Use it — don\'t copy peers who need a high-equity plan.',
  P2: 'Most of your wealth is in your firm and property. Plan the cash-flow story before you plan the asset story.',
  P3: 'Sophisticated portfolio access + adviser support is your edge. Lean on it; don\'t reinvent the wheel.',
  P4: 'Late start, but high earning years remaining. Aggressive saving + index simplicity catches you up fastest.',
  P5: 'Strong knowledge + appetite, but concentration is your biggest risk. Build the floor before topping up the growth engine.',
  P6: 'Discipline is your superpower; inflation is your hidden enemy. A small equity tilt buys decades of purchasing power.',
  P7: 'Cross-jurisdiction planning matters: RNOR transition, FATCA / FBAR, currency hedge. Specialist advice pays for itself.',
  P8: 'Lifetime-income planning is more important than maximum growth. Annuity-laddering + SCSS + good insurance form your base.',
  P9: 'No legacy pressure frees you to maximise experiences and FIRE-style flexibility. Spend on time, not stuff.',
}

// ─── Signal explanations for laymen ─────────────────────────────────────

const SIGNAL_PLAIN: Record<SignalId, { meaning: string; watch: string }> = {
  money_script_avoidance:    { meaning: 'You see money as morally suspect.',                            watch: 'May under-invest or leave cash in low-yield accounts.' },
  money_script_worship:      { meaning: 'You believe more money will solve more problems.',            watch: 'Risk of overspending and chasing high-return promises.' },
  money_script_status:       { meaning: 'You link self-worth to net worth or visible consumption.',    watch: 'Lifestyle creep can erode the savings rate.' },
  money_script_vigilance:    { meaning: 'You instinctively save and prepare.',                          watch: 'Healthy in moderation; extreme = under-invested in growth.' },
  time_orientation_present:  { meaning: 'You weight today over the long-term future.',                 watch: 'Hard to stay committed to 15+ year SIPs without automation.' },
  locus_of_control_internal: { meaning: 'You believe your choices, not luck, drive outcomes.',         watch: 'Generally protective — supports disciplined planning.' },
  self_efficacy:             { meaning: 'You trust your own ability to manage money.',                  watch: 'Pair with humility checks for big decisions.' },
  family_obligation_weight:  { meaning: 'You expect to support parents / siblings / children.',         watch: 'Build a parallel buffer; don\'t under-budget for your own retirement.' },
  protection_to_aspiration:  { meaning: 'Your goals lean toward growth vs preservation (or vice-versa).', watch: 'Imbalance suggests a one-sided plan — diversify goal types.' },
  financial_anxiety_marker:  { meaning: 'Current life events are creating money stress.',              watch: 'Slow major decisions — anxiety + finance is a bad combination.' },
  herding_susceptibility:    { meaning: 'You\'re influenced by friends / family / WhatsApp tips.',     watch: 'Filter every tip through an independent-research rule.' },
  overconfidence_marker:     { meaning: 'You feel certain you can beat the market.',                    watch: 'Stress-test assumptions — most overconfident investors underperform.' },
}

const SIGNAL_LABEL: Record<SignalId, string> = {
  money_script_avoidance:    'Money Avoidance',
  money_script_worship:      'Money Worship',
  money_script_status:       'Money Status',
  money_script_vigilance:    'Money Vigilance',
  time_orientation_present:  'Present-bias',
  locus_of_control_internal: 'Internal Locus',
  self_efficacy:             'Self-Efficacy',
  family_obligation_weight:  'Family Obligation',
  protection_to_aspiration:  'Aspiration ↔ Protection',
  financial_anxiety_marker:  'Financial Anxiety',
  herding_susceptibility:    'Herd-Susceptibility',
  overconfidence_marker:     'Overconfidence',
}

// ─── Money scripts ──────────────────────────────────────────────────────

const SCRIPT_META: Record<MoneyScriptId, { label: string; plain: string; color: string }> = {
  avoidance: { label: 'Avoidance', plain: 'Money makes you uncomfortable.',          color: '#dc2626' },
  worship:   { label: 'Worship',   plain: 'Money is the answer to life\'s problems.', color: '#f59e0b' },
  status:    { label: 'Status',    plain: 'Money signals who you are.',               color: '#a855f7' },
  vigilance: { label: 'Vigilance', plain: 'Money should be saved and protected.',     color: '#059669' },
}

const CONFIDENCE_TONE = {
  high:         { fg: '#3730a3', bg: '#eef2ff', border: '#c7d2fe', bars: 3 },
  medium:       { fg: '#92400e', bg: '#fffbeb', border: '#fde68a', bars: 2 },
  low:          { fg: '#475569', bg: '#f1f5f9', border: '#cbd5e1', bars: 1 },
  unclassified: { fg: '#475569', bg: '#f1f5f9', border: '#cbd5e1', bars: 0 },
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

// ─── Dashboard ──────────────────────────────────────────────────────────

export function GoalDiscoveryDashboard({
  gdState, v10State, userProfile, buckets, returnAssumptions,
}: Props) {
  const inference = gdState?.inference ?? null
  const composites = v10State?.composites ?? null
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [exportErr, setExportErr] = useState<string | null>(null)
  const [actionsOpen, setActionsOpen] = useState(true)

  if (!inference && !composites) return null

  const persona = inference?.persona.primary ?? null
  const personaDef = persona ? PERSONAS.find((p) => p.id === persona.id) : null
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
  const activeSignals = signalEntries.filter((s) => s.score != null && s.score >= 0.7)

  // Goal-type distribution
  const goalsByType = namedGoals.reduce<Record<string, number>>((acc, g) => {
    if (g.type) acc[g.type] = (acc[g.type] ?? 0) + 1
    return acc
  }, {})
  const topGoalTypes = Object.entries(goalsByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

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
    <section className="rounded-lg border-2 border-indigo-300 bg-gradient-to-br from-white via-white to-indigo-50/30 p-3 sm:p-4 space-y-3.5 ring-1 ring-indigo-100 shadow-sm">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="inline-block bg-indigo-100 text-indigo-800 text-[10px] font-bold tracking-[2px] uppercase px-2.5 py-0.5 rounded-full">
              Goal Discovery dashboard
            </span>
            <span className="text-[10px] text-slate-500 italic">
              what your answers say about how you think about money
            </span>
          </div>
        </div>
        {inference && (
          <span className="text-[10px] text-slate-500 tabular-nums">
            updated {new Date(inference.computedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        )}
      </header>

      {/* ── Persona portrait ──────────────────────────────────── */}
      {persona && personaDef ? (
        <section className="rounded-lg border-2 border-indigo-300 bg-white p-3 flex items-start gap-3">
          <div className="shrink-0 w-14 h-14 rounded-lg bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-3xl" aria-hidden="true">
            {PERSONA_ICON[persona.id]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[9px] font-bold tracking-[2px] uppercase text-indigo-700">You read as</span>
              <ConfidenceBars bars={confTone.bars} fg={confTone.fg} />
              <span className="text-[9px] uppercase tracking-wider" style={{ color: confTone.fg }}>{confidence}</span>
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-extralight tracking-tight text-slate-900 leading-snug">
              {persona.name}
            </h3>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{personaDef.description}</p>
            <p className="text-[11.5px] text-indigo-900 mt-1.5 leading-relaxed">
              <span className="font-bold">What this means for you:</span> {PERSONA_TAKEAWAY[persona.id]}
            </p>
            {inference?.persona.secondary && (
              <p className="text-[10px] text-slate-500 mt-1 italic">
                Secondary tilt: {inference.persona.secondary.name}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-3 text-center">
          <p className="text-[11px] text-slate-600 leading-snug">
            No clear persona inferred yet. Add scene tags and at least one goal in Goal Discovery, then click "Process & apply".
          </p>
        </section>
      )}

      {/* ── Summary strip ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-700 px-3 py-2 rounded-md bg-indigo-50/50 border border-indigo-100">
        <SummaryStat icon="📊" label="signals active" value={`${activeSignals.length}/${signalEntries.length}`} />
        <Dot />
        <SummaryStat icon="🎯" label="goals captured" value={String(namedGoals.length)} />
        <Dot />
        <SummaryStat icon="🏷️" label="life-context tags" value={String(tags.length)} />
        <Dot />
        <SummaryStat icon="⚖️" label="v10 risk profile" value={composites ? `${Math.round(composites.riskProfile)}/100` : 'pending'} />
      </div>

      {/* ── Signal heatmap (12 dots) ──────────────────────────── */}
      {signalEntries.length > 0 && (
        <section className="rounded-md border border-slate-200 p-2.5 bg-white">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Signal map</span>
            <span className="text-[10px] text-slate-500 italic">
              ● active (≥ 0.7) · ◐ partial · ○ latent
            </span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {signalEntries.map((s) => {
              const intensity =
                s.score == null ? 0
                : s.score >= 0.7 ? 1
                : s.score >= 0.4 ? 0.5
                : 0.15
              const fill = intensity === 1 ? '#4338ca' : intensity > 0 ? '#a5b4fc' : '#e2e8f0'
              return (
                <span
                  key={s.id}
                  title={`${SIGNAL_LABEL[s.id]} — ${s.score == null ? 'no signal' : s.score.toFixed(2)}`}
                  className="inline-block w-4 h-4 rounded-full border border-slate-200"
                  style={{ background: fill }}
                  aria-label={`${SIGNAL_LABEL[s.id]} score ${s.score?.toFixed(2) ?? 'n/a'}`}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* ── Active signals — what to watch ────────────────────── */}
      {activeSignals.length > 0 && (
        <section className="rounded-md border border-slate-200 p-2.5 bg-white">
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-1.5">
            Active signals — plain English
          </h4>
          <div className="space-y-2">
            {activeSignals.map((s) => {
              const plain = SIGNAL_PLAIN[s.id]
              return (
                <div key={s.id} className="border-l-2 border-indigo-300 pl-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11.5px] font-bold text-slate-900">● {SIGNAL_LABEL[s.id]}</span>
                    <span className="text-[10px] tabular-nums text-slate-500">{s.score?.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-snug mt-0.5">
                    <span className="font-semibold">{plain.meaning}</span> <span className="text-slate-600">{plain.watch}</span>
                  </p>
                  {s.evidence && (
                    <p className="text-[10px] text-slate-500 italic mt-0.5">From your answers: "{s.evidence}"</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Money scripts donut + goal mix bars (side-by-side) ─ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Money scripts */}
        {composites?.dominantMoneyScript && (
          <section className="rounded-md border border-slate-200 p-2.5 bg-white">
            <div className="flex items-baseline justify-between mb-1">
              <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Money scripts</h4>
              <span className="text-[10px] text-slate-500">
                ★ {SCRIPT_META[composites.dominantMoneyScript].label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ScriptDonut scripts={composites.moneyScripts} dominant={composites.dominantMoneyScript} />
              <ul className="text-[10.5px] space-y-1 flex-1 min-w-0">
                {(Object.keys(composites.moneyScripts) as MoneyScriptId[]).map((id) => {
                  const meta = SCRIPT_META[id]
                  const isDominant = composites.dominantMoneyScript === id
                  return (
                    <li key={id} className="flex items-baseline gap-1.5">
                      <span aria-hidden="true" className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: meta.color }} />
                      <span className={isDominant ? 'font-bold text-slate-900' : 'text-slate-700'}>
                        {isDominant && '★ '}{meta.label}
                      </span>
                      <span className="text-slate-400 tabular-nums">{Math.round(composites.moneyScripts[id])}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
            <p className="text-[10.5px] text-slate-600 italic mt-1.5 leading-snug border-t border-slate-100 pt-1.5">
              "{SCRIPT_META[composites.dominantMoneyScript].plain}"
            </p>
          </section>
        )}

        {/* Goal mix */}
        {topGoalTypes.length > 0 && (
          <section className="rounded-md border border-slate-200 p-2.5 bg-white">
            <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-1.5">
              Goal mix
            </h4>
            <div className="space-y-1.5">
              {topGoalTypes.map(([typeId, count]) => {
                const label = GD_GOAL_TYPES.find((t) => t.value === typeId)?.label ?? typeId
                const maxCount = topGoalTypes[0][1]
                const pct = (count / maxCount) * 100
                return (
                  <div key={typeId}>
                    <div className="flex items-baseline justify-between text-[10.5px]">
                      <span className="text-slate-700 truncate">{label}</span>
                      <span className="tabular-nums text-slate-500">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[10.5px] text-slate-500 italic mt-1.5 leading-snug">
              The mix tells the engine which buckets to weight: retirement → B3/B4; education → B2; lifestyle → B1.
            </p>
          </section>
        )}
      </div>

      {/* ── Partner alignment ────────────────────────────────── */}
      {inference?.partnerDivergence && (
        <section
          className={`rounded-md border-2 p-2.5 ${
            inference.partnerDivergence.diverged ? 'border-rose-200 bg-rose-50/60' : 'border-emerald-200 bg-emerald-50/60'
          }`}
        >
          <div className={`text-[10px] font-bold tracking-[2px] uppercase ${
            inference.partnerDivergence.diverged ? 'text-rose-700' : 'text-emerald-700'
          }`}>
            Partner alignment {inference.partnerDivergence.diverged ? '· divergent' : '· aligned'}
          </div>
          {inference.partnerDivergence.diverged ? (
            <p className="text-[11.5px] text-slate-700 mt-1 leading-snug">
              <span className="font-bold">You'd drop "{inference.partnerDivergence.userPick}"</span> first.
              You think your partner would drop <span className="font-bold">"{inference.partnerDivergence.partnerPick}"</span>.
              v10 flags this as the most diagnostic question in the flow — worth a conversation before the plan locks in.
            </p>
          ) : (
            <p className="text-[11.5px] text-slate-700 mt-1 leading-snug">
              You and your partner would both drop <span className="font-bold">"{inference.partnerDivergence.userPick}"</span> first — your priorities are aligned.
            </p>
          )}
        </section>
      )}

      {/* ── Goals + life context (compact two-column) ────────── */}
      {(namedGoals.length > 0 || tags.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
          {namedGoals.length > 0 && (
            <section className="rounded-md border border-slate-200 p-2.5 bg-white">
              <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-1.5">
                Your goals
              </h4>
              <ul className="space-y-0.5">
                {namedGoals.map((g, i) => (
                  <li key={i} className="flex items-baseline gap-2 text-[11px]">
                    <span className="text-slate-400 tabular-nums w-5 shrink-0">{i + 1}.</span>
                    <span className="text-slate-900 truncate flex-1">{g.name}</span>
                    {g.priority && (
                      <span className={`text-[9px] font-bold uppercase tracking-wide shrink-0 ${
                        g.priority === 'must' ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        {g.priority}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {tags.length > 0 && (
            <section className="rounded-md border border-slate-200 p-2.5 bg-white">
              <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-1.5">
                Life context
              </h4>
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => {
                  const opt = GD_SCENE_TAGS.find((o) => o.value === t)
                  return (
                    <span key={t} className="text-[10.5px] text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full">
                      {opt?.icon && <span className="mr-0.5">{opt.icon}</span>}
                      {opt?.label ?? t}
                    </span>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Bridge sentence ───────────────────────────────────── */}
      {inference?.bridgeSentence && (
        <blockquote className="text-[11.5px] text-slate-700 italic leading-relaxed border-l-4 border-indigo-400 bg-indigo-50/40 pl-2.5 py-1.5 pr-2 rounded-r">
          {inference.bridgeSentence}
        </blockquote>
      )}

      {/* ── Action recommendations (collapsible) ─────────────── */}
      <section className="rounded-md border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setActionsOpen((v) => !v)}
          className="w-full flex items-center justify-between p-2.5 text-left hover:bg-slate-50 transition-colors"
          aria-expanded={actionsOpen}
        >
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Action recommendations</h4>
          <span className="text-slate-500 text-xs" aria-hidden="true">{actionsOpen ? '−' : '+'}</span>
        </button>
        {actionsOpen && (
          <div className="px-2.5 pb-2.5">
            <BehaviouralActions />
          </div>
        )}
      </section>

      {/* ── Download row ─────────────────────────────────────── */}
      <section className="rounded-md border-2 border-indigo-200 bg-indigo-50/30 p-2.5">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1.5">
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-indigo-700">Download report</h4>
          <span className="text-[10px] text-slate-500 italic">
            Same envelope as the v10 + Risk dashboards. For advisor handoff or archiving.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
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
        {exportErr && <div className="mt-2 text-[11px] text-rose-700">{exportErr}</div>}
      </section>
    </section>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────

function SummaryStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span aria-hidden="true">{icon}</span>
      <span className="font-bold text-slate-900 tabular-nums">{value}</span>
      <span className="text-slate-500">{label}</span>
    </span>
  )
}

function Dot() {
  return <span className="text-slate-300" aria-hidden="true">·</span>
}

function ConfidenceBars({ bars, fg }: { bars: number; fg: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-1 h-2.5 rounded-sm"
          style={{ background: i < bars ? fg : '#e2e8f0' }}
        />
      ))}
    </span>
  )
}

function ScriptDonut({
  scripts, dominant,
}: { scripts: Record<MoneyScriptId, number>; dominant: MoneyScriptId | null }) {
  const total = (Object.values(scripts) as number[]).reduce((s, v) => s + v, 0) || 1
  const cx = 50, cy = 50, R = 42, r = 26
  let angle = -90
  function slicePath(fraction: number): string {
    if (fraction <= 0) return ''
    const start = angle
    const sweep = fraction * 360
    const end = start + sweep
    angle = end
    const a1 = (start * Math.PI) / 180
    const a2 = (end * Math.PI) / 180
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1)
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2)
    const x3 = cx + r * Math.cos(a2), y3 = cy + r * Math.sin(a2)
    const x4 = cx + r * Math.cos(a1), y4 = cy + r * Math.sin(a1)
    const largeArc = sweep > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4} Z`
  }
  const order: MoneyScriptId[] = ['avoidance', 'worship', 'status', 'vigilance']
  const slices = order.map((id) => ({
    d: slicePath(scripts[id] / total),
    color: SCRIPT_META[id].color,
    isDominant: id === dominant,
  }))
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0" aria-label="Money script distribution">
      {slices.map((s, i) => (
        <path
          key={i}
          d={s.d}
          fill={s.color}
          stroke="white"
          strokeWidth={s.isDominant ? 2 : 1}
          opacity={s.isDominant ? 1 : 0.75}
        />
      ))}
      {dominant && (
        <text x={cx} y={cy + 3} textAnchor="middle" className="fill-slate-700" style={{ fontSize: 10, fontWeight: 700 }}>
          ★
        </text>
      )}
    </svg>
  )
}
