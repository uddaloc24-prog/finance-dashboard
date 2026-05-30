// Expense Tracker — localStorage adapter. Mirrors `src/lib/storage.ts`'s
// shape (typed get/set with safe defaults) so the rest of the app can
// query expense data in a consistent way.
//
// Storage keys are prefixed `exp_` so they don't collide with planner
// state. First-time read seeds default accounts + categories.

import type {
  Account, Category, Merchant, Transaction, Rule, Budget,
} from '../../types/expense'
import { SEED_ACCOUNTS, SEED_GROUPS } from './seed'

// ─── Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  ACCOUNTS:     'exp_accounts',
  CATEGORIES:   'exp_categories',
  MERCHANTS:    'exp_merchants',
  TRANSACTIONS: 'exp_transactions',
  RULES:        'exp_rules',
  BUDGETS:      'exp_budgets',
  SETTINGS:     'exp_settings',
  SCHEMA:       'exp_schema_version',
} as const

const SCHEMA_VERSION = 1

// ─── Low-level get / set ──────────────────────────────────────────────

function get<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch { return null }
}

function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(key, JSON.stringify(value)) }
  catch { /* quota / privacy errors are non-fatal */ }
}

function remove(key: string): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(key) } catch { /* ignore */ }
}

// ─── ID generation (deterministic per call, monotonic-ish) ────────────

let _counter = 0
function makeId(prefix: string): string {
  _counter += 1
  const t = Date.now().toString(36)
  const c = _counter.toString(36).padStart(2, '0')
  const r = Math.random().toString(36).slice(2, 6)
  return `${prefix}_${t}${c}${r}`
}

// ─── Settings (currency, etc.) ────────────────────────────────────────

export interface ExpenseSettings {
  currency: string                 // ISO 4217 — default 'INR'
}

const DEFAULT_SETTINGS: ExpenseSettings = { currency: 'INR' }

// ─── Seed-on-first-read ───────────────────────────────────────────────

/** Ensures default accounts + categories exist. Idempotent. */
function ensureSeeded(): void {
  if (typeof window === 'undefined') return
  const existing = get<number>(KEYS.SCHEMA)
  if (existing === SCHEMA_VERSION) return

  const now = new Date().toISOString()

  if (!get<Account[]>(KEYS.ACCOUNTS)) {
    const seeded: Account[] = SEED_ACCOUNTS.map((a) => ({
      ...a, id: makeId('acc'), createdAt: now,
    }))
    set(KEYS.ACCOUNTS, seeded)
  }
  if (!get<Category[]>(KEYS.CATEGORIES)) {
    // Parents first so we can wire children to their parentId.
    const out: Category[] = []
    for (const group of SEED_GROUPS) {
      const parentId = makeId('cat')
      out.push({ ...group.parent, id: parentId, parentId: null })
      for (const child of group.children) {
        out.push({ ...child, id: makeId('cat'), parentId })
      }
    }
    set(KEYS.CATEGORIES, out)
  }
  if (!get<Transaction[]>(KEYS.TRANSACTIONS)) set(KEYS.TRANSACTIONS, [])
  if (!get<Merchant[]>(KEYS.MERCHANTS))       set(KEYS.MERCHANTS, [])
  if (!get<Rule[]>(KEYS.RULES))               set(KEYS.RULES, [])
  if (!get<Budget[]>(KEYS.BUDGETS))           set(KEYS.BUDGETS, [])
  if (!get<ExpenseSettings>(KEYS.SETTINGS))   set(KEYS.SETTINGS, DEFAULT_SETTINGS)
  set(KEYS.SCHEMA, SCHEMA_VERSION)
}

// ─── Public API ───────────────────────────────────────────────────────

export const expenseStorage = {
  // Accounts
  getAccounts: (): Account[] => { ensureSeeded(); return get<Account[]>(KEYS.ACCOUNTS) ?? [] },
  setAccounts: (a: Account[]) => set(KEYS.ACCOUNTS, a),
  addAccount: (a: Omit<Account, 'id' | 'createdAt'>): Account => {
    ensureSeeded()
    const next: Account = { ...a, id: makeId('acc'), createdAt: new Date().toISOString() }
    const list = get<Account[]>(KEYS.ACCOUNTS) ?? []
    list.push(next); set(KEYS.ACCOUNTS, list); return next
  },
  updateAccount: (id: string, patch: Partial<Account>): Account | null => {
    const list = get<Account[]>(KEYS.ACCOUNTS) ?? []
    const idx = list.findIndex((a) => a.id === id)
    if (idx < 0) return null
    const next = { ...list[idx], ...patch, id: list[idx].id }
    list[idx] = next; set(KEYS.ACCOUNTS, list); return next
  },
  deleteAccount: (id: string): boolean => {
    const list = get<Account[]>(KEYS.ACCOUNTS) ?? []
    const next = list.filter((a) => a.id !== id)
    set(KEYS.ACCOUNTS, next); return next.length !== list.length
  },

  // Categories
  getCategories: (): Category[] => { ensureSeeded(); return get<Category[]>(KEYS.CATEGORIES) ?? [] },
  setCategories: (c: Category[]) => set(KEYS.CATEGORIES, c),
  addCategory: (c: Omit<Category, 'id'>): Category => {
    ensureSeeded()
    const next: Category = { ...c, id: makeId('cat') }
    const list = get<Category[]>(KEYS.CATEGORIES) ?? []
    list.push(next); set(KEYS.CATEGORIES, list); return next
  },

  // Transactions
  getTransactions: (): Transaction[] => { ensureSeeded(); return get<Transaction[]>(KEYS.TRANSACTIONS) ?? [] },
  setTransactions: (t: Transaction[]) => set(KEYS.TRANSACTIONS, t),
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction => {
    ensureSeeded()
    const now = new Date().toISOString()
    const next: Transaction = { ...t, id: makeId('txn'), createdAt: now, updatedAt: now }
    const list = get<Transaction[]>(KEYS.TRANSACTIONS) ?? []
    list.push(next); set(KEYS.TRANSACTIONS, list); return next
  },
  updateTransaction: (id: string, patch: Partial<Transaction>): Transaction | null => {
    const list = get<Transaction[]>(KEYS.TRANSACTIONS) ?? []
    const idx = list.findIndex((t) => t.id === id)
    if (idx < 0) return null
    const next = { ...list[idx], ...patch, id: list[idx].id, updatedAt: new Date().toISOString() }
    list[idx] = next; set(KEYS.TRANSACTIONS, list); return next
  },
  deleteTransaction: (id: string): boolean => {
    const list = get<Transaction[]>(KEYS.TRANSACTIONS) ?? []
    const next = list.filter((t) => t.id !== id)
    set(KEYS.TRANSACTIONS, next); return next.length !== list.length
  },

  // Merchants
  getMerchants: (): Merchant[] => { ensureSeeded(); return get<Merchant[]>(KEYS.MERCHANTS) ?? [] },
  setMerchants: (m: Merchant[]) => set(KEYS.MERCHANTS, m),

  // Rules (Phase 2)
  getRules: (): Rule[] => { ensureSeeded(); return get<Rule[]>(KEYS.RULES) ?? [] },
  setRules: (r: Rule[]) => set(KEYS.RULES, r),

  // Settings
  getSettings: (): ExpenseSettings => { ensureSeeded(); return get<ExpenseSettings>(KEYS.SETTINGS) ?? DEFAULT_SETTINGS },
  setSettings: (s: ExpenseSettings) => set(KEYS.SETTINGS, s),

  // Maintenance
  clearAll: (): void => {
    for (const k of Object.values(KEYS)) remove(k)
  },
  /** Test-only — re-seeds on next read. */
  __resetForTests: (): void => {
    for (const k of Object.values(KEYS)) remove(k)
    _counter = 0
  },
}
