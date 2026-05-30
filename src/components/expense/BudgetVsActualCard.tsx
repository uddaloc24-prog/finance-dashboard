// BudgetVsActualCard — the behavioural read-out: budget adherence,
// discipline score, and the biggest overshoots / under-spends for the
// current month. Reads the Plan-tab budget (UserProfile.expenses.breakdown)
// and reconciles against logged expense transactions.
//
// When no budget breakdown exists, the card surfaces a friendly nudge
// to fill in the Plan tab's Monthly Budget editor.

import { useMemo } from 'react'
import type { Transaction, Category } from '../../types/expense'
import type { UserProfile } from '../../types'
import { reconcileWithBudget } from '../../lib/expense/budgetReconciler'

interface Props {
  profile: UserProfile
  transactions: Transaction[]
  categories: Category[]
  yearMonth: string                      // YYYY-MM
}

function fmtINR(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e7) return `₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `₹${(abs / 1e5).toFixed(1)} L`
  if (abs >= 1e3) return `₹${(abs / 1e3).toFixed(1)}k`
  return `₹${Math.round(abs)}`
}

export function BudgetVsActualCard({ profile, transactions, categories, yearMonth }: Props) {
  const breakdown = profile.expenses?.breakdown
  const recon = useMemo(
    () => reconcileWithBudget(transactions, categories, breakdown, yearMonth),
    [transactions, categories, breakdown, yearMonth],
  )

  if (!breakdown || recon.totals.budgeted <= 0) {
    return (
      <section className="rounded-lg border-2 border-amber-200 bg-amber-50/40 p-4">
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
          <div>
            <div className="text-[10px] font-bold tracking-[3px] uppercase text-amber-800">Budget vs actual</div>
            <h3 className="font-serif text-base font-extrabold text-slate-900">No budget set yet.</h3>
          </div>
        </div>
        <p className="text-[11.5px] text-slate-700 leading-snug">
          Fill the <strong>Monthly Budget</strong> section on the Plan tab to start tracking discipline. The four expense groups
          (Essential · Lifestyle · Healthcare · Education) and 18 sub-categories there are identical to the categories in this
          tab — once they're set, this card lights up with budget-vs-actual deltas, overshoots, and a discipline score.
        </p>
      </section>
    )
  }

  const t = recon.totals
  const tone =
    t.disciplineScore >= 0.9 ? 'emerald' :
    t.disciplineScore >= 0.7 ? 'amber' :
                                'rose'
  const toneClass = tone === 'emerald'
    ? 'border-emerald-300 bg-emerald-50/40'
    : tone === 'amber'
      ? 'border-amber-300 bg-amber-50/40'
      : 'border-rose-300 bg-rose-50/40'
  const scoreColor = tone === 'emerald' ? 'text-emerald-700'
                    : tone === 'amber'   ? 'text-amber-700'
                    :                       'text-rose-700'

  return (
    <section className={`rounded-lg border-2 ${toneClass} p-4`}>
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-[10px] font-bold tracking-[3px] uppercase text-slate-700">Budget vs actual</div>
          <h3 className="font-serif text-base font-extrabold text-slate-900">
            {t.delta > 0 ? `${fmtINR(Math.abs(t.delta))} over budget`
              : t.delta < 0 ? `${fmtINR(Math.abs(t.delta))} under budget`
              :                'On budget.'}
          </h3>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-bold tracking-[2px] uppercase text-slate-500">Discipline</div>
          <div className={`font-mono font-extrabold text-[22px] tabular-nums ${scoreColor}`}>
            {(t.disciplineScore * 100).toFixed(0)} <span className="text-[12px]">%</span>
          </div>
        </div>
      </div>

      {/* Headline strip */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Tile label="Budgeted (MTD)" value={fmtINR(t.budgeted)} />
        <Tile label="Actual (MTD)"   value={fmtINR(t.actual)} tone={t.delta > 0 ? 'rose' : 'emerald'} />
        <Tile label="Over / Under"   value={`${t.overshootCount} / ${t.underCount}`} sub="categories" />
      </div>

      {/* Overshoots + Under-spends */}
      {(recon.topOvershoots.length > 0 || recon.topUnderSpends.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          {recon.topOvershoots.length > 0 && (
            <div className="rounded border border-rose-300 bg-white p-2">
              <div className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-rose-700 mb-1">Biggest overshoots</div>
              <ul className="space-y-0.5">
                {recon.topOvershoots.map((r) => (
                  <li key={r.budgetKey} className="grid grid-cols-[1fr_auto] gap-2 text-[11px]">
                    <span className="text-slate-800 truncate">{r.categoryName}</span>
                    <span className="font-mono text-rose-700 tabular-nums shrink-0">+{fmtINR(r.delta)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recon.topUnderSpends.length > 0 && (
            <div className="rounded border border-emerald-300 bg-white p-2">
              <div className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-emerald-700 mb-1">Biggest under-spends</div>
              <ul className="space-y-0.5">
                {recon.topUnderSpends.map((r) => (
                  <li key={r.budgetKey} className="grid grid-cols-[1fr_auto] gap-2 text-[11px]">
                    <span className="text-slate-800 truncate">{r.categoryName}</span>
                    <span className="font-mono text-emerald-700 tabular-nums shrink-0">-{fmtINR(Math.abs(r.delta))}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Full row table (collapsible) */}
      <details className="text-[11px]">
        <summary className="cursor-pointer font-bold uppercase tracking-[1.5px] text-slate-600 text-[10px] hover:text-slate-900">
          All {recon.rows.length} budget rows
        </summary>
        <table className="w-full mt-2 text-[10.5px]">
          <thead className="text-slate-500 text-left">
            <tr className="border-b border-slate-200">
              <th className="font-normal py-1">Category</th>
              <th className="font-normal py-1 text-right">Budget</th>
              <th className="font-normal py-1 text-right">Actual</th>
              <th className="font-normal py-1 text-right">Δ</th>
              <th className="font-normal py-1 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {recon.rows.map((r) => {
              const statusColor = r.status === 'over' ? 'text-rose-700'
                                : r.status === 'under' ? 'text-emerald-700'
                                : 'text-slate-500'
              return (
                <tr key={r.budgetKey} className="border-b border-slate-100">
                  <td className="py-1 text-slate-900">{r.categoryName}<span className="text-slate-400 text-[9px]"> · {r.groupName}</span></td>
                  <td className="py-1 text-right tabular-nums text-slate-700">{fmtINR(r.budgetedMonthly)}</td>
                  <td className="py-1 text-right tabular-nums font-semibold text-slate-900">{fmtINR(r.actualMtd)}</td>
                  <td className={`py-1 text-right tabular-nums ${statusColor}`}>{r.delta >= 0 ? '+' : '-'}{fmtINR(Math.abs(r.delta))}</td>
                  <td className={`py-1 text-right uppercase tracking-[1.5px] text-[9px] font-bold ${statusColor}`}>{r.status}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </details>
    </section>
  )
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'rose' | 'emerald' }) {
  const fg = tone === 'rose'    ? 'text-rose-700'
            : tone === 'emerald' ? 'text-emerald-700'
            :                       'text-slate-900'
  return (
    <div className="rounded border border-slate-200 bg-white px-3 py-1.5">
      <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-slate-500">{label}</div>
      <div className={`font-mono font-extrabold text-[15px] tabular-nums ${fg}`}>{value}</div>
      {sub && <div className="text-[9px] text-slate-500 italic">{sub}</div>}
    </div>
  )
}
