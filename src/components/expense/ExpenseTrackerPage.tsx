// Expense Tracker — Phase 1 surface.
//
// Sections (top → bottom):
//   • Hero — explains what the tab does + the upcoming phases.
//   • Month-to-date strip — totals across direction × type.
//   • Add transaction form — structured manual entry (date / amount /
//     direction / account / category / payment mode / notes).
//   • Transactions list — descending date order; inline delete; status
//     pill for `needsReview`.
//
// All data lives in localStorage via `expenseStorage`. Phase 2 will add
// CSV import + SMS regex + Groq natural-language parsing. Phase 3 will
// add the analytics dashboard + narrative summaries.

import { useEffect, useMemo, useState } from 'react'
import type { Account, Category, Direction, PaymentMode, Source, Transaction } from '../../types/expense'
import type { UserProfile } from '../../types'
import { expenseStorage } from '../../lib/expense/expenseStorage'
import { ImportPanel } from './ImportPanel'
import { AnalyticsPanel } from './AnalyticsPanel'
import { RulesManager } from './RulesManager'
import { CategorySelect } from './CategorySelect'
import { Modal } from '../ui/Modal'
import { suggestRuleFromManualOverride, type RuleSuggestion } from '../../lib/expense/categorization'

const PAYMENT_MODES: PaymentMode[] = ['UPI', 'CARD', 'CASH', 'NET_BANKING', 'AUTO_DEBIT', 'OTHER']

function fmtINR(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e7) return `₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `₹${(abs / 1e5).toFixed(1)} L`
  if (abs >= 1e3) return `₹${(abs / 1e3).toFixed(1)}k`
  return `₹${Math.round(abs)}`
}

function todayISO(): string {
  const d = new Date()
  const yr = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dy = String(d.getDate()).padStart(2, '0')
  return `${yr}-${mo}-${dy}`
}

interface Props {
  profile: UserProfile
}

export function ExpenseTrackerPage({ profile }: Props) {
  const [accounts]   = useState<Account[]>(() => expenseStorage.getAccounts())
  const [categories] = useState<Category[]>(() => expenseStorage.getCategories())
  const [transactions, setTransactions] = useState<Transaction[]>(() => expenseStorage.getTransactions())

  // Form state
  const [date, setDate]               = useState<string>(todayISO())
  const [amount, setAmount]           = useState<string>('')
  const [direction, setDirection]     = useState<Direction>('DEBIT')
  const [accountId, setAccountId]     = useState<string>(() => accounts[0]?.id ?? '')
  const [categoryId, setCategoryId]   = useState<string>('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI')
  const [notes, setNotes]             = useState<string>('')

  // If the seed runs after first paint, keep state in sync.
  useEffect(() => {
    if (accountId === '' && accounts.length > 0) setAccountId(accounts[0].id)
  }, [accounts, accountId])

  // ─── Month-to-date totals ───────────────────────────────────────────

  const mtd = useMemo(() => {
    const yyyy = todayISO().slice(0, 7)
    const inMonth = transactions.filter((t) => t.date.startsWith(yyyy))
    const sumBy = (pred: (t: Transaction) => boolean) =>
      inMonth.filter(pred).reduce((s, t) => s + t.amount, 0)
    return {
      income:    sumBy((t) => t.direction === 'CREDIT' && categoryType(t.categoryId, categories) === 'INCOME'),
      expense:   sumBy((t) => t.direction === 'DEBIT'),
      savings:   sumBy((t) => t.direction === 'DEBIT' && categoryType(t.categoryId, categories) === 'SAVING'),
      count:     inMonth.length,
    }
  }, [transactions, categories])

  // ─── Form actions ──────────────────────────────────────────────────

  function submitTransaction() {
    const amt = parseFloat(amount)
    if (!Number.isFinite(amt) || amt <= 0) return
    if (!accountId) return

    const inserted = expenseStorage.addTransaction({
      accountId,
      categoryId: categoryId || null,
      merchantId: null,
      date,
      amount: amt,
      currency: 'INR',
      direction,
      paymentMode,
      rawText: notes.trim(),
      source: 'MANUAL',
      isRecurring: false,
      isTransfer: false,
      tags: [],
      needsReview: !categoryId,
      notes: notes.trim() || undefined,
    })
    setTransactions((prev) => [...prev, inserted])
    setAmount('')
    setNotes('')
  }

  function removeTxn(id: string) {
    expenseStorage.deleteTransaction(id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  function changeTxnCategory(id: string, newCategoryId: string) {
    const patch = {
      categoryId: newCategoryId || null,
      needsReview: !newCategoryId,
    }
    const updated = expenseStorage.updateTransaction(id, patch)
    if (!updated) return
    setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)))

    // Suggest a categorisation rule from this override, if the txn has a
    // recoverable merchant and no existing rule covers it.
    if (newCategoryId) {
      const existingRules = expenseStorage.getRules()
      const suggestion = suggestRuleFromManualOverride(updated, newCategoryId, existingRules)
      if (suggestion) setRuleSuggestion({ txnId: id, suggestion })
    } else {
      // Clearing back to "uncategorised" — nothing to suggest.
      if (ruleSuggestion?.txnId === id) setRuleSuggestion(null)
    }
  }

  const [ruleSuggestion, setRuleSuggestion] = useState<{ txnId: string; suggestion: RuleSuggestion } | null>(null)
  const [analyticsOpen,  setAnalyticsOpen]  = useState(false)

  function acceptRuleSuggestion() {
    if (!ruleSuggestion) return
    const list = expenseStorage.getRules()
    const next = [
      ...list,
      {
        id: `rule_${Date.now().toString(36)}`,
        matchType: ruleSuggestion.suggestion.matchType,
        pattern: ruleSuggestion.suggestion.pattern,
        suggestedCategoryId: ruleSuggestion.suggestion.suggestedCategoryId,
        suggestedTags: [],
        priority: ruleSuggestion.suggestion.priority,
        isActive: true,
      },
    ]
    expenseStorage.setRules(next)
    setRuleSuggestion(null)
  }

  // ─── Filters ──────────────────────────────────────────────────────

  const [filterFrom,     setFilterFrom]     = useState<string>('')
  const [filterTo,       setFilterTo]       = useState<string>('')
  const [filterAccountId,setFilterAccountId]= useState<string>('')   // '' = all
  const [filterCategoryId,setFilterCategoryId] = useState<string>('') // '' = all
  const [filterSource,   setFilterSource]   = useState<Source | ''>('')
  const [filterQuery,    setFilterQuery]    = useState<string>('')

  function resetFilters() {
    setFilterFrom('')
    setFilterTo('')
    setFilterAccountId('')
    setFilterCategoryId('')
    setFilterSource('')
    setFilterQuery('')
  }
  const anyFilterActive =
    !!(filterFrom || filterTo || filterAccountId || filterCategoryId || filterSource || filterQuery.trim())

  // ─── Sorted + filtered list ──────────────────────────────────────

  const sortedTxns = useMemo(
    () => [...transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.createdAt < b.createdAt ? 1 : -1))),
    [transactions],
  )

  const filteredTxns = useMemo(() => {
    const q = filterQuery.trim().toLowerCase()
    return sortedTxns.filter((t) => {
      if (filterFrom       && t.date < filterFrom)                                 return false
      if (filterTo         && t.date > filterTo)                                   return false
      if (filterAccountId  && t.accountId !== filterAccountId)                     return false
      if (filterSource     && t.source !== filterSource)                           return false
      if (filterCategoryId) {
        // Match the category or any descendant of a selected parent.
        if (filterCategoryId === '__uncategorised__') {
          if (t.categoryId !== null) return false
        } else if (t.categoryId !== filterCategoryId) {
          // If the filter points at a PARENT, accept any child.
          const cat = categories.find((c) => c.id === t.categoryId)
          if (cat?.parentId !== filterCategoryId) return false
        }
      }
      if (q) {
        const blob = `${t.notes ?? ''} ${t.rawText ?? ''}`.toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [sortedTxns, filterFrom, filterTo, filterAccountId, filterCategoryId, filterSource, filterQuery, categories])
  const acctById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])) as Record<string, Account>, [accounts])
  const catById  = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])) as Record<string, Category>, [categories])

  return (
    <section className="space-y-3">
      {/* Hero */}
      <header
        className="rounded-xl p-5 sm:p-6"
        style={{ background: 'linear-gradient(135deg, #14b8a622 0%, #14b8a608 40%, #ffffff 100%)', border: '2px solid #14b8a640' }}
      >
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-[10px] font-bold tracking-[4px] uppercase text-teal-700">Expense Tracker</span>
          <span className="h-px flex-1 bg-gradient-to-r from-teal-500/60 to-transparent" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-[2px] text-teal-800 bg-teal-100 border border-teal-300 rounded px-2 py-0.5">Phase 3 — analytics</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-extralight tracking-tight text-slate-900 leading-[1.1]">
          Where every <em className="font-extrabold not-italic text-teal-700">rupee</em> went — and how it stacked up.
        </h2>
        <p className="text-[12.5px] sm:text-[13px] text-slate-700 mt-2.5 leading-relaxed max-w-3xl">
          Each row is paired to your Plan-tab Monthly Budget. The Analytics card below surfaces a discipline score, your biggest overshoots
          and under-spends, a 6-month trend, and a written monthly narrative. Everything lives on this device.
        </p>
      </header>

      {/* Analytics — behind a 3D button so the page stays focused on logging */}
      <div className="flex justify-center">
        <AnalyticsButton onClick={() => setAnalyticsOpen(true)} />
      </div>

      <Modal
        open={analyticsOpen}
        title="Analytics"
        subtitle="Budget vs actual · monthly narrative · category breakdown · 6-month trend"
        accent="emerald"
        size="5xl"
        onClose={() => setAnalyticsOpen(false)}
      >
        <AnalyticsPanel
          profile={profile}
          accounts={accounts}
          categories={categories}
          transactions={transactions}
        />
      </Modal>

      {/* Import — paste SMS / paste CSV */}
      <ImportPanel
        accounts={accounts}
        onImported={(added) => setTransactions((prev) => [...prev, ...added])}
      />

      {/* Rules — CRUD over deterministic categorisation rules */}
      <RulesManager categories={categories} />

      {/* Month-to-date strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border-2 border-slate-200 bg-white p-3">
        <KpiTile label="MTD income"   value={fmtINR(mtd.income)}  tone="emerald" />
        <KpiTile label="MTD spend"    value={fmtINR(mtd.expense)} tone="rose" />
        <KpiTile label="MTD savings"  value={fmtINR(mtd.savings)} tone="navy" />
        <KpiTile label="Transactions" value={mtd.count.toString()} tone="slate" />
      </section>

      {/* Add transaction form — cozy panel, 2-column grid */}
      <section className="rounded-2xl border-2 border-teal-300 ring-1 ring-inset ring-teal-100 bg-gradient-to-br from-teal-50/50 via-white to-amber-50/30 p-5 shadow-sm">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="text-[10px] font-bold tracking-[3px] uppercase text-teal-800">Add transaction</div>
            <h3 className="font-serif text-base font-extrabold text-slate-900">One row at a time — for now.</h3>
          </div>
          <span className="text-[10px] font-mono text-teal-700/70">structured · manual · MANUAL source tag</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Amount (₹)">
            <input
              type="number"
              step="0.01"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </Field>

          <Field label="Direction">
            <div className="flex gap-1">
              <DirectionPill active={direction === 'DEBIT'}  onClick={() => setDirection('DEBIT')}  label="Spent (Debit)" tone="rose" />
              <DirectionPill active={direction === 'CREDIT'} onClick={() => setDirection('CREDIT')} label="Got (Credit)"  tone="emerald" />
            </div>
          </Field>

          <Field label="Payment mode">
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)} className={inputCls}>
              {PAYMENT_MODES.map((m) => <option key={m} value={m}>{labelForMode(m)}</option>)}
            </select>
          </Field>

          <Field label="Account">
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls}>
              {accounts.length === 0 && <option value="">— no accounts —</option>}
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.provider && ` · ${a.provider}`}{a.maskedIdentifier && ` ··${a.maskedIdentifier}`}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Category">
            <CategorySelect
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              className={inputCls}
              allowEmpty
            />
          </Field>

          <Field label="Notes" wide>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. weekly Fabindia haul"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={submitTransaction}
            disabled={!amount || parseFloat(amount) <= 0 || !accountId}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-bold uppercase tracking-[1.5px] text-white bg-gradient-to-b from-teal-500 via-teal-600 to-teal-700 hover:from-teal-400 hover:via-teal-500 hover:to-teal-600 border border-black/15 select-none active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              boxShadow: '0 3px 0 0 rgb(15,118,110), 0 6px 10px -3px rgba(15,23,42,0.35), inset 0 1px 0 rgba(255,255,255,0.45)',
              textShadow: '0 1px 1px rgba(0,0,0,0.40)',
            }}
          >
            <span aria-hidden="true">＋</span>
            <span>Add transaction</span>
          </button>
          <p className="text-[10.5px] text-slate-500 italic">
            Stays in your browser · no upload · no account
          </p>
        </div>
      </section>

      {/* Transactions list */}
      <section className="rounded-lg border-2 border-slate-200 bg-white">
        <div className="flex items-baseline justify-between px-4 py-3 border-b border-slate-200 flex-wrap gap-2">
          <h3 className="font-serif text-base font-extrabold text-slate-900">All transactions</h3>
          <span className="text-[10px] font-mono text-slate-500">
            {anyFilterActive ? `${filteredTxns.length} of ${transactions.length} shown` : `${transactions.length} total`}
          </span>
        </div>

        {/* Filter bar */}
        {transactions.length > 0 && (
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <FilterField label="From">
                <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className={filterInputCls} />
              </FilterField>
              <FilterField label="To">
                <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className={filterInputCls} />
              </FilterField>
              <FilterField label="Account">
                <select value={filterAccountId} onChange={(e) => setFilterAccountId(e.target.value)} className={filterInputCls}>
                  <option value="">All</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </FilterField>
              <FilterField label="Category">
                <CategorySelect
                  categories={categories}
                  value={filterCategoryId}
                  onChange={setFilterCategoryId}
                  className={filterInputCls}
                  allowEmpty
                  emptyLabel="All categories"
                />
              </FilterField>
              <FilterField label="Source">
                <select value={filterSource} onChange={(e) => setFilterSource((e.target.value || '') as Source | '')} className={filterInputCls}>
                  <option value="">All</option>
                  <option value="MANUAL">Manual</option>
                  <option value="SMS">SMS</option>
                  <option value="BANK_API">Bank API / CSV</option>
                  <option value="EMAIL">Email</option>
                </select>
              </FilterField>
              <FilterField label="Search">
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="notes / raw text"
                  className={filterInputCls}
                />
              </FilterField>
            </div>
            {anyFilterActive && (
              <div className="mt-1.5 text-right">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded hover:bg-slate-100 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {sortedTxns.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-slate-500 italic">
            No transactions yet — add one above to get started.
          </div>
        ) : filteredTxns.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-slate-500 italic">
            No transactions match the current filters.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredTxns.map((t) => {
              const cat = t.categoryId ? catById[t.categoryId] : undefined
              const acc = acctById[t.accountId]
              const sign = t.direction === 'DEBIT' ? '−' : '+'
              const amountTone = t.direction === 'DEBIT' ? 'text-rose-700' : 'text-emerald-700'
              return (
                <li key={t.id} className="px-4 py-2.5 grid grid-cols-[72px_1fr_auto] gap-2 items-baseline">
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">{t.date.slice(5)}</span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <CategorySelect
                        categories={categories}
                        value={t.categoryId ?? ''}
                        onChange={(v) => changeTxnCategory(t.id, v)}
                        ariaLabel={`Category for ${cat?.name ?? 'uncategorised'} transaction`}
                        className={[
                          'bg-transparent border-0 px-0 py-0 text-[12px] font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-300 rounded',
                          !t.categoryId ? 'italic text-slate-500 font-normal' : '',
                        ].join(' ')}
                      />
                      {t.needsReview && (
                        <span className="text-[8.5px] font-bold uppercase tracking-[1.5px] bg-amber-100 text-amber-800 border border-amber-300 rounded px-1 py-0">needs review</span>
                      )}
                    </div>
                    <div className="text-[10.5px] text-slate-500 truncate">
                      {acc?.name ?? '?'} · {labelForMode(t.paymentMode)}
                      {t.notes && ` · ${t.notes}`}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 shrink-0">
                    <span className={`font-mono font-bold tabular-nums text-[13px] ${amountTone}`}>
                      {sign}{fmtINR(t.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTxn(t.id)}
                      title="Delete transaction"
                      className="text-[10px] text-slate-400 hover:text-rose-700 px-1 rounded transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  {/* "Save as rule?" strip — fires once after an inline override. */}
                  {ruleSuggestion && ruleSuggestion.txnId === t.id && (
                    <div className="col-span-3 mt-1.5 -mb-0.5 grid grid-cols-[1fr_auto] gap-2 items-baseline px-2 py-1.5 rounded bg-teal-50 border border-teal-200">
                      <span className="text-[10.5px] text-teal-900">
                        Save as a rule? Categorise future <strong className="font-bold">"{ruleSuggestion.suggestion.pattern}"</strong> transactions the same way automatically.
                      </span>
                      <span className="flex items-baseline gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={acceptRuleSuggestion}
                          className="text-[10px] font-bold uppercase tracking-[1.5px] rounded px-2 py-0.5 text-white bg-teal-700 hover:bg-teal-600 transition-colors"
                        >
                          + Save rule
                        </button>
                        <button
                          type="button"
                          onClick={() => setRuleSuggestion(null)}
                          className="text-[10px] text-slate-500 hover:text-slate-900 px-1 rounded transition-colors"
                        >
                          dismiss
                        </button>
                      </span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </section>
  )
}

// ─── Small UI primitives ─────────────────────────────────────────────

// Cozy, thick-bordered, elegant input style — used by the add-transaction
// form, the filter bar, and any other inline editors on this page.
const inputCls = [
  'w-full bg-white border-2 border-slate-300 rounded-lg',
  'px-3 py-2 text-[13px] text-slate-900 shadow-sm',
  'placeholder:text-slate-400',
  'focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100',
  'transition-colors',
].join(' ')

const filterInputCls = [
  'w-full bg-white border-2 border-slate-300 rounded-lg',
  'px-2.5 py-1.5 text-[12px] text-slate-900',
  'focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100',
  'transition-colors',
].join(' ')

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="block text-[10px] font-bold uppercase tracking-[1.5px] text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[9.5px] font-bold uppercase tracking-[1.5px] text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  )
}

// 3D button that opens the Analytics modal — matches the Playbook/Guide
// button language used elsewhere in the app.
function AnalyticsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="View analytics — budget vs actual · narrative · breakdown · trend"
      className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-[12px] font-bold uppercase tracking-[2px] text-white bg-gradient-to-b from-teal-300 via-teal-500 to-teal-700 hover:from-teal-200 hover:via-teal-400 hover:to-teal-600 border border-black/15 select-none active:translate-y-[2px] transition-all"
      style={{
        boxShadow: '0 4px 0 0 rgb(15,118,110), 0 8px 14px -4px rgba(15,23,42,0.40), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 0 rgba(0,0,0,0.20)',
        textShadow: '0 1px 1px rgba(0,0,0,0.45)',
      }}
    >
      <span aria-hidden="true" className="text-[14px] leading-none">📊</span>
      <span>View Analytics</span>
    </button>
  )
}

function DirectionPill({ active, onClick, label, tone }: { active: boolean; onClick: () => void; label: string; tone: 'rose' | 'emerald' }) {
  const onClass = tone === 'rose'
    ? 'bg-rose-600 text-white border-rose-700'
    : 'bg-emerald-600 text-white border-emerald-700'
  const offClass = 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 text-[10.5px] font-bold uppercase tracking-[1px] rounded px-2 py-1.5 border transition-colors ${active ? onClass : offClass}`}
    >
      {label}
    </button>
  )
}

function KpiTile({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'rose' | 'navy' | 'slate' }) {
  const fg =
    tone === 'emerald' ? 'text-emerald-700' :
    tone === 'rose'    ? 'text-rose-700' :
    tone === 'navy'    ? 'text-blue-700' :
                          'text-slate-700'
  return (
    <div className="px-3 py-2">
      <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-slate-500">{label}</div>
      <div className={`font-mono font-extrabold text-[16px] tabular-nums ${fg} mt-0.5`}>{value}</div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────

function labelForMode(m: PaymentMode): string {
  switch (m) {
    case 'UPI':         return 'UPI'
    case 'CARD':        return 'Card'
    case 'CASH':        return 'Cash'
    case 'NET_BANKING': return 'Net-banking'
    case 'AUTO_DEBIT':  return 'Auto-debit'
    case 'OTHER':       return 'Other'
  }
}

function categoryType(categoryId: string | null, categories: Category[]): string | null {
  if (!categoryId) return null
  return categories.find((c) => c.id === categoryId)?.type ?? null
}
