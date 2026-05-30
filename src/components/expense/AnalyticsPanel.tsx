// AnalyticsPanel — month picker + KPIs + category/payment breakdown +
// 6-month trend + templated narrative.

import { useEffect, useMemo, useState } from 'react'
import type { Account, Category, Transaction } from '../../types/expense'
import type { UserProfile } from '../../types'
import { monthlySummary, trends } from '../../lib/expense/analytics'
import { reconcileWithBudget } from '../../lib/expense/budgetReconciler'
import { buildTemplatedNarrative } from '../../lib/expense/narrative'
import { llmMonthlyNarrative, llmRuntime } from '../../lib/expense/parsing/llmHook'
import { BudgetVsActualCard } from './BudgetVsActualCard'

interface Props {
  profile: UserProfile
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
}

function fmtINR(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`
  return `₹${Math.round(n)}`
}

function todayYM(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function AnalyticsPanel({ profile, accounts, categories, transactions }: Props) {
  const [yearMonth,      setYearMonth]      = useState(todayYM())
  const [drillParentId,  setDrillParentId]  = useState<string>('')

  // Drill filter — narrow transactions to those in the drilled parent's
  // descendant categories (and bare leaves if the drill points at one).
  const drillFilteredTxns = useMemo(() => {
    if (!drillParentId) return transactions
    const drillCat = categories.find((c) => c.id === drillParentId)
    if (!drillCat) return transactions
    // Parent → match transactions whose category's parentId === drillParentId
    if (drillCat.parentId === null) {
      const childIds = new Set(
        categories.filter((c) => c.parentId === drillParentId).map((c) => c.id),
      )
      return transactions.filter((t) => t.categoryId && childIds.has(t.categoryId))
    }
    // Leaf — direct id match.
    return transactions.filter((t) => t.categoryId === drillParentId)
  }, [transactions, categories, drillParentId])

  const summary = useMemo(
    () => monthlySummary(drillFilteredTxns, categories, accounts, yearMonth),
    [drillFilteredTxns, categories, accounts, yearMonth],
  )

  const trend = useMemo(
    () => trends(drillFilteredTxns, categories, 6, new Date(`${yearMonth}-01`)),
    [drillFilteredTxns, categories, yearMonth],
  )

  const recon = useMemo(
    () => reconcileWithBudget(drillFilteredTxns, categories, profile.expenses?.breakdown, yearMonth),
    [drillFilteredTxns, categories, profile, yearMonth],
  )

  const narrative = useMemo(
    () => buildTemplatedNarrative(summary, recon.totals.budgeted > 0 ? recon : undefined),
    [summary, recon],
  )

  // ── AI narrative — opt-in, requires profile.groqApiKey ────────────
  const [aiNarrative, setAiNarrative] = useState<string | null>(null)
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiError,     setAiError]     = useState<string | null>(null)
  const aiAvailable = llmRuntime.isAvailable()

  // Reset AI output when the underlying month / drill changes.
  useEffect(() => {
    setAiNarrative(null)
    setAiError(null)
  }, [yearMonth, drillParentId, summary.totals.count])

  async function fetchAiNarrative() {
    setAiLoading(true)
    setAiError(null)
    try {
      const aggregate = {
        yearMonth: summary.yearMonth,
        totals:    summary.totals,
        byCategoryType: summary.byCategoryType,
        topCategories:  summary.topCategories,
        byPaymentMode:  summary.byPaymentMode,
        budgetVsActual: recon.totals.budgeted > 0 ? {
          budgeted: recon.totals.budgeted,
          actual:   recon.totals.actual,
          delta:    recon.totals.delta,
          disciplineScore: recon.totals.disciplineScore,
          topOvershoots:   recon.topOvershoots.map((r) => ({ category: r.categoryName, delta: r.delta })),
          topUnderSpends:  recon.topUnderSpends.map((r) => ({ category: r.categoryName, delta: r.delta })),
        } : null,
      }
      const out = await llmMonthlyNarrative(aggregate)
      if (out) setAiNarrative(out)
      else     setAiError('No response — check your Groq key or try again.')
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI call failed.')
    } finally {
      setAiLoading(false)
    }
  }

  // Parents only for the drill picker.
  const drillParents = useMemo(
    () => categories.filter((c) => c.parentId === null && c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  )

  return (
    <section className="rounded-lg border-2 border-slate-200 bg-white">
      {/* Header + month picker + drill */}
      <div className="flex items-baseline justify-between gap-3 px-4 py-3 border-b border-slate-200 flex-wrap">
        <div>
          <div className="text-[10px] font-bold tracking-[3px] uppercase text-slate-700">Analytics</div>
          <h3 className="font-serif text-base font-extrabold text-slate-900">
            {drillParentId
              ? `${drillParents.find((p) => p.id === drillParentId)?.name ?? 'Group'} at a glance.`
              : 'Month at a glance.'}
          </h3>
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <label className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-slate-500">
            Drill into
            <select
              value={drillParentId}
              onChange={(e) => setDrillParentId(e.target.value)}
              className="ml-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11.5px] normal-case font-normal tracking-normal focus:outline-none focus:border-teal-500"
            >
              <option value="">All categories</option>
              {drillParents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Budget vs actual — the discipline read-out */}
        <BudgetVsActualCard
          profile={profile}
          transactions={transactions}
          categories={categories}
          yearMonth={yearMonth}
          drillParentId={drillParentId || undefined}
        />

        {/* Narrative — AI swap-in when Groq key is set */}
        <section className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
          <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
            <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">
              Monthly narrative {aiNarrative && <span className="ml-1 text-teal-700">· AI</span>}
            </div>
            {aiAvailable && (
              <span className="flex items-baseline gap-1">
                {!aiNarrative ? (
                  <button
                    type="button"
                    onClick={fetchAiNarrative}
                    disabled={aiLoading || summary.totals.count === 0}
                    className="text-[10px] font-bold uppercase tracking-[1.5px] rounded px-2 py-0.5 text-white bg-teal-700 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {aiLoading ? 'Writing…' : '✨ Use AI'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setAiNarrative(null); setAiError(null) }}
                    className="text-[10px] font-bold uppercase tracking-[1.5px] rounded px-2 py-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    Show templated
                  </button>
                )}
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-slate-800 leading-relaxed whitespace-pre-line">
            {aiNarrative ?? narrative}
          </p>
          {aiError && (
            <p className="text-[10px] text-rose-700 italic mt-1">{aiError}</p>
          )}
          <p className="text-[9.5px] text-slate-500 italic mt-1.5">
            {aiAvailable
              ? (aiNarrative ? 'Generated via Groq · click "Show templated" to revert.' : 'Click "Use AI" to swap the templated copy for a Groq-written one.')
              : 'Templated · enter a Groq API key in Profile & Settings to enable AI narration.'}
          </p>
        </section>

        {/* Category breakdown */}
        {summary.byParentCategory.length > 0 && (
          <section className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">By category</div>
            <BreakdownBars
              rows={summary.byParentCategory.map((p) => ({ id: p.id, label: p.name, total: p.total }))}
              max={Math.max(...summary.byParentCategory.map((p) => p.total))}
            />
          </section>
        )}

        {/* Payment mode + accounts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <section className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">By payment mode</div>
            <BreakdownBars
              rows={(Object.entries(summary.byPaymentMode) as Array<[string, number]>)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => ({ id: k, label: k.replace('_', ' '), total: v }))
                .sort((a, b) => b.total - a.total)}
              max={Math.max(...Object.values(summary.byPaymentMode))}
            />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">By account</div>
            {summary.byAccount.length > 0 ? (
              <BreakdownBars
                rows={summary.byAccount.map((a) => ({ id: a.id, label: a.name, total: a.total }))}
                max={Math.max(...summary.byAccount.map((a) => a.total))}
              />
            ) : (
              <p className="text-[10.5px] text-slate-500 italic">No activity.</p>
            )}
          </section>
        </div>

        {/* 6-month trend */}
        <section className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">6-month trend (Income vs Spend vs Savings)</div>
          <TrendChart points={trend} />
        </section>
      </div>
    </section>
  )
}

// ─── Breakdown horizontal bars ────────────────────────────────────────

function BreakdownBars({ rows, max }: { rows: Array<{ id: string; label: string; total: number }>; max: number }) {
  if (rows.length === 0 || max <= 0) {
    return <p className="text-[10.5px] text-slate-500 italic">No activity.</p>
  }
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => {
        const pct = Math.max(2, (r.total / max) * 100)
        return (
          <li key={r.id}>
            <div className="flex items-baseline justify-between text-[10.5px] mb-0.5">
              <span className="text-slate-800 capitalize">{r.label}</span>
              <span className="font-mono tabular-nums text-slate-900">{fmtINR(r.total)}</span>
            </div>
            <div className="h-1.5 rounded bg-slate-100 overflow-hidden">
              <div className="h-full bg-teal-500" style={{ width: `${pct}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ─── Trend chart (simple SVG; no recharts dep) ───────────────────────

function TrendChart({ points }: { points: ReturnType<typeof trends> }) {
  if (points.length === 0) return <p className="text-[10.5px] text-slate-500 italic">No data.</p>
  const max = Math.max(
    ...points.flatMap((p) => [p.income, p.expense, p.savings]),
    1,
  )
  const width = 100, height = 100
  const xStep = width / Math.max(1, points.length - 1)
  function line(values: number[], color: string) {
    if (values.length === 0) return null
    const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * xStep} ${height - (v / max) * height}`).join(' ')
    return <path d={d} stroke={color} strokeWidth={1.5} fill="none" vectorEffect="non-scaling-stroke" />
  }
  return (
    <div>
      <svg viewBox={`-2 -2 ${width + 4} ${height + 4}`} className="w-full h-32" preserveAspectRatio="none">
        {line(points.map((p) => p.income),  '#0d9488')}    {/* teal */}
        {line(points.map((p) => p.expense), '#e11d48')}    {/* rose */}
        {line(points.map((p) => p.savings), '#2563eb')}    {/* blue */}
      </svg>
      <div className="flex items-baseline justify-between mt-1 text-[9px] text-slate-500 font-mono">
        {points.map((p) => <span key={p.yearMonth}>{p.yearMonth.slice(2)}</span>)}
      </div>
      <div className="flex items-baseline gap-3 mt-1 text-[10px]">
        <Legend color="#0d9488" label="Income" />
        <Legend color="#e11d48" label="Spend" />
        <Legend color="#2563eb" label="Savings" />
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span aria-hidden="true" className="inline-block w-2 h-2 rounded-sm" style={{ background: color }} />
      <span className="text-slate-700">{label}</span>
    </span>
  )
}
