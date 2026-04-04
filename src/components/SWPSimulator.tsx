import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { BucketState, ReturnAssumptions, SWPYearRow } from '../types'
import { simulateSWP } from '../lib/calculations'
import { Card, CardHeader, CardTitle } from './ui/Card'
import { LEGACY_YEARS } from '../constants'

interface Props {
  buckets: BucketState
  monthlyWithdrawal: number
  inflationRate: number
  returnAssumptions: ReturnAssumptions
}

const CR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">Year {label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-6">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{CR(p.value)}</span>
        </div>
      ))}
      <div className="border-t mt-2 pt-2 flex justify-between">
        <span className="text-gray-500">Total</span>
        <span className="font-bold">{CR(total)}</span>
      </div>
    </div>
  )
}

export function SWPSimulator({ buckets, monthlyWithdrawal, inflationRate, returnAssumptions }: Props) {
  const rows: SWPYearRow[] = simulateSWP({ buckets, monthlyWithdrawal, inflationRate, returnAssumptions })
  const depleted = rows.find((r) => r.totalCorpus <= 0)

  const chartData = rows.map((r) => ({
    year: r.year,
    'B1 (Short)': r.b1,
    'B2 (Mid)': r.b2,
    'B3 (Long)': r.b3,
  }))

  const legacyRows = rows.filter((r) => LEGACY_YEARS.includes(r.year))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>SWP Simulator — 25-Year Projection</CardTitle>
          {depleted && (
            <span className="text-xs text-red-600 font-medium bg-red-50 px-3 py-1 rounded-full">
              Corpus depletes at Year {depleted.year}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Withdrawal steps up {inflationRate}% annually. Buckets auto-refill in sequence.
        </p>
      </CardHeader>

      {/* Chart */}
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gB3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gB2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gB1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} tickFormatter={(v) => `Yr ${v}`} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={CR} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {LEGACY_YEARS.map((yr) => (
              <ReferenceLine key={yr} x={yr} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: `Yr ${yr}`, position: 'top', fontSize: 10, fill: '#94a3b8' }} />
            ))}
            <Area type="monotone" dataKey="B3 (Long)" stackId="1" stroke="#22c55e" fill="url(#gB3)" strokeWidth={2} />
            <Area type="monotone" dataKey="B2 (Mid)" stackId="1" stroke="#f59e0b" fill="url(#gB2)" strokeWidth={2} />
            <Area type="monotone" dataKey="B1 (Short)" stackId="1" stroke="#3b82f6" fill="url(#gB1)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legacy corpus table */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Legacy Corpus at Key Milestones</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="pb-2 font-medium">Year</th>
                <th className="pb-2 font-medium">Annual Withdrawal</th>
                <th className="pb-2 font-medium">B1</th>
                <th className="pb-2 font-medium">B2</th>
                <th className="pb-2 font-medium">B3</th>
                <th className="pb-2 font-medium">Total Legacy Corpus</th>
              </tr>
            </thead>
            <tbody>
              {legacyRows.map((row) => (
                <tr key={row.year} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2.5 font-semibold text-gray-700">Year {row.year}</td>
                  <td className="py-2.5 text-gray-600">{INR(row.annualWithdrawal)}</td>
                  <td className="py-2.5 text-blue-600">{CR(row.b1)}</td>
                  <td className="py-2.5 text-amber-600">{CR(row.b2)}</td>
                  <td className="py-2.5 text-green-600">{CR(row.b3)}</td>
                  <td className="py-2.5 font-bold text-gray-900">{CR(row.totalCorpus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}
