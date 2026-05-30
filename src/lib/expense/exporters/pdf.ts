// PDF exporter for the Expense Tracker — single-page summary of one
// month: header strip · MTD KPIs · budget reconciliation table ·
// templated narrative.
//
// Uses jsPDF dynamically imported so the bundle doesn't grow until
// the user actually triggers an export.

import type { Account, Category, Transaction } from '../../../types/expense'
import type { UserProfile } from '../../../types'
import { monthlySummary } from '../analytics'
import { reconcileWithBudget } from '../budgetReconciler'
import { buildTemplatedNarrative } from '../narrative'

interface BuildArgs {
  profile: UserProfile
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  yearMonth: string
}

function fmtINR(n: number): string {
  return `Rs ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function monthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
}

export async function exportExpensePdf(args: BuildArgs): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const summary = monthlySummary(args.transactions, args.categories, args.accounts, args.yearMonth)
  const recon   = reconcileWithBudget(args.transactions, args.categories, args.profile.expenses?.breakdown, args.yearMonth)
  const narrative = buildTemplatedNarrative(summary, recon.totals.budgeted > 0 ? recon : undefined)

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 15
  let y = margin

  // ── Header ─────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(13, 148, 136)      // teal
  doc.text('Expense Tracker', margin, y)
  y += 7

  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(`Monthly summary — ${monthLabel(args.yearMonth)}`, margin, y)
  y += 6

  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, margin, y)
  y += 8

  // ── KPI strip ──────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.2)
  doc.line(margin, y, pageW - margin, y)
  y += 5

  const colW = (pageW - 2 * margin) / 4
  const tiles: Array<{ label: string; value: string; color: [number, number, number] }> = [
    { label: 'Income',  value: fmtINR(summary.totals.income),  color: [5, 150, 105] },
    { label: 'Spend',   value: fmtINR(summary.totals.expense), color: [225, 29, 72] },
    { label: 'Savings', value: fmtINR(summary.totals.savings), color: [37, 99, 235] },
    { label: 'Txns',    value: String(summary.totals.count),   color: [71, 85, 105] },
  ]
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  for (let i = 0; i < tiles.length; i++) {
    doc.text(tiles[i].label.toUpperCase(), margin + i * colW, y)
  }
  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  for (let i = 0; i < tiles.length; i++) {
    const [r, g, b] = tiles[i].color
    doc.setTextColor(r, g, b)
    doc.text(tiles[i].value, margin + i * colW, y)
  }
  y += 8

  // ── Budget vs actual ──────────────────────────────────────────────
  if (recon.totals.budgeted > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text('Budget vs Actual', margin, y); y += 5

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    const summaryLine =
      recon.totals.delta > 0 ? `Over budget by ${fmtINR(Math.abs(recon.totals.delta))} of ${fmtINR(recon.totals.budgeted)} — discipline ${(recon.totals.disciplineScore * 100).toFixed(0)} %.`
      : recon.totals.delta < 0 ? `Under budget by ${fmtINR(Math.abs(recon.totals.delta))} of ${fmtINR(recon.totals.budgeted)} — discipline ${(recon.totals.disciplineScore * 100).toFixed(0)} %.`
      :                          `On budget — discipline ${(recon.totals.disciplineScore * 100).toFixed(0)} %.`
    doc.text(summaryLine, margin, y); y += 6

    // Table header
    const cols = [
      { label: 'Category',  x: margin,         w: 60 },
      { label: 'Budget',    x: margin + 60,    w: 32, align: 'right' as const },
      { label: 'Actual',    x: margin + 92,    w: 32, align: 'right' as const },
      { label: 'Delta',     x: margin + 124,   w: 32, align: 'right' as const },
      { label: 'Status',    x: margin + 156,   w: 24, align: 'right' as const },
    ]
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    for (const c of cols) {
      if (c.align === 'right') doc.text(c.label, c.x + c.w, y, { align: 'right' })
      else                     doc.text(c.label, c.x, y)
    }
    y += 3
    doc.setLineWidth(0.15)
    doc.line(margin, y, pageW - margin, y)
    y += 3

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    for (const row of recon.rows) {
      if (y > 270) { doc.addPage(); y = margin }
      doc.setTextColor(15, 23, 42)
      doc.text(`${row.categoryName}`, cols[0].x, y, { maxWidth: cols[0].w - 2 })
      doc.text(fmtINR(row.budgetedMonthly), cols[1].x + cols[1].w, y, { align: 'right' })
      doc.text(fmtINR(row.actualMtd),       cols[2].x + cols[2].w, y, { align: 'right' })
      const deltaColor: [number, number, number] = row.delta > 0 ? [225, 29, 72] : row.delta < 0 ? [5, 150, 105] : [100, 116, 139]
      doc.setTextColor(...deltaColor)
      doc.text(`${row.delta >= 0 ? '+' : '-'}${fmtINR(Math.abs(row.delta))}`, cols[3].x + cols[3].w, y, { align: 'right' })
      doc.text(row.status, cols[4].x + cols[4].w, y, { align: 'right' })
      doc.setTextColor(15, 23, 42)
      y += 5
    }
    y += 4
  }

  // ── Narrative ──────────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = margin }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text('Monthly narrative', margin, y); y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  const lines = doc.splitTextToSize(narrative, pageW - 2 * margin)
  for (const line of lines) {
    if (y > 280) { doc.addPage(); y = margin }
    doc.text(line, margin, y)
    y += 4.5
  }

  doc.save(`expense-tracker-${args.yearMonth}.pdf`)
}
