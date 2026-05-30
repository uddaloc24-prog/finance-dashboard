// Smart Expense Tracker — type contract (client-only adaptation).
//
// Mirrors the .md §2 data model with the auth / multi-user fields
// dropped (this app is single-device · localStorage · no backend).

// ─── Account ──────────────────────────────────────────────────────────

export type AccountType = 'BANK' | 'CREDIT_CARD' | 'WALLET' | 'CASH'
export type IntegrationType = 'SMS' | 'EMAIL' | 'BANK_API' | 'MANUAL'

export interface Account {
  id: string
  name: string
  type: AccountType
  provider: string                 // 'HDFC', 'SBI', 'ICICI', 'PhonePe', 'Cash', ...
  /** Last-4 (cards / accounts) or empty for cash/wallet. */
  maskedIdentifier: string
  integrationType: IntegrationType
  createdAt: string                // ISO
  lastSyncAt?: string              // ISO; reserved for Phase 2 connectors
}

// ─── Category ─────────────────────────────────────────────────────────

export type CategoryType = 'NEED' | 'WANT' | 'SAVING' | 'INCOME'

export interface Category {
  id: string
  parentId: string | null
  name: string
  /** Stable code so seed rules + future LLM categorisation are upgrade-proof. */
  code: string                     // e.g. 'FOOD_GROCERIES'
  type: CategoryType
  sortOrder: number
  isActive: boolean
}

// ─── Merchant ─────────────────────────────────────────────────────────

export interface Merchant {
  id: string
  nameNormalized: string
  defaultCategoryId: string | null
  notes?: string
}

// ─── Transaction ──────────────────────────────────────────────────────

export type Direction = 'DEBIT' | 'CREDIT'
export type PaymentMode = 'UPI' | 'CARD' | 'CASH' | 'NET_BANKING' | 'AUTO_DEBIT' | 'OTHER'
export type Source = 'SMS' | 'EMAIL' | 'BANK_API' | 'MANUAL'

export interface Transaction {
  id: string
  accountId: string
  categoryId: string | null
  merchantId: string | null
  date: string                     // YYYY-MM-DD
  amount: number                   // always positive; `direction` carries sign
  currency: string                 // 'INR' default
  direction: Direction
  paymentMode: PaymentMode
  /** Original SMS body / CSV row / manual-input text — Phase-2 ingestion uses this. */
  rawText: string
  source: Source
  isRecurring: boolean
  isTransfer: boolean
  tags: string[]
  needsReview: boolean
  notes?: string
  createdAt: string                // ISO
  updatedAt: string                // ISO
}

// ─── Rule (Phase-2 categorisation engine, type stubbed here) ──────────

export type RuleMatchType =
  | 'MERCHANT_CONTAINS'
  | 'SENDER_EQUALS'
  | 'TEXT_REGEX'
  | 'AMOUNT_EQUALS'
  | 'RECURRENCE_PATTERN'

export interface Rule {
  id: string
  matchType: RuleMatchType
  pattern: string
  suggestedCategoryId: string
  suggestedTags: string[]
  /** Lower → runs first. */
  priority: number
  isActive: boolean
}

// ─── Budget (Phase-3 analytics, type stubbed here) ────────────────────

export type BudgetPeriod = 'MONTHLY' | 'YEARLY'

export interface Budget {
  id: string
  categoryId: string
  period: BudgetPeriod
  limitAmount: number
  currency: string
  startDate: string                // YYYY-MM-DD
  endDate?: string                 // YYYY-MM-DD, optional open-ended
}
