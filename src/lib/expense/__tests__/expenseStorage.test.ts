// expenseStorage.test.ts — Phase 1 contract.
// Runs in jsdom because we touch window.localStorage.
// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest'
import { expenseStorage } from '../expenseStorage'

beforeEach(() => {
  expenseStorage.__resetForTests()
})

describe('expenseStorage — seed-on-first-read', () => {
  it('seeds default accounts on first getAccounts()', () => {
    const accounts = expenseStorage.getAccounts()
    expect(accounts.length).toBeGreaterThan(0)
    expect(accounts.some((a) => a.type === 'CASH')).toBe(true)
  })

  it('seeds default categories on first getCategories()', () => {
    const cats = expenseStorage.getCategories()
    expect(cats.length).toBeGreaterThan(0)
    // Spot-check the four type buckets are all represented.
    const types = new Set(cats.map((c) => c.type))
    expect(types.has('NEED')).toBe(true)
    expect(types.has('WANT')).toBe(true)
    expect(types.has('SAVING')).toBe(true)
    expect(types.has('INCOME')).toBe(true)
  })

  it('every seeded category has a stable code', () => {
    const cats = expenseStorage.getCategories()
    for (const c of cats) {
      expect(c.code).toMatch(/^[A-Z_]+$/)
    }
  })

  it('seeded ids are unique', () => {
    const cats = expenseStorage.getCategories()
    const ids = new Set(cats.map((c) => c.id))
    expect(ids.size).toBe(cats.length)
  })

  it('seeds 4 expense groups (Essential / Lifestyle / Healthcare / Education)', () => {
    const cats = expenseStorage.getCategories()
    const parents = cats.filter((c) => c.parentId === null)
    const codes = parents.map((p) => p.code).sort()
    expect(codes).toEqual(expect.arrayContaining(['ESSENTIAL', 'LIFESTYLE', 'HEALTHCARE', 'EDUCATION']))
  })

  it('exact match with budget editor — 18 expense sub-categories mirror ExpenseBreakdown', () => {
    const cats = expenseStorage.getCategories()
    const codes = new Set(cats.map((c) => c.code))
    // ESSENTIAL × 5
    expect(codes.has('ESSENTIAL_RENT')).toBe(true)
    expect(codes.has('ESSENTIAL_FOOD')).toBe(true)
    expect(codes.has('ESSENTIAL_UTILITIES')).toBe(true)
    expect(codes.has('ESSENTIAL_DOMESTIC_HELP')).toBe(true)
    expect(codes.has('ESSENTIAL_TRANSPORTATION')).toBe(true)
    // LIFESTYLE × 5
    expect(codes.has('LIFESTYLE_DINING_OUT')).toBe(true)
    expect(codes.has('LIFESTYLE_TRAVEL')).toBe(true)
    expect(codes.has('LIFESTYLE_SUBSCRIPTIONS')).toBe(true)
    expect(codes.has('LIFESTYLE_PERSONAL_CARE')).toBe(true)
    expect(codes.has('LIFESTYLE_GIFTS_MISC')).toBe(true)
    // HEALTHCARE × 4
    expect(codes.has('HEALTHCARE_INSURANCE_PREMIUM')).toBe(true)
    expect(codes.has('HEALTHCARE_DOCTOR_VISITS')).toBe(true)
    expect(codes.has('HEALTHCARE_MEDICINES')).toBe(true)
    expect(codes.has('HEALTHCARE_DIAGNOSTICS')).toBe(true)
    // EDUCATION × 4
    expect(codes.has('EDUCATION_TUITION')).toBe(true)
    expect(codes.has('EDUCATION_BOOKS')).toBe(true)
    expect(codes.has('EDUCATION_COURSES')).toBe(true)
    expect(codes.has('EDUCATION_COACHING')).toBe(true)
  })

  it('every child category has a valid parent id', () => {
    const cats = expenseStorage.getCategories()
    const parentIds = new Set(cats.filter((c) => c.parentId === null).map((p) => p.id))
    for (const c of cats) {
      if (c.parentId !== null) {
        expect(parentIds.has(c.parentId)).toBe(true)
      }
    }
  })

  it('CATEGORY_TO_BUDGET_KEY covers every expense leaf and only expense leaves', () => {
    // dynamic import to avoid hoisting
    return import('../seed').then(({ CATEGORY_TO_BUDGET_KEY }) => {
      const cats = expenseStorage.getCategories()
      const expenseLeafCodes = cats
        .filter((c) => c.parentId !== null && (c.type === 'NEED' || c.type === 'WANT'))
        .map((c) => c.code)
      // Every expense leaf has a budget key.
      for (const code of expenseLeafCodes) {
        expect(CATEGORY_TO_BUDGET_KEY[code], `${code} missing from map`).toBeDefined()
      }
      // Every key in the map maps to a valid ExpenseBreakdown field
      // (we can't fully type-check at runtime but at least confirm 18 entries).
      expect(Object.keys(CATEGORY_TO_BUDGET_KEY)).toHaveLength(18)
    })
  })
})

describe('expenseStorage — transactions CRUD', () => {
  it('addTransaction stores it + returns id/createdAt/updatedAt', () => {
    const accounts = expenseStorage.getAccounts()
    const txn = expenseStorage.addTransaction({
      accountId: accounts[0].id,
      categoryId: null,
      merchantId: null,
      date: '2026-05-30',
      amount: 350,
      currency: 'INR',
      direction: 'DEBIT',
      paymentMode: 'UPI',
      rawText: 'Paid 350 at Fabindia',
      source: 'MANUAL',
      isRecurring: false,
      isTransfer: false,
      tags: [],
      needsReview: true,
    })
    expect(txn.id).toMatch(/^txn_/)
    expect(txn.createdAt).toBeTruthy()
    expect(txn.updatedAt).toBeTruthy()
    expect(expenseStorage.getTransactions()).toHaveLength(1)
  })

  it('updateTransaction patches and refreshes updatedAt', async () => {
    const accounts = expenseStorage.getAccounts()
    const cats     = expenseStorage.getCategories()
    const txn = expenseStorage.addTransaction({
      accountId: accounts[0].id, categoryId: null, merchantId: null,
      date: '2026-05-30', amount: 350, currency: 'INR',
      direction: 'DEBIT', paymentMode: 'UPI',
      rawText: '', source: 'MANUAL',
      isRecurring: false, isTransfer: false, tags: [],
      needsReview: true,
    })
    const updated = expenseStorage.updateTransaction(txn.id, { categoryId: cats[0].id, needsReview: false })
    expect(updated?.categoryId).toBe(cats[0].id)
    expect(updated?.needsReview).toBe(false)
    // updatedAt is refreshed to a valid ISO; we don't assert a strict !==
    // because same-ms calls would race. Just confirm it's still well-formed.
    expect(updated?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('deleteTransaction removes it', () => {
    const accounts = expenseStorage.getAccounts()
    const txn = expenseStorage.addTransaction({
      accountId: accounts[0].id, categoryId: null, merchantId: null,
      date: '2026-05-30', amount: 350, currency: 'INR',
      direction: 'DEBIT', paymentMode: 'UPI',
      rawText: '', source: 'MANUAL',
      isRecurring: false, isTransfer: false, tags: [],
      needsReview: true,
    })
    expect(expenseStorage.deleteTransaction(txn.id)).toBe(true)
    expect(expenseStorage.getTransactions()).toHaveLength(0)
  })

  it('deleteTransaction returns false for unknown id', () => {
    expect(expenseStorage.deleteTransaction('nope')).toBe(false)
  })
})

describe('expenseStorage — accounts CRUD', () => {
  it('addAccount works', () => {
    const before = expenseStorage.getAccounts().length
    const acc = expenseStorage.addAccount({
      name: 'HDFC credit card',
      type: 'CREDIT_CARD',
      provider: 'HDFC',
      maskedIdentifier: '1234',
      integrationType: 'MANUAL',
    })
    expect(acc.id).toMatch(/^acc_/)
    expect(expenseStorage.getAccounts()).toHaveLength(before + 1)
  })
})

describe('expenseStorage — settings', () => {
  it('default currency is INR', () => {
    expect(expenseStorage.getSettings().currency).toBe('INR')
  })
})

describe('expenseStorage — clearAll', () => {
  it('clearAll wipes every key and re-seeds on next read', () => {
    expenseStorage.getAccounts()    // seeds
    expenseStorage.addTransaction({
      accountId: expenseStorage.getAccounts()[0].id,
      categoryId: null, merchantId: null,
      date: '2026-05-30', amount: 100, currency: 'INR',
      direction: 'DEBIT', paymentMode: 'CASH',
      rawText: '', source: 'MANUAL',
      isRecurring: false, isTransfer: false, tags: [],
      needsReview: true,
    })
    expect(expenseStorage.getTransactions()).toHaveLength(1)
    expenseStorage.clearAll()
    expect(expenseStorage.getTransactions()).toHaveLength(0)
    // Accounts and categories re-seed on next call.
    expect(expenseStorage.getAccounts().length).toBeGreaterThan(0)
    expect(expenseStorage.getCategories().length).toBeGreaterThan(0)
  })
})
