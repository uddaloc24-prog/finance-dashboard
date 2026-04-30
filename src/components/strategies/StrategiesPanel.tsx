import { useMemo, useState } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from '../../types'
import type { TaxSlab } from '../../lib/calculations/taxEngine'
import { runAllStrategies } from '../../lib/calculations/strategyEngine'
import { StrategyTable } from './StrategyTable'
import { StrategyChart } from './StrategyChart'
import { StrategyCard } from './StrategyCard'

interface Props {
  profile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
}

export function StrategiesPanel({ profile, buckets, returnAssumptions }: Props) {
  const userSlab: TaxSlab = (profile.taxBracket ?? 20) as TaxSlab
  const results = useMemo(
    () => runAllStrategies({
      corpus: profile.corpus,
      monthlyWithdrawal: profile.monthlyWithdrawal,
      inflationRate: profile.inflationRate,
      returnAssumptions,
      buckets,
      taxSlab: userSlab,
      taxRegime: 'old',
      isSenior: (profile.demographics?.currentAge ?? 60) >= 60,
    }),
    [profile.corpus, profile.monthlyWithdrawal, profile.inflationRate, returnAssumptions, buckets, userSlab, profile.demographics?.currentAge],
  )

  const bestFit = results.find((r) => r.isBestFit) ?? null
  const [selectedId, setSelectedId] = useState<string | null>(bestFit?.id ?? null)
  const selected = results.find((r) => r.id === selectedId) ?? bestFit ?? results[0]

  const passingCount = results.filter((r) => r.verdict === 'PASSES' || r.verdict === 'BEST_FIT').length
  const partialCount = results.filter((r) => r.verdict === 'PARTIAL').length
  const failCount = results.filter((r) => r.verdict === 'FAILS').length
  const naCount = results.filter((r) => r.verdict === 'NOT_APPLICABLE').length

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900">10-Strategy Comparison</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              All 10 retirement income strategies scored against your corpus + monthly target. Indian tax (LTCG / slab / 80TTB) applied at <strong>{userSlab}% slab</strong>{(profile.demographics?.currentAge ?? 60) >= 60 ? ', senior citizen' : ''}.
            </p>
          </div>
          <div className="flex gap-2 text-[11px]">
            <Pill color="green"  label={`${passingCount} pass`} />
            <Pill color="amber"  label={`${partialCount} partial`} />
            <Pill color="red"    label={`${failCount} fail`} />
            <Pill color="gray"   label={`${naCount} N/A`} />
          </div>
        </div>
      </div>

      <StrategyChart results={results} highlightId={selectedId} />

      <StrategyTable results={results} onSelect={setSelectedId} selectedId={selectedId} />

      {selected && <StrategyCard result={selected} />}
    </div>
  )
}

function Pill({ color, label }: { color: 'green' | 'amber' | 'red' | 'gray'; label: string }) {
  const styles = {
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-800',
    red:   'bg-red-100   text-red-800',
    gray:  'bg-gray-100  text-gray-700',
  }[color]
  return <span className={`px-2 py-0.5 rounded-full font-medium ${styles}`}>{label}</span>
}
