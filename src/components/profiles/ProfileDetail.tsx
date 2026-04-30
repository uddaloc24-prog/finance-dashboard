import type { RiskProfile } from '../../types/profiles'

interface Props {
  profile: RiskProfile
  userCorpus: number
}

const fmtINR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

const bucketColor = {
  B1: { bg: 'bg-blue-50',   text: 'text-blue-700',   bar: 'bg-blue-400' },
  B2: { bg: 'bg-teal-50',   text: 'text-teal-700',   bar: 'bg-teal-400' },
  B3: { bg: 'bg-violet-50', text: 'text-violet-700', bar: 'bg-violet-400' },
  B4: { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-400' },
} as const

export function ProfileDetail({ profile, userCorpus }: Props) {
  const scale = userCorpus / 1_00_00_000  // ratio vs ₹1Cr reference
  const userMonthly = profile.expectedMonthlyOn1Cr * scale
  const userYr10Monthly = profile.expectedYr10MonthlyOn1Cr * scale
  const userYr20Corpus = profile.expected20yrCorpusFromCr * scale

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{profile.name}</h3>
            <p className="text-sm text-gray-600 mt-0.5">{profile.tagline}</p>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-gray-500 uppercase tracking-wide">Quiz score range</div>
            <div className="text-sm font-semibold tabular-nums text-gray-900">
              {profile.scoreRange[0]}–{profile.scoreRange[1]} / 50
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-700 mt-3 leading-relaxed">{profile.description}</p>
        <div className="mt-3 text-xs text-gray-500">
          <strong>Best for:</strong> {profile.bestFor}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Bucket allocation on your <span className="tabular-nums">{fmtINR(userCorpus)}</span> corpus
        </h4>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div className={bucketColor.B1.bar} style={{ width: `${profile.bucketShare.b1 * 100}%` }} aria-label={`B1 ${Math.round(profile.bucketShare.b1 * 100)}%`} />
          <div className={bucketColor.B2.bar} style={{ width: `${profile.bucketShare.b2 * 100}%` }} aria-label={`B2 ${Math.round(profile.bucketShare.b2 * 100)}%`} />
          <div className={bucketColor.B3.bar} style={{ width: `${profile.bucketShare.b3 * 100}%` }} aria-label={`B3 ${Math.round(profile.bucketShare.b3 * 100)}%`} />
          <div className={bucketColor.B4.bar} style={{ width: `${profile.bucketShare.b4 * 100}%` }} aria-label={`B4 ${Math.round(profile.bucketShare.b4 * 100)}%`} />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
          {(['B1', 'B2', 'B3', 'B4'] as const).map((b) => {
            const pct = profile.bucketShare[b.toLowerCase() as 'b1' | 'b2' | 'b3' | 'b4']
            return (
              <div key={b} className={`rounded-lg ${bucketColor[b].bg} px-2 py-2`}>
                <div className={`text-[10px] uppercase font-semibold ${bucketColor[b].text}`}>{b}</div>
                <div className="text-sm font-bold text-gray-900 mt-0.5 tabular-nums">{Math.round(pct * 100)}%</div>
                <div className="text-[10px] text-gray-500 tabular-nums">{fmtINR(pct * userCorpus)}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <KPI label="Year-1 monthly" value={fmtINR(userMonthly)} hint="combined income from instruments" />
        <KPI label="Year-10 monthly" value={fmtINR(userYr10Monthly)} hint="real-terms growth from equity refill" />
        <KPI label="Year-20 corpus" value={fmtINR(userYr20Corpus)} hint="projected ending balance" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900">Recommended instruments</h4>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Allocations scaled from the ₹1Cr reference plan to your <span className="tabular-nums">{fmtINR(userCorpus)}</span> corpus
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {profile.instruments.map((inst) => {
            const userAlloc = inst.allocationOn1CrCorpus * scale
            const userIncome = inst.monthlyIncomeOn1Cr ? inst.monthlyIncomeOn1Cr * scale : null
            return (
              <div key={inst.name} className="px-5 py-3 flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${bucketColor[inst.bucket].bg} ${bucketColor[inst.bucket].text}`}>
                      {inst.bucket}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{inst.name}</span>
                    {inst.governmentBacked && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Govt-backed</span>}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {inst.fundHouse} · {inst.category} · ~{inst.expectedCagr}% CAGR
                    {inst.lockIn ? ` · ${inst.lockIn} lock-in` : ''}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{inst.taxTreatment}</div>
                  {inst.notes && <div className="text-[10px] text-gray-500 mt-0.5 italic">{inst.notes}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-gray-900 tabular-nums">{fmtINR(userAlloc)}</div>
                  {userIncome != null && (
                    <div className="text-[11px] text-gray-500 tabular-nums">{fmtINR(userIncome)}/mo</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-green-700 mb-2">Pros</div>
          <ul className="text-sm text-gray-700 space-y-1">
            {profile.pros.map((p, i) => <li key={i} className="flex gap-2"><span className="text-green-600">+</span>{p}</li>)}
          </ul>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-red-700 mb-2">Cons / trade-offs</div>
          <ul className="text-sm text-gray-700 space-y-1">
            {profile.cons.map((c, i) => <li key={i} className="flex gap-2"><span className="text-red-600">−</span>{c}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-xl font-bold text-gray-900 mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-gray-400 mt-0.5">{hint}</div>}
    </div>
  )
}
