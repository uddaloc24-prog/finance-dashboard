// smsParser — deterministic regex parser for common Indian bank /
// card / UPI SMS formats. Returns a `ParsedSms` envelope matching the
// .md §4 schema; `confidence` gates fall-through to the LLM helper.
//
// Pure function · zero I/O · idempotent. Tested against the formats in
// docs/sample-sms-examples.md (sample-set to be added in Phase 2 UI).

import type { PaymentMode } from '../../../types/expense'

export interface ParsedSms {
  success: boolean
  confidence: number               // 0..1
  rawText: string
  parser: 'regex' | 'failed'
  transaction?: {
    date?: string                  // YYYY-MM-DD
    amount?: number
    currency: string               // 'INR'
    direction?: 'DEBIT' | 'CREDIT'
    merchantName?: string
    accountHint?: string           // last-4 digits
    paymentMode?: PaymentMode
    description: string
  }
}

// ─── Format detectors ────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

function extractAmount(text: string): number | undefined {
  // Matches "Rs.", "Rs ", "INR", "₹" before a number with optional commas
  // + decimals. The number is greedy — captures all consecutive digits +
  // commas + decimal so "50000.00" is not truncated to "500".
  const m = text.match(/(?:Rs\.?|INR|₹)\s*([0-9](?:[0-9,]*[0-9])?(?:\.\d{1,2})?)/i)
  if (!m) return undefined
  const n = parseFloat(m[1].replace(/,/g, ''))
  return Number.isFinite(n) ? n : undefined
}

function extractDirection(text: string): 'DEBIT' | 'CREDIT' | undefined {
  // Order matters: check explicit credit first (more specific keywords).
  const lower = text.toLowerCase()

  const creditKw = /\b(credited|received|deposited|refund|refunded)\b/i
  const debitKw  = /\b(debited|spent|withdrawn|paid|purchase|purchased|charged)\b/i

  const hasCredit = creditKw.test(lower)
  const hasDebit  = debitKw.test(lower)

  if (hasCredit && !hasDebit) return 'CREDIT'
  if (hasDebit  && !hasCredit) return 'DEBIT'
  // Tie-break: "credited to a/c" wins over generic "debit" mentions.
  if (hasCredit && /credited to/i.test(lower)) return 'CREDIT'
  if (hasDebit  && /debited from/i.test(lower)) return 'DEBIT'
  return undefined
}

function extractPaymentMode(text: string): PaymentMode | undefined {
  // Order: most specific first
  if (/\b(auto[\s-]?debit|standing instruction|\bSI\b)\b/i.test(text)) return 'AUTO_DEBIT'
  if (/\b(NEFT|RTGS|IMPS)\b/i.test(text))                              return 'NET_BANKING'
  if (/\b(UPI|VPA)\b|@\w+(?:bank|upi|ybl|okhdfcbank|paytm|axl|axis)\b/i.test(text)) return 'UPI'
  // "Card xx1234" / "Card 1234" / "Card no. 1234" / "credit card" / "debit card" / CC / DC / POS
  if (/(?:credit\s+card|debit\s+card|\bCC\b|\bDC\b|\bPOS\b|\bcard\b\s+(?:no\.?\s*)?(?:x{2,4}|\*{2,4}|\d))/i.test(text)) return 'CARD'
  if (/\b(ATM withdrawal|cash withdrawal|withdrew cash)\b/i.test(text)) return 'CASH'
  return undefined
}

function extractMerchant(text: string, direction: 'DEBIT' | 'CREDIT' | undefined): string | undefined {
  // DEBIT → text after "at"/"to". CREDIT → after "from".
  // Stop at "on", "via", "Avl", "Bal", "Ref" (case-insensitive).
  const stop = /(?=\s+(?:on|via|Avl|Bal|Ref|UPI|Info|Date|Trxn)\b|[.,!?\n]|$)/i
  const startToken =
    direction === 'CREDIT' ? /\b(?:from)\s+([^\n,.;]+?)(?=\s+(?:on|via|Avl|Bal|Ref|UPI|Info|Date|Trxn)\b|[.,!?\n]|$)/i
    : direction === 'DEBIT'  ? /\b(?:at|to)\s+([^\n,.;]+?)(?=\s+(?:on|via|Avl|Bal|Ref|UPI|Info|Date|Trxn)\b|[.,!?\n]|$)/i
    :                          /\b(?:at|to|from)\s+([^\n,.;]+?)(?=\s+(?:on|via|Avl|Bal|Ref|UPI|Info|Date|Trxn)\b|[.,!?\n]|$)/i
  void stop
  const m = text.match(startToken)
  if (!m) return undefined
  const raw = m[1].trim()
  if (raw.length < 2 || raw.length > 60) return undefined
  // Strip a trailing UPI handle.
  const cleaned = raw.replace(/\s*@\S+$/, '').trim()
  return cleaned.length >= 2 ? cleaned : undefined
}

function extractDate(text: string): string | undefined {
  // DD-MMM-YY / DD-MMM-YYYY  e.g. 23-Oct-24
  const a = text.match(/\b(\d{1,2})[-\s\/]+([A-Za-z]{3})[-\s\/]+(\d{2,4})\b/)
  if (a) {
    const dd = parseInt(a[1], 10)
    const mo = MONTHS[a[2].toLowerCase()]
    let yy = parseInt(a[3], 10)
    if (yy < 100) yy = 2000 + yy
    if (mo && dd >= 1 && dd <= 31) return iso(yy, mo, dd)
  }
  // DD/MM/YY or DD-MM-YY
  const b = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/)
  if (b) {
    const dd = parseInt(b[1], 10)
    const mo = parseInt(b[2], 10)
    let yy = parseInt(b[3], 10)
    if (yy < 100) yy = 2000 + yy
    if (mo >= 1 && mo <= 12 && dd >= 1 && dd <= 31) return iso(yy, mo, dd)
  }
  // YYYY-MM-DD (already ISO)
  const c = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (c) return c[0]
  return undefined
}

function extractAccountHint(text: string): string | undefined {
  // "a/c XX1234" · "account xxxx1234" · "card ending 1234" · "**1234"
  const m = text.match(/(?:a\/c|account|card(?:\s+(?:no\.?|ending))?|XX|xx|\*{2,4})\s*\*{0,4}\s*(\d{4})\b/i)
  return m?.[1]
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// ─── Main entry ───────────────────────────────────────────────────────

export function parseSms(rawText: string): ParsedSms {
  const text = rawText.trim()
  if (text.length === 0) {
    return { success: false, confidence: 0, rawText, parser: 'failed' }
  }

  const amount      = extractAmount(text)
  const direction   = extractDirection(text)
  const paymentMode = extractPaymentMode(text)
  const merchant    = extractMerchant(text, direction)
  const date        = extractDate(text)
  const acctHint    = extractAccountHint(text)

  // Confidence rubric
  let conf = 0
  if (amount    !== undefined) conf += 0.35
  if (direction !== undefined) conf += 0.20
  if (merchant  !== undefined) conf += 0.20
  if (date      !== undefined) conf += 0.10
  if (paymentMode !== undefined) conf += 0.10
  if (acctHint  !== undefined) conf += 0.05
  conf = Math.min(1, conf)

  // Threshold for "deterministic success" — amount + direction is the floor.
  if (amount === undefined || direction === undefined || conf < 0.5) {
    return { success: false, confidence: round(conf, 2), rawText, parser: 'failed' }
  }

  const description = buildDescription(direction, amount, merchant, paymentMode)
  return {
    success: true,
    confidence: round(conf, 2),
    rawText,
    parser: 'regex',
    transaction: {
      date,
      amount,
      currency: 'INR',
      direction,
      merchantName: merchant,
      accountHint: acctHint,
      paymentMode,
      description,
    },
  }
}

function buildDescription(
  dir: 'DEBIT' | 'CREDIT',
  amount: number,
  merchant: string | undefined,
  mode: PaymentMode | undefined,
): string {
  const verb = dir === 'DEBIT' ? 'Spent' : 'Received'
  const tail = merchant ? ` ${dir === 'DEBIT' ? 'at' : 'from'} ${merchant}` : ''
  const modeTail = mode && mode !== 'OTHER' ? ` via ${labelForMode(mode)}` : ''
  return `${verb} ₹${amount.toLocaleString('en-IN')}${tail}${modeTail}`.trim()
}

function labelForMode(m: PaymentMode): string {
  switch (m) {
    case 'UPI': return 'UPI'
    case 'CARD': return 'Card'
    case 'CASH': return 'Cash'
    case 'NET_BANKING': return 'Net-banking'
    case 'AUTO_DEBIT': return 'Auto-debit'
    case 'OTHER': return 'Other'
  }
}

function round(v: number, d: number): number {
  const f = Math.pow(10, d)
  return Math.round(v * f) / f
}
