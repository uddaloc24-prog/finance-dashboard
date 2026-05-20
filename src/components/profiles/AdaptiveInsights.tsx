// "Adaptive Insights" surface — renders the persona, signals, drop-goal
// divergence, and dominant money script in the Profile tab so the user
// sees their adaptive profile without re-opening the v10 quiz. Pure
// presentational; reads from GoalDiscoveryState.inference and the v10
// CompositesResult.

import type { GoalDiscoveryState, V10QuizState, SignalId } from '../../types/psychometric'
import { downloadV10Json } from '../../lib/exporters/v10Json'

interface Props {
  gdState: GoalDiscoveryState | null
  v10State: V10QuizState | null
}

const SIGNAL_LABELS: Record<SignalId, string> = {
  money_script_avoidance:    'Money avoidance',
  money_script_worship:      'Money worship',
  money_script_status:       'Money status',
  money_script_vigilance:    'Money vigilance',
  time_orientation_present:  'Present-biased',
  locus_of_control_internal: 'Internal locus of control',
  self_efficacy:             'High self-efficacy',
  family_obligation_weight:  'Family obligation',
  protection_to_aspiration:  'Aspiration vs protection',
  financial_anxiety_marker:  'Financial anxiety',
  herding_susceptibility:    'Herd-susceptible',
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

export function AdaptiveInsights({ gdState, v10State }: Props) {
  const inference = gdState?.inference ?? null
  const composites = v10State?.composites ?? null
  if (!inference && !composites) return null

  const persona = inference?.persona.primary ?? null
  const confidence = inference?.persona.confidence ?? 'unclassified'
  const confTone = CONFIDENCE_TONE[confidence]
  const activeSignals = inference
    ? (Object.entries(inference.signals)
        .filter(([, sig]) => sig.score != null && sig.score >= 0.7)
        .map(([id]) => id as SignalId))
    : []

  return (
    <section className="mt-3 rounded-lg border-2 border-indigo-200 bg-indigo-50/30 p-3 space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-bold tracking-[3px] uppercase text-indigo-700">
          Adaptive insights
        </span>
        <span className="h-px flex-1 bg-indigo-300/40" aria-hidden="true" />
        {inference && (
          <span className="text-[9px] text-slate-500 italic tabular-nums">
            updated {new Date(inference.computedAt).toLocaleDateString()}
          </span>
        )}
        <button
          type="button"
          onClick={() => downloadV10Json(gdState, v10State)}
          className="text-[10px] font-bold tracking-wider uppercase text-indigo-700 hover:text-indigo-900 px-1.5 py-0.5 rounded hover:bg-indigo-100/60 transition-colors"
          title="Download a structured JSON for advisor handoff"
        >
          ⬇ JSON
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Persona */}
        {persona && (
          <div className="rounded-md border border-indigo-200 bg-white p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[9px] font-bold tracking-[2px] uppercase text-indigo-700">
                Inferred persona
              </span>
              <span
                className="text-[9px] font-bold tracking-[1.5px] uppercase px-1.5 py-0.5 rounded border"
                style={{ color: confTone.fg, background: confTone.bg, borderColor: confTone.border }}
              >
                {confidence} conf.
              </span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 mt-1 tracking-tight">{persona.name}</h4>
            {persona.evidence.length > 0 && (
              <div className="text-[10px] text-slate-500 mt-1 leading-snug truncate">
                Evidence: {persona.evidence.slice(0, 3).join(' · ')}
              </div>
            )}
          </div>
        )}

        {/* Dominant money script (from v10 composites if any) */}
        {composites?.dominantMoneyScript && (
          <div className="rounded-md border border-indigo-200 bg-white p-3">
            <div className="text-[9px] font-bold tracking-[2px] uppercase text-indigo-700">
              Dominant money script
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 mt-1 tracking-tight">
              {SCRIPT_LABELS[composites.dominantMoneyScript]}
            </h4>
            <div className="text-[10px] text-slate-500 mt-1 tabular-nums">
              avoidance {Math.round(composites.moneyScripts.avoidance)} ·{' '}
              worship {Math.round(composites.moneyScripts.worship)} ·{' '}
              status {Math.round(composites.moneyScripts.status)} ·{' '}
              vigilance {Math.round(composites.moneyScripts.vigilance)}
            </div>
          </div>
        )}
      </div>

      {/* Active signals */}
      {activeSignals.length > 0 && (
        <div>
          <div className="text-[9px] font-bold tracking-[2px] uppercase text-indigo-700 mb-1.5">
            Active behavioural signals
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeSignals.map((id) => (
              <span
                key={id}
                className="text-[10px] font-medium text-indigo-900 bg-white border border-indigo-200 px-2 py-0.5 rounded-full"
                title={`Signal ${id} active (score ≥ 0.7)`}
              >
                {SIGNAL_LABELS[id]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Drop-goal divergence */}
      {inference?.partnerDivergence && (
        <div
          className={`rounded-md border-2 p-2.5 ${
            inference.partnerDivergence.diverged
              ? 'border-rose-200 bg-rose-50/60'
              : 'border-emerald-200 bg-emerald-50/60'
          }`}
        >
          <div
            className={`text-[9px] font-bold tracking-[2px] uppercase ${
              inference.partnerDivergence.diverged ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            Partner alignment {inference.partnerDivergence.diverged ? '· divergence' : '· aligned'}
          </div>
          {inference.partnerDivergence.diverged ? (
            <p className="text-[11px] text-slate-700 mt-1 leading-snug">
              You would drop <strong>"{inference.partnerDivergence.userPick}"</strong> · You think your partner would drop{' '}
              <strong>"{inference.partnerDivergence.partnerPick}"</strong>. Worth an open conversation before the plan locks in.
            </p>
          ) : (
            <p className="text-[11px] text-slate-700 mt-1 leading-snug">
              You and your partner would both drop <strong>"{inference.partnerDivergence.userPick}"</strong> first — your priorities are aligned on this question.
            </p>
          )}
        </div>
      )}

      {/* Bridge sentence */}
      {inference?.bridgeSentence && (
        <p className="text-[11px] text-slate-600 italic leading-snug border-l-2 border-indigo-300 pl-2.5">
          {inference.bridgeSentence}
        </p>
      )}
    </section>
  )
}
