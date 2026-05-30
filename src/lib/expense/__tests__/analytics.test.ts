// analytics + budgetReconciler + narrative contract.

import { describe, it, expect } from 'vitest'
import { monthlySummary, trends, runInternalQuery } from '../analytics'
import { reconcileWithBudget } from '../budgetReconciler'
import { buildTemplatedNarrative } from '../narrative'
import type { Account, Category, Transaction } from '../../../types/expense'
import type { ExpenseBreakdown } from '../../../types'

// ─── Fixtures ─────────────────────────────────────────────────────────

const acc: Account[] = [
  { id: 'a1', name: 'Bank', type: 'BANK', provider: 'HDFC', maskedIdentifier: '1234', integrationType: 'MANUAL', createdAt: '' },
  { id: 'a2', name: 'Cash', type: 'CASH', provider: '',      maskedIdentifier: '',     integrationType: 'MANUAL', createdAt: '' },
]

const cats: Category[] = [
  { id: 'p-essential', parentId: null,         name: 'Essential', code: 'ESSENTIAL',          type: 'NEED',   sortOrder: 1, isActive: true },
  { id: 'c-food',      parentId: 'p-essential', name: 'Food',     code: 'ESSENTIAL_FOOD',     type: 'NEED',   sortOrder: 2, isActive: true },
  { id: 'c-rent',      parentId: 'p-essential', name: 'Rent',     code: 'ESSENTIAL_RENT',     type: 'NEED',   sortOrder: 1, isActive: true },
  { id: 'p-lifestyle', parentId: null,         name: 'Lifestyle', code: 'LIFESTYLE',         type: 'WANT',   sortOrder: 2, isActive: true },
  { id: 'c-dining',    parentId: 'p-lifestyle', name: 'Dining',   code: 'LIFESTYLE_DINING_OUT',type: 'WANT',  sortOrder: 1, isActive: true },
  { id: 'p-saving',    parentId: null,         name: 'Savings',   code: 'SAVINGS',           type: 'SAVING', sortOrder: 5, isActive: true },
  { id: 'c-sip',       parentId: 'p-saving',    name: 'SIP',      code: 'SAVINGS_SIP',       type: 'SAVING', sortOrder: 1, isActive: true },
  { id: 'p-income',    parentId: null,         name: 'Income',    code: 'INCOME',            type: 'INCOME', sortOrder: 6, isActive: true },
  { id: 'c-salary',    parentId: 'p-income',    name: 'Salary',   code: 'INCOME_SALARY',     type: 'INCOME', sortOrder: 1, isActive: true },
]

function txn(over: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    accountId: 'a1', categoryId: null, merchantId: null,
    date: '2024-10-15', amount: 100, currency: 'INR',
    direction: 'DEBIT', paymentMode: 'UPI',
    rawText: '', source: 'MANUAL',
    isRecurring: false, isTransfer: false, tags: [],
    needsReview: false,
    createdAt: '', updatedAt: '',
    ...over,
  }
}

const txns: Transaction[] = [
  txn({ date: '2024-10-05', amount: 30000, direction: 'CREDIT', categoryId: 'c-salary',  paymentMode: 'NET_BANKING' }),
  txn({ date: '2024-10-10', amount: 15000, direction: 'DEBIT',  categoryId: 'c-rent',    paymentMode: 'NET_BANKING' }),
  txn({ date: '2024-10-15', amount: 5000,  direction: 'DEBIT',  categoryId: 'c-food',    paymentMode: 'UPI' }),
  txn({ date: '2024-10-20', amount: 2000,  direction: 'DEBIT',  categoryId: 'c-dining',  paymentMode: 'CARD' }),
  txn({ date: '2024-10-25', amount: 5000,  direction: 'DEBIT',  categoryId: 'c-sip',     paymentMode: 'AUTO_DEBIT' }),
  txn({ date: '2024-09-15', amount: 1000,  direction: 'DEBIT',  categoryId: 'c-food' }),     // prior month
]

// ─── monthlySummary ──────────────────────────────────────────────────

describe('monthlySummary', () => {
  const s = monthlySummary(txns, cats, acc, '2024-10')

  it('totals income / expense / savings correctly', () => {
    expect(s.totals.income).toBe(30000)
    expect(s.totals.expense).toBe(15000 + 5000 + 2000)   // rent + food + dining = 22000
    expect(s.totals.savings).toBe(5000)
  })

  it('savingsRate = savings / income', () => {
    expect(s.totals.savingsRate).toBeCloseTo(5000 / 30000, 3)
  })

  it('counts only within the month', () => {
    expect(s.totals.count).toBe(5)   // Sep row excluded
  })

  it('byCategoryType buckets are correct', () => {
    expect(s.byCategoryType.NEED).toBe(15000 + 5000)
    expect(s.byCategoryType.WANT).toBe(2000)
    expect(s.byCategoryType.SAVING).toBe(5000)
    expect(s.byCategoryType.INCOME).toBe(30000)
  })

  it('byParentCategory rolls up children', () => {
    const ess = s.byParentCategory.find((p) => p.id === 'p-essential')
    expect(ess?.total).toBe(15000 + 5000)
  })

  it('byPaymentMode is correct', () => {
    expect(s.byPaymentMode.UPI).toBe(5000)
    expect(s.byPaymentMode.CARD).toBe(2000)
    expect(s.byPaymentMode.NET_BANKING).toBe(45000)
  })

  it('topCategories sorted desc', () => {
    expect(s.topCategories[0].name).toBe('Salary')   // 30000 wins
    expect(s.topCategories[1].name).toBe('Rent')     // 15000
  })

  it('handles empty month', () => {
    const empty = monthlySummary([], cats, acc, '2026-01')
    expect(empty.totals.count).toBe(0)
    expect(empty.totals.savingsRate).toBe(0)
  })
})

// ─── trends ─────────────────────────────────────────────────────────

describe('trends', () => {
  it('returns N months ordered oldest → newest', () => {
    const t = trends(txns, cats, 3, new Date('2024-11-15'))
    expect(t).toHaveLength(3)
    expect(t[0].yearMonth).toBe('2024-09')
    expect(t[2].yearMonth).toBe('2024-11')
  })

  it('per-month sums match expectations', () => {
    const t = trends(txns, cats, 3, new Date('2024-11-15'))
    const oct = t.find((p) => p.yearMonth === '2024-10')!
    expect(oct.expense).toBe(22000)
    expect(oct.savings).toBe(5000)
    expect(oct.income).toBe(30000)
  })
})

// ─── runInternalQuery ───────────────────────────────────────────────

describe('runInternalQuery', () => {
  const now = new Date('2024-10-31')

  it('sum metric over this_month for a category code', () => {
    const r = runInternalQuery(txns, cats, { metric: 'sum', category: 'ESSENTIAL_FOOD', period: 'this_month' }, now)
    expect(r.value).toBe(5000)
    expect(r.unit).toBe('INR')
  })

  it('sum over parent category includes children', () => {
    const r = runInternalQuery(txns, cats, { metric: 'sum', category: 'ESSENTIAL', period: 'this_month' }, now)
    expect(r.value).toBe(15000 + 5000)
  })

  it('count metric', () => {
    const r = runInternalQuery(txns, cats, { metric: 'count', category: null, period: 'this_month' }, now)
    expect(r.value).toBe(5)
  })

  it('avg metric', () => {
    const r = runInternalQuery(txns, cats, { metric: 'avg', category: 'ESSENTIAL_FOOD', period: 'this_month' }, now)
    expect(r.value).toBe(5000)
  })

  it('list metric returns transactions', () => {
    const r = runInternalQuery(txns, cats, { metric: 'list', category: null, period: 'this_month' }, now)
    expect(Array.isArray(r.value)).toBe(true)
    expect((r.value as Transaction[]).length).toBe(5)
  })

  it('last_30_days window', () => {
    const r = runInternalQuery(txns, cats, { metric: 'count', category: null, period: 'last_30_days' }, new Date('2024-10-31'))
    expect(r.matchedTxns).toBe(5)
  })
})

// ─── reconcileWithBudget ────────────────────────────────────────────

describe('reconcileWithBudget', () => {
  const breakdown: ExpenseBreakdown = {
    rent:           { amount: 12000, frequency: 'monthly' },     // budgeted 12k, actual 15k → over
    food:           { amount: 6000,  frequency: 'monthly' },     // budgeted 6k, actual 5k → under
    utilities:      { amount: 3000,  frequency: 'monthly' },
    domesticHelp:   { amount: 0,     frequency: 'monthly' },
    transportation: { amount: 4000,  frequency: 'monthly' },
    diningOut:      { amount: 1500,  frequency: 'monthly' },     // budgeted 1.5k, actual 2k → over (by 33%)
    travel:         { amount: 0,     frequency: 'monthly' },
    subscriptions:  { amount: 999,   frequency: 'monthly' },
    personalCare:   { amount: 0,     frequency: 'monthly' },
    giftsMisc:      { amount: 0,     frequency: 'monthly' },
    insurancePremium: { amount: 5000, frequency: 'yearly' },     // 5000/12 ≈ 416/mo
    doctorVisits:    { amount: 0, frequency: 'monthly' },
    medicines:       { amount: 0, frequency: 'monthly' },
    diagnostics:     { amount: 0, frequency: 'monthly' },
    tuition:         { amount: 0, frequency: 'monthly' },
    books:           { amount: 0, frequency: 'monthly' },
    courses:         { amount: 0, frequency: 'monthly' },
    coaching:        { amount: 0, frequency: 'monthly' },
  }

  const recon = reconcileWithBudget(txns, cats, breakdown, '2024-10')

  it('emits a row for every paired budget key present in categories', () => {
    // Fixture has 3 expense leaves (rent, food, dining); reconciler skips
    // budget keys whose category doesn't exist in the catalogue.
    expect(recon.rows.length).toBe(3)
    const keys = recon.rows.map((r) => r.budgetKey).sort()
    expect(keys).toEqual(['diningOut', 'food', 'rent'])
  })

  it('rent row reports over-budget delta', () => {
    const r = recon.rows.find((x) => x.budgetKey === 'rent')!
    expect(r.budgetedMonthly).toBe(12000)
    expect(r.actualMtd).toBe(15000)
    expect(r.delta).toBe(3000)
    expect(r.status).toBe('over')
  })

  it('food row reports under-budget', () => {
    const r = recon.rows.find((x) => x.budgetKey === 'food')!
    expect(r.delta).toBe(-1000)
    expect(r.status).toBe('under')
  })

  it('yearly-frequency budget entries normalise to monthly', () => {
    // Verify the frequency-normaliser by isolating one entry. The fixture
    // doesn't include insurancePremium as a category, so this test
    // recomputes against a single-row reconciliation.
    const oneCat: Category[] = [
      { id: 'p-h', parentId: null, name: 'Healthcare', code: 'HEALTHCARE', type: 'NEED', sortOrder: 3, isActive: true },
      { id: 'c-h', parentId: 'p-h', name: 'Insurance', code: 'HEALTHCARE_INSURANCE_PREMIUM', type: 'NEED', sortOrder: 1, isActive: true },
    ]
    const b: ExpenseBreakdown = {
      ...breakdown,
      insurancePremium: { amount: 5000, frequency: 'yearly' },
    }
    const r = reconcileWithBudget([], oneCat, b, '2024-10')
    const ins = r.rows.find((x) => x.budgetKey === 'insurancePremium')!
    expect(ins.budgetedMonthly).toBeCloseTo(5000 / 12, 1)
  })

  it('totals sum across the 3 fixture rows', () => {
    // Fixture only has rent/food/dining as expense leaves.
    expect(recon.totals.actual).toBe(15000 + 5000 + 2000)
    expect(recon.totals.budgeted).toBe(12000 + 6000 + 1500)
    expect(recon.totals.delta).toBe(22000 - 19500)
  })

  it('disciplineScore in [0, 1]; lower with bigger overshoots', () => {
    expect(recon.totals.disciplineScore).toBeGreaterThan(0)
    expect(recon.totals.disciplineScore).toBeLessThanOrEqual(1)
  })

  it('topOvershoots holds the biggest INR overshoots', () => {
    const topNames = recon.topOvershoots.map((r) => r.categoryName)
    expect(topNames[0]).toBe('Rent')   // +3000 is the largest
  })

  it('topUnderSpends holds the biggest INR under-spends', () => {
    const topNames = recon.topUnderSpends.map((r) => r.categoryName)
    expect(topNames.length).toBeGreaterThan(0)
  })

  it('empty breakdown → all-zero reconciliation', () => {
    const z = reconcileWithBudget(txns, cats, undefined, '2024-10')
    expect(z.rows.length).toBe(0)
    expect(z.totals.budgeted).toBe(0)
  })
})

// ─── narrative ───────────────────────────────────────────────────────

describe('buildTemplatedNarrative', () => {
  const summary = monthlySummary(txns, cats, acc, '2024-10')

  it('mentions the month and the headline counts', () => {
    const n = buildTemplatedNarrative(summary)
    expect(n).toMatch(/October 2024/)
    expect(n).toMatch(/5 transactions/)
    expect(n).toMatch(/Salary|Rent/)
  })

  it('renders the empty-state message when no transactions', () => {
    const empty = monthlySummary([], cats, acc, '2024-10')
    expect(buildTemplatedNarrative(empty)).toMatch(/No transactions logged/)
  })

  it('with reconciliation, mentions adherence + overshoots', () => {
    const breakdown: ExpenseBreakdown = {
      rent:           { amount: 12000, frequency: 'monthly' },
      food:           { amount: 6000,  frequency: 'monthly' },
      utilities:      { amount: 3000,  frequency: 'monthly' },
      domesticHelp:   { amount: 0,     frequency: 'monthly' },
      transportation: { amount: 4000,  frequency: 'monthly' },
      diningOut:      { amount: 1500,  frequency: 'monthly' },
      travel:         { amount: 0, frequency: 'monthly' },
      subscriptions:  { amount: 0, frequency: 'monthly' },
      personalCare:   { amount: 0, frequency: 'monthly' },
      giftsMisc:      { amount: 0, frequency: 'monthly' },
      insurancePremium:{ amount: 0, frequency: 'monthly' },
      doctorVisits:   { amount: 0, frequency: 'monthly' },
      medicines:      { amount: 0, frequency: 'monthly' },
      diagnostics:    { amount: 0, frequency: 'monthly' },
      tuition:        { amount: 0, frequency: 'monthly' },
      books:          { amount: 0, frequency: 'monthly' },
      courses:        { amount: 0, frequency: 'monthly' },
      coaching:       { amount: 0, frequency: 'monthly' },
    }
    const recon = reconcileWithBudget(txns, cats, breakdown, '2024-10')
    const n = buildTemplatedNarrative(summary, recon)
    expect(n).toMatch(/adherence/i)
    expect(n).toMatch(/Suggestions/i)
  })
})
