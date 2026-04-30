import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { UserProfile, BucketState, ReturnAssumptions } from '../types'
import { simulateSWP, computeMaxSustainableWithdrawal } from '../lib/calculations'
import { PRESERVATION_YEARS } from '../constants'
import { Card, CardHeader, CardTitle } from './ui/Card'

const ALLOC = [
  {
    key: 'b4' as const,
    pct: 40,
    label: 'B4 — Equity',
    sub: 'Flexi Cap · Large Cap · Gold ETF',
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    lightBg: 'bg-purple-50',
    border: 'border-purple-200',
    returnPct: '12%',
    horizon: '10+ years',
    why: 'The biggest slice goes to equity because it earns the most (≈12%/yr). This is your engine — 40% of your corpus compounding at 12% is what makes the whole plan work. Its profits fund everything below.',
  },
  {
    key: 'b3' as const,
    pct: 30,
    label: 'B3 — Hybrid/BAF',
    sub: 'Balanced Advantage · Multi-Asset',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    returnPct: '9.5%',
    horizon: '5–10 years',
    why: '30% in hybrid funds balances growth and stability. It earns ~9.5%/yr and acts as the refill reservoir — topping up B2 when needed. B4\'s profits flow here, keeping it replenished.',
  },
  {
    key: 'b2' as const,
    pct: 20,
    label: 'B2 — Short Debt',
    sub: 'Corp Bond · Short Duration MF',
    color: 'bg-amber-500',
    textColor: 'text-amber-700',
    lightBg: 'bg-amber-50',
    border: 'border-amber-200',
    returnPct: '8%',
    horizon: '1–5 years',
    why: '20% in safe debt funds earns ~8%/yr with low risk. It\'s the buffer between growth and spending — it absorbs the refill demand from B1 without touching equity.',
  },
  {
    key: 'b1' as const,
    pct: 10,
    label: 'B1 — Liquid',
    sub: 'SCSS · Senior FD · Liquid MF',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    returnPct: '7%',
    horizon: '0–1 year',
    why: 'Only 10% here — just enough for your near-term spending (≈1 year). It earns 7%/yr. Keeping this small forces more money into higher-return buckets.',
  },
]

function AllocationBreakdown({ corpus, buckets }: { corpus: number; buckets: BucketState }) {
  const totalBuckets = buckets.b1 + buckets.b2 + buckets.b3 + buckets.b4
  // Use actual bucket values if available, otherwise derive from default allocation
  const b1Pct = totalBuckets > 0 ? (buckets.b1 / totalBuckets) * 100 : 10
  const b2Pct = totalBuckets > 0 ? (buckets.b2 / totalBuckets) * 100 : 20
  const b3Pct = totalBuckets > 0 ? (buckets.b3 / totalBuckets) * 100 : 30
  const b4Pct = totalBuckets > 0 ? (buckets.b4 / totalBuckets) * 100 : 40
  const pcts = { b1: b1Pct, b2: b2Pct, b3: b3Pct, b4: b4Pct }
  const amounts = { b1: buckets.b1, b2: buckets.b2, b3: buckets.b3, b4: buckets.b4 }

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          How Your {CR(corpus)} Is Distributed
        </p>
        <span className="text-xs text-gray-400">Based on HDFC 4-bucket strategy</span>
      </div>

      {/* Stacked proportion bar */}
      <div className="flex h-8 rounded-xl overflow-hidden mb-4 shadow-sm">
        {/* B4 first (biggest) to B1 (smallest) — left to right */}
        {ALLOC.map((a) => (
          <div
            key={a.key}
            className={`${a.color} flex items-center justify-center transition-all`}
            style={{ width: `${pcts[a.key]}%` }}
          >
            <span className="text-white text-xs font-bold drop-shadow">{Math.round(pcts[a.key])}%</span>
          </div>
        ))}
      </div>

      {/* Legend labels below bar */}
      <div className="flex mb-5">
        {ALLOC.map((a) => (
          <div key={a.key} style={{ width: `${pcts[a.key]}%` }} className="text-center">
            <p className={`text-xs font-bold truncate px-0.5 ${a.textColor}`}>{a.label.split('—')[0].trim()}</p>
          </div>
        ))}
      </div>

      {/* 4 cards explaining each bucket */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
        {ALLOC.map((a) => (
          <div key={a.key} className={`rounded-xl border p-3 ${a.lightBg} ${a.border}`}>
            <div className="flex items-center justify-between mb-1">
              <p className={`text-xs font-bold ${a.textColor}`}>{a.label}</p>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/70 ${a.textColor}`}>
                {Math.round(pcts[a.key])}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-1.5">{a.sub}</p>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-400">{a.horizon}</span>
              <span className={`font-semibold ${a.textColor}`}>{a.returnPct}/yr</span>
            </div>
            <p className={`text-lg font-bold ${a.textColor}`}>{CR(amounts[a.key])}</p>
            <p className="text-xs text-gray-500 mt-1.5 leading-snug">{a.why}</p>
          </div>
        ))}
      </div>

      {/* Logic summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
        <p className="text-xs font-semibold text-gray-600 mb-1">The logic behind this split</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          The allocation is intentionally <strong>top-heavy in equity</strong>: 70% of your corpus (B3 + B4) is in growth assets earning 9.5–12%/yr. Only 30% sits in safer, lower-return accounts. This is what makes corpus preservation possible — the growth side earns enough returns to fund your withdrawals without touching the principal.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Weighted average return ≈ <strong>{((buckets.b1 / totalBuckets || 0.10) * 7 + (buckets.b2 / totalBuckets || 0.20) * 8 + (buckets.b3 / totalBuckets || 0.30) * 9.5 + (buckets.b4 / totalBuckets || 0.40) * 12).toFixed(1)}%/yr</strong> across all 4 buckets · Annual returns on {CR(corpus)} ≈ <strong>{CR(corpus * ((buckets.b1 / totalBuckets || 0.10) * 7 + (buckets.b2 / totalBuckets || 0.20) * 8 + (buckets.b3 / totalBuckets || 0.30) * 9.5 + (buckets.b4 / totalBuckets || 0.40) * 12) / 100)}/yr</strong>
        </p>
      </div>
    </div>
  )
}

interface Props {
  profile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
  startYear?: number
}

const CR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}
const INR = (n: number) => '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN')

export function CorpusPreservation({
  profile,
  buckets,
  returnAssumptions,
  startYear = new Date().getFullYear(),
}: Props) {
  const initialCorpus = profile.corpus

  const rows = simulateSWP({
    buckets,
    monthlyWithdrawal: profile.monthlyWithdrawal,
    inflationRate: profile.inflationRate,
    returnAssumptions,
    initialCorpus,
  })

  const maxSafe = computeMaxSustainableWithdrawal(initialCorpus, returnAssumptions, profile.inflationRate, profile.bucketAllocation)
  const preservationRows = rows.slice(0, PRESERVATION_YEARS)
  const year20Row = preservationRows[PRESERVATION_YEARS - 1]
  const exitCorpus = year20Row?.totalCorpus ?? 0
  const isPreserved = !preservationRows.some(r => r.corpusBelowInitial)
  const firstBreachIdx = preservationRows.findIndex(r => r.corpusBelowInitial)

  const currentMonthly = profile.monthlyWithdrawal
  const delta = currentMonthly - maxSafe
  const overSafe = delta > 0

  const chartData = preservationRows.map((r, i) => ({
    year: startYear + i,
    corpus: r.totalCorpus,
  }))

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Corpus Preservation Guarantee</CardTitle>
          <p className="text-xs text-gray-400 mt-0.5">
            Will your ₹{(initialCorpus / 1e7).toFixed(1)} Cr survive {PRESERVATION_YEARS} years untouched?
          </p>
        </div>
      </CardHeader>

      {/* Allocation breakdown */}
      <AllocationBreakdown corpus={initialCorpus} buckets={buckets} />

      {/* Status banner */}
      <div className={`rounded-xl p-4 mb-5 flex items-center gap-3 ${isPreserved ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <span className="text-2xl shrink-0">{isPreserved ? '✅' : '⚠️'}</span>
        <div>
          <p className={`text-sm font-bold ${isPreserved ? 'text-green-800' : 'text-red-800'}`}>
            {isPreserved
              ? `Corpus Preserved — Your ${CR(initialCorpus)} stays intact for all ${PRESERVATION_YEARS} years`
              : `Corpus Breached — falls below ${CR(initialCorpus)} starting Year ${firstBreachIdx + 1} (${startYear + firstBreachIdx})`}
          </p>
          <p className={`text-xs mt-0.5 ${isPreserved ? 'text-green-600' : 'text-red-600'}`}>
            {isPreserved
              ? `All withdrawals are funded by investment returns. Your principal stays untouched.`
              : `At this withdrawal rate, you're spending more than your investments earn. Reduce monthly withdrawal to ${CR(maxSafe)}/month to preserve corpus.`}
          </p>
        </div>
      </div>

      {/* 3 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Initial Corpus</p>
          <p className="text-xl font-bold text-gray-900">{CR(initialCorpus)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Your principal floor — never touch this</p>
        </div>
        <div className={`rounded-xl p-4 border ${overSafe ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${overSafe ? 'text-red-400' : 'text-green-400'}`}>
            Max Safe Withdrawal
          </p>
          <p className={`text-xl font-bold ${overSafe ? 'text-red-700' : 'text-green-700'}`}>
            {CR(maxSafe)}<span className="text-sm font-medium">/month</span>
          </p>
          <p className={`text-xs mt-0.5 ${overSafe ? 'text-red-500' : 'text-green-500'}`}>
            Fully returns-funded for {PRESERVATION_YEARS} yrs
          </p>
        </div>
        <div className={`rounded-xl p-4 border ${exitCorpus >= initialCorpus ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${exitCorpus >= initialCorpus ? 'text-blue-400' : 'text-amber-400'}`}>
            Year-{PRESERVATION_YEARS} Exit Value
          </p>
          <p className={`text-xl font-bold ${exitCorpus >= initialCorpus ? 'text-blue-700' : 'text-amber-700'}`}>
            {CR(exitCorpus)}
          </p>
          <p className={`text-xs mt-0.5 ${exitCorpus >= initialCorpus ? 'text-blue-500' : 'text-amber-500'}`}>
            What you walk away with in {startYear + PRESERVATION_YEARS - 1}
          </p>
        </div>
      </div>

      {/* Withdrawal health bar */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Withdrawal vs Safe Limit</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${overSafe ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {overSafe ? `₹${INR(delta)} over safe limit` : `₹${INR(-delta)} under safe limit`}
          </span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs text-gray-500 w-28 shrink-0">Your withdrawal</span>
          <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${overSafe ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, (currentMonthly / (maxSafe * 1.5)) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-gray-700 w-20 text-right shrink-0">{CR(currentMonthly)}/mo</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-28 shrink-0">Safe limit</span>
          <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-gray-400"
              style={{ width: `${Math.min(100, (maxSafe / (maxSafe * 1.5)) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-gray-500 w-20 text-right shrink-0">{CR(maxSafe)}/mo</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {overSafe
            ? `You're withdrawing ${CR(delta)}/month more than your investments generate. Over ${PRESERVATION_YEARS} years, this draws down your ₹${(initialCorpus / 1e7).toFixed(1)} Cr principal.`
            : `Your investments earn more than you spend. The surplus compounds back into your corpus — it will grow over time.`}
        </p>
      </div>

      {/* Corpus floor chart */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Corpus Trajectory — {startYear} to {startYear + PRESERVATION_YEARS - 1}
        </p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={CR} width={60} />
              <Tooltip formatter={(v: number) => CR(v)} labelFormatter={(l) => `Year: ${l}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {/* Danger zone: below initial corpus */}
              <ReferenceArea y1={0} y2={initialCorpus} fill="#fef2f2" fillOpacity={0.5} />
              {/* Floor line */}
              <ReferenceLine
                y={initialCorpus}
                stroke="#ef4444"
                strokeDasharray="6 3"
                label={{ value: `Floor ${CR(initialCorpus)}`, position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }}
              />
              <Line
                type="monotone"
                dataKey="corpus"
                name="Total Corpus"
                stroke={isPreserved ? '#22c55e' : '#f59e0b'}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-400 text-center mt-1">
          Red zone = below your initial corpus. Green line = corpus stays above floor.
        </p>
      </div>

      {/* Returns vs Withdrawals table */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Year-by-Year: Returns Earned vs Amount Withdrawn
        </p>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-400">
                <th className="px-3 py-2 font-medium">Year</th>
                <th className="px-3 py-2 font-medium text-right">Corpus</th>
                <th className="px-3 py-2 font-medium text-right">Returns Earned</th>
                <th className="px-3 py-2 font-medium text-right">Withdrawn</th>
                <th className="px-3 py-2 font-medium text-right">Net</th>
                <th className="px-3 py-2 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {preservationRows.map((r, i) => {
                const net = r.totalReturnsEarned - r.annualWithdrawal
                const breach = r.corpusBelowInitial
                return (
                  <tr key={i} className={`border-b last:border-0 ${breach ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-2 font-medium text-gray-700">{startYear + i}</td>
                    <td className={`px-3 py-2 text-right font-medium ${breach ? 'text-red-700' : 'text-gray-700'}`}>
                      {CR(r.totalCorpus)}
                    </td>
                    <td className="px-3 py-2 text-right text-green-700">{CR(r.totalReturnsEarned)}</td>
                    <td className="px-3 py-2 text-right text-amber-700">{CR(r.annualWithdrawal)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {net >= 0 ? '+' : '−'}{INR(net)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {breach
                        ? <span className="text-red-500 font-bold">⚠ Breach</span>
                        : <span className="text-green-500">✓</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Net = Returns − Withdrawals. Positive means corpus is growing. Negative means you're drawing from principal.
        </p>
      </div>
    </Card>
  )
}
