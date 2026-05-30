// budgetReconciler — pair every logged transaction to its budget row
// (from the Plan tab's ExpenseBreakdown) and emit a per-line and total
// view: budgeted-monthly vs actual-MTD, delta, status, and an overall
// "discipline score" in [0, 1].
//
// This is the substrate the AnalyticsPanel uses to surface behavioural
// read-outs (overshoots, under-spends, end-of-month spikes, impulse
// risk).
//
// Pure function · deterministic.

import type {
  Category, Transaction,
} from '../../types/expense'
import type {
  ExpenseBreakdown, ExpenseEntry, PaymentFrequency,
} from '../../types'
import { CATEGORY_TO_BUDGET_KEY } from './seed'

export type BudgetStatus = 'under' | 'on-track' | 'over'

export interface BudgetActualRow {
  budgetKey:       keyof ExpenseBreakdown
  categoryId:      string
  categoryCode:    string
  categoryName:    string
  /** Parent group ("Essential", "Lifestyle", "Healthcare", "Education"). */
  groupName:       string
  budgetedMonthly: number
  actualMtd:       number
  delta:           number              // actual - budgeted
  /** Fractional overshoot. > 0 = over budget. */
  overshootPct:    number
  status:          BudgetStatus
}

export interface BudgetReconciliation {
  yearMonth: string
  rows: BudgetActualRow[]
  totals: {
    budgeted: number
    actual:   number
    delta:    number
    /** 0..1, 1 = perfect adherence to budget. */
    disciplineScore: number
    overshootCount:  number          // # rows over budget
    underCount:      number
  }
  /** Top-3 ranked overshoots by absolute INR delta. */
  topOvershoots: BudgetActualRow[]
  /** Top-3 ranked under-spends by absolute INR delta. */
  topUnderSpends: BudgetActualRow[]
}

// ─── Frequency normalisation ──────────────────────────────────────────

const TO_MONTHLY: Record<PaymentFrequency, number> = {
  'monthly':     1,
  'quarterly':   1 / 3,
  'half-yearly': 1 / 6,
  'yearly':      1 / 12,
}

function monthlyOf(entry: ExpenseEntry | undefined): number {
  if (!entry) return 0
  const m = TO_MONTHLY[entry.frequency] ?? 1
  return entry.amount * m
}

// ─── Status classification ────────────────────────────────────────────

const ON_TRACK_BAND = 0.05      // ±5 % counts as "on-track"

function classify(actual: number, budgeted: number): { status: BudgetStatus; overshootPct: number } {
  if (budgeted <= 0) {
    // No budget set — only flag "over" if anything was spent.
    return actual > 0
      ? { status: 'over',   overshootPct: 1 }
      : { status: 'under',  overshootPct: -1 }
  }
  const pct = (actual - budgeted) / budgeted
  if (pct >  ON_TRACK_BAND) return { status: 'over',     overshootPct: pct }
  if (pct < -ON_TRACK_BAND) return { status: 'under',    overshootPct: pct }
  return                        { status: 'on-track', overshootPct: pct }
}

// ─── Reverse map: budgetKey → categoryCode ────────────────────────────

const BUDGET_KEY_TO_CODE: Record<keyof ExpenseBreakdown, string> = Object
  .entries(CATEGORY_TO_BUDGET_KEY)
  .reduce<Record<keyof ExpenseBreakdown, string>>((acc, [code, key]) => {
    acc[key] = code
    return acc
  }, {} as never)

// ─── Main entry ───────────────────────────────────────────────────────

export function reconcileWithBudget(
  transactions: Transaction[],
  categories: Category[],
  breakdown: ExpenseBreakdown | undefined,
  yearMonth: string,
): BudgetReconciliation {
  if (!breakdown) {
    return emptyReconciliation(yearMonth)
  }

  const codeToCat = Object.fromEntries(categories.map((c) => [c.code, c])) as Record<string, Category>
  const monthTxns = transactions.filter((t) => t.date.startsWith(yearMonth))

  // Sum DEBIT actuals per category code.
  const actualByCode = new Map<string, number>()
  for (const t of monthTxns) {
    if (t.direction !== 'DEBIT' || !t.categoryId) continue
    const cat = categories.find((c) => c.id === t.categoryId)
    if (!cat) continue
    actualByCode.set(cat.code, (actualByCode.get(cat.code) ?? 0) + t.amount)
  }

  const rows: BudgetActualRow[] = []
  for (const budgetKey of Object.keys(BUDGET_KEY_TO_CODE) as Array<keyof ExpenseBreakdown>) {
    const code = BUDGET_KEY_TO_CODE[budgetKey]
    const cat  = codeToCat[code]
    if (!cat) continue

    const parent       = categories.find((c) => c.id === cat.parentId)
    const groupName    = parent?.name ?? ''
    const budgetedMonthly = round(monthlyOf(breakdown[budgetKey]))
    const actualMtd       = round(actualByCode.get(code) ?? 0)
    const delta           = round(actualMtd - budgetedMonthly)
    const { status, overshootPct } = classify(actualMtd, budgetedMonthly)

    rows.push({
      budgetKey,
      categoryId:   cat.id,
      categoryCode: code,
      categoryName: cat.name,
      groupName,
      budgetedMonthly,
      actualMtd,
      delta,
      overshootPct: round(overshootPct, 3),
      status,
    })
  }

  // Sort by group then sort-order within the group.
  rows.sort((a, b) =>
    a.groupName.localeCompare(b.groupName)
    || a.categoryName.localeCompare(b.categoryName),
  )

  const totals = computeTotals(rows)
  const sortedByDelta = [...rows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const topOvershoots = sortedByDelta.filter((r) => r.status === 'over').slice(0, 3)
  const topUnderSpends = sortedByDelta.filter((r) => r.status === 'under' && r.budgetedMonthly > 0).slice(0, 3)

  return { yearMonth, rows, totals, topOvershoots, topUnderSpends }
}

// ─── Totals + discipline score ────────────────────────────────────────

function computeTotals(rows: BudgetActualRow[]) {
  const budgeted = rows.reduce((s, r) => s + r.budgetedMonthly, 0)
  const actual   = rows.reduce((s, r) => s + r.actualMtd, 0)
  const overshoots  = rows.filter((r) => r.status === 'over').length
  const unders      = rows.filter((r) => r.status === 'under' && r.budgetedMonthly > 0).length

  // Discipline = 1 - weighted-mean of clamped per-row overshoots.
  // Under-spends have no penalty; on-track scores ~ 1.
  if (budgeted <= 0) {
    return {
      budgeted: 0,
      actual:   round(actual),
      delta:    round(actual),
      disciplineScore: 0,
      overshootCount: overshoots,
      underCount: unders,
    }
  }
  let weightedOver = 0
  for (const r of rows) {
    if (r.budgetedMonthly <= 0) continue
    const over = Math.max(0, r.actualMtd - r.budgetedMonthly)
    weightedOver += over
  }
  const score = Math.max(0, Math.min(1, 1 - weightedOver / budgeted))

  return {
    budgeted: round(budgeted),
    actual:   round(actual),
    delta:    round(actual - budgeted),
    disciplineScore: round(score, 3),
    overshootCount: overshoots,
    underCount: unders,
  }
}

function emptyReconciliation(yearMonth: string): BudgetReconciliation {
  return {
    yearMonth, rows: [],
    totals: { budgeted: 0, actual: 0, delta: 0, disciplineScore: 0, overshootCount: 0, underCount: 0 },
    topOvershoots: [], topUnderSpends: [],
  }
}

function round(v: number, d: number = 2): number {
  const f = Math.pow(10, d); return Math.round(v * f) / f
}
