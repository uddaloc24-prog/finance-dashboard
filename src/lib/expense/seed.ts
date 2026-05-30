// Seed accounts + categories for the Expense Tracker.
//
// The four expense groups (Essential / Lifestyle / Healthcare / Education)
// and their 18 sub-categories MUST mirror the Plan-tab Monthly Budget
// editor exactly (src/types/index.ts → ExpenseBreakdown,
// src/components/ExpenseEditor.tsx). This lets us pair every logged
// transaction to the user's pre-committed budget and compute a
// budget-vs-actual delta — the signal we use for "discipline" and other
// behavioural read-outs.
//
// Two extra groups — Savings and Income — exist so the tracker can
// record SIP transfers and salary credits. They have no corresponding
// budget row and are skipped in the budget-vs-actual diff.

import type { Account, Category } from '../../types/expense'

// ─── Default accounts ────────────────────────────────────────────────

export const SEED_ACCOUNTS: Omit<Account, 'id' | 'createdAt'>[] = [
  {
    name: 'Cash',
    type: 'CASH',
    provider: 'Cash',
    maskedIdentifier: '',
    integrationType: 'MANUAL',
  },
  {
    name: 'Bank account',
    type: 'BANK',
    provider: '',
    maskedIdentifier: '',
    integrationType: 'MANUAL',
  },
]

// ─── Seed groups + sub-categories ────────────────────────────────────
//
// `parent.code` doubles as the group key. `child.code` is namespaced to
// the parent code (e.g. ESSENTIAL_RENT) so the budget-vs-actual
// reconciler can pair every transaction to a budget row deterministically.

export interface SeedGroup {
  parent: Omit<Category, 'id' | 'parentId'>
  children: Array<Omit<Category, 'id' | 'parentId'>>
}

export const SEED_GROUPS: SeedGroup[] = [
  // ── 01 · Essential ─────────────────────────────────────────────────
  {
    parent: { code: 'ESSENTIAL', name: 'Essential', type: 'NEED', sortOrder: 1, isActive: true },
    children: [
      { code: 'ESSENTIAL_RENT',           name: 'Rent / Housing',          type: 'NEED', sortOrder: 1, isActive: true },
      { code: 'ESSENTIAL_FOOD',           name: 'Food & Groceries',        type: 'NEED', sortOrder: 2, isActive: true },
      { code: 'ESSENTIAL_UTILITIES',      name: 'Utilities',               type: 'NEED', sortOrder: 3, isActive: true },
      { code: 'ESSENTIAL_DOMESTIC_HELP',  name: 'Domestic help',           type: 'NEED', sortOrder: 4, isActive: true },
      { code: 'ESSENTIAL_TRANSPORTATION', name: 'Transportation',          type: 'NEED', sortOrder: 5, isActive: true },
    ],
  },
  // ── 02 · Lifestyle ─────────────────────────────────────────────────
  {
    parent: { code: 'LIFESTYLE', name: 'Lifestyle', type: 'WANT', sortOrder: 2, isActive: true },
    children: [
      { code: 'LIFESTYLE_DINING_OUT',    name: 'Dining & Entertainment',   type: 'WANT', sortOrder: 1, isActive: true },
      { code: 'LIFESTYLE_TRAVEL',        name: 'Travel & Vacations',       type: 'WANT', sortOrder: 2, isActive: true },
      { code: 'LIFESTYLE_SUBSCRIPTIONS', name: 'Subscriptions',            type: 'WANT', sortOrder: 3, isActive: true },
      { code: 'LIFESTYLE_PERSONAL_CARE', name: 'Personal care',            type: 'WANT', sortOrder: 4, isActive: true },
      { code: 'LIFESTYLE_GIFTS_MISC',    name: 'Gifts & Misc',             type: 'WANT', sortOrder: 5, isActive: true },
    ],
  },
  // ── 03 · Healthcare ────────────────────────────────────────────────
  {
    parent: { code: 'HEALTHCARE', name: 'Healthcare', type: 'NEED', sortOrder: 3, isActive: true },
    children: [
      { code: 'HEALTHCARE_INSURANCE_PREMIUM', name: 'Insurance premium',      type: 'NEED', sortOrder: 1, isActive: true },
      { code: 'HEALTHCARE_DOCTOR_VISITS',     name: 'Doctor & Hospital',      type: 'NEED', sortOrder: 2, isActive: true },
      { code: 'HEALTHCARE_MEDICINES',         name: 'Medicines & Supplements',type: 'NEED', sortOrder: 3, isActive: true },
      { code: 'HEALTHCARE_DIAGNOSTICS',       name: 'Diagnostics & Tests',    type: 'NEED', sortOrder: 4, isActive: true },
    ],
  },
  // ── 04 · Education ─────────────────────────────────────────────────
  {
    parent: { code: 'EDUCATION', name: 'Education', type: 'NEED', sortOrder: 4, isActive: true },
    children: [
      { code: 'EDUCATION_TUITION',  name: 'Tuition / School fees',   type: 'NEED', sortOrder: 1, isActive: true },
      { code: 'EDUCATION_BOOKS',    name: 'Books & Supplies',        type: 'NEED', sortOrder: 2, isActive: true },
      { code: 'EDUCATION_COURSES',  name: 'Online courses',          type: 'NEED', sortOrder: 3, isActive: true },
      { code: 'EDUCATION_COACHING', name: 'Coaching / Tutoring',     type: 'NEED', sortOrder: 4, isActive: true },
    ],
  },
  // ── 05 · Savings — tracker-only (no budget pair) ───────────────────
  {
    parent: { code: 'SAVINGS', name: 'Savings', type: 'SAVING', sortOrder: 5, isActive: true },
    children: [
      { code: 'SAVINGS_SIP',       name: 'SIP / Mutual funds',         type: 'SAVING', sortOrder: 1, isActive: true },
      { code: 'SAVINGS_FD',        name: 'Fixed deposit',              type: 'SAVING', sortOrder: 2, isActive: true },
      { code: 'SAVINGS_PPF_EPF',   name: 'PPF / EPF / NPS',            type: 'SAVING', sortOrder: 3, isActive: true },
      { code: 'SAVINGS_INSURANCE', name: 'Life-insurance premium',     type: 'SAVING', sortOrder: 4, isActive: true },
    ],
  },
  // ── 06 · Income — tracker-only (no budget pair) ────────────────────
  {
    parent: { code: 'INCOME', name: 'Income', type: 'INCOME', sortOrder: 6, isActive: true },
    children: [
      { code: 'INCOME_SALARY',   name: 'Salary',          type: 'INCOME', sortOrder: 1, isActive: true },
      { code: 'INCOME_INTEREST', name: 'Interest',        type: 'INCOME', sortOrder: 2, isActive: true },
      { code: 'INCOME_DIVIDEND', name: 'Dividend',        type: 'INCOME', sortOrder: 3, isActive: true },
      { code: 'INCOME_RENT',     name: 'Rental income',   type: 'INCOME', sortOrder: 4, isActive: true },
      { code: 'INCOME_OTHER',    name: 'Other income',    type: 'INCOME', sortOrder: 5, isActive: true },
    ],
  },
  // ── 07 · Catchall ──────────────────────────────────────────────────
  {
    parent: { code: 'OTHER', name: 'Uncategorised', type: 'WANT', sortOrder: 99, isActive: true },
    children: [],
  },
]

// ─── Budget-pair mapping ──────────────────────────────────────────────
//
// Maps every category code that has a counterpart in the Plan-tab
// budget (src/types/index.ts → ExpenseBreakdown) to its budget key.
// Used by the future budget-vs-actual reconciler. Codes outside this
// map (Savings, Income, Catchall, parent groups) are excluded from the
// behavioural diff.

export const CATEGORY_TO_BUDGET_KEY: Record<string, keyof import('../../types').ExpenseBreakdown> = {
  ESSENTIAL_RENT:                 'rent',
  ESSENTIAL_FOOD:                 'food',
  ESSENTIAL_UTILITIES:            'utilities',
  ESSENTIAL_DOMESTIC_HELP:        'domesticHelp',
  ESSENTIAL_TRANSPORTATION:       'transportation',

  LIFESTYLE_DINING_OUT:           'diningOut',
  LIFESTYLE_TRAVEL:               'travel',
  LIFESTYLE_SUBSCRIPTIONS:        'subscriptions',
  LIFESTYLE_PERSONAL_CARE:        'personalCare',
  LIFESTYLE_GIFTS_MISC:           'giftsMisc',

  HEALTHCARE_INSURANCE_PREMIUM:   'insurancePremium',
  HEALTHCARE_DOCTOR_VISITS:       'doctorVisits',
  HEALTHCARE_MEDICINES:           'medicines',
  HEALTHCARE_DIAGNOSTICS:         'diagnostics',

  EDUCATION_TUITION:              'tuition',
  EDUCATION_BOOKS:                'books',
  EDUCATION_COURSES:              'courses',
  EDUCATION_COACHING:             'coaching',
}
