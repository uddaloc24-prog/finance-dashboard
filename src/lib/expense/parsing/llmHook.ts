// llmHook — wires four expense-side LLM helpers to the existing Groq
// runtime (the same provider the AI tab uses). When the user has
// supplied a groqApiKey on their profile, these helpers make real
// fetch calls; otherwise every helper returns null and the templated
// fall-backs continue to power the UI.
//
// .md §4 §6 §7 §8 surfaces:
//   • llmParseSms          (SMS fallback when regex confidence < 0.5)
//   • llmCategorise        (categorisation fallback per .md §7 stage 2)
//   • llmMonthlyNarrative  (PROMPT_MONTHLY_NARRATIVE)
//   • llmInterpretQuery    (PROMPT_INTERPRET_QUERY)

import type { Direction, PaymentMode } from '../../../types/expense'
import { storage } from '../../storage'

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

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

export const PROMPT_MONTHLY_NARRATIVE = `
Act as a candid Indian financial coach.
Write a tight 3-paragraph summary of the month's spending using ONLY
the JSON below. No emojis, no filler, no opening "I am". End with
2-3 specific, action-oriented suggestions numbered 1./2./3.

Use rupee amounts in INR (₹ + en-IN locale, e.g. ₹1,23,456).

JSON:
{{AGGREGATE_JSON}}
`.trim()

export const PROMPT_INTERPRET_QUERY = `
Convert this user question into a safe internal query. Return ONLY JSON:

{
  "metric": "sum" | "avg" | "count" | "list",
  "category": one of {{AVAILABLE_CATEGORY_CODES}} or null (means "all"),
  "period": "this_month" | "last_30_days" | "last_90_days" | "this_year" | "last_year" | string
}

Reject prompts that ask for raw text dumps.

Question: {{QUESTION}}
`.trim()

// ─── Runtime — uses storage.getProfile().groqApiKey ──────────────────

function readGroqKey(): string | null {
  try {
    const profile = storage.getProfile()
    return profile?.groqApiKey?.trim() || null
  } catch { return null }
}

interface LlmRuntime {
  isAvailable(): boolean
}

export const llmRuntime: LlmRuntime = {
  isAvailable(): boolean {
    return !!readGroqKey()
  },
}

// ─── Low-level fetch wrapper ──────────────────────────────────────────

async function callGroq(prompt: string, maxTokens = 1200): Promise<string | null> {
  const key = readGroqKey()
  if (!key) return null

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return null
    const json = await res.json() as { choices: Array<{ message: { content: string } }> }
    return json.choices[0]?.message?.content ?? null
  } catch {
    return null
  }
}

/** Strip ```json fences from a string before JSON.parse. */
function stripFence(s: string): string {
  return s.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim()
}

function safeJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try { return JSON.parse(stripFence(raw)) as T } catch { return null }
}

// ─── Public helpers ──────────────────────────────────────────────────

export async function llmParseSms(smsBody: string): Promise<LlmParsedTransaction | null> {
  if (!llmRuntime.isAvailable()) return null
  const prompt = PROMPT_PARSE_SMS.replace('{{SMS_BODY}}', smsBody)
  return safeJson<LlmParsedTransaction>(await callGroq(prompt, 500))
}

export interface LlmCategorisation {
  categoryCode: string
  confidence: number
  tags: string[]
}

export async function llmCategorise(args: {
  merchantName?: string
  rawText?: string
  amount: number
  date?: string
  availableCategoryCodes: string[]
}): Promise<LlmCategorisation | null> {
  if (!llmRuntime.isAvailable()) return null
  const prompt = PROMPT_CATEGORIZE
    .replace('{{AVAILABLE_CATEGORY_CODES}}', args.availableCategoryCodes.join(' · '))
    .replace('{{MERCHANT}}', args.merchantName ?? '(none)')
    .replace('{{RAW_TEXT}}', args.rawText ?? '(none)')
    .replace('{{AMOUNT}}', String(args.amount))
    .replace('{{DATE}}', args.date ?? '(none)')
  return safeJson<LlmCategorisation>(await callGroq(prompt, 200))
}

export async function llmMonthlyNarrative(aggregate: Record<string, unknown>): Promise<string | null> {
  if (!llmRuntime.isAvailable()) return null
  const prompt = PROMPT_MONTHLY_NARRATIVE.replace('{{AGGREGATE_JSON}}', JSON.stringify(aggregate, null, 2))
  return await callGroq(prompt, 800)
}

export interface InternalQuery {
  metric: 'sum' | 'avg' | 'count' | 'list'
  category: string | null
  period: string
}

export async function llmInterpretQuery(question: string, categoryCodes: string[]): Promise<InternalQuery | null> {
  if (!llmRuntime.isAvailable()) return null
  const prompt = PROMPT_INTERPRET_QUERY
    .replace('{{AVAILABLE_CATEGORY_CODES}}', categoryCodes.join(' · '))
    .replace('{{QUESTION}}', question)
  return safeJson<InternalQuery>(await callGroq(prompt, 250))
}
