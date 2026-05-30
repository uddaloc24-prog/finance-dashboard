// categorization — .md §7 two-stage pipeline.
//
//   Stage 1 — rules engine (deterministic; runs first).
//   Stage 2 — LLM hook (asynchronous; runs only on miss).
//   Final  — if neither path resolves OR confidence < threshold,
//            set categoryId=null and needsReview=true.

import type { Category, Rule, Transaction } from '../../types/expense'
import { applyRules, type RuleCandidate } from './rulesEngine'
import { llmCategorise } from './parsing/llmHook'

export interface CategorisationOutput {
  categoryId: string | null
  tags: string[]
  needsReview: boolean
  /** Per-stage trace for the trace ledger. */
  trace: {
    matchedRuleId?: string
    llmCategoryCode?: string
    llmConfidence?: number
    reason: 'rule' | 'llm' | 'no-match'
  }
}

const LLM_CONFIDENCE_THRESHOLD = 0.7

/** Categorise a single candidate. Pure-ish — async because of the LLM. */
export async function categorise(
  candidate: RuleCandidate,
  rules: Rule[],
  categories: Category[],
): Promise<CategorisationOutput> {
  // Stage 1 — rules
  const ruleMatch = applyRules(candidate, rules)
  if (ruleMatch) {
    return {
      categoryId: ruleMatch.categoryId,
      tags: ruleMatch.tags,
      needsReview: false,
      trace: { matchedRuleId: ruleMatch.rule.id, reason: 'rule' },
    }
  }

  // Stage 2 — LLM (no-op stub today; returns null until Groq is wired)
  const codeToId = Object.fromEntries(categories.map((c) => [c.code, c.id]))
  const availableCodes = categories.filter((c) => c.isActive).map((c) => c.code)

  const llmOut = await llmCategorise({
    merchantName:  candidate.merchantName,
    rawText:       candidate.rawText,
    amount:        candidate.amount,
    date:          candidate.date,
    availableCategoryCodes: availableCodes,
  })

  if (llmOut && llmOut.confidence >= LLM_CONFIDENCE_THRESHOLD) {
    const catId = codeToId[llmOut.categoryCode]
    if (catId) {
      return {
        categoryId: catId,
        tags: llmOut.tags,
        needsReview: false,
        trace: {
          llmCategoryCode: llmOut.categoryCode,
          llmConfidence:   llmOut.confidence,
          reason: 'llm',
        },
      }
    }
  }

  // Final — no match; queue for human review.
  return {
    categoryId: null,
    tags: [],
    needsReview: true,
    trace: {
      llmCategoryCode: llmOut?.categoryCode,
      llmConfidence:   llmOut?.confidence,
      reason: 'no-match',
    },
  }
}

/** Suggest a new MERCHANT_CONTAINS rule when the user manually overrides
 *  a category — .md §7 "system can suggest creation of a new Rule". */
export interface RuleSuggestion {
  matchType: 'MERCHANT_CONTAINS'
  pattern: string
  suggestedCategoryId: string
  priority: number
}

export function suggestRuleFromManualOverride(
  txn: Transaction,
  categoryId: string,
  existingRules: Rule[],
): RuleSuggestion | null {
  // Only suggest if there's a stable merchant string to anchor on.
  const candidate = txn.rawText.split(/\s+at\s+|\s+to\s+|\s+from\s+/i)[1]?.split(/\s+(?:on|via|Avl|Bal)\b/i)[0]?.trim()
  const merchant = candidate && candidate.length >= 3 ? candidate : undefined
  if (!merchant) return null

  // Don't propose if a rule already covers this merchant.
  const exists = existingRules.some((r) =>
    r.matchType === 'MERCHANT_CONTAINS' &&
    merchant.toLowerCase().includes(r.pattern.toLowerCase()),
  )
  if (exists) return null

  // Use a short, stable substring of the merchant name as the pattern.
  const pattern = merchant.split(/\s+/).slice(0, 2).join(' ')
  return {
    matchType: 'MERCHANT_CONTAINS',
    pattern,
    suggestedCategoryId: categoryId,
    priority: 100,
  }
}
