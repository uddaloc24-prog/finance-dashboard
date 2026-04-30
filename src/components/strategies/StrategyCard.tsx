import type { StrategyResult } from '../../types/strategies'
import { strategyById } from '../../lib/data/strategies'

interface Props {
  result: StrategyResult
}

export function StrategyCard({ result }: Props) {
  const def = strategyById(result.id)
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg" aria-hidden="true">{result.flag}</span>
          <h3 className="font-semibold text-gray-900">{result.name}</h3>
          {result.isBestFit && (
            <span className="ml-auto text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              ⭐ BEST FIT
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500">{def.origin}</p>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed">{def.description}</p>

      <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
        <strong>Verdict:</strong> {result.verdictReason}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Mini label="Safe WR" value={`${def.safeWRrange[0]}–${def.safeWRrange[1]}%`} />
        <Mini label="Your WR" value={`${result.effectiveWR.toFixed(1)}%`} />
        <Mini label="Score" value={`${result.totalScore}/60`} />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-700">Score breakdown</div>
        <ScoreBar label="Achieves your target" value={result.scoreDimensions.achievesTarget} />
        <ScoreBar label="Principal preservation" value={result.scoreDimensions.principalAfter20yr} />
        <ScoreBar label="Inflation protection" value={result.scoreDimensions.inflationProtection} />
        <ScoreBar label="Tax efficiency" value={result.scoreDimensions.taxEfficiency} />
        <ScoreBar label="India feasibility" value={result.scoreDimensions.indiaFeasibility} />
        <ScoreBar label="Simplicity" value={result.scoreDimensions.simplicity} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 pt-2">
        <div>
          <div className="text-xs font-medium text-green-700 mb-1">Pros</div>
          <ul className="text-xs text-gray-700 space-y-0.5">
            {def.pros.map((p, i) => <li key={i} className="flex gap-1.5"><span className="text-green-600">+</span>{p}</li>)}
          </ul>
        </div>
        <div>
          <div className="text-xs font-medium text-red-700 mb-1">Cons</div>
          <ul className="text-xs text-gray-700 space-y-0.5">
            {def.cons.map((c, i) => <li key={i} className="flex gap-1.5"><span className="text-red-600">−</span>{c}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold text-gray-900 mt-0.5 tabular-nums">{value}</div>
    </div>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100
  const color = value >= 8 ? 'bg-green-500' : value >= 5 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 items-center text-xs">
      <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
        <span className="text-gray-700 truncate">{label}</span>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="text-gray-700 font-medium tabular-nums w-8 text-right">{value}/10</span>
    </div>
  )
}
