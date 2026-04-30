import { RISK_PROFILES } from '../../lib/data/riskProfiles'
import type { RiskProfileId } from '../../types/profiles'

interface Props {
  userCorpus: number
  selectedId?: RiskProfileId | null
  onSelect: (id: RiskProfileId) => void
}

const fmtINR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

export function ProfileComparison({ userCorpus, selectedId, onSelect }: Props) {
  const scale = userCorpus / 1_00_00_000
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-900">All 5 profiles head-to-head</h4>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Scaled to your <span className="tabular-nums">{fmtINR(userCorpus)}</span> corpus. Click a row to load that profile's detailed plan.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-2 font-medium">Profile</th>
              <th className="text-right px-3 py-2 font-medium">Score</th>
              <th className="text-right px-3 py-2 font-medium">Equity %</th>
              <th className="text-right px-3 py-2 font-medium">Yr-1 / mo</th>
              <th className="text-right px-3 py-2 font-medium">Yr-10 / mo</th>
              <th className="text-right px-3 py-2 font-medium">Yr-20 corpus</th>
              <th className="text-left px-3 py-2 font-medium">Best for</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {RISK_PROFILES.map((p) => {
              const equityPct = Math.round((p.bucketShare.b3 * 0.5 + p.bucketShare.b4) * 100)
              const isSelected = selectedId === p.id
              return (
                <tr
                  key={p.id}
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => onSelect(p.id)}
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    <div className="text-[10px] text-gray-500">{p.tagline}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                    {p.scoreRange[0]}–{p.scoreRange[1]}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">~{equityPct}%</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">
                    {fmtINR(p.expectedMonthlyOn1Cr * scale)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">
                    {fmtINR(p.expectedYr10MonthlyOn1Cr * scale)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <span className={p.expected20yrCorpusFromCr * scale >= userCorpus ? 'text-green-700 font-semibold' : 'text-gray-700'}>
                      {fmtINR(p.expected20yrCorpusFromCr * scale)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-gray-600 max-w-[200px]">{p.bestFor}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
