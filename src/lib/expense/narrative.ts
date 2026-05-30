// narrative — build a 2-3 paragraph monthly summary from the analytics
// outputs. Templated for offline use; the LLM helper from llmHook
// becomes the swap-in when a Groq key is wired.
//
// Pure function · deterministic.

import type { MonthlySummary } from './analytics'
import type { BudgetReconciliation, BudgetActualRow } from './budgetReconciler'

function fmtINR(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`
  return `₹${Math.round(n)}`
}

function fmtPct(p: number): string {
  return `${(p * 100).toFixed(0)} %`
}

function monthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
}

export function buildTemplatedNarrative(
  summary: MonthlySummary,
  reconciliation?: BudgetReconciliation,
): string {
  const paras: string[] = []
  const month = monthLabel(summary.yearMonth)

  // ── Para 1 — the headline ─────────────────────────────────────────

  if (summary.totals.count === 0) {
    return `No transactions logged for ${month}. Add a row or paste an SMS / CSV to start tracking.`
  }

  const top = summary.topCategories[0]
  const sr = summary.totals.savingsRate
  paras.push(
    [
      `In ${month} you logged ${summary.totals.count} transactions — `,
      summary.totals.income > 0
        ? `${fmtINR(summary.totals.income)} in, `
        : '',
      `${fmtINR(summary.totals.expense)} spent`,
      summary.totals.savings > 0
        ? `, and ${fmtINR(summary.totals.savings)} routed to savings`
        : '',
      '.',
      top ? ` Your largest single category was ${top.name} at ${fmtINR(top.total)}.` : '',
      sr > 0 ? ` Savings rate landed at ${fmtPct(sr)}.` : '',
    ].join(''),
  )

  // ── Para 2 — budget discipline (if reconciliation available) ───────

  if (reconciliation && reconciliation.totals.budgeted > 0) {
    const t = reconciliation.totals
    const adherence = fmtPct(t.disciplineScore)
    paras.push(buildDisciplineParagraph(t, reconciliation.topOvershoots, reconciliation.topUnderSpends, adherence))
  }

  // ── Para 3 — 2-3 specific suggestions ─────────────────────────────

  paras.push(buildSuggestionsParagraph(summary, reconciliation))

  return paras.join('\n\n')
}

function buildDisciplineParagraph(
  t: BudgetReconciliation['totals'],
  overs: BudgetActualRow[],
  unders: BudgetActualRow[],
  adherence: string,
): string {
  const parts: string[] = []

  if (t.delta > 0) {
    parts.push(
      `You ran ${fmtINR(Math.abs(t.delta))} over your monthly budget of ${fmtINR(t.budgeted)} — adherence ${adherence}.`,
    )
  } else if (t.delta < 0) {
    parts.push(
      `You came in ${fmtINR(Math.abs(t.delta))} under budget (${fmtINR(t.actual)} of ${fmtINR(t.budgeted)}) — adherence ${adherence}.`,
    )
  } else {
    parts.push(`You hit budget exactly — adherence ${adherence}.`)
  }

  if (overs.length > 0) {
    const list = overs
      .map((r) => `${r.categoryName} (+${fmtINR(r.delta)})`)
      .join(', ')
    parts.push(`The biggest overshoots were ${list}.`)
  }
  if (unders.length > 0) {
    const list = unders
      .map((r) => `${r.categoryName} (-${fmtINR(Math.abs(r.delta))})`)
      .join(', ')
    parts.push(`On the other side, you under-spent on ${list}.`)
  }
  return parts.join(' ')
}

function buildSuggestionsParagraph(
  summary: MonthlySummary,
  reconciliation: BudgetReconciliation | undefined,
): string {
  const suggestions: string[] = []

  // 1. Address the biggest overshoot.
  const topOver = reconciliation?.topOvershoots?.[0]
  if (topOver && topOver.delta > 0) {
    suggestions.push(
      `Tighten ${topOver.categoryName} first — a ${fmtINR(topOver.delta)} cut next month brings you back inside budget for that line.`,
    )
  }

  // 2. Highlight payment-mode dominance (impulse risk).
  const modes = summary.byPaymentMode
  const topMode = (Object.keys(modes) as Array<keyof typeof modes>)
    .sort((a, b) => modes[b] - modes[a])[0]
  if (topMode && modes[topMode] > 0 && (topMode === 'UPI' || topMode === 'CARD')) {
    suggestions.push(
      `${topMode === 'UPI' ? 'UPI' : 'Card'} accounts for the largest share of spend — frictionless rails are the highest-impulse channels; set a weekly cap.`,
    )
  }

  // 3. Savings rate guidance.
  if (summary.totals.savingsRate < 0.2 && summary.totals.income > 0) {
    suggestions.push(
      `Savings rate of ${fmtPct(summary.totals.savingsRate)} is below the ~20 % rule-of-thumb. Even a ₹2-3k SIP bump from the lowest-overshoot line would lift it.`,
    )
  }

  if (suggestions.length === 0) {
    suggestions.push(
      `You held the line this month — keep your category rules current and the automation does the work.`,
    )
  }

  return `Suggestions: ${suggestions.map((s, i) => `${i + 1}. ${s}`).join(' ')}`
}
