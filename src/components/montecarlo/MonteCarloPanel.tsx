import { useState } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { UserProfile, BucketState, ReturnAssumptions } from '../../types'
import type { MonteCarloResult } from '../../lib/calculations/monteCarlo'
import { runMonteCarlo } from '../../lib/calculations/monteCarlo'
import { Button } from '../ui/Button'

interface Props {
  profile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
}

const fmtINR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

const fmtAxis = (n: number) => {
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `${(n / 1e5).toFixed(0)}L`
  return n.toLocaleString('en-IN')
}

export function MonteCarloPanel({ profile, buckets, returnAssumptions }: Props) {
  const [result, setResult] = useState<MonteCarloResult | null>(null)
  const [running, setRunning] = useState(false)
  const [runs, setRuns] = useState(200)

  const handleRun = () => {
    setRunning(true)
    // Yield to allow spinner to render before blocking compute
    setTimeout(() => {
      const res = runMonteCarlo({
        corpus: profile.corpus,
        monthlyWithdrawal: profile.monthlyWithdrawal,
        inflationRate: profile.inflationRate,
        returnAssumptions,
        buckets,
        runs,
      })
      setResult(res)
      setRunning(false)
    }, 30)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Monte Carlo simulation</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Sample {runs} portfolio paths with random per-year returns. See the percentile band of outcomes — how often the plan succeeds, and what range of corpus to expect.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={runs}
            onChange={(e) => setRuns(Number(e.target.value))}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value={100}>100 runs (fast)</option>
            <option value={200}>200 runs</option>
            <option value={500}>500 runs</option>
            <option value={1000}>1000 runs</option>
          </select>
          <Button onClick={handleRun} disabled={running}>
            {running ? 'Running…' : result ? 'Re-run' : 'Run simulation →'}
          </Button>
        </div>
      </div>

      {!result && !running && (
        <div className="rounded-xl bg-gray-50 border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          Click <strong>Run simulation</strong> to project a fan of possible outcomes for your plan.
        </div>
      )}

      {running && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-6 text-center text-sm text-blue-800">
          Running {runs} simulations...
        </div>
      )}

      {result && !running && (
        <>
          <div className="grid sm:grid-cols-4 gap-3">
            <KPI
              label="Success rate"
              value={`${(result.successRate * 100).toFixed(0)}%`}
              tone={result.successRate >= 0.85 ? 'good' : result.successRate >= 0.65 ? 'warn' : 'bad'}
              hint={`${result.runs} runs · ${result.durationMs}ms`}
            />
            <KPI label="Median final" value={fmtINR(result.medianFinalCorpus)} hint="50th percentile" />
            <KPI label="Best case" value={fmtINR(result.p90FinalCorpus)} tone="good" hint="90th percentile" />
            <KPI label="Worst case" value={fmtINR(result.p10FinalCorpus)} tone="bad" hint="10th percentile" />
          </div>

          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={result.yearlyPercentiles} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11 }} width={55} />
              <Tooltip
                formatter={(v: number, name: string) => [fmtINR(v), name]}
                labelFormatter={(y) => `Year ${y}`}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />

              {/* Outer band: p10 → p90 (lightest) */}
              <Area type="monotone" dataKey="p90" stackId="bands" name="p10-p90 range" fill="#dbeafe" stroke="none" fillOpacity={0.6} />
              <Area type="monotone" dataKey="p10" stackId="bands-low" name=" " fill="#dbeafe" stroke="none" fillOpacity={0} />

              {/* Inner band: p25 → p75 */}
              <Area type="monotone" dataKey="p75" stackId="bands2" name="p25-p75 range" fill="#93c5fd" stroke="none" fillOpacity={0.5} />
              <Area type="monotone" dataKey="p25" stackId="bands2-low" name=" " fill="#93c5fd" stroke="none" fillOpacity={0} />

              {/* Median line */}
              <Line type="monotone" dataKey="median" stroke="#1d4ed8" strokeWidth={2.5} dot={false} name="Median" />
            </ComposedChart>
          </ResponsiveContainer>

          {result.worstDepletionYear && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              <strong>Earliest depletion:</strong> in the worst run, corpus hit zero in year {result.worstDepletionYear}. The {(100 - result.successRate * 100).toFixed(0)}% of runs that fail concentrate in this region.
            </div>
          )}
        </>
      )}
    </div>
  )
}

function KPI({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const toneClass = tone === 'good' ? 'text-green-700' : tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-red-700' : 'text-gray-900'
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-xl font-bold mt-1 tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="text-[11px] text-gray-400 mt-0.5">{hint}</div>}
    </div>
  )
}
