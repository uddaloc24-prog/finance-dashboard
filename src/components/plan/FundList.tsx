import type { BucketKey, FundPick } from '../../types/v2'

interface FundListProps {
  bucket: BucketKey
  picks: FundPick[]
}

const bucketLabel: Record<BucketKey, { title: string; purpose: string; tint: string }> = {
  b1: { title: 'Bucket 1 — Liquidity', purpose: '0–2 yr cash · 10%', tint: 'bg-blue-50 text-blue-700' },
  b2: { title: 'Bucket 2 — Fixed Floor', purpose: 'SCSS / bonds · 35%', tint: 'bg-teal-50 text-teal-700' },
  b3: { title: 'Bucket 3 — Stability & SWP', purpose: 'BAF / hybrid · 25%', tint: 'bg-violet-50 text-violet-700' },
  b4: { title: 'Bucket 4 — Growth & Refill', purpose: 'equity / gold · 30%', tint: 'bg-orange-50 text-orange-700' },
}

export function FundList({ bucket, picks }: FundListProps) {
  const meta = bucketLabel[bucket]
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className={`rounded-t-xl px-4 py-2.5 ${meta.tint} text-sm font-medium flex items-center justify-between`}>
        <span>{meta.title}</span>
        <span className="text-[11px] opacity-80">{meta.purpose}</span>
      </div>
      <ul className="divide-y divide-gray-100">
        {picks.length === 0 && (
          <li className="px-4 py-3 text-xs text-gray-500">No funds selected.</li>
        )}
        {picks.map((fund) => (
          <li key={fund.schemeCode} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{fund.schemeName}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Scheme code: {fund.schemeCode}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-gray-900">{fund.suggestedAllocation}%</div>
                <div className="text-[11px] text-gray-500">of bucket</div>
              </div>
            </div>
            {fund.rationale && (
              <p className="mt-1.5 text-xs text-gray-600">{fund.rationale}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
