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
        <span className={`text-xs font-bold ${textColor}`}>{label}</span>
        <div className="text-right">
          <p className={`text-base font-bold ${textColor}`}>{CR(value)}</p>
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

interface BucketLine {
  icon: string
  text: string
  amount: number
  sign: '+' | '-' | '='
  color: string
  bold?: boolean
}

function MathLine({ icon, text, amount, sign, color, bold }: BucketLine) {
  return (
    <div className={`flex items-center justify-between py-1 ${bold ? 'border-t border-gray-200 mt-1 pt-2' : ''}`}>
      <span className="flex items-center gap-1.5 text-xs text-gray-600">
        <span>{icon}</span>
        <span>{text}</span>
      </span>
      <span className={`text-xs font-${bold ? 'bold' : 'medium'} tabular-nums ${color}`}>
        {sign === '=' ? '' : sign}{CR(amount)}
      </span>
    </div>
  )
}

function BucketExplainer({
  calYear, row, prevB1, prevB2, prevB3, prevB4, returnAssumptions,
}: {
  calYear: number
  row: SWPYearRow
  prevB1: number; prevB2: number; prevB3: number; prevB4: number
  returnAssumptions: ReturnAssumptions
}) {
  const b4GrowthBeforeHarvest = row.b4Harvested  // interest-only model: B4 principal constant

  // In the interest-only model, all transfers are regular annual SWP flows, not events.
  // The only "event" worth calling out is an emergency B2 principal draw.
  const emergencyReason = row.b2EmergencyToB1 > 0
    ? `B1's pool ran dry — the cascaded interest from all buckets wasn't enough to cover your inflation-adjusted withdrawal. As a last resort, ${CR(row.b2EmergencyToB1)} of B2's SCSS/FD principal was broken into to top up B1. This is rare and only happens when withdrawals significantly exceed total investment returns over several years.`
    : null

  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        How Each Bucket Changed in {calYear}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {/* B1 — liquid pool */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs font-bold text-blue-700 mb-2">B1 — Liquid MF / Money Market</p>
          <MathLine icon="▸" text="Pool at start of year" amount={prevB1} sign="=" color="text-gray-500" />
          <MathLine icon="✓" text={`Earned ${returnAssumptions.b1}% on pool`} amount={row.b1GrowthEarned} sign="+" color="text-green-600" />
          <MathLine icon="⬇️" text="Received from B2 cascade" amount={row.b1RefillFromB2} sign="+" color="text-blue-600" />
          <MathLine icon="✗" text="You withdrew (12 months)" amount={row.annualWithdrawal} sign="-" color="text-red-500" />
          {row.b2EmergencyToB1 > 0 && (
            <MathLine icon="🚨" text="Emergency B2 principal drawn" amount={row.b2EmergencyToB1} sign="+" color="text-red-600" />
          )}
          <MathLine icon="=" text="Pool at end of year" amount={row.b1} sign="=" color="text-blue-700" bold />
          <p className="text-xs text-blue-500 mt-2 leading-snug">
            B1 is your spending pool. It receives all cascaded interest from B2/B3/B4 each year, then pays your withdrawals. The pool rises when interest &gt; withdrawals, falls when withdrawals &gt; interest.
          </p>
        </div>

        {/* B2 — SCSS/FD fixed income */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs font-bold text-amber-700 mb-2">B2 — SCSS · FD · Short Debt</p>
          <MathLine icon="▸" text="Principal (locked)" amount={prevB2} sign="=" color="text-gray-500" />
          <MathLine icon="✓" text={`${returnAssumptions.b2}% interest earned`} amount={row.b2GrowthEarned} sign="+" color="text-green-600" />
          <MathLine icon="⬇️" text="Received from B3 cascade" amount={row.b2RefillFromB3 - row.b2GrowthEarned > 0 ? row.b2RefillFromB3 - row.b2GrowthEarned : 0} sign="+" color="text-amber-600" />
          <MathLine icon="↓" text="Sent entire cascade to B1" amount={row.b1RefillFromB2} sign="-" color="text-amber-700" />
          {row.b2EmergencyToB1 > 0 && (
            <MathLine icon="🚨" text="Emergency principal drawn" amount={row.b2EmergencyToB1} sign="-" color="text-red-600" />
          )}
          <MathLine icon="=" text="Principal at end of year" amount={row.b2} sign="=" color="text-amber-700" bold />
          <p className="text-xs text-amber-600 mt-2 leading-snug">
            {row.b2EmergencyToB1 > 0
              ? `B2's principal was partially broken into — an emergency. In normal years, only interest leaves; the ₹${(prevB2/1e5).toFixed(0)}L SCSS/FD principal stays intact.`
              : `B2's principal stayed locked at ${CR(prevB2)}. Only the interest it earned (plus B3/B4 cascade) was sent to B1. SCSS/FD works exactly like this in real life.`}
          </p>
        </div>

        {/* B3 — hybrid/BAF */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-xs font-bold text-emerald-700 mb-2">B3 — Hybrid / BAF</p>
          <MathLine icon="▸" text="Principal (locked)" amount={prevB3} sign="=" color="text-gray-500" />
          <MathLine icon="✓" text={`${returnAssumptions.b3}% interest earned`} amount={row.b3GrowthEarned} sign="+" color="text-green-600" />
          <MathLine icon="⬇️" text="Received from B4 interest" amount={row.b4Harvested} sign="+" color="text-emerald-500" />
          <MathLine icon="↓" text="Sent entire cascade to B2" amount={row.b2RefillFromB3} sign="-" color="text-emerald-700" />
          <MathLine icon="=" text="Principal at end of year" amount={row.b3} sign="=" color="text-emerald-700" bold />
          <p className="text-xs text-emerald-600 mt-2 leading-snug">
            B3's ₹{(prevB3/1e5).toFixed(0)}L principal stays locked. It earned {CR(row.b3GrowthEarned)} at {returnAssumptions.b3}%, received {CR(row.b4Harvested)} from B4, and passed all {CR(row.b2RefillFromB3)} to B2. Pure pass-through with preserved principal.
          </p>
        </div>

        {/* B4 — equity */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
          <p className="text-xs font-bold text-purple-700 mb-2">B4 — Equity (Flexi Cap / Index)</p>
          <MathLine icon="▸" text="Principal (permanently locked)" amount={prevB4} sign="=" color="text-gray-500" />
          <MathLine icon="✓" text={`${returnAssumptions.b4}% equity return earned`} amount={b4GrowthBeforeHarvest} sign="+" color="text-green-600" />
          <MathLine icon="↓" text="Sent interest to B3 (annual SWP)" amount={row.b4Harvested} sign="-" color="text-purple-500" />
          <MathLine icon="=" text="Principal at end of year" amount={row.b4} sign="=" color="text-purple-700" bold />
          <p className="text-xs text-purple-500 mt-2 leading-snug">
            B4's ₹{(prevB4/1e5).toFixed(0)}L principal never changes. Every year it earns {CR(b4GrowthBeforeHarvest)} at {returnAssumptions.b4}% — all of that goes to B3 as interest income. The principal stays permanently invested.
          </p>
        </div>
      </div>

      {/* Normal flow note + emergency callout */}
      {emergencyReason ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">🚨 Emergency This Year</p>
          <p className="text-xs text-red-700 leading-relaxed">{emergencyReason}</p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700">
          <p className="font-semibold mb-1">✓ Normal year — interest-only cascade</p>
          <p className="text-green-600 leading-relaxed">
            B4 sent {CR(row.b4Harvested)} interest to B3 · B3 cascaded {CR(row.b2RefillFromB3)} to B2 · B2 sent {CR(row.b1RefillFromB2)} to B1 · B1 paid your {CR(row.annualWithdrawal)} withdrawal. All principals stayed intact.
          </p>
        </div>
      )}
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
  const [speedIdx, setSpeedIdx] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const row = rows[idx]
  const prevRow = idx > 0 ? rows[idx - 1] : null

  const prevB1 = prevRow?.b1 ?? buckets.b1
  const prevB2 = prevRow?.b2 ?? buckets.b2
  const prevB3 = prevRow?.b3 ?? buckets.b3
  const prevB4 = prevRow?.b4 ?? buckets.b4

  // B4 growth this year
  const b4GrowthThisYear = row.b4Harvested > 0 ? row.b4Harvested : row.b4 - prevB4

  const maxCorpus = rows[0]?.totalCorpus ?? 1
  const calYear = startYear + row.year - 1
  const depleted = row.totalCorpus <= 0

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setIdx((i) => {
          if (i >= rows.length - 1) { setPlaying(false); return i }
          return i + 1
        })
      }, SPEEDS[speedIdx].ms)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, speedIdx, rows.length])

  const chartData = rows.slice(0, idx + 1).map((r) => ({
    year: startYear + r.year - 1,
    B1: r.b1,
    B2: r.b2,
    B3: r.b3,
    B4: r.b4,
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Year-by-Year Bucket Flow</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Step through each year — see the 4-bucket cascade in action
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

        <div className="flex items-center gap-2">
          <button onClick={() => { setPlaying(false); setIdx((i) => Math.max(0, i - 1)) }} disabled={idx === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 text-gray-600 font-bold">‹</button>
          <div className="text-center min-w-[90px]">
            <p className="text-xl font-bold text-gray-900">{calYear}</p>
            <p className="text-xs text-gray-400">Year {row.year} of {rows.length}</p>
          </div>
          <button onClick={() => { setPlaying(false); setIdx((i) => Math.min(rows.length - 1, i + 1)) }} disabled={idx === rows.length - 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 text-gray-600 font-bold">›</button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setPlaying((p) => !p)} disabled={idx === rows.length - 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 min-w-[72px]">
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {SPEEDS.map((s, i) => (
              <button key={s.label} onClick={() => setSpeedIdx(i)}
                className={`px-2.5 py-1.5 font-medium transition-colors ${i === speedIdx ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                {s.label}
              </button>
            ))}
          </div>
          {idx > 0 && (
            <button onClick={() => { setPlaying(false); setIdx(0) }}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50">
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {/* ── 4 Bucket bars ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <BucketBar label="B1 — Liquid" value={row.b1} prevValue={prevB1} max={maxCorpus}
          color="bg-blue-500" bgColor="bg-blue-50 border-blue-200" textColor="text-blue-700" />
        <BucketBar label="B2 — Short Debt" value={row.b2} prevValue={prevB2} max={maxCorpus}
          color="bg-amber-500" bgColor="bg-amber-50 border-amber-200" textColor="text-amber-700" />
        <BucketBar label="B3 — Hybrid/BAF" value={row.b3} prevValue={prevB3} max={maxCorpus}
          color="bg-emerald-500" bgColor="bg-emerald-50 border-emerald-200" textColor="text-emerald-700" />
        <BucketBar label="B4 — Equity" value={row.b4} prevValue={prevB4} max={maxCorpus}
          color="bg-purple-500" bgColor="bg-purple-50 border-purple-200" textColor="text-purple-700" />
      </div>

      {/* ── Cascade events + quick stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            What happened in {calYear}
          </p>
          <div className="divide-y divide-gray-100">
            {/* Interest earned per bucket */}
            <EventStep icon="📈" label="B4 equity earned interest"
              amount={row.b4Harvested}
              note={`${returnAssumptions.b4}% on locked B4 principal → sent to B3`}
              variant="positive" />
            <EventStep icon="📊" label="B3 hybrid earned interest"
              amount={row.b3GrowthEarned}
              note={`${returnAssumptions.b3}% on locked B3 principal → passed to B2`}
              variant="positive" />
            <EventStep icon="🏦" label="B2 SCSS/FD earned interest"
              amount={row.b2GrowthEarned}
              note={`${returnAssumptions.b2}% on B2 principal — SCSS/FD payout → sent to B1`}
              variant="positive" />
            <EventStep icon="💧" label="B1 liquid earned interest"
              amount={row.b1GrowthEarned}
              note={`${returnAssumptions.b1}% on B1 pool`}
              variant="positive" />
            {/* Total cascade arriving at B1 */}
            <EventStep icon="⬇️" label="Total interest cascade into B1"
              amount={row.b1RefillFromB2}
              note="B2 interest + B3 interest + B4 interest — all lands in B1 pool"
              variant="positive" />
            {/* Withdrawal */}
            <EventStep icon="💸" label="You withdrew from B1"
              amount={row.annualWithdrawal}
              note={`${INR(row.annualWithdrawal / 12)}/month (inflation-adjusted)`}
              variant="warning" />
            {/* Emergency only */}
            {row.b2EmergencyToB1 > 0 && (
              <EventStep icon="🚨" label="Emergency: B2 principal → B1"
                amount={row.b2EmergencyToB1}
                note="B1 pool ran dry — breaking into SCSS/FD principal (last resort)"
                variant="danger" />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Totals</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total corpus</span>
                <span className="font-bold text-gray-900">{CR(row.totalCorpus)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Monthly withdrawal</span>
                <span className="font-medium text-amber-700">{INR(row.annualWithdrawal / 12)}</span>
              </div>
              {prevRow && (
                <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
                  <span className="text-gray-500">Corpus change vs last year</span>
                  <span className={`font-bold ${row.totalCorpus >= prevRow.totalCorpus ? 'text-green-600' : 'text-red-500'}`}>
                    {row.totalCorpus >= prevRow.totalCorpus ? '+' : ''}{CR(row.totalCorpus - prevRow.totalCorpus)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">B1 Runway</p>
            <p className="text-2xl font-bold text-indigo-700">
              {row.annualWithdrawal > 0 ? Math.floor((row.b1 / row.annualWithdrawal) * 12) : '∞'}{' '}
              <span className="text-sm font-medium">months</span>
            </p>
            <p className="text-xs text-indigo-400 mt-0.5">{CR(row.b1)} in B1 at current withdrawal rate</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-2">B4 Equity Growth</p>
            <p className="text-2xl font-bold text-purple-700">{CR(row.b4)}</p>
            <p className="text-xs text-purple-400 mt-0.5">
              {row.b4Harvested > 0 ? `↓ Harvested ${CR(row.b4Harvested)} to B3 this year` : `↑ ${CR(b4GrowthThisYear)} compounded this year`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Detailed per-bucket explanation ── */}
      <BucketExplainer
        calYear={calYear}
        row={row}
        prevB1={prevB1} prevB2={prevB2} prevB3={prevB3} prevB4={prevB4}
        returnAssumptions={returnAssumptions}
      />

      {/* ── Sparkline ── */}
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
                <Line type="monotone" dataKey="B4" stroke="#a855f7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="B3" stroke="#10b981" strokeWidth={2} dot={false} />
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
