import { useState } from 'react'
import type { RiskProfileId } from '../../types/profiles'
import { RISK_PROFILES } from '../../lib/data/riskProfiles'

interface Props {
  userCorpus: number
  matchedId: RiskProfileId | null
  onSelect: (id: RiskProfileId) => void
}

const fmtINR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

const bucketBar = {
  b1: 'bg-blue-400',
  b2: 'bg-teal-400',
  b3: 'bg-violet-400',
  b4: 'bg-orange-400',
} as const

export function ProfileGrid({ userCorpus, matchedId, onSelect }: Props) {
  const [openInstruments, setOpenInstruments] = useState<RiskProfileId | null>(null)
  const scale = userCorpus / 1_00_00_000

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <header className="px-5 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">All 5 risk profiles, side by side</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Each profile is fully laid out below — figures scaled to your <span className="tabular-nums font-medium">{fmtINR(userCorpus)}</span> corpus. The recommended profile for your quiz score is highlighted.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
        {RISK_PROFILES.map((p) => {
          const isMatch = matchedId === p.id
          const equityPct = Math.round((p.bucketShare.b3 * 0.5 + p.bucketShare.b4) * 100)
          const yr1 = p.expectedMonthlyOn1Cr * scale
          const yr10 = p.expectedYr10MonthlyOn1Cr * scale
          const yr20 = p.expected20yrCorpusFromCr * scale
          const corpusGrew = yr20 >= userCorpus
          const isOpen = openInstruments === p.id

          return (
            <div
              key={p.id}
              className={`relative flex flex-col p-4 transition-colors ${
                isMatch ? 'bg-blue-50/40' : 'bg-white'
              }`}
            >
              {isMatch && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600" aria-hidden="true" />
              )}

              {/* Header */}
              <div className="mb-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-sm font-semibold text-gray-900 leading-tight">{p.name}</h4>
                  {isMatch && (
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                      YOU
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5 tabular-nums">
                  Score {p.scoreRange[0]}–{p.scoreRange[1]} / 50
                </div>
                <p className="text-[11px] text-gray-600 mt-1.5 leading-snug">{p.tagline}</p>
              </div>

              {/* Allocation bar */}
              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1.5">
                  Allocation · ~{equityPct}% equity
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
                  <div className={bucketBar.b1} style={{ width: `${p.bucketShare.b1 * 100}%` }} />
                  <div className={bucketBar.b2} style={{ width: `${p.bucketShare.b2 * 100}%` }} />
                  <div className={bucketBar.b3} style={{ width: `${p.bucketShare.b3 * 100}%` }} />
                  <div className={bucketBar.b4} style={{ width: `${p.bucketShare.b4 * 100}%` }} />
                </div>
                <div className="grid grid-cols-4 gap-1 mt-1.5 text-center">
                  {(['b1', 'b2', 'b3', 'b4'] as const).map((b) => (
                    <div key={b} className="text-[9px] tabular-nums text-gray-500">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${bucketBar[b]} mr-0.5 align-middle`} aria-hidden="true" />
                      {Math.round(p.bucketShare[b] * 100)}
                    </div>
                  ))}
                </div>
              </div>

              {/* KPIs */}
              <div className="space-y-1.5 mb-3 pb-3 border-b border-gray-100">
                <KpiRow label="Year-1 mo" value={fmtINR(yr1)} />
                <KpiRow label="Year-10 mo" value={fmtINR(yr10)} />
                <KpiRow
                  label="Year-20 corpus"
                  value={fmtINR(yr20)}
                  valueClass={corpusGrew ? 'text-green-700' : 'text-gray-700'}
                />
              </div>

              {/* Pros/Cons compact */}
              <div className="text-[11px] space-y-2 mb-3">
                <div>
                  <div className="text-green-700 font-medium mb-0.5">Strengths</div>
                  <ul className="text-gray-600 space-y-0.5 leading-snug">
                    {p.pros.slice(0, 2).map((pro, i) => (
                      <li key={i} className="flex gap-1"><span className="text-green-600">+</span><span>{pro}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-amber-700 font-medium mb-0.5">Trade-offs</div>
                  <ul className="text-gray-600 space-y-0.5 leading-snug">
                    {p.cons.slice(0, 2).map((con, i) => (
                      <li key={i} className="flex gap-1"><span className="text-amber-600">−</span><span>{con}</span></li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Best for */}
              <div className="text-[10px] text-gray-500 italic mb-3 leading-snug">
                <span className="font-medium not-italic text-gray-700">For: </span>{p.bestFor}
              </div>

              {/* Instrument summary toggle */}
              <button
                type="button"
                onClick={() => setOpenInstruments(isOpen ? null : p.id)}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-medium text-left mb-2"
              >
                {isOpen ? '× Hide' : `+ View ${p.instruments.length} instruments`}
              </button>

              {isOpen && (
                <div className="rounded-md bg-gray-50 border border-gray-200 p-2 mb-3 space-y-1.5 text-[10px]">
                  {p.instruments.map((inst) => {
                    const userAlloc = inst.allocationOn1CrCorpus * scale
                    return (
                      <div key={inst.name} className="flex items-start gap-1.5">
                        <span className={`shrink-0 mt-0.5 px-1 rounded text-[9px] font-semibold ${
                          inst.bucket === 'B1' ? 'bg-blue-100 text-blue-700' :
                          inst.bucket === 'B2' ? 'bg-teal-100 text-teal-700' :
                          inst.bucket === 'B3' ? 'bg-violet-100 text-violet-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {inst.bucket}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate">{inst.name}</div>
                          <div className="text-gray-500 truncate">{inst.category} · {inst.expectedCagr}%</div>
                        </div>
                        <div className="text-gray-700 font-medium tabular-nums shrink-0">
                          {fmtINR(userAlloc)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className={`mt-auto rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  isMatch
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isMatch ? 'Use this plan' : 'Choose this'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KpiRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${valueClass ?? 'text-gray-900'}`}>{value}</span>
    </div>
  )
}
