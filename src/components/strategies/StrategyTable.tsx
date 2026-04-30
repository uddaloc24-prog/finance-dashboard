import { useState } from 'react'
import type { StrategyResult, Verdict } from '../../types/strategies'

interface Props {
  results: StrategyResult[]
  onSelect?: (id: string) => void
  selectedId?: string | null
}

type SortKey = 'score' | 'finalCorpus' | 'safeWR' | 'monthly' | 'postTax'

const verdictStyle: Record<Verdict, { bg: string; text: string; label: string; icon: string }> = {
  PASSES:         { bg: 'bg-green-100',  text: 'text-green-800',  label: 'PASSES',   icon: '✅' },
  PARTIAL:        { bg: 'bg-amber-100',  text: 'text-amber-800',  label: 'PARTIAL',  icon: '⚠️' },
  FAILS:          { bg: 'bg-red-100',    text: 'text-red-800',    label: 'FAILS',    icon: '❌' },
  NOT_APPLICABLE: { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'N/A',      icon: '🚫' },
  BEST_FIT:       { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'BEST FIT', icon: '⭐' },
}

const fmtINR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

export function StrategyTable({ results, onSelect, selectedId }: Props) {
  const [sort, setSort] = useState<SortKey>('score')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const sorted = [...results].sort((a, b) => {
    let cmp = 0
    switch (sort) {
      case 'score':       cmp = a.totalScore - b.totalScore; break
      case 'finalCorpus': cmp = a.finalCorpus - b.finalCorpus; break
      case 'safeWR':      cmp = a.safeWRmid - b.safeWRmid; break
      case 'monthly':     cmp = a.monthlyIncomeOnCorpus - b.monthlyIncomeOnCorpus; break
      case 'postTax':     cmp = a.postTaxMonthlyIncome - b.postTaxMonthlyIncome; break
    }
    return dir === 'asc' ? cmp : -cmp
  })

  const handleSort = (key: SortKey) => {
    if (sort === key) setDir(dir === 'asc' ? 'desc' : 'asc')
    else { setSort(key); setDir('desc') }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Strategy</th>
              <Th label="Safe WR" active={sort === 'safeWR'} dir={dir} onClick={() => handleSort('safeWR')} />
              <Th label="Gross / mo" active={sort === 'monthly'} dir={dir} onClick={() => handleSort('monthly')} />
              <Th label="Net / mo (post-tax)" active={sort === 'postTax'} dir={dir} onClick={() => handleSort('postTax')} />
              <Th label="20-yr Corpus" active={sort === 'finalCorpus'} dir={dir} onClick={() => handleSort('finalCorpus')} />
              <Th label="Score /60" active={sort === 'score'} dir={dir} onClick={() => handleSort('score')} />
              <th className="text-left px-4 py-3 font-medium">Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((r) => {
              const v = verdictStyle[r.verdict]
              const isSelected = selectedId === r.id
              return (
                <tr
                  key={r.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onSelect?.(r.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true">{r.flag}</span>
                      <span className="font-medium text-gray-900">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                    {r.safeWRmid.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                    {fmtINR(r.monthlyIncomeOnCorpus)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <div className="font-semibold text-gray-900">{fmtINR(r.postTaxMonthlyIncome)}</div>
                    <div className={`text-[10px] ${r.taxDragPct < 5 ? 'text-green-600' : r.taxDragPct < 15 ? 'text-amber-600' : 'text-red-600'}`}>
                      −{r.taxDragPct.toFixed(1)}% tax
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={r.finalCorpus >= 0 ? 'text-gray-900' : 'text-red-700'}>
                      {fmtINR(r.finalCorpus)}
                    </span>
                    {r.depletionYear && (
                      <div className="text-[10px] text-red-600">
                        depleted yr {r.depletionYear}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className="font-semibold text-gray-900">{r.totalScore}</span>
                    <span className="text-gray-400 text-xs">/60</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${v.bg} ${v.text}`}>
                      <span aria-hidden="true">{v.icon}</span>
                      {v.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-gray-50 text-[11px] text-gray-500 border-t border-gray-100">
        Click a row to see details. Sortable: tap any column header.
      </div>
    </div>
  )
}

function Th({ label, active, dir, onClick }: { label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void }) {
  return (
    <th
      className="text-right px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900"
      onClick={onClick}
      role="button"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="text-gray-400">
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  )
}
