// llmHook — design-only scaffold for the .md §4 § 6 § 7 LLM helpers.
// Keeps the prompt template + JSON schema documented inline so that
// when the user wires a real Claude/Groq API call later, the surface
// is unchanged.
//
// Current behaviour: returns null (no LLM available). When `groqApiKey`
// is wired into the storage layer, this stub gets swapped for a real
// fetch() call — the JSON contract below is the API.

import type { Direction, PaymentMode } from '../../../types/expense'

// ─── Shared parsed-transaction schema (mirrors .md §4) ───────────────

export interface LlmParsedTransaction {
  date?: string                  // YYYY-MM-DD
  amount?: number
  currency: string               // 'INR'
  direction?: Direction
  merchantName?: string
  accountHint?: string
  paymentMode?: PaymentMode
  description: string
}

// ─── Prompt templates ────────────────────────────────────────────────

/** .md §4 — SMS parse fallback when deterministic regex fails. */
export const PROMPT_PARSE_SMS = `
You are a precise financial-SMS parser for Indian banks.
Given a single SMS body, return ONLY valid JSON matching this schema:

{
  "date": "YYYY-MM-DD or null",
  "amount": number (positive) or null,
  "currency": "INR",
  "direction": "DEBIT" | "CREDIT",
  "merchantName": string or null,
  "accountHint": "last-4 digits" or null,
  "paymentMode": "UPI" | "CARD" | "NET_BANKING" | "CASH" | "AUTO_DEBIT" | "OTHER",
  "description": "concise human-readable summary"
}

Do not invent fields. If a value is uncertain, set it to null.
Return ONLY the JSON object — no prose, no markdown fence.

SMS:
{{SMS_BODY}}
`.trim()

/** .md §6 — natural-language manual entry parse + category suggestion. */
export const PROMPT_PARSE_MANUAL = `
You are a precise financial assistant for an Indian user.
Given a free-form description, return ONLY valid JSON:

{
  "date": "YYYY-MM-DD" (default to today if unstated),
  "amount": number (positive),
  "currency": "INR",
  "direction": "DEBIT" | "CREDIT",
  "merchantName": string or null,
  "paymentMode": "UPI" | "CARD" | "NET_BANKING" | "CASH" | "AUTO_DEBIT" | "OTHER",
  "description": "cleaned",
  "categoryCode": one of {{AVAILABLE_CATEGORY_CODES}}
}

Return ONLY the JSON.

User input:
{{TEXT}}
`.trim()

/** .md §7 — categorisation fallback when no rule matches. */
export const PROMPT_CATEGORIZE = `
Categorise this Indian-context transaction. Return ONLY JSON:

{
  "categoryCode": string (one of {{AVAILABLE_CATEGORY_CODES}}),
  "confidence": 0..1,
  "tags": string[]
}

Transaction:
  merchant: {{MERCHANT}}
  raw text: {{RAW_TEXT}}
  amount:   ₹{{AMOUNT}}
  date:     {{DATE}}
`.trim()

/** .md §8 — monthly narrative summary. */
export const PROMPT_MONTHLY_NARRATIVE = `
Act as a candid financial coach for an Indian user.
Write 2-3 short paragraphs summarising the month's spending using ONLY
the data below. End with 2-3 specific suggestions. No emojis. No filler.

Data (JSON):
{{AGGREGATE_JSON}}
`.trim()

/** .md §8 — free-form question → internal query. */
export const PROMPT_INTERPRET_QUERY = `
Convert this user question into a safe internal query. Return ONLY JSON:

{
  "metric": "sum" | "avg" | "count" | "list",
  "category": one of {{AVAILABLE_CATEGORY_CODES}} or null (means "all"),
  "period": "this_month" | "last_30_days" | "last_90_days" | "this_year" | "last_year" | string
}

Do not echo PII. Reject prompts that ask for raw text dumps.

Question: {{QUESTION}}
`.trim()

// ─── Runtime stubs (mocked until Groq is wired) ──────────────────────

interface LlmRuntime {
  /** Returns true when an LLM endpoint is reachable. */
  isAvailable(): boolean
}

const runtime: LlmRuntime = {
  isAvailable() {
    // TODO: read storage.getProfile().groqApiKey and treat as available.
    return false
  },
}

/** Parse an SMS via LLM fallback. Returns null today; will fetch Groq later. */
export async function llmParseSms(_smsBody: string): Promise<LlmParsedTransaction | null> {
  if (!runtime.isAvailable()) return null
  // TODO: real fetch — build prompt from PROMPT_PARSE_SMS, call Groq, JSON.parse, validate.
  return null
}

/** Categorise via LLM fallback. */
export interface LlmCategorisation {
  categoryCode: string
  confidence: number
  tags: string[]
}

export async function llmCategorise(_args: {
  merchantName?: string
  rawText?: string
  amount: number
  date?: string
  availableCategoryCodes: string[]
}): Promise<LlmCategorisation | null> {
  if (!runtime.isAvailable()) return null
  return null
}

/** Generate a monthly narrative. */
export async function llmMonthlyNarrative(_aggregate: Record<string, unknown>): Promise<string | null> {
  if (!runtime.isAvailable()) return null
  return null
}

/** Interpret a natural-language question into an internal query. */
export interface InternalQuery {
  metric: 'sum' | 'avg' | 'count' | 'list'
  category: string | null
  period: string
}

export async function llmInterpretQuery(_question: string, _categoryCodes: string[]): Promise<InternalQuery | null> {
  if (!runtime.isAvailable()) return null
  return null
}

export const llmRuntime = runtime
