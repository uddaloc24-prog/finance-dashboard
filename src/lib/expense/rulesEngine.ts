// rulesEngine — apply user/global Rules to a transaction-candidate to
// suggest a category + tags. .md §7 Stage 1 of the categorisation
// engine. Pure function — same input → same output.

import type { Rule, Direction, PaymentMode } from '../../types/expense'

export interface RuleCandidate {
  merchantName?: string
  rawText?: string
  amount: number
  direction: Direction
  paymentMode?: PaymentMode
  /** Optional sender for SMS-source candidates (e.g., 'HDFC_Bank'). */
  sender?: string
  /** Day-of-month, used by RECURRENCE_PATTERN. */
  date?: string
}

export interface RuleMatch {
  rule: Rule
  /** Category to assign. */
  categoryId: string
  /** Tags to merge in. */
  tags: string[]
}

/** Apply every active rule in priority order; first match wins. */
export function applyRules(candidate: RuleCandidate, rules: Rule[]): RuleMatch | null {
  const sorted = [...rules]
    .filter((r) => r.isActive)
    .sort((a, b) => a.priority - b.priority)

  for (const r of sorted) {
    if (matchesRule(r, candidate)) {
      return { rule: r, categoryId: r.suggestedCategoryId, tags: r.suggestedTags }
    }
  }
  return null
}

function matchesRule(r: Rule, c: RuleCandidate): boolean {
  switch (r.matchType) {
    case 'MERCHANT_CONTAINS':
      if (!c.merchantName) return false
      return c.merchantName.toLowerCase().includes(r.pattern.toLowerCase())

    case 'SENDER_EQUALS':
      if (!c.sender) return false
      return c.sender.toLowerCase() === r.pattern.toLowerCase()

    case 'TEXT_REGEX':
      if (!c.rawText) return false
      try {
        const re = new RegExp(r.pattern, 'i')
        return re.test(c.rawText)
      } catch { return false }

    case 'AMOUNT_EQUALS': {
      const target = parseFloat(r.pattern)
      if (!Number.isFinite(target)) return false
      // ±1 ₹ tolerance for rounding.
      return Math.abs(c.amount - target) < 1
    }

    case 'RECURRENCE_PATTERN': {
      // Pattern format: "monthly:DD" — fires when transaction date's
      // day-of-month equals DD (with ±1 day tolerance).
      const m = r.pattern.match(/^monthly:(\d{1,2})$/i)
      if (!m || !c.date) return false
      const target = parseInt(m[1], 10)
      const day = parseInt(c.date.slice(-2), 10)
      return Number.isFinite(day) && Math.abs(day - target) <= 1
    }
  }
}
