// csvConnector — paste-a-statement CSV → raw transaction records.
//
// The .md §5 calls for a `BankConnector` base class. We provide:
//   • `parseCsv(text)` — header-aware CSV → array of CsvRow
//   • `mapRowsToTransactions(rows, accountId)` — heuristic column
//     mapping that handles the most common Indian-bank statement
//     layouts (HDFC, ICICI, SBI, Axis, Kotak). The mapper recognises
//     several synonym headers for each field and emits ParsedTransaction
//     shapes ready for the categorisation pipeline.
//
// Pure functions · no I/O · zero dependencies.

import type { Direction, PaymentMode } from '../../../types/expense'

export interface ParsedTransaction {
  date: string                  // YYYY-MM-DD
  amount: number                // always positive
  currency: string              // 'INR'
  direction: Direction
  merchantName?: string
  paymentMode?: PaymentMode
  description: string
  rawText: string               // original CSV row joined back with commas
}

export interface CsvRow {
  [columnName: string]: string
}

// ─── Column synonyms (lowercased keys) ───────────────────────────────

const DATE_KEYS    = ['date', 'transaction date', 'txn date', 'value date', 'posting date', 'tran date']
const DESC_KEYS    = ['description', 'narration', 'remarks', 'particulars', 'transaction details', 'txn description']
const DEBIT_KEYS   = ['debit', 'withdrawal', 'withdrawal amt', 'withdrawal amount', 'debit amount', 'dr', 'amount debit', 'debit (inr)']
const CREDIT_KEYS  = ['credit', 'deposit', 'deposit amt', 'deposit amount', 'credit amount', 'cr', 'amount credit', 'credit (inr)']
const AMOUNT_KEYS  = ['amount', 'amount (inr)', 'amount (rs)', 'transaction amount', 'value']
const TYPE_KEYS    = ['type', 'dr/cr', 'transaction type', 'cr/dr', 'tran type']

// ─── CSV parser (RFC-4180-ish — handles quoted fields, escaped quotes) ─

export function parseCsv(text: string): CsvRow[] {
  if (!text.trim()) return []
  const rows = splitRows(text)
  if (rows.length === 0) return []
  const headers = splitFields(rows[0]).map((h) => h.trim().replace(/^"|"$/g, ''))
  const out: CsvRow[] = []
  for (let r = 1; r < rows.length; r++) {
    const fields = splitFields(rows[r])
    if (fields.length === 0 || fields.every((f) => f.trim() === '')) continue
    const row: CsvRow = {}
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = (fields[i] ?? '').trim().replace(/^"|"$/g, '')
    }
    out.push(row)
  }
  return out
}

function splitRows(text: string): string[] {
  // Split on newlines that are NOT inside quotes.
  const rows: string[] = []
  let buf = ''
  let inQuote = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') inQuote = !inQuote
    if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (buf.length > 0) rows.push(buf)
      buf = ''
      // skip \r\n
      if (ch === '\r' && text[i + 1] === '\n') i++
    } else {
      buf += ch
    }
  }
  if (buf.length > 0) rows.push(buf)
  return rows
}

function splitFields(row: string): string[] {
  const out: string[] = []
  let buf = ''
  let inQuote = false
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (ch === '"') {
      if (inQuote && row[i + 1] === '"') { buf += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      out.push(buf); buf = ''
    } else {
      buf += ch
    }
  }
  out.push(buf)
  return out
}

// ─── Field-level helpers ─────────────────────────────────────────────

function findKey(row: CsvRow, candidates: string[]): string | undefined {
  const lower = Object.fromEntries(Object.keys(row).map((k) => [k.toLowerCase().trim(), k]))
  for (const c of candidates) {
    if (lower[c]) return lower[c]
  }
  return undefined
}

function parseDate(s: string): string | undefined {
  if (!s) return undefined
  const trimmed = s.trim()

  // YYYY-MM-DD
  let m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`

  // DD/MM/YYYY or DD-MM-YYYY
  m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (m) {
    let yr = parseInt(m[3], 10)
    if (yr < 100) yr = 2000 + yr
    const mo = parseInt(m[2], 10)
    const dd = parseInt(m[1], 10)
    if (mo >= 1 && mo <= 12 && dd >= 1 && dd <= 31) {
      return `${yr}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    }
  }

  // DD-MMM-YY / DD-Mon-YYYY
  const MONTHS: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  }
  m = trimmed.match(/^(\d{1,2})[-\s]+([A-Za-z]{3})[-\s]+(\d{2,4})$/)
  if (m) {
    const mo = MONTHS[m[2].toLowerCase()]
    let yr = parseInt(m[3], 10)
    if (yr < 100) yr = 2000 + yr
    const dd = parseInt(m[1], 10)
    if (mo && dd >= 1 && dd <= 31) {
      return `${yr}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    }
  }
  return undefined
}

function parseAmt(s: string | undefined): number {
  if (!s) return 0
  const cleaned = s.replace(/[^\d.\-]/g, '')
  if (!cleaned) return 0
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? Math.abs(n) : 0
}

function inferPaymentMode(desc: string): PaymentMode | undefined {
  const t = desc.toLowerCase()
  if (/upi|vpa|@/.test(t))                                  return 'UPI'
  if (/(neft|rtgs|imps)/.test(t))                           return 'NET_BANKING'
  if (/(pos|card|debit\s+card|credit\s+card)/.test(t))      return 'CARD'
  if (/(cash withdrawal|atm wdl|atm cash)/.test(t))         return 'CASH'
  if (/(standing instruction|si\s|auto\s*debit)/.test(t))   return 'AUTO_DEBIT'
  return undefined
}

function cleanMerchant(desc: string): string {
  // Strip common prefixes / refs / dates from the description.
  return desc
    .replace(/^(upi\/|neft\/|imps\/|rtgs\/|pos\/)/i, '')
    .replace(/\d{6,}/g, '')                  // long ref numbers
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 60)
}

// ─── Mapper ─────────────────────────────────────────────────────────

export function mapRowsToTransactions(rows: CsvRow[]): ParsedTransaction[] {
  const out: ParsedTransaction[] = []
  if (rows.length === 0) return out

  for (const row of rows) {
    const dateKey   = findKey(row, DATE_KEYS)
    const descKey   = findKey(row, DESC_KEYS)
    const debitKey  = findKey(row, DEBIT_KEYS)
    const creditKey = findKey(row, CREDIT_KEYS)
    const amountKey = findKey(row, AMOUNT_KEYS)
    const typeKey   = findKey(row, TYPE_KEYS)

    const date = parseDate(dateKey ? row[dateKey] : '')
    if (!date) continue   // skip header-confused / non-data rows

    const desc = descKey ? row[descKey] : ''

    let amount = 0
    let direction: Direction | undefined

    if (debitKey || creditKey) {
      const dr = parseAmt(debitKey ? row[debitKey] : undefined)
      const cr = parseAmt(creditKey ? row[creditKey] : undefined)
      if (dr > 0)      { amount = dr; direction = 'DEBIT' }
      else if (cr > 0) { amount = cr; direction = 'CREDIT' }
    } else if (amountKey) {
      amount = parseAmt(row[amountKey])
      const typeStr = (typeKey ? row[typeKey] : '').toLowerCase()
      if (/dr|debit|withdrawal|wd/i.test(typeStr))      direction = 'DEBIT'
      else if (/cr|credit|deposit/i.test(typeStr))      direction = 'CREDIT'
      else if (amount > 0)                              direction = 'DEBIT'   // assume debit if unclear
    }

    if (amount <= 0 || !direction) continue

    const paymentMode = inferPaymentMode(desc)
    const merchantName = desc ? cleanMerchant(desc) : undefined

    out.push({
      date,
      amount,
      currency: 'INR',
      direction,
      merchantName,
      paymentMode,
      description: desc || (direction === 'DEBIT' ? 'CSV debit' : 'CSV credit'),
      rawText: Object.values(row).join(','),
    })
  }
  return out
}
