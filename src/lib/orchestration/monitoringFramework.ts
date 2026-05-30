// monitoringFramework — emit the structured review plan a user must
// follow once the engine's strategy is in place.
//
// PDF reference (Goal-Based Investing §III): "→ Recommended Strategy →
// Allocation → Glide Path → Product Categories → Monitoring Framework."
//
// Sources of review items
// ───────────────────────
//   1. Strategy-cadence baseline   — one rebalance review per goal,
//      cadence keyed to the recommended strategy (e.g., LDI = yearly,
//      Dynamic = quarterly).
//   2. Glide-path step             — one yearly anniversary review per
//      goal with glideDown=true.
//   3. Product-specific            — SCSS 5-y renewal · FD ladder
//      annual rollover · PPF 15-y extension · BAF drift check.
//   4. Bias guardrails             — every guardrail from
//      preferences.bias.guardrails becomes a review item.
//   5. Age-keyed lifecycle         — 60 SCSS · 65 mid-retirement re-plan
//      · 70 annuity · 75 estate · 80 healthcare ramp.
//   6. Tax actions                 — annual FY-end LTCG harvest +
//      regime + 80TTB.
//
// All items are merged, deduplicated by id, sorted by (priority asc,
// cadence rank, id). The 10 nearest scheduled items also surface in
// `upcoming` for the dashboard.
//
// Pure function · deterministic. Same input → identical output.

import type {
  EngineInput, FittedGoal, StrategySelection, ProductPlan,
  ReviewItem, ReviewCadence, ReviewResponsibility,
  MonitoringFramework, ScheduledReview,
} from '../../types/orchestration'
import { hashInput } from './hash'
import { strategyById } from './strategyCatalogue'

// ─── Strategy → cadence map ───────────────────────────────────────────

const STRATEGY_CADENCE: Record<string, {
  rebalance: ReviewCadence
  glideStep: ReviewCadence
}> = {
  lda:             { rebalance: 'yearly',      glideStep: 'yearly'      },
  bucket:          { rebalance: 'yearly',      glideStep: 'yearly'      },
  strategic:       { rebalance: 'half-yearly', glideStep: 'event-driven'},
  dynamic:         { rebalance: 'quarterly',   glideStep: 'event-driven'},
  glide:           { rebalance: 'half-yearly', glideStep: 'yearly'      },
  index:           { rebalance: 'yearly',      glideStep: 'event-driven'},
  'core-sat':      { rebalance: 'half-yearly', glideStep: 'event-driven'},
  'retire-income': { rebalance: 'quarterly',   glideStep: 'yearly'      },
  'tax-aware':     { rebalance: 'yearly',      glideStep: 'event-driven'},
  guardrail:       { rebalance: 'quarterly',   glideStep: 'event-driven'},
  fire:            { rebalance: 'yearly',      glideStep: 'event-driven'},
  education:       { rebalance: 'yearly',      glideStep: 'yearly'      },
}

const CADENCE_RANK: Record<ReviewCadence, number> = {
  monthly: 1, quarterly: 2, 'half-yearly': 3, yearly: 4, 'event-driven': 5,
}

// ─── Product-specific reviews ─────────────────────────────────────────

interface ProductReviewSpec {
  kind: ReviewItem['kind']
  cadence: ReviewCadence
  trigger: string
  action: string
  responsibility: ReviewResponsibility
  priority: ReviewItem['priority']
}

const PRODUCT_REVIEWS: Record<string, ProductReviewSpec> = {
  scss: {
    kind: 'product-check', cadence: 'event-driven',
    trigger: 'SCSS 5-year maturity approaching',
    action: 'Renew (new 5-y block) or roll into FD ladder + BAF',
    responsibility: 'user', priority: 2,
  },
  'fd-ladder': {
    kind: 'product-check', cadence: 'yearly',
    trigger: 'FD rung matures',
    action: 'Re-ladder at then-current senior-citizen rate',
    responsibility: 'user', priority: 3,
  },
  ppf: {
    kind: 'product-check', cadence: 'event-driven',
    trigger: '15-year PPF maturity',
    action: 'Extend in 5-y blocks (with / without contribution) or withdraw',
    responsibility: 'user', priority: 2,
  },
  'tax-free-bonds': {
    kind: 'product-check', cadence: 'half-yearly',
    trigger: 'Coupon-date check',
    action: 'Verify coupon credit; sweep idle balance into B1 liquid',
    responsibility: 'auto-debit', priority: 4,
  },
  baf: {
    kind: 'rebalance', cadence: 'half-yearly',
    trigger: 'Allocation drift > 10 % vs strategy target',
    action: 'Switch units to align (use STP for large drifts)',
    responsibility: 'user', priority: 3,
  },
  'index-fund': {
    kind: 'product-check', cadence: 'yearly',
    trigger: 'TER (expense ratio) review',
    action: 'Switch to a lower-cost index if TER > 0.3 % p.a.',
    responsibility: 'user', priority: 4,
  },
  'multi-cap': {
    kind: 'product-check', cadence: 'yearly',
    trigger: 'Active fund manager review',
    action: 'Compare 3-y alpha vs Nifty 500; switch if persistent underperformance',
    responsibility: 'user', priority: 4,
  },
}

// ─── Age-keyed lifecycle milestones ───────────────────────────────────

interface LifecycleSpec {
  ageAt: number
  title: string
  action: string
  detail: string
}

const LIFECYCLE: LifecycleSpec[] = [
  { ageAt: 60, title: 'SCSS eligibility',     action: 'Open SCSS up to ₹30 L cap', detail: 'Senior Citizen Savings Scheme becomes available — the cleanest B2 anchor for the next 5 years.' },
  { ageAt: 65, title: 'Mid-retirement re-plan', action: 'Re-run the engine with the post-retirement expense baseline', detail: 'Income needs typically reset 3-5 y into retirement; re-rank goals.' },
  { ageAt: 70, title: 'Annuity consideration', action: 'Evaluate part-corpus → immediate annuity for a longevity floor', detail: 'NPS annuity / LIC PMVVY / private immediate-annuity products.' },
  { ageAt: 75, title: 'Estate + will review',  action: 'Verify nominees on every account; refresh will; MWP-tag term plan', detail: 'Reduces probate friction and protects the spouse / dependents.' },
  { ageAt: 80, title: 'Healthcare ramp',       action: 'Top-up health cover; lift B1+B2 cushion to 2-3 y of expenses', detail: 'Healthcare inflation accelerates; build redundancy.' },
]

// ─── Main entry ───────────────────────────────────────────────────────

export function buildMonitoringFramework(
  input: EngineInput,
  fittedGoals: FittedGoal[],
  strategies: StrategySelection | undefined,
  productPlan: ProductPlan,
  now: Date = new Date(),
): MonitoringFramework {
  const items: ReviewItem[] = []

  // 1 + 2 — per-goal strategy rebalance + glide-step
  for (const fg of fittedGoals) {
    const goal = input.goals.find((g) => g.id === fg.goalId)
    if (!goal) continue
    const stratId = strategies?.byGoal.find((x) => x.goalId === fg.goalId)?.recommended
    const strategy = strategyById(stratId ?? '')
    const cadenceMap = stratId && STRATEGY_CADENCE[stratId]
      ? STRATEGY_CADENCE[stratId]
      : { rebalance: 'yearly' as ReviewCadence, glideStep: 'yearly' as ReviewCadence }

    items.push({
      id: `rebalance-${fg.goalId}`,
      kind: 'rebalance', cadence: cadenceMap.rebalance,
      title: `Rebalance — ${goal.label}`,
      detail: `Drift check vs ${strategy?.name ?? 'recommended strategy'} target buckets.`,
      trigger: `Allocation drift > 5 % vs strategy target on any bucket`,
      action: 'Switch units across buckets to restore the target split',
      responsibility: 'user', priority: 2, goalId: fg.goalId,
      nextDate: nextDateFor(cadenceMap.rebalance, now),
    })

    if (fg.glidePath.length > 1) {
      items.push({
        id: `glide-${fg.goalId}`,
        kind: 'glide-step', cadence: cadenceMap.glideStep,
        title: `Glide step — ${goal.label}`,
        detail: 'Move equity share one step down per glide-path schedule.',
        trigger: 'Plan anniversary',
        action: 'Reallocate per the next-year row of the glide table',
        responsibility: 'user', priority: 3, goalId: fg.goalId,
        nextDate: nextDateFor(cadenceMap.glideStep, now),
      })
    }
  }

  // 3 — product-specific reviews
  const seenProductReviewIds = new Set<string>()
  for (const goalPlan of productPlan.byGoal) {
    for (const slice of goalPlan.slices) {
      for (const item of slice.items) {
        const spec = PRODUCT_REVIEWS[item.categoryId]
        if (!spec) continue
        const reviewId = `product-${item.categoryId}-${goalPlan.goalId}-${slice.bucket}`
        if (seenProductReviewIds.has(reviewId)) continue
        seenProductReviewIds.add(reviewId)
        items.push({
          id: reviewId,
          kind: spec.kind, cadence: spec.cadence,
          title: `${item.name} — ${ucWords(spec.kind.replace('-', ' '))}`,
          detail: `${item.name} holds ₹${formatINR(item.amount)} in ${slice.bucket.toUpperCase()}.`,
          trigger: spec.trigger, action: spec.action,
          responsibility: spec.responsibility, priority: spec.priority,
          goalId: goalPlan.goalId, bucketId: slice.bucket, productId: item.categoryId,
          nextDate: nextDateFor(spec.cadence, now),
        })
      }
    }
  }

  // 4 — bias guardrails → review items
  for (const g of input.preferences.bias.guardrails) {
    items.push({
      id: `guardrail-${g.id}`,
      kind: 'guardrail-trigger',
      cadence: g.category === 'review-cadence' ? 'quarterly' : 'event-driven',
      title: `Guardrail — ${ucWords(g.category.replace(/-/g, ' '))}`,
      detail: g.action,
      trigger: g.trigger, action: g.action,
      responsibility: 'user',
      priority: g.severity === 'high' ? 1 : g.severity === 'med' ? 2 : 3,
      nextDate: nextDateFor(
        g.category === 'review-cadence' ? 'quarterly' : 'event-driven',
        now,
      ),
    })
  }

  // 5 — age-keyed lifecycle milestones (only ages ≥ currentAge)
  for (const ms of LIFECYCLE) {
    if (ms.ageAt < input.plan.currentAge) continue
    const yearsAhead = ms.ageAt - input.plan.currentAge
    const targetDate = new Date(now)
    targetDate.setUTCFullYear(targetDate.getUTCFullYear() + yearsAhead)
    items.push({
      id: `lifecycle-${ms.ageAt}`,
      kind: 'lifecycle', cadence: 'event-driven',
      title: `Age ${ms.ageAt} — ${ms.title}`,
      detail: ms.detail,
      trigger: `Birthday — ${ms.ageAt} years old`,
      action: ms.action,
      responsibility: ms.ageAt >= 70 ? 'advisor' : 'user',
      priority: ms.ageAt === 60 ? 1 : 2,
      nextDate: targetDate.toISOString(),
    })
  }

  // 6 — annual FY-end tax action
  items.push({
    id: 'tax-fy-end',
    kind: 'tax-action', cadence: 'yearly',
    title: 'FY-end tax actions',
    detail: 'LTCG harvest up to ₹1.25 L · regime choice · 80TTB ₹50 k sweep.',
    trigger: 'Approaching Mar 31 (FY-end)',
    action: 'Sell ₹1.25 L equity gain, re-buy; verify slab; declare 80TTB if 60+',
    responsibility: 'ca', priority: 2,
    nextDate: nextMarch31(now),
  })

  // Sort by priority asc → cadence rank asc → id asc (stable, deterministic)
  items.sort((a, b) =>
    a.priority - b.priority
    || CADENCE_RANK[a.cadence] - CADENCE_RANK[b.cadence]
    || a.id.localeCompare(b.id)
  )

  // Upcoming — pick 10 nearest scheduled items.
  const scheduled: ScheduledReview[] = items
    .filter((i) => i.cadence !== 'event-driven' && i.nextDate)
    .map((i) => ({ date: i.nextDate, itemId: i.id, summary: i.title }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)

  return {
    items,
    upcoming: scheduled,
    emittedAt: now.toISOString(),
    inputsHash: hashInput({
      engineHash: hashInput(input),
      productHash: productPlan.inputsHash,
      monitoringVersion: 1,
    }),
  }
}

// ─── Date helpers (pure, UTC) ─────────────────────────────────────────

function nextDateFor(cadence: ReviewCadence, now: Date): string {
  switch (cadence) {
    case 'monthly':      return nextMonthEnd(now)
    case 'quarterly':    return nextQuarterEnd(now)
    case 'half-yearly':  return nextHalfYearEnd(now)
    case 'yearly':       return nextMarch31(now)
    case 'event-driven': return ''
  }
}

function nextMonthEnd(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  return d.toISOString().slice(0, 10) + 'T00:00:00.000Z'
}

function nextQuarterEnd(now: Date): string {
  const m = now.getUTCMonth()        // 0-11
  const qEnds = [2, 5, 8, 11]        // Mar, Jun, Sep, Dec — month indexes
  const nextQ = qEnds.find((qe) => qe > m) ?? (qEnds[0] + 12)  // wrap into next year
  const year = nextQ >= 12 ? now.getUTCFullYear() + 1 : now.getUTCFullYear()
  const mo = nextQ % 12
  // Quarter-end day-of-month
  const day = mo === 2 ? 31 : mo === 5 ? 30 : mo === 8 ? 30 : 31
  return new Date(Date.UTC(year, mo, day)).toISOString().slice(0, 10) + 'T00:00:00.000Z'
}

function nextHalfYearEnd(now: Date): string {
  const m = now.getUTCMonth()
  // Half-year ends: Mar 31 (m=2), Sep 30 (m=8)
  if (m < 2) return `${now.getUTCFullYear()}-03-31T00:00:00.000Z`
  if (m === 2 && now.getUTCDate() < 31) return `${now.getUTCFullYear()}-03-31T00:00:00.000Z`
  if (m < 8) return `${now.getUTCFullYear()}-09-30T00:00:00.000Z`
  if (m === 8 && now.getUTCDate() < 30) return `${now.getUTCFullYear()}-09-30T00:00:00.000Z`
  return `${now.getUTCFullYear() + 1}-03-31T00:00:00.000Z`
}

function nextMarch31(now: Date): string {
  const m = now.getUTCMonth()
  if (m < 2 || (m === 2 && now.getUTCDate() < 31)) {
    return `${now.getUTCFullYear()}-03-31T00:00:00.000Z`
  }
  return `${now.getUTCFullYear() + 1}-03-31T00:00:00.000Z`
}

function ucWords(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatINR(n: number): string {
  if (n >= 1e7)  return `${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5)  return `${(n / 1e5).toFixed(1)} L`
  if (n >= 1e3)  return `${(n / 1e3).toFixed(0)}k`
  return `${n}`
}
