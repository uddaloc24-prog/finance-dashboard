// goalsFromGd — projects the free-form Goal Discovery answers (Profile
// tab, block-1) into the engine's structured RawGoal[]. Merges with the
// legacy manual Goal store so the engine sees a single goal universe.
//
// Memo reference: §3 (RawGoal contract) + §7 (gd-projection source tag).

import type { GoalDiscoveryState } from '../../types/psychometric'
import type { Goal } from '../../types/v2'
import type { RawGoal, GoalKind, GoalInflationCategory, GoalPriority } from '../../types/orchestration'

interface GdGoalEntry {
  name?: string
  type?: string
  amount?: string
  horizon?: string
  priority?: string
}

/** Read goal-pile from GD block-1, normalise into RawGoal[]. */
export function goalsFromGd(gd: GoalDiscoveryState | null | undefined, now: Date = new Date()): RawGoal[] {
  if (!gd) return []
  const raw = gd.answers?.['block-1']?.['goals']
  if (!Array.isArray(raw)) return []
  const thisYear = now.getFullYear()

  const out: RawGoal[] = []
  for (let i = 0; i < raw.length; i++) {
    const e = raw[i] as unknown as GdGoalEntry
    if (!e || typeof e !== 'object') continue
    const name = (e.name ?? '').trim()
    if (!name) continue
    const amount = parseAmount(e.amount)
    if (amount <= 0) continue
    const yearsOut = parseHorizon(e.horizon, thisYear)
    out.push({
      id: `gd-${slug(name)}-${i}`,
      label: name,
      kind: parseKind(e.type),
      amount,
      startYear: thisYear + yearsOut,
      priority: parsePriority(e.priority),
      inflationCategory: parseCategory(e.type, name),
      source: 'gd-projection',
    })
  }
  return out
}

/** Convert legacy `Goal[]` (v2 store) into RawGoal[] tagged `source: 'manual'`. */
export function goalsFromManual(goals: Goal[]): RawGoal[] {
  return goals.map((g) => ({
    id: g.id,
    label: g.label,
    kind: g.kind as GoalKind,
    amount: g.amount,
    startYear: g.startYear,
    endYear: g.endYear,
    priority: g.priority as GoalPriority,
    inflationCategory: (g.inflationCategory ?? 'general') as GoalInflationCategory,
    source: 'manual',
  }))
}

/** Merge manual + GD goals, deduplicating by label (case-insensitive). When
 *  both stores carry the same label, the manual entry wins (user edited it). */
export function mergeGoals(manual: RawGoal[], gd: RawGoal[]): RawGoal[] {
  const seen = new Set<string>(manual.map((g) => g.label.toLowerCase()))
  const extras = gd.filter((g) => !seen.has(g.label.toLowerCase()))
  return [...manual, ...extras]
}

// ─── Parsers ───────────────────────────────────────────────────────────

/** "₹50L", "1.5 Cr", "50,00,000", "75000" → number in rupees. */
export function parseAmount(s: string | undefined | null): number {
  if (!s) return 0
  const cleaned = s.replace(/[₹,\s]/g, '').toLowerCase()
  const num = parseFloat(cleaned)
  if (isNaN(num) || num <= 0) return 0
  if (/cr/.test(cleaned)) return Math.round(num * 1_00_00_000)
  if (/l(ac|akh)?\b|^[\d.]+l$/.test(cleaned)) return Math.round(num * 1_00_000)
  if (/k\b|^[\d.]+k$/.test(cleaned)) return Math.round(num * 1000)
  return Math.round(num)
}

/** "5 years", "5y", "2030", "by 2031" → years from `thisYear`. Defaults to 5. */
export function parseHorizon(s: string | undefined | null, thisYear: number): number {
  if (!s) return 5
  const cleaned = s.toString().trim().toLowerCase()
  const yearMatch = cleaned.match(/(20\d{2})/)
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10)
    return Math.max(0, y - thisYear)
  }
  const yMatch = cleaned.match(/(\d+)\s*(y|yr|year)/)
  if (yMatch) return Math.max(0, parseInt(yMatch[1], 10))
  const m = cleaned.match(/(\d+)/)
  if (m) return Math.max(0, parseInt(m[1], 10))
  return 5
}

export function parseKind(type: string | undefined | null): GoalKind {
  const t = (type ?? '').toLowerCase()
  if (/income|retire|pension|swp/.test(t)) return 'income'
  if (/legacy|inherit|bequest|estate/.test(t)) return 'legacy'
  if (/corpus|wealth|grow|build/.test(t)) return 'corpus-build'
  return 'event'
}

export function parseCategory(type: string | undefined | null, name: string): GoalInflationCategory {
  const blob = `${type ?? ''} ${name}`.toLowerCase()
  if (/health|medical|hospital|surgery|treatment/.test(blob)) return 'healthcare'
  if (/educat|school|college|university|tuition|degree/.test(blob)) return 'education'
  return 'general'
}

export function parsePriority(p: string | undefined | null): GoalPriority {
  const v = (p ?? '').toLowerCase()
  if (/must|essential|critical|need|priority/.test(v)) return 'must-have'
  return 'nice-to-have'
}

/** URL-safe slug for goal ids (kept stable so re-projections don't shuffle ids). */
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)
}
