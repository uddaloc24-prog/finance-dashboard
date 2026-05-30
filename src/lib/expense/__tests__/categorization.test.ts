// rulesEngine + categorisation contract.

import { describe, it, expect } from 'vitest'
import { applyRules } from '../rulesEngine'
import { categorise, suggestRuleFromManualOverride } from '../categorization'
import type { Rule, Category, Transaction } from '../../../types/expense'

const cats: Category[] = [
  { id: 'cat-food',  parentId: null, name: 'Food',  code: 'ESSENTIAL_FOOD',           type: 'NEED', sortOrder: 1, isActive: true },
  { id: 'cat-sub',   parentId: null, name: 'Subs',  code: 'LIFESTYLE_SUBSCRIPTIONS',  type: 'WANT', sortOrder: 2, isActive: true },
  { id: 'cat-sal',   parentId: null, name: 'Sal',   code: 'INCOME_SALARY',            type: 'INCOME', sortOrder: 3, isActive: true },
]

const ruleFabindia: Rule = {
  id: 'r1', matchType: 'MERCHANT_CONTAINS', pattern: 'Fabindia',
  suggestedCategoryId: 'cat-food', suggestedTags: ['clothing'], priority: 1, isActive: true,
}
const ruleNetflix: Rule = {
  id: 'r2', matchType: 'MERCHANT_CONTAINS', pattern: 'Netflix',
  suggestedCategoryId: 'cat-sub', suggestedTags: [], priority: 2, isActive: true,
}
const ruleSalary: Rule = {
  id: 'r3', matchType: 'TEXT_REGEX', pattern: 'salary credit',
  suggestedCategoryId: 'cat-sal', suggestedTags: [], priority: 3, isActive: true,
}

// ─── rulesEngine ─────────────────────────────────────────────────────

describe('applyRules', () => {
  it('matches MERCHANT_CONTAINS', () => {
    const out = applyRules(
      { merchantName: 'Fabindia Mumbai', amount: 350, direction: 'DEBIT' },
      [ruleFabindia],
    )
    expect(out?.categoryId).toBe('cat-food')
    expect(out?.tags).toContain('clothing')
  })

  it('priority order matters — lower priority wins', () => {
    const r1: Rule = { ...ruleFabindia, suggestedCategoryId: 'cat-food', priority: 5 }
    const r2: Rule = { ...ruleFabindia, suggestedCategoryId: 'cat-sub',  priority: 1 }
    const out = applyRules({ merchantName: 'Fabindia', amount: 100, direction: 'DEBIT' }, [r1, r2])
    expect(out?.categoryId).toBe('cat-sub')
  })

  it('skips inactive rules', () => {
    const out = applyRules(
      { merchantName: 'Fabindia', amount: 100, direction: 'DEBIT' },
      [{ ...ruleFabindia, isActive: false }],
    )
    expect(out).toBeNull()
  })

  it('TEXT_REGEX matches against rawText (case-insensitive)', () => {
    const out = applyRules(
      { amount: 50000, direction: 'CREDIT', rawText: 'Acct credited with Rs 50000; SALARY CREDIT' },
      [ruleSalary],
    )
    expect(out?.categoryId).toBe('cat-sal')
  })

  it('AMOUNT_EQUALS matches ±1 ₹', () => {
    const rule: Rule = {
      id: 'r-amt', matchType: 'AMOUNT_EQUALS', pattern: '499',
      suggestedCategoryId: 'cat-sub', suggestedTags: [], priority: 1, isActive: true,
    }
    const out = applyRules({ amount: 499.5, direction: 'DEBIT' }, [rule])
    expect(out?.categoryId).toBe('cat-sub')
  })

  it('RECURRENCE_PATTERN monthly:DD matches ±1 day', () => {
    const rule: Rule = {
      id: 'r-rec', matchType: 'RECURRENCE_PATTERN', pattern: 'monthly:01',
      suggestedCategoryId: 'cat-sub', suggestedTags: [], priority: 1, isActive: true,
    }
    expect(applyRules({ amount: 100, direction: 'DEBIT', date: '2024-11-01' }, [rule])?.categoryId).toBe('cat-sub')
    expect(applyRules({ amount: 100, direction: 'DEBIT', date: '2024-11-02' }, [rule])?.categoryId).toBe('cat-sub')
    expect(applyRules({ amount: 100, direction: 'DEBIT', date: '2024-11-15' }, [rule])).toBeNull()
  })

  it('no match → null', () => {
    const out = applyRules({ merchantName: 'Random Merchant', amount: 100, direction: 'DEBIT' }, [ruleFabindia, ruleNetflix])
    expect(out).toBeNull()
  })
})

// ─── categorise (two-stage pipeline) ─────────────────────────────────

describe('categorise — two-stage', () => {
  it('Stage 1 (rules) match → no needsReview', async () => {
    const out = await categorise(
      { merchantName: 'Fabindia', amount: 350, direction: 'DEBIT' },
      [ruleFabindia], cats,
    )
    expect(out.categoryId).toBe('cat-food')
    expect(out.needsReview).toBe(false)
    expect(out.trace.reason).toBe('rule')
  })

  it('No rule match + LLM unavailable → needsReview', async () => {
    const out = await categorise(
      { merchantName: 'Random Merchant', amount: 100, direction: 'DEBIT' },
      [], cats,
    )
    expect(out.categoryId).toBeNull()
    expect(out.needsReview).toBe(true)
    expect(out.trace.reason).toBe('no-match')
  })
})

// ─── suggestRuleFromManualOverride ───────────────────────────────────

describe('suggestRuleFromManualOverride', () => {
  const baseTxn: Transaction = {
    id: 't1', accountId: 'a1', categoryId: null, merchantId: null,
    date: '2024-10-23', amount: 350, currency: 'INR',
    direction: 'DEBIT', paymentMode: 'CARD',
    rawText: 'Spent Rs 350 at Fabindia on 23-Oct-24',
    source: 'SMS', isRecurring: false, isTransfer: false,
    tags: [], needsReview: true,
    createdAt: '2024-10-23', updatedAt: '2024-10-23',
  }

  it('proposes a MERCHANT_CONTAINS rule from raw text', () => {
    const suggestion = suggestRuleFromManualOverride(baseTxn, 'cat-food', [])
    expect(suggestion?.matchType).toBe('MERCHANT_CONTAINS')
    expect(suggestion?.suggestedCategoryId).toBe('cat-food')
    expect(suggestion?.pattern.toLowerCase()).toContain('fabindia')
  })

  it('returns null when an existing rule already covers the merchant', () => {
    const suggestion = suggestRuleFromManualOverride(baseTxn, 'cat-food', [ruleFabindia])
    expect(suggestion).toBeNull()
  })

  it('returns null when raw text has no recoverable merchant', () => {
    const suggestion = suggestRuleFromManualOverride(
      { ...baseTxn, rawText: 'Unstructured note' },
      'cat-food', [],
    )
    expect(suggestion).toBeNull()
  })
})
