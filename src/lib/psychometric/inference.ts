// v10 adaptive inference — persona detection + behavioural-signal extraction
// over a completed (or in-progress) GoalDiscoveryState. Pure functions.

import type {
  GoalDiscoveryState,
  InferenceResult,
  PersonaConfidence,
  PersonaHit,
  PersonaInference,
  SignalHit,
  SignalId,
  SignalMap,
} from '../../types/psychometric'
import { PERSONAS } from '../data/personas'

// ─── helpers ────────────────────────────────────────────────────────────

interface GoalEntry { name: string; type: string; amount: string; horizon: string; priority: string }

function readGoals(gd: GoalDiscoveryState): GoalEntry[] {
  const raw = gd.answers['block-1']?.['goals']
  return Array.isArray(raw) && typeof raw[0] === 'object' ? (raw as unknown as GoalEntry[]) : []
}

function readTags(gd: GoalDiscoveryState): string[] {
  const t = gd.answers['block-0']?.['tags']
  return Array.isArray(t) ? (t as string[]) : []
}

function readText(gd: GoalDiscoveryState): string {
  const parts: string[] = []
  const b0notes = gd.answers['block-0']?.['notes']
  if (typeof b0notes === 'string') parts.push(b0notes)
  for (const key of ['q1Text','q2Text','q3Text'] as const) {
    const v = gd.answers['block-2']?.[key]
    if (typeof v === 'string') parts.push(v)
  }
  return parts.join(' \n ')
}

function readGoalNames(gd: GoalDiscoveryState): string {
  return readGoals(gd).map((g) => g.name).filter(Boolean).join(' ')
}

// ─── persona inference ──────────────────────────────────────────────────

export function inferPersona(gd: GoalDiscoveryState): PersonaInference {
  const text = readText(gd)
  const goalNames = readGoalNames(gd)
  const combined = `${text} ${goalNames}`
  const goals = readGoals(gd)
  const tags = readTags(gd)

  const goalsByType = goals.reduce<Record<string, number>>((acc, g) => {
    if (g.type) acc[g.type] = (acc[g.type] ?? 0) + 1
    return acc
  }, {})

  // Block-5 partner involvement signal (used by P8 / P9 ad-hoc rules)
  const partnerInvolvement = (gd.answers['block-5']?.['applicable'] as string | undefined) ?? ''

  const hits: PersonaHit[] = PERSONAS.map((p) => {
    let score = 0
    const evidence: string[] = []

    // keyword regexes on the combined free text
    for (const re of p.keywords) {
      const m = combined.match(re)
      if (m) {
        score += 1
        evidence.push(m[0])
      }
    }

    // goal-type weights
    for (const [type, count] of Object.entries(goalsByType)) {
      const w = p.goalTypeWeights[type]
      if (w) {
        score += w * count
        evidence.push(`goal:${type}×${count}`)
      }
    }

    // scene-tag weights
    for (const t of tags) {
      const w = p.tagWeights[t]
      if (w) {
        score += w
        evidence.push(`tag:${t}`)
      }
    }

    // ad-hoc per-persona refinements
    if (p.id === 'P8' && partnerInvolvement === 'no') {
      score += 0.5
      evidence.push('partner:no/single')
    }
    if (p.id === 'P9') {
      const hasEducation = (goalsByType['education'] ?? 0) > 0
      if (!hasEducation && partnerInvolvement === 'yes') {
        score += 1
        evidence.push('childless+coupled')
      }
    }

    return { id: p.id, name: p.name, score, evidence }
  })

  const ranked = hits.filter((h) => h.score > 0).sort((a, b) => b.score - a.score)
  const primary = ranked[0] ?? null
  const secondary = ranked[1] && ranked[1].id !== primary?.id && ranked[1].score >= 1 ? ranked[1] : null

  const hi = primary?.score ?? 0
  const sec = secondary?.score ?? 0
  const margin = hi - sec

  let confidence: PersonaConfidence = 'unclassified'
  if (hi >= 1) {
    confidence = 'low'
    if (margin >= 1 && hi >= 1.5) confidence = 'medium'
    if (margin >= 2 && hi >= 2) confidence = 'high'
  }

  return { primary, secondary, confidence, all: ranked }
}

// ─── signal inference ──────────────────────────────────────────────────

const ALL_SIGNAL_IDS: SignalId[] = [
  'money_script_avoidance',
  'money_script_worship',
  'money_script_status',
  'money_script_vigilance',
  'time_orientation_present',
  'locus_of_control_internal',
  'self_efficacy',
  'family_obligation_weight',
  'protection_to_aspiration',
  'financial_anxiety_marker',
  'herding_susceptibility',
  'overconfidence_marker',
]

interface SignalRule {
  id: SignalId
  score: number                         // assigned if rule matches
  test: (ctx: SignalCtx) => string | null    // returns matched evidence, or null
}

interface SignalCtx {
  text: string
  textWithGoals: string
  tags: string[]
  goals: GoalEntry[]
  q2Start: string
}

function reMatch(re: RegExp, s: string): string | null {
  const m = s.match(re)
  return m ? m[0] : null
}

const SIGNAL_RULES: SignalRule[] = [
  {
    id: 'money_script_avoidance', score: 0.75,
    test: (c) => reMatch(/\b(greedy|corrupt|don['']t deserve|guilty|too much)\b/i, c.text),
  },
  {
    id: 'money_script_worship', score: 0.75,
    test: (c) => reMatch(/\b(more money|enough money|money would solve|money fixes|money brings)\b/i, c.text),
  },
  {
    id: 'money_script_status', score: 0.7,
    test: (c) => reMatch(/\b(status|prestige|signal|show|important to drive|impress)\b/i, c.textWithGoals),
  },
  {
    id: 'money_script_vigilance', score: 0.7,
    test: (c) => {
      const direct = reMatch(/\b(save|saving|frugal|careful|rainy day|don['']t spend|tight)\b/i, c.text)
      if (direct) return direct
      const hasLegacy = c.goals.some((g) => g.type === 'legacy')
      if (hasLegacy) {
        const m = reMatch(/\b(preserve|protect)\b/i, c.text)
        if (m) return m
      }
      return null
    },
  },
  {
    id: 'time_orientation_present', score: 0.7,
    test: (c) => {
      const m = reMatch(/\b(now|today|immediately|can['']t wait|right now)\b/i, c.text)
      if (m) return m
      if (c.q2Start === 'Travel') return 'block2.q2.start = Travel'
      return null
    },
  },
  {
    id: 'locus_of_control_internal', score: 0.7,
    test: (c) => reMatch(/\b(i can|i know|i manage|i handle|i'?m good at|i'?ve always)\b/i, c.text),
  },
  {
    id: 'self_efficacy', score: 0.7,
    test: (c) => reMatch(/\b(i can|i know|i manage|i handle|i'?m good at|i'?ve always)\b/i, c.text),
  },
  {
    id: 'family_obligation_weight', score: 0.7,
    test: (c) => {
      const m = reMatch(/\b(parent|in-laws|sibling|family obligation|support)\b/i, c.text)
      if (m) return m
      if (c.goals.some((g) => g.type === 'parent_care' || g.type === 'education')) return 'goal:parent/education'
      return null
    },
  },
  {
    id: 'financial_anxiety_marker', score: 0.7,
    test: (c) => {
      const anxietyTags = new Set(['bereavement','divorce','layoff','illness','business-event'])
      const hitTag = c.tags.find((t) => anxietyTags.has(t))
      if (hitTag) return `tag:${hitTag}`
      return reMatch(/\b(worry|worried|anxious|stress|scared|afraid|fear)\b/i, c.text)
    },
  },
  {
    id: 'herding_susceptibility', score: 0.7,
    test: (c) => reMatch(/\b(everyone|friend|colleague|whatsapp|told me|group|tip)\b/i, c.text),
  },
  // protection_to_aspiration and overconfidence_marker: placeholders in
  // v10 source — no inference rule defined yet.
]

export function inferSignals(gd: GoalDiscoveryState): SignalMap {
  const text = readText(gd)
  const ctx: SignalCtx = {
    text,
    textWithGoals: `${text} ${readGoalNames(gd)}`,
    tags: readTags(gd),
    goals: readGoals(gd),
    q2Start: (gd.answers['block-2']?.['q2Start'] as string | undefined) ?? '',
  }

  const out = ALL_SIGNAL_IDS.reduce<Record<SignalId, SignalHit>>((acc, id) => {
    acc[id] = { id, score: null, evidence: [] }
    return acc
  }, {} as Record<SignalId, SignalHit>)

  for (const rule of SIGNAL_RULES) {
    const ev = rule.test(ctx)
    if (ev) {
      out[rule.id] = { id: rule.id, score: rule.score, evidence: [ev] }
    }
  }
  return out
}

// ─── bridge sentence ────────────────────────────────────────────────────

const BRIDGE_TAIL = 'helps me understand HOW you think about money decisions — not what you own. About fifteen minutes.'

export function generateBridgeSentence(gd: GoalDiscoveryState): string {
  const q1 = (gd.answers['block-2']?.['q1Text'] as string | undefined)?.trim() ?? ''
  if (q1.length >= 30) {
    let snippet = q1
    if (snippet.length > 130) {
      snippet = snippet.slice(0, 130).replace(/[,;.]\s*\S*$/, '') + '…'
    }
    return `You told me earlier that '${snippet}'. The next set of questions ${BRIDGE_TAIL.replace('— not', '— not')} Some answers might surprise you.`
  }

  const goals = readGoals(gd).map((g) => g.name).filter(Boolean)
  if (goals.length > 0) {
    const list = goals.slice(0, 3).join(', ') + (goals.length > 3 ? '…' : '')
    return `You've named ${goals.length} goal${goals.length === 1 ? '' : 's'} — ${list}. The next set of questions ${BRIDGE_TAIL}`
  }

  return `The next set of questions ${BRIDGE_TAIL}`
}

// ─── top-level ─────────────────────────────────────────────────────────

export function runInference(gd: GoalDiscoveryState): InferenceResult {
  return {
    persona: inferPersona(gd),
    signals: inferSignals(gd),
    bridgeSentence: generateBridgeSentence(gd),
    computedAt: new Date().toISOString(),
  }
}
