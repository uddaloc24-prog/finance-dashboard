// ImportPanel — Phase 2 ingestion UI.
//
// Two collapsible sub-panels:
//   1. Paste-an-SMS  — runs parseSms() then categorise() and commits.
//   2. Paste-a-CSV   — runs parseCsv() + mapRowsToTransactions(), then
//                      categorise() per row, and commits the batch.
//
// Imports are deterministic (no LLM call yet — the helper stub returns
// null). Anything the rules engine can't classify lands with
// needsReview = true.

import { useState } from 'react'
import { parseSms } from '../../lib/expense/parsing/smsParser'
import { parseCsv, mapRowsToTransactions } from '../../lib/expense/parsing/csvConnector'
import { categorise } from '../../lib/expense/categorization'
import { expenseStorage } from '../../lib/expense/expenseStorage'
import type { Account, Transaction, Direction } from '../../types/expense'

interface Props {
  accounts: Account[]
  /** Notify parent when transactions are added so the list re-renders. */
  onImported: (added: Transaction[]) => void
}

export function ImportPanel({ accounts, onImported }: Props) {
  return (
    <details className="rounded-2xl border-2 border-teal-300 ring-1 ring-inset ring-teal-100 bg-gradient-to-br from-teal-50/40 via-white to-amber-50/20 shadow-sm h-full">
      <summary className="cursor-pointer px-4 py-3 text-[11px] font-bold tracking-[2px] uppercase text-teal-800 hover:bg-teal-50/60 transition-colors flex items-baseline justify-between rounded-2xl">
        <span>Import — SMS · CSV</span>
        <span className="text-[10px] font-normal normal-case tracking-normal text-slate-500 italic">
          paste a bank SMS or CSV statement
        </span>
      </summary>

      <div className="px-4 pb-4 pt-1 space-y-3">
        <SmsImport accounts={accounts} onImported={onImported} />
        <CsvImport accounts={accounts} onImported={onImported} />
        <p className="text-[10.5px] text-slate-500 italic leading-snug">
          Parsing is deterministic and runs on your device — nothing leaves the browser.
          Anything the rules engine can't categorise is flagged <strong>needs review</strong> for you to fix in the list.
        </p>
      </div>
    </details>
  )
}

// ─── SMS sub-panel ──────────────────────────────────────────────────

function SmsImport({ accounts, onImported }: Props) {
  const [body,      setBody]      = useState('')
  const [accountId, setAccountId] = useState<string>(() => accounts[0]?.id ?? '')
  const [feedback,  setFeedback]  = useState<string | null>(null)
  const [busy,      setBusy]      = useState(false)

  async function parseAndCommit() {
    if (!body.trim() || !accountId) return
    setBusy(true)
    setFeedback(null)
    try {
      const parsed = parseSms(body)
      if (!parsed.success || !parsed.transaction) {
        setFeedback(`Could not parse — confidence ${(parsed.confidence * 100).toFixed(0)} %. Try another SMS or use the structured form below.`)
        return
      }

      const t = parsed.transaction
      const cats = expenseStorage.getCategories()
      const rules = expenseStorage.getRules()
      const cat = await categorise(
        {
          merchantName: t.merchantName,
          rawText:      parsed.rawText,
          amount:       t.amount ?? 0,
          direction:    (t.direction ?? 'DEBIT') as Direction,
          paymentMode:  t.paymentMode,
          date:         t.date,
        },
        rules, cats,
      )

      const inserted = expenseStorage.addTransaction({
        accountId,
        categoryId: cat.categoryId,
        merchantId: null,
        date:       t.date ?? todayISO(),
        amount:     t.amount ?? 0,
        currency:   'INR',
        direction:  (t.direction ?? 'DEBIT') as Direction,
        paymentMode:t.paymentMode ?? 'OTHER',
        rawText:    parsed.rawText,
        source:     'SMS',
        isRecurring:false,
        isTransfer: false,
        tags:       cat.tags,
        needsReview:cat.needsReview,
        notes:      t.description,
      })
      onImported([inserted])
      setBody('')
      setFeedback(`Imported · ${cat.needsReview ? 'needs review — pick a category below' : 'categorised by rules'}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="text-[10px] font-bold tracking-[2px] uppercase text-teal-800 mb-1">SMS</div>
      <textarea
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder='e.g. "Spent Rs.350 on HDFC Card xx1234 at FABINDIA on 23-Oct-24"'
        className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-[12px] focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
      />
      <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="bg-white border border-slate-300 rounded px-2 py-1 text-[11.5px] focus:outline-none focus:border-teal-500"
        >
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button
          type="button"
          onClick={parseAndCommit}
          disabled={!body.trim() || busy}
          className="text-[10px] font-bold uppercase tracking-[1.5px] rounded px-2.5 py-1 text-white bg-teal-700 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Parse + commit
        </button>
        {feedback && <span className="text-[10.5px] text-slate-600 italic">{feedback}</span>}
      </div>
    </section>
  )
}

// ─── CSV sub-panel ──────────────────────────────────────────────────

function CsvImport({ accounts, onImported }: Props) {
  const [text,      setText]      = useState('')
  const [accountId, setAccountId] = useState<string>(() => accounts[0]?.id ?? '')
  const [feedback,  setFeedback]  = useState<string | null>(null)
  const [busy,      setBusy]      = useState(false)

  async function importBatch() {
    if (!text.trim() || !accountId) return
    setBusy(true)
    setFeedback(null)
    try {
      const rows    = parseCsv(text)
      const parsed  = mapRowsToTransactions(rows)
      if (parsed.length === 0) {
        setFeedback('No rows parsed. Check the header row.')
        return
      }
      const cats  = expenseStorage.getCategories()
      const rules = expenseStorage.getRules()

      const added: Transaction[] = []
      for (const p of parsed) {
        const cat = await categorise(
          { merchantName: p.merchantName, rawText: p.rawText, amount: p.amount, direction: p.direction, paymentMode: p.paymentMode, date: p.date },
          rules, cats,
        )
        const txn = expenseStorage.addTransaction({
          accountId,
          categoryId: cat.categoryId,
          merchantId: null,
          date: p.date,
          amount: p.amount,
          currency: 'INR',
          direction: p.direction,
          paymentMode: p.paymentMode ?? 'OTHER',
          rawText: p.rawText,
          source: 'BANK_API',
          isRecurring: false,
          isTransfer: false,
          tags: cat.tags,
          needsReview: cat.needsReview,
          notes: p.description,
        })
        added.push(txn)
      }
      onImported(added)
      const needsReview = added.filter((a) => a.needsReview).length
      setText('')
      setFeedback(`Imported ${added.length} row${added.length === 1 ? '' : 's'} — ${needsReview} flagged for review.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="text-[10px] font-bold tracking-[2px] uppercase text-teal-800 mb-1">CSV statement</div>
      <textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Date,Narration,Debit,Credit
23/10/2024,UPI/FABINDIA/REF12345,350.00,
24/10/2024,SALARY CREDIT,,50000.00"
        className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-[11.5px] font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
      />
      <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="bg-white border border-slate-300 rounded px-2 py-1 text-[11.5px] focus:outline-none focus:border-teal-500"
        >
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button
          type="button"
          onClick={importBatch}
          disabled={!text.trim() || busy}
          className="text-[10px] font-bold uppercase tracking-[1.5px] rounded px-2.5 py-1 text-white bg-teal-700 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Import all rows
        </button>
        {feedback && <span className="text-[10.5px] text-slate-600 italic">{feedback}</span>}
      </div>
    </section>
  )
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
