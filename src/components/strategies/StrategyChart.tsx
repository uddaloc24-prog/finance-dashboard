import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { StrategyResult } from '../../types/strategies'

interface Props {
  results: StrategyResult[]
  highlightId?: string | null
}

const STRATEGY_COLORS: Record<string, string> = {
  rule4pct:     '#dc2626',  // red
  guardrails:   '#ea580c',  // orange
  vanguard:     '#ca8a04',  // amber
  bucket3:      '#16a34a',  // green
  bucket4india: '#2563eb',  // blue (best fit)
  npsHybrid:    '#7c3aed',  // violet
  scssPmvvy:    '#0891b2',  // cyan
  rmdBased:     '#94a3b8',  // gray (N/A)
  tipsLadder:   '#94a3b8',  // gray (N/A)
  constantPct:  '#db2777',  // pink
}

const fmtAxis = (n: number) => {
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `${(n / 1e5).toFixed(0)} L`
  return n.toLocaleString('en-IN')
}

const fmtTip = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

export function StrategyChart({ results, highlightId }: Props) {
  // Build a year-indexed dataset: { year: 0, rule4pct: 100000000, ... }
  const horizon = (results[0]?.yearlyCorpus.length ?? 21) - 1
  const data: Array<Record<string, number>> = []
  for (let y = 0; y <= horizon; y++) {
    const row: Record<string, number> = { year: y }
    for (const r of results) {
      // skip N/A strategies in the chart
      if (r.verdict === 'NOT_APPLICABLE') continue
      row[r.id] = r.yearlyCorpus[y] ?? 0
    }
    data.push(row)
  }
  const visibleResults = results.filter((r) => r.verdict !== 'NOT_APPLICABLE')

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">20-Year Corpus Projection</h3>
        <span className="text-[11px] text-gray-500">
          {visibleResults.length} of {results.length} shown · N/A strategies hidden
        </span>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11 }}
            label={{ value: 'Year', position: 'insideBottom', offset: -2, fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={fmtAxis}
            width={60}
          />
          <Tooltip
            formatter={(v: number, _name, payload) => [fmtTip(v), payload.dataKey]}
            labelFormatter={(y) => `Year ${y}`}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="line"
          />
          {visibleResults.map((r) => (
            <Line
              key={r.id}
              type="monotone"
              dataKey={r.id}
              name={r.name}
              stroke={STRATEGY_COLORS[r.id] ?? '#64748b'}
              strokeWidth={highlightId === r.id ? 3 : highlightId ? 1 : 2}
              strokeOpacity={highlightId && highlightId !== r.id ? 0.3 : 1}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
