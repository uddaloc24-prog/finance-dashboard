// Rule-driven "what to do about it" cards for the Insights tab.
// Reads inference + composites from storage and produces a small list of
// actionable insights keyed to detected signals, persona, and composite
// scores. Returns null if nothing useful can be said.

import { useMemo } from 'react'
import type {
  CompositesResult,
  PartnerDivergence,
  PersonaInference,
  SignalId,
  SignalMap,
} from '../../types/psychometric'
import { storage } from '../../lib/storage'
import { SIGNAL_ACTIVATION_THRESHOLD } from '../../lib/data/personas'

interface Action {
  id: string
  tone: 'rose' | 'amber' | 'emerald' | 'indigo'
  title: string
  body: string
}

const TONE_PALETTE: Record<Action['tone'], { border: string; bg: string; fg: string; chip: string }> = {
  rose:    { border: 'border-rose-200',    bg: 'bg-rose-50/60',    fg: 'text-rose-700',    chip: 'bg-rose-100 text-rose-700' },
  amber:   { border: 'border-amber-200',   bg: 'bg-amber-50/60',   fg: 'text-amber-700',   chip: 'bg-amber-100 text-amber-700' },
  emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50/60', fg: 'text-emerald-700', chip: 'bg-emerald-100 text-emerald-700' },
  indigo:  { border: 'border-indigo-200',  bg: 'bg-indigo-50/60',  fg: 'text-indigo-700',  chip: 'bg-indigo-100 text-indigo-700' },
}

function activeSignalSet(signals: SignalMap): Set<SignalId> {
  const out = new Set<SignalId>()
  for (const id of Object.keys(signals) as SignalId[]) {
    const sig = signals[id]
    if (sig?.score != null && sig.score >= SIGNAL_ACTIVATION_THRESHOLD) out.add(id)
  }
  return out
}

function buildActions(
  persona: PersonaInference | null,
  signals: SignalMap | null,
  composites: CompositesResult | null,
  divergence: PartnerDivergence | null,
): Action[] {
  const out: Action[] = []
  const active = signals ? activeSignalSet(signals) : new Set<SignalId>()

  // ── Composite-driven actions (only fire when v10 was completed) ───────
  if (composites) {
    if (composites.scamVulnerability >= 60) {
      out.push({
        id: 'scam',
        tone: 'rose',
        title: 'Verify every new investment via SEBI',
        body: 'Your scam-vulnerability composite is high. Confirm any new scheme or app at sebi.gov.in/Intermediaries before parting with money. Refuse OTPs / "verification fees" / urgent calls on principle.',
      })
    }
    if (composites.biasIndex >= 55) {
      out.push({
        id: 'bias',
        tone: 'amber',
        title: 'Slow major decisions down',
        body: 'Your composite bias index is elevated. For any decision above ₹5 L, write the rationale, sleep on it 48 hours, then reread it before acting. A SEBI-registered advisor sanity-check is worth the fee.',
      })
    }
    if (composites.planningReadiness < 40) {
      out.push({
        id: 'planning',
        tone: 'amber',
        title: 'Build a monthly review habit',
        body: 'Planning readiness is low. Block 30 minutes on the 1st of each month to skim balances, EMI status, and one upcoming goal. The habit, not the genius, is what compounds.',
      })
    }
  }

  // ── Signal-driven actions ─────────────────────────────────────────────
  if (active.has('overconfidence_marker')) {
    out.push({
      id: 'overconfidence',
      tone: 'amber',
      title: 'Stress-test the equity allocation',
      body: 'Active overconfidence markers. Run the Monte Carlo at a 40% bear scenario on B3/B4 before committing to your current equity tilt; verify you would still meet the floor.',
    })
  }
  if (active.has('herding_susceptibility')) {
    out.push({
      id: 'herd',
      tone: 'amber',
      title: 'Filter WhatsApp / family tips',
      body: 'Herd-susceptibility detected. Set a personal rule: nothing from a forwarded message gets bought until you have read the SID, checked SEBI registration, and one independent source.',
    })
  }
  if (active.has('time_orientation_present')) {
    out.push({
      id: 'present',
      tone: 'indigo',
      title: 'Pre-commit to the long horizon',
      body: 'You lean toward present-bias. Automate SIPs / SWP slots on the 1st of the month so the long-horizon path runs without re-decision. Reduce the number of times you "choose" to invest.',
    })
  }
  if (active.has('money_script_avoidance')) {
    out.push({
      id: 'avoidance',
      tone: 'indigo',
      title: 'Re-frame money as instrument, not identity',
      body: 'Money-avoidance script is active. The next time you skip a review or postpone a portfolio decision, name what you are avoiding aloud — then schedule a 15-minute slot for it.',
    })
  }
  if (active.has('money_script_status')) {
    out.push({
      id: 'status',
      tone: 'indigo',
      title: 'Audit status-purchases against goals',
      body: 'Status script is active. For every lifestyle purchase above ₹2 L this year, write which Goal-Discovery goal it advances. If none, hold for 30 days before deciding.',
    })
  }

  // ── Partner divergence ───────────────────────────────────────────────
  if (divergence?.diverged) {
    out.push({
      id: 'partner',
      tone: 'rose',
      title: 'Have the drop-goal conversation',
      body: `You would drop "${divergence.userPick}" first; you think your partner would drop "${divergence.partnerPick}". Misalignment on the lowest-priority goal often hides misalignment on the top ones — open the conversation before the plan locks in.`,
    })
  }

  // ── Persona-driven sentinel ──────────────────────────────────────────
  if (persona?.primary && persona.confidence !== 'unclassified') {
    // P6 Frugal Saver — equity-under-allocation is a known risk
    if (persona.primary.id === 'P6') {
      out.push({
        id: 'p6-equity',
        tone: 'emerald',
        title: 'Consider lifting B3 / B4 by 5–10%',
        body: 'You score as the Frugal Saver — Cash & Gold persona, which tends to under-allocate to growth assets. Even a modest tilt into Balanced Advantage and a Nifty 50 index fund can lift the 10-year corpus by ~30%.',
      })
    }
    // P5 DIY Equity Bull — concentration risk
    if (persona.primary.id === 'P5') {
      out.push({
        id: 'p5-concentration',
        tone: 'amber',
        title: 'Diversify off the equity-only tilt',
        body: 'You score as the DIY Equity Bull persona. Build a B2 floor (SCSS + Short-Duration MF) that covers 5 years of withdrawals before topping up B4 further. Sequence-of-returns risk is what hurts retirees most.',
      })
    }
  }

  return out
}

export function BehaviouralActions() {
  const gdState = useMemo(() => storage.getGoalDiscovery(), [])
  const v10State = useMemo(() => storage.getV10QuizState(), [])
  const inference = gdState?.inference ?? null
  const composites = v10State?.composites ?? null

  const actions = useMemo(
    () => buildActions(
      inference?.persona ?? null,
      inference?.signals ?? null,
      composites,
      inference?.partnerDivergence ?? null,
    ),
    [inference, composites],
  )

  if (actions.length === 0) {
    return (
      <div className="rounded-md border-2 border-dashed border-slate-200 bg-slate-50/40 p-4 text-center">
        <p className="text-xs text-slate-500 leading-snug">
          Complete Goal Discovery and the v10 psychometric assessment on the Profile tab to unlock
          behavioural action insights here.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {actions.map((a) => {
        const t = TONE_PALETTE[a.tone]
        return (
          <article
            key={a.id}
            className={`rounded-lg border-2 ${t.border} ${t.bg} p-3`}
          >
            <div className={`text-[9px] font-bold tracking-[2px] uppercase ${t.fg}`}>
              Action · {a.tone === 'rose' ? 'High priority' : a.tone === 'amber' ? 'Heads up' : a.tone === 'emerald' ? 'Opportunity' : 'Practice'}
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-1 tracking-tight">{a.title}</h4>
            <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">{a.body}</p>
          </article>
        )
      })}
    </div>
  )
}
