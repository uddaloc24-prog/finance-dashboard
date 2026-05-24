// Format-agnostic adapter — turns the engine + fitter snapshot into
// a structured "report data" object that exporters render in their
// native format (markdown / docx / pptx / pdf / csv).
//
// Keeps formatting decisions OUT of the engine and the exporters.

import type { CriterionWeights, EngineOutput, StrategyFit, RawGoal } from '../../types/orchestration'

export interface OrchestrationReportData {
  header: {
    personaUsed: string
    weightDerivation: string
    rankedAt: string                    // human-readable
    inputsHash: string
    fitHash: string
    totalGoals: number
  }
  weights: Array<{ criterion: string; percent: number }>
  preempted: Array<{ id: string; label: string; trigger: string; gap: number }>
  rankedGoals: Array<{
    rank: number
    label: string
    source: RawGoal['source']
    priority: RawGoal['priority']
    kind: RawGoal['kind']
    targetYear?: number
    composite: number
    priorityWeight: number
    importance: number
    urgency: number
    affordability: number
    riskFit: number
    rationale: string[]
    // From fitter
    corpusAllocated: number
    monthlySipNeeded: number
    monthlySipAffordable: number
    inflatedCost: number
    projectedAtTarget: number
    shortfall: number
    status: 'funded' | 'partial' | 'unfunded'
    bucketB1Pct: number; bucketB2Pct: number; bucketB3Pct: number; bucketB4Pct: number
  }>
  totals: {
    corpus: number; corpusUsed: number; corpusFree: number
    sipCapacity: number; sipUsed: number; sipShortfall: number
    goalsFunded: number; goalsPartial: number; goalsUnfunded: number
  }
  bucketTargets: {
    b1: number; b2: number; b3: number; b4: number
    b1Pct: number; b2Pct: number; b3Pct: number; b4Pct: number
  }
  actions: Array<{ priority: number; category: string; title: string; detail: string; amount?: number }>
}

const TRIGGER_BY_ID: Record<string, string> = {
  'sys-term-life':      'lifeCover < 5× annualBurn AND age < 70',
  'sys-health-cover':   'healthCover < ₹15L × age-uplift multiplier',
  'sys-emergency-fund': 'liquidCorpus < 6× monthlyBurn',
}

const CRITERION_ORDER: Array<keyof CriterionWeights> = ['importance', 'urgency', 'affordability', 'riskFit']
const CRITERION_LABEL: Record<keyof CriterionWeights, string> = {
  importance: 'Importance', urgency: 'Urgency', affordability: 'Affordability', riskFit: 'Risk-fit',
}

/** Builds the report-ready data structure from an engine + fitter pair. */
export function buildOrchestrationReport(ranked: EngineOutput, fit: StrategyFit): OrchestrationReportData {
  const fitById = new Map(fit.goals.map((g) => [g.goalId, g]))

  const preempted = ranked.ranked
    .filter((r) => r.goal.source === 'system')
    .map((r) => ({
      id: r.goal.id,
      label: r.goal.label,
      trigger: TRIGGER_BY_ID[r.goal.id] ?? '—',
      gap: r.goal.amount,
    }))

  const rankedGoals = ranked.ranked.map((r, i) => {
    const f = fitById.get(r.goal.id)
    return {
      rank: i + 1,
      label: r.goal.label,
      source: r.goal.source,
      priority: r.goal.priority,
      kind: r.goal.kind,
      targetYear: r.goal.startYear,
      composite: Math.round(r.composite * 10) / 10,
      priorityWeight: Math.round(r.priorityWeight * 10000) / 10000,
      importance:    Math.round(r.scores.importance),
      urgency:       Math.round(r.scores.urgency),
      affordability: Math.round(r.scores.affordability),
      riskFit:       Math.round(r.scores.riskFit),
      rationale: ranked.trace.goalRationale[r.goal.id] ?? [],
      corpusAllocated:     f?.corpusAllocated      ?? 0,
      monthlySipNeeded:    f?.monthlySipNeeded     ?? 0,
      monthlySipAffordable: f?.monthlySipAffordable ?? 0,
      inflatedCost:        f?.inflatedCost         ?? 0,
      projectedAtTarget:   f?.projectedAtTarget    ?? 0,
      shortfall:           f?.shortfall            ?? 0,
      status:              f?.status               ?? 'unfunded' as const,
      bucketB1Pct: f?.bucketSplit.b1 ?? 0, bucketB2Pct: f?.bucketSplit.b2 ?? 0,
      bucketB3Pct: f?.bucketSplit.b3 ?? 0, bucketB4Pct: f?.bucketSplit.b4 ?? 0,
    }
  })

  return {
    header: {
      personaUsed:      ranked.trace.personaUsed,
      weightDerivation: ranked.trace.weightDerivation,
      rankedAt:         new Date(ranked.emittedAt).toLocaleString('en-IN'),
      inputsHash:       ranked.inputsHash,
      fitHash:          fit.inputsHash,
      totalGoals:       ranked.ranked.length,
    },
    weights: CRITERION_ORDER.map((k) => ({
      criterion: CRITERION_LABEL[k],
      percent: Math.round(ranked.weightsUsed[k] * 100),
    })),
    preempted,
    rankedGoals,
    totals: { ...fit.totals },
    bucketTargets: { ...fit.bucketTargets },
    actions: fit.actions.map((a) => ({
      priority: a.priority,
      category: a.category,
      title:    a.title,
      detail:   a.detail,
      amount:   a.amount,
    })),
  }
}

// ─── Helpers reused by exporters ──────────────────────────────────────

export function fmtINRshort(n: number): string {
  const abs = Math.abs(n), sign = n < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)}Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)}L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)}k`
  return `${sign}₹${Math.round(abs)}`
}

// ─── Markdown serialiser ──────────────────────────────────────────────

export function orchestrationToMarkdown(data: OrchestrationReportData): string[] {
  const lines: string[] = []
  const w = (s: string = '') => lines.push(s)

  w('## Orchestration Engine — Ranked Goals & Fitted Strategy')
  w()
  w(`> Generated by the Goal Ranking Engine + Strategy Fitter on **${data.header.rankedAt}**.`)
  w(`> Persona used: **${data.header.personaUsed}** · weight derivation: **${data.header.weightDerivation}** · ${data.header.totalGoals} goals ranked.`)
  w(`> Engine hash: \`${data.header.inputsHash}\` · Fit hash: \`${data.header.fitHash}\``)
  w()

  // Weights
  w('### Criterion weights in effect')
  w()
  w('| Criterion | Weight |')
  w('|---|---|')
  data.weights.forEach((wgt) => w(`| ${wgt.criterion} | ${wgt.percent}% |`))
  w()

  // Pre-emption
  if (data.preempted.length > 0) {
    w('### Mandatory pre-emption fired')
    w()
    w('| System goal | Trigger | Gap |')
    w('|---|---|---|')
    data.preempted.forEach((p) => w(`| ${p.label} | ${p.trigger} | ${fmtINRshort(p.gap)} |`))
    w()
  } else {
    w('### Mandatory pre-emption')
    w()
    w('> ✓ All protection floors pass. No system goals were emitted.')
    w()
  }

  // Ranked goals
  w('### Ranked goals')
  w()
  w('| # | Goal | Source | Priority | Target FY | Composite | Weight | IMP | URG | AFF | RSK | Status | Corpus alloc | SIP afford / need | Shortfall |')
  w('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  data.rankedGoals.forEach((g) => {
    w(`| ${g.rank} | ${g.label} | ${g.source} | ${g.priority} | ${g.targetYear ?? '—'} | ${g.composite.toFixed(1)} | ${(g.priorityWeight * 100).toFixed(1)}% | ${g.importance} | ${g.urgency} | ${g.affordability} | ${g.riskFit} | ${g.status} | ${fmtINRshort(g.corpusAllocated)} | ${fmtINRshort(g.monthlySipAffordable)} / ${fmtINRshort(g.monthlySipNeeded)} | ${g.shortfall > 0 ? fmtINRshort(g.shortfall) : '—'} |`)
  })
  w()

  // Totals
  w('### Strategy totals')
  w()
  w('| Metric | Value |')
  w('|---|---|')
  w(`| Corpus used | ${fmtINRshort(data.totals.corpusUsed)} of ${fmtINRshort(data.totals.corpus)} |`)
  w(`| Corpus free | ${fmtINRshort(data.totals.corpusFree)} |`)
  w(`| SIP used / capacity | ${fmtINRshort(data.totals.sipUsed)}/mo of ${fmtINRshort(data.totals.sipCapacity)}/mo |`)
  w(`| SIP shortfall | ${data.totals.sipShortfall > 0 ? `${fmtINRshort(data.totals.sipShortfall)}/mo` : '—'} |`)
  w(`| Goals funded / partial / unfunded | ${data.totals.goalsFunded} / ${data.totals.goalsPartial} / ${data.totals.goalsUnfunded} |`)
  w()

  // Bucket targets
  if (data.totals.corpusUsed > 0) {
    w('### Bucket allocation target')
    w()
    w('| Bucket | Share | Amount |')
    w('|---|---|---|')
    w(`| B1 · Liquid | ${(data.bucketTargets.b1Pct * 100).toFixed(0)}% | ${fmtINRshort(data.bucketTargets.b1)} |`)
    w(`| B2 · Short debt | ${(data.bucketTargets.b2Pct * 100).toFixed(0)}% | ${fmtINRshort(data.bucketTargets.b2)} |`)
    w(`| B3 · Hybrid | ${(data.bucketTargets.b3Pct * 100).toFixed(0)}% | ${fmtINRshort(data.bucketTargets.b3)} |`)
    w(`| B4 · Equity | ${(data.bucketTargets.b4Pct * 100).toFixed(0)}% | ${fmtINRshort(data.bucketTargets.b4)} |`)
    w()
  }

  // Actions
  if (data.actions.length > 0) {
    w('### Recommended actions')
    w()
    data.actions.forEach((a) => {
      w(`**${a.priority}. ${a.title}** _(${a.category})_`)
      w()
      w(`> ${a.detail}`)
      w()
    })
  }

  w('---')
  w()
  return lines
}

// ─── CSV serialiser — ranked goals as rows ────────────────────────────

export function orchestrationToCsvRows(data: OrchestrationReportData): string[][] {
  const rows: string[][] = []
  rows.push(['Engine — Ranked Goals & Fitted Strategy'])
  rows.push([`Persona: ${data.header.personaUsed}`, `Derivation: ${data.header.weightDerivation}`, `As of: ${data.header.rankedAt}`])
  rows.push([])
  rows.push(['Rank', 'Goal', 'Source', 'Priority', 'Kind', 'Target FY', 'Composite', 'Priority Weight %', 'Importance', 'Urgency', 'Affordability', 'Risk-fit', 'Status', 'Corpus Alloc', 'SIP Afford', 'SIP Need', 'Inflated Cost', 'Projected', 'Shortfall'])
  data.rankedGoals.forEach((g) => {
    rows.push([
      String(g.rank), g.label, g.source, g.priority, g.kind, String(g.targetYear ?? ''),
      String(g.composite), (g.priorityWeight * 100).toFixed(2),
      String(g.importance), String(g.urgency), String(g.affordability), String(g.riskFit),
      g.status,
      String(g.corpusAllocated), String(g.monthlySipAffordable), String(g.monthlySipNeeded),
      String(g.inflatedCost), String(g.projectedAtTarget), String(g.shortfall),
    ])
  })
  rows.push([])
  rows.push(['Action #', 'Category', 'Title', 'Detail', 'Amount'])
  data.actions.forEach((a) => rows.push([String(a.priority), a.category, a.title, a.detail, a.amount != null ? String(a.amount) : '']))
  return rows
}
