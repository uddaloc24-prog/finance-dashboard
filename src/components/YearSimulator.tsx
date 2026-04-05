import { useState, useEffect, useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { BucketState, ReturnAssumptions, SWPYearRow } from '../types'
import { simulateSWP } from '../lib/calculations'
import { Card, CardHeader, CardTitle } from './ui/Card'

interface Props {
  buckets: BucketState
  monthlyWithdrawal: number
  inflationRate: number
  returnAssumptions: ReturnAssumptions
  startYear?: number
}

const CR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

const SPEEDS = [
  { label: '0.5×', ms: 2000 },
  { label: '1×', ms: 1000 },
  { label: '2×', ms: 500 },
  { label: '4×', ms: 250 },
]

function BucketBar({
  label,
  value,
  prevValue,
  max,
  color,
  bgColor,
  textColor,
}: {
  label: string
  value: number
  prevValue: number
  max: number
  color: string
  bgColor: string
  textColor: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const delta = value - prevValue
  return (
    <div className={`rounded-xl border p-4 ${bgColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-bold ${textColor}`}>{label}</span>
        <div className="text-right">
          <p className={`text-lg font-bold ${textColor}`}>{CR(value)}</p>
          {delta !== 0 && (
            <p className={`text-xs font-medium ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {delta > 0 ? '+' : ''}{CR(delta)}
            </p>
          )}
        </div>
      </div>
      <div className="h-2.5 bg-white/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function EventStep({
  icon,
  label,
  amount,
  note,
  variant = 'default',
}: {
  icon: string
  label: string
  amount: number
  note?: string
  variant?: 'default' | 'positive' | 'warning' | 'danger'
}) {
  const colors = {
    default: 'text-gray-700',
    positive: 'text-green-700',
    warning: 'text-amber-700',
    danger: 'text-red-700',
  }
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-lg leading-none mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-medium ${colors[variant]}`}>{label}</span>
          <span className={`text-sm font-bold tabular-nums ${colors[variant]}`}>{INR(amount)}</span>
        </div>
        {note && <p className="text-xs text-gray-400 mt-0.5">{note}</p>}
      </div>
    </div>
  )
}

export function YearSimulator({
  buckets,
  monthlyWithdrawal,
  inflationRate,
  returnAssumptions,
  startYear = new Date().getFullYear(),
}: Props) {
  const rows: SWPYearRow[] = simulateSWP({ buckets, monthlyWithdrawal, inflationRate, returnAssumptions })
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speedIdx, setSpeedIdx] = useState(1) // default 1× = 1000ms
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const row = rows[idx]
  const prevRow = idx > 0 ? rows[idx - 1] : null

  const prevB1 = prevRow?.b1 ?? buckets.b1
  const prevB2 = prevRow?.b2 ?? buckets.b2
  const prevB3 = prevRow?.b3 ?? buckets.b3

  // B3 growth this year: if harvested, all gains moved to B2; otherwise B3 itself grew
  const b3GrowthThisYear = row.b3Harvested > 0 ? row.b3Harvested : row.b3 - prevB3

  const maxCorpus = rows[0]?.totalCorpus ?? 1

  // Auto-play
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setIdx((i) => {
          if (i >= rows.length - 1) {
            setPlaying(false)
            return i
          }
          return i + 1
        })
      }, SPEEDS[speedIdx].ms)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, speedIdx, rows.length])

  const calYear = startYear + row.year - 1

  // Chart data: all rows up to current idx (inclusive) for the sparkline
  const chartData = rows.slice(0, idx + 1).map((r) => ({
    year: startYear + r.year - 1,
    B1: r.b1,
    B2: r.b2,
    B3: r.b3,
  }))

  const depleted = row.totalCorpus <= 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Year-by-Year Bucket Flow</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Step through each year to see how money flows between buckets
            </p>
          </div>
          {depleted && (
            <span className="text-xs text-red-600 font-medium bg-red-50 px-3 py-1 rounded-full">
              Corpus depleted
            </span>
          )}
        </div>
      </CardHeader>

      {/* ── Year control ── */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        {/* Scrubber */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="range"
            min={0}
            max={rows.length - 1}
            value={idx}
            onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value)) }}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>{startYear}</span>
            <span>{startYear + rows.length - 1}</span>
          </div>
        </div>

        {/* Prev / display / Next */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPlaying(false); setIdx((i) => Math.max(0, i - 1)) }}
            disabled={idx === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 text-gray-600 font-bold"
          >
            ‹
          </button>
          <div className="text-center min-w-[90px]">
            <p className="text-xl font-bold text-gray-900">{calYear}</p>
            <p className="text-xs text-gray-400">Year {row.year} of {rows.length}</p>
          </div>
          <button
            onClick={() => { setPlaying(false); setIdx((i) => Math.min(rows.length - 1, i + 1)) }}
            disabled={idx === rows.length - 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 text-gray-600 font-bold"
          >
            ›
          </button>
        </div>

        {/* Play / speed */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying((p) => !p)}
            disabled={idx === rows.length - 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 min-w-[72px]"
          >
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {SPEEDS.map((s, i) => (
              <button
                key={s.label}
                onClick={() => setSpeedIdx(i)}
                className={`px-2.5 py-1.5 font-medium transition-colors ${
                  i === speedIdx
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {idx > 0 && (
            <button
              onClick={() => { setPlaying(false); setIdx(0) }}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50"
            >
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Bucket bars ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <BucketBar
          label="B1 — Short Term (Liquid)"
          value={row.b1}
          prevValue={prevB1}
          max={maxCorpus}
          color="bg-blue-500"
          bgColor="bg-blue-50 border-blue-200"
          textColor="text-blue-700"
        />
        <BucketBar
          label="B2 — Medium Term (Buffer)"
          value={row.b2}
          prevValue={prevB2}
          max={maxCorpus}
          color="bg-amber-500"
          bgColor="bg-amber-50 border-amber-200"
          textColor="text-amber-700"
        />
        <BucketBar
          label="B3 — Long Term (Growth)"
          value={row.b3}
          prevValue={prevB3}
          max={maxCorpus}
          color="bg-green-500"
          bgColor="bg-green-50 border-green-200"
          textColor="text-green-700"
        />
      </div>

      {/* ── Cascade events ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            What happened in {calYear}
          </p>
          <div className="divide-y divide-gray-100">
            {/* B3 growth (always) */}
            <EventStep
              icon="📈"
              label="B3 compounded (equity growth)"
              amount={b3GrowthThisYear}
              note={row.b3Harvested > 0
                ? `B2 needed replenishment — all accumulated gains (${CR(row.b3Harvested)}) harvested`
                : `${returnAssumptions.b3}% — gains stay in B3, compounding further`}
              variant="positive"
            />
            {row.b3Harvested > 0 && (
              <EventStep
                icon="🌾"
                label="B3 gains transferred → B2"
                amount={row.b3Harvested}
                note="B3 resets to principal; all accumulated gains moved to buffer"
                variant="positive"
              />
            )}
            <EventStep
              icon="📊"
              label="B2 grew on its own balance"
              amount={row.b2GrowthEarned}
              note={`${returnAssumptions.b2}% return`}
              variant="positive"
            />
            <EventStep
              icon="💰"
              label="B1 earned return"
              amount={row.b1GrowthEarned}
              note={`${returnAssumptions.b1}% return`}
              variant="positive"
            />
            <EventStep
              icon="💸"
              label="Annual withdrawal from B1"
              amount={row.annualWithdrawal}
              note={`₹${Math.round(row.annualWithdrawal / 12).toLocaleString('en-IN')}/month (inflation-adjusted)`}
              variant="warning"
            />
            {row.b1RefillFromB2 > 0 && (
              <EventStep
                icon="🔄"
                label="B2 → B1 top-up (auto-refill)"
                amount={row.b1RefillFromB2}
                note="B1 dropped below 1yr expenses — refilled to 2yr buffer"
                variant="default"
              />
            )}
            {row.b2EmergencyFromB3 > 0 && (
              <EventStep
                icon="🚨"
                label="Emergency: B3 principal → B2"
                amount={row.b2EmergencyFromB3}
                note="B2 critically low — last-resort liquidation"
                variant="danger"
              />
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              End of Year Summary
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total corpus</span>
                <span className="font-bold text-gray-900">{CR(row.totalCorpus)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Annual withdrawal</span>
                <span className="font-medium text-amber-700">{INR(row.annualWithdrawal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Monthly withdrawal</span>
                <span className="font-medium text-amber-700">{INR(row.annualWithdrawal / 12)}</span>
              </div>
              {prevRow && (
                <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
                  <span className="text-gray-500">Corpus change</span>
                  <span className={`font-bold ${row.totalCorpus >= prevRow.totalCorpus ? 'text-green-600' : 'text-red-500'}`}>
                    {row.totalCorpus >= prevRow.totalCorpus ? '+' : ''}{CR(row.totalCorpus - prevRow.totalCorpus)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">
              B1 Runway
            </p>
            <p className="text-2xl font-bold text-indigo-700">
              {row.annualWithdrawal > 0
                ? Math.floor((row.b1 / row.annualWithdrawal) * 12)
                : '∞'}{' '}
              <span className="text-sm font-medium">months</span>
            </p>
            <p className="text-xs text-indigo-400 mt-0.5">
              {CR(row.b1)} in B1 at current withdrawal rate
            </p>
          </div>
        </div>
      </div>

      {/* ── Sparkline chart ── */}
      {chartData.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Corpus trail ({startYear} → {calYear})
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={CR} width={56} />
                <Tooltip formatter={(v: number) => CR(v)} labelFormatter={(l) => `Year: ${l}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine x={calYear} stroke="#6366f1" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="B3" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="B2" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="B1" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Card>
  )
}
