import type { UserProfile, BucketState, SWPYearRow, ReturnAssumptions } from '../types'
import { totalCorpus, b1RunwayMonths } from './calculations'

const INR = (n: number) =>
  '₹' +
  Math.round(n).toLocaleString('en-IN')

export async function exportPDF(
  profile: UserProfile,
  buckets: BucketState,
  returns: ReturnAssumptions,
  swpRows: SWPYearRow[]
): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const date = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const month = new Date().toISOString().slice(0, 7)

  let y = 15

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Retirement Portfolio Review', 105, y, { align: 'center' })
  y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${date}`, 105, y, { align: 'center' })
  y += 12

  // Corpus summary
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Corpus Summary', 15, y)
  y += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const total = totalCorpus(buckets)
  const runway = b1RunwayMonths(buckets.b1, profile.monthlyWithdrawal)
  const rows = [
    ['Total Corpus', INR(total)],
    ['Monthly Withdrawal', INR(profile.monthlyWithdrawal)],
    ['B1 Runway', `${runway} months`],
    ['Inflation Rate', `${profile.inflationRate}%`],
    ['Risk Appetite', `${profile.riskAppetite}/5`],
    ['Tax Bracket', `${profile.taxBracket}%`],
  ]

  rows.forEach(([label, value]) => {
    doc.text(label, 20, y)
    doc.text(value, 90, y)
    y += 6
  })
  y += 4

  // Bucket breakdown
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Bucket Breakdown', 15, y)
  y += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Bucket', 20, y)
  doc.text('Value', 70, y)
  doc.text('% of Corpus', 110, y)
  doc.text('Return Assumption', 155, y)
  y += 5
  doc.setFont('helvetica', 'normal')

  const bucketRows = [
    ['B1 — Short Term (0–3yr)', buckets.b1, returns.b1],
    ['B2 — Mid Term (3–10yr)', buckets.b2, returns.b2],
    ['B3 — Long Term (10–20yr)', buckets.b3, returns.b3],
  ] as const

  bucketRows.forEach(([label, value, ret]) => {
    doc.text(label, 20, y)
    doc.text(INR(value), 70, y)
    doc.text(`${((value / total) * 100).toFixed(1)}%`, 110, y)
    doc.text(`${ret}% p.a.`, 155, y)
    y += 6
  })
  y += 6

  // 25-year projection (legacy years only)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('SWP Projection — Key Milestones', 15, y)
  y += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Year', 20, y)
  doc.text('Annual Withdrawal', 45, y)
  doc.text('Total Corpus', 100, y)
  y += 5
  doc.setFont('helvetica', 'normal')

  const legacyRows = swpRows.filter((r) => r.isLegacyYear || r.year === 1 || r.year === 5 || r.year === 10)
  legacyRows.forEach((row) => {
    doc.text(`Year ${row.year}`, 20, y)
    doc.text(INR(row.annualWithdrawal), 45, y)
    doc.text(INR(row.totalCorpus), 100, y)
    y += 6
    if (y > 270) {
      doc.addPage()
      y = 15
    }
  })

  y += 6
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text(
    'This report is for personal financial planning purposes only. Not SEBI-registered advice.',
    105,
    285,
    { align: 'center' }
  )

  doc.save(`retirement-review-${month}.pdf`)
}
