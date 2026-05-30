// CSV exporter for the Expense Tracker — two outputs:
//   • transactionsCsv(...) → flat dump of (filtered) transactions
//   • budgetVsActualCsv(...) → the reconciliation table for one month
//
// Both return a Blob; the caller triggers the download via the
// `download` helper.

import type { Account, Category, Transaction } from '../../../types/expense'
import type { BudgetReconciliation } from '../budgetReconciler'

// ─── Shared utilities ────────────────────────────────────────────────

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function rowsToCsv(rows: string[][]): string {
  return rows.map((r) => r.map(escapeCell).join(',')).join('\r\n')
}

export function download(filename: string, content: string, mime = 'text/csv'): void {
  if (typeof window === 'undefined') return
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Transactions ────────────────────────────────────────────────────

export function transactionsCsv(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
): string {
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]))   as Record<string, Account>
  const catById = Object.fromEntries(categories.map((c) => [c.id, c])) as Record<string, Category>

  const header = [
    'Date', 'Amount', 'Currency', 'Direction', 'Account', 'Account type',
    'Category', 'Category code', 'Payment mode', 'Source', 'Needs review',
    'Notes', 'Raw text',
  ]
  const rows = transactions.map((t) => {
    const cat = t.categoryId ? catById[t.categoryId] : undefined
    const acc = accById[t.accountId]
    return [
      t.date,
      String(t.amount),
      t.currency,
      t.direction,
      acc?.name ?? '',
      acc?.type ?? '',
      cat?.name ?? 'Uncategorised',
      cat?.code ?? '',
      t.paymentMode,
      t.source,
      t.needsReview ? 'yes' : '',
      t.notes ?? '',
      t.rawText ?? '',
    ]
  })
  return rowsToCsv([header, ...rows])
}

// ─── Budget vs actual reconciliation ─────────────────────────────────

export function budgetVsActualCsv(recon: BudgetReconciliation): string {
  const header = [
    'Year-Month', 'Group', 'Category', 'Budget key', 'Budgeted (monthly)',
    'Actual (MTD)', 'Delta', 'Overshoot %', 'Status',
  ]
  const rows = recon.rows.map((r) => [
    recon.yearMonth, r.groupName, r.categoryName, String(r.budgetKey),
    String(r.budgetedMonthly), String(r.actualMtd), String(r.delta),
    `${(r.overshootPct * 100).toFixed(1)} %`, r.status,
  ])
  const totals: string[][] = [
    ['—'],
    [
      recon.yearMonth, '— TOTAL —', '', '',
      String(recon.totals.budgeted), String(recon.totals.actual), String(recon.totals.delta),
      `${(recon.totals.disciplineScore * 100).toFixed(0)} % discipline`,
      `${recon.totals.overshootCount} over / ${recon.totals.underCount} under`,
    ],
  ]
  return rowsToCsv([header, ...rows, ...totals])
}
