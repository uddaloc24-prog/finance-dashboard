import { useState, useEffect } from 'react'
import {
  ASSET_CLASSES,
  BUCKET_PURPOSES,
  classesForBucket,
  classById,
  fundsForClass,
  fundAnalysis,
  type AssetClassMeta,
  type BucketKey,
} from '../../lib/data/assetClasses'
import { recommendationFor, type BucketRecommendation, type OptimalMixSlice } from '../../lib/data/recommendations'
import { profileById } from '../../lib/data/riskProfiles'
import { storage } from '../../lib/storage'

const BUCKET_COLOR: Record<BucketKey, { bg: string; text: string; bar: string; ring: string; soft: string }> = {
  b1: { bg: 'bg-blue-50',   text: 'text-blue-700',   bar: 'bg-blue-500',   ring: 'ring-blue-200',   soft: 'bg-blue-100/50' },
  b2: { bg: 'bg-teal-50',   text: 'text-teal-700',   bar: 'bg-teal-500',   ring: 'ring-teal-200',   soft: 'bg-teal-100/50' },
  b3: { bg: 'bg-violet-50', text: 'text-violet-700', bar: 'bg-violet-500', ring: 'ring-violet-200', soft: 'bg-violet-100/50' },
  b4: { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500', ring: 'ring-orange-200', soft: 'bg-orange-100/50' },
}

interface Props {
  bucketValues?: { b1: number; b2: number; b3: number; b4: number }
}

export function BucketFundsExplorer({ bucketValues }: Props) {
  const profileId = storage.getRiskProfile()
  const profile = profileId ? profileById(profileId) : null

  return (
    <section className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Asset class explorer</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xl">
              For each bucket, the recommended asset class is auto-selected based on your risk profile, with the top funds marked. Use the dropdown to compare alternatives — every class includes a detailed analysis report.
            </p>
          </div>
          {profile ? (
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Your risk profile</div>
              <div className="text-sm font-bold text-blue-700 mt-0.5">{profile.name}</div>
            </div>
          ) : (
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Risk profile</div>
              <div className="text-xs text-amber-700 mt-0.5">Take the quiz on the Profile tab for personalised recommendations</div>
            </div>
          )}
        </div>
      </div>

      {(['b1', 'b2', 'b3', 'b4'] as BucketKey[]).map((b) => {
        const purpose = BUCKET_PURPOSES[b]
        const value = bucketValues?.[b] ?? 0
        const rec = recommendationFor(profileId, b)
        return <BucketSection key={b} bucket={b} purpose={purpose} bucketValue={value} recommendation={rec} profileLabel={profile?.name ?? null} />
      })}
    </section>
  )
}

interface BucketSectionProps {
  bucket: BucketKey
  purpose: typeof BUCKET_PURPOSES[BucketKey]
  bucketValue: number
  recommendation: BucketRecommendation | null
  profileLabel: string | null
}

function BucketSection({ bucket, purpose, bucketValue, recommendation, profileLabel }: BucketSectionProps) {
  const classes = classesForBucket(bucket)
  const initialClass = recommendation?.primary ?? classes[0]?.id ?? ''
  const [classId, setClassId] = useState<string>(initialClass)
  const cls = classById(classId as AssetClassMeta['id']) ?? classes[0]
  const palette = BUCKET_COLOR[bucket]
  const isShowingRecommended = recommendation && classId === recommendation.primary

  // ── Compute fund / instrument options for the chosen class (lifted up here
  // so the second dropdown can sit alongside the asset-class dropdown) ──
  const isDirect = cls?.kind === 'direct'
  const recommendedSet = new Set(isShowingRecommended ? recommendation?.primaryFundCodes ?? [] : [])
  const fundsRaw = isDirect ? [] : (cls ? fundsForClass(cls) : [])
  const directInstruments = cls?.directInstruments ?? []
  const sortedFunds = sortByRecommendation(fundsRaw, recommendedSet)
  const availableOptions: Array<{ key: string; label: string; recommended: boolean }> = isDirect
    ? directInstruments.map((d) => ({ key: d.name, label: d.name, recommended: false }))
    : sortedFunds.map((f) => ({ key: f.schemeCode, label: f.schemeName, recommended: recommendedSet.has(f.schemeCode) }))

  const [fundKey, setFundKey] = useState<string>(availableOptions[0]?.key ?? '')

  // Reset fund selection when the class changes — auto-pick first (recommended) option
  useEffect(() => {
    setFundKey(availableOptions[0]?.key ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId])

  return (
    <div className="bg-white border-2 border-slate-300 rounded-lg overflow-hidden shadow-sm">
      {/* Bucket header */}
      <div className={`px-4 py-2.5 border-b-2 border-slate-200 ${palette.bg}`}>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="min-w-0">
            <h3 className={`text-[13px] font-bold ${palette.text}`}>{purpose.label}</h3>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
              {purpose.role} <span className="text-slate-400">· {purpose.horizon} · default {purpose.defaultPct}%</span>
            </p>
          </div>
          {bucketValue > 0 && (
            <div className="text-right shrink-0">
              <div className="text-[9px] uppercase tracking-wide text-slate-500 font-semibold">Allocation</div>
              <div className={`text-base font-bold tabular-nums ${palette.text}`}>{fmtINR(bucketValue)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Recommendation banner */}
      {recommendation && profileLabel && (
        <div className={`px-4 py-2 border-b-2 border-slate-200 flex items-center gap-2 flex-wrap text-[11px] ${palette.soft}`}>
          <span className={`shrink-0 w-4 h-4 rounded-full ${palette.bar} text-white flex items-center justify-center text-[9px] font-bold`} aria-hidden="true">★</span>
          <span className="text-slate-700">
            <strong className={palette.text}>Primary for {profileLabel}:</strong>{' '}
            <span className="text-slate-700">{classById(recommendation.primary)?.label ?? recommendation.primary}</span>
          </span>
        </div>
      )}

      {/* Optimised mix panel */}
      {recommendation?.optimalMix && profileLabel && (
        <OptimalMixPanel mix={recommendation.optimalMix} palette={palette} bucket={bucket} profileLabel={profileLabel} />
      )}

      {/* Dual dropdown row — Asset class | Fund / Instrument (side by side) */}
      <div className="px-4 py-3 border-b-2 border-slate-200 bg-slate-50/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Asset class */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-[1.5px] mb-1.5">
              Asset class · {classes.length} options
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className={`w-full bg-white border-2 border-slate-300 rounded-md px-2.5 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-500 focus:ring-2 ${palette.ring}`}
            >
              {classes.map((c) => {
                const isPrimary = recommendation?.primary === c.id
                const isSecondary = recommendation?.secondary === c.id
                const tag = isPrimary ? '  ★ recommended' : isSecondary ? '  ☆ alternative' : ''
                return (
                  <option key={c.id} value={c.id}>{c.label}{tag}</option>
                )
              })}
            </select>
          </div>

          {/* Fund / instrument */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-[1.5px] mb-1.5">
              {isDirect ? 'Instrument' : 'Fund'} · {availableOptions.length} option{availableOptions.length !== 1 ? 's' : ''}
            </label>
            <select
              value={fundKey}
              onChange={(e) => setFundKey(e.target.value)}
              className={`w-full bg-white border-2 border-slate-300 rounded-md px-2.5 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-500 focus:ring-2 ${palette.ring}`}
              disabled={availableOptions.length === 0}
            >
              {availableOptions.length === 0 && <option value="">(no options)</option>}
              {availableOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.recommended ? '★ ' : ''}{o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Off-recommendation hint */}
      {recommendation && !isShowingRecommended && profileLabel && classId !== recommendation.secondary && (
        <div className="px-4 py-2 bg-amber-50/60 border-b-2 border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
          <span aria-hidden="true">ℹ️</span>
          <span>This isn't the typical pick for a <strong>{profileLabel}</strong> profile in this bucket. The primary recommendation banner above explains why.</span>
        </div>
      )}

      {/* Class detail (shows the selected fund / instrument card) */}
      {cls && (
        <ClassDetail
          cls={cls}
          palette={palette}
          recommendation={recommendation}
          isShowingRecommended={isShowingRecommended ?? false}
          selectedFundKey={fundKey}
        />
      )}
    </div>
  )
}

interface ClassDetailProps {
  cls: AssetClassMeta
  palette: typeof BUCKET_COLOR[BucketKey]
  recommendation: BucketRecommendation | null
  isShowingRecommended: boolean
  selectedFundKey: string
}

function ClassDetail({ cls, palette, recommendation, isShowingRecommended, selectedFundKey }: ClassDetailProps) {
  const isDirect = cls.kind === 'direct'
  const fundsRaw = isDirect ? [] : fundsForClass(cls)
  const directInstruments = cls.directInstruments ?? []
  const recommendedSet = new Set(isShowingRecommended ? recommendation?.primaryFundCodes ?? [] : [])

  const funds = sortByRecommendation(fundsRaw, recommendedSet)
  const selectedFund = !isDirect ? funds.find((f) => f.schemeCode === selectedFundKey) : undefined
  const selectedInstrument = isDirect ? directInstruments.find((d) => d.name === selectedFundKey) : undefined

  return (
    <div className="p-4 space-y-3">
      {/* Tagline + rationale */}
      <div>
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-0.5">
          <h4 className="text-sm font-semibold text-slate-900">{cls.label}</h4>
          <span className="text-[10px] text-slate-500">{cls.short}</span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">{cls.rationale}</p>
      </div>

      {/* Why-for-your-profile callout when on the recommended class */}
      {isShowingRecommended && recommendation && (
        <div className={`rounded-lg border ${palette.ring} ${palette.soft} px-4 py-3`}>
          <div className={`text-[10px] uppercase tracking-wide font-bold ${palette.text} mb-1`}>
            ★ Why this for your profile
          </div>
          <p className="text-xs text-slate-800 leading-relaxed">{recommendation.rationale}</p>
        </div>
      )}

      {/* KPIs strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <KPI label="Expected CAGR" value={`${cls.expectedReturnRange[0]}–${cls.expectedReturnRange[1]}%`} />
        <KPI label="Volatility" value={cls.volatilityBand.split(' — ')[0]} hint={cls.volatilityBand.split(' — ')[1]} />
        <KPI label="Liquidity" value={cls.liquidityNote.split(';')[0]} />
        {isDirect ? (
          <KPI label="Instruments" value={`${directInstruments.length}`} hint="direct (non-MF)" />
        ) : (
          <KPI label="Funds shortlist" value={`${funds.length}`} hint="curated AMFI funds" />
        )}
      </div>

      {/* Selected fund detail (MF kind) */}
      {!isDirect && selectedFund && (
        <FundDetailCard fund={selectedFund} palette={palette} cls={cls} isTopPick={recommendedSet.has(selectedFund.schemeCode)} />
      )}

      {/* Selected instrument detail (direct kind) */}
      {isDirect && selectedInstrument && (
        <InstrumentDetailCard inst={selectedInstrument} palette={palette} cls={cls} />
      )}

      {/* Empty state */}
      {!selectedFund && !selectedInstrument && (
        <div className="text-xs text-slate-500 italic py-3">No options configured for this class yet.</div>
      )}

      {/* Detailed analysis report */}
      <details className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span>Detailed analysis report</span>
          <span className="text-[10px] text-slate-500 font-normal">selection criteria · risk factors · how to invest</span>
        </summary>
        <div className="mt-3 space-y-4">
          <Section title="Selection criteria" items={cls.selectionCriteria} tone="check" />
          <Section title="Risk factors" items={cls.riskFactors} tone="warn" />

          <div className="grid sm:grid-cols-2 gap-3">
            <InfoBlock label="Expected return">
              <span className="font-semibold text-slate-900 tabular-nums">{cls.expectedReturnRange[0]}–{cls.expectedReturnRange[1]}% CAGR</span>
              <span className="block text-[11px] text-slate-500 mt-1">Historical category average; not a guarantee.</span>
            </InfoBlock>
            <InfoBlock label="Volatility">
              <span className="text-slate-800">{cls.volatilityBand}</span>
            </InfoBlock>
            <InfoBlock label="Tax treatment">
              <span className="text-slate-800">{cls.taxTreatment}</span>
            </InfoBlock>
            <InfoBlock label="Liquidity">
              <span className="text-slate-800">{cls.liquidityNote}</span>
            </InfoBlock>
            <InfoBlock label="How to invest">
              <span className="text-slate-800">{cls.howToInvest}</span>
            </InfoBlock>
            <InfoBlock label="Best for">
              <span className="text-slate-800">{cls.bestFor}</span>
            </InfoBlock>
          </div>
        </div>
      </details>
    </div>
  )
}

// ── Detail cards (rendered when a fund / instrument is selected) ─────

import type { CuratedFund } from '../../types/v2'
import type { DirectInstrument } from '../../lib/data/assetClasses'

function FundDetailCard({
  fund, palette, cls, isTopPick,
}: {
  fund: CuratedFund
  palette: typeof BUCKET_COLOR[BucketKey]
  cls: AssetClassMeta
  isTopPick: boolean
}) {
  const note = fundAnalysis(fund.schemeCode)
  return (
    <div className={`rounded-lg border-2 ${isTopPick ? borderForBucket(palette) : 'border-slate-200'} ${palette.bg} overflow-hidden`}>
      <div className="px-4 py-3 flex items-start gap-3">
        <span className={`shrink-0 w-1 h-12 ${palette.bar} rounded-full`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{fund.schemeName}</span>
            {isTopPick && (
              <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${palette.bar} text-white`}>
                ★ Top pick
              </span>
            )}
            <span className="text-[10px] text-slate-500 tabular-nums">{fund.schemeCode}</span>
          </div>
          <div className="flex gap-3 mt-1 text-[11px] text-slate-600 tabular-nums flex-wrap">
            <span>AUM <strong>₹{fund.aumCrore?.toLocaleString('en-IN')} Cr</strong></span>
            <span>Expense <strong>{fund.expenseRatio}%</strong></span>
            <span>Category <strong>{fund.category}</strong></span>
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 pt-1 space-y-2 border-t border-slate-200/60">
        {note && (
          <div className={`rounded-md ${palette.soft} px-3 py-2`}>
            <div className={`text-[10px] uppercase tracking-wide font-semibold ${palette.text} mb-1`}>Why this fund</div>
            <p className="text-xs text-slate-800 leading-relaxed">{note}</p>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <InfoLine label="Tax treatment" value={cls.taxTreatment} />
          <InfoLine label="How to invest" value={cls.howToInvest} />
        </div>
        <div className="text-[10px] text-slate-500 italic">
          Verify NAV, AUM, expense ratio and exit load on the AMC website before transacting.
        </div>
      </div>
    </div>
  )
}

function InstrumentDetailCard({
  inst, palette, cls,
}: {
  inst: DirectInstrument
  palette: typeof BUCKET_COLOR[BucketKey]
  cls: AssetClassMeta
}) {
  return (
    <div className={`rounded-lg border-2 border-slate-200 ${palette.bg} overflow-hidden`}>
      <div className="px-4 py-3 flex items-start gap-3">
        <span className={`shrink-0 w-1 h-12 ${palette.bar} rounded-full`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900">{inst.name}</div>
          <div className="text-[11px] text-slate-600 mt-0.5">{inst.issuer} · {inst.category}</div>
          <div className="flex gap-3 mt-1 text-[11px] text-slate-600 tabular-nums flex-wrap">
            <span>Yield <strong>{inst.expectedCagr}%</strong></span>
            {inst.tenure && <span>Tenure <strong>{inst.tenure}</strong></span>}
            {inst.minTicket && <span>Min <strong>{inst.minTicket}</strong></span>}
            {inst.maxTicket && <span>Max <strong>{inst.maxTicket}</strong></span>}
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 pt-1 space-y-2 border-t border-slate-200/60">
        <div className={`rounded-md ${palette.soft} px-3 py-2`}>
          <div className={`text-[10px] uppercase tracking-wide font-semibold ${palette.text} mb-1`}>Notes</div>
          <p className="text-xs text-slate-800 leading-relaxed">{inst.notes}</p>
        </div>
        {inst.yieldOrCoupon && (
          <InfoLine label="Yield / coupon" value={inst.yieldOrCoupon} />
        )}
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <InfoLine label="Tax treatment" value={inst.taxNote} />
          <InfoLine label="How to invest" value={cls.howToInvest} />
        </div>
        <div className="text-[10px] text-slate-500 italic">
          Verify current rates, eligibility and tax treatment with the issuer before investing.
        </div>
      </div>
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-0.5">{label}</div>
      <div className="text-slate-700 leading-relaxed text-[11px]">{value}</div>
    </div>
  )
}

// Palette of distinct slice colors for the optimal-mix bar; loops if needed
const SLICE_COLORS = [
  'bg-slate-700', 'bg-blue-500', 'bg-teal-500', 'bg-amber-500',
  'bg-violet-500', 'bg-orange-500', 'bg-rose-500', 'bg-emerald-500',
]

function OptimalMixPanel({
  mix, palette, bucket, profileLabel,
}: {
  mix: OptimalMixSlice[]
  palette: typeof BUCKET_COLOR[BucketKey]
  bucket: BucketKey
  profileLabel: string
}) {
  const total = mix.reduce((s, m) => s + m.pctOfBucket, 0)
  const normalised = total > 0 ? mix.map((m) => ({ ...m, pct: (m.pctOfBucket / total) * 100 })) : []

  return (
    <div className={`px-4 py-3 border-b-2 border-slate-200 ${palette.bg}`}>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <h4 className={`text-xs font-bold ${palette.text}`}>
          Optimised mix · {bucket.toUpperCase()} for {profileLabel}
        </h4>
        <span className="text-[10px] text-slate-500">Reshuffled for best risk-adjusted return</span>
      </div>

      {/* Stacked horizontal bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-200/50 mb-2">
        {normalised.map((slice, i) => {
          const cls = classById(slice.classId)
          return (
            <div
              key={slice.classId}
              className={SLICE_COLORS[i % SLICE_COLORS.length]}
              style={{ width: `${slice.pct}%` }}
              title={`${cls?.label ?? slice.classId} — ${slice.pctOfBucket}%`}
            />
          )
        })}
      </div>

      {/* Slice list */}
      <div className="grid sm:grid-cols-2 gap-x-3 gap-y-1">
        {normalised.map((slice, i) => {
          const cls = classById(slice.classId)
          return (
            <div key={slice.classId} className="flex items-baseline gap-1.5 text-[10px]">
              <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${SLICE_COLORS[i % SLICE_COLORS.length]} translate-y-[-1px]`} aria-hidden="true" />
              <span className="font-semibold text-slate-800 tabular-nums shrink-0 w-7">{slice.pctOfBucket}%</span>
              <span className="text-slate-700 truncate">{cls?.label ?? slice.classId}</span>
              <span className="text-slate-500 truncate">— {slice.role}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KPI({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50/60 px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
      <div className="text-xs font-semibold text-slate-900 mt-0.5 tabular-nums truncate">{value}</div>
      {hint && <div className="text-[9px] text-slate-500 mt-0.5 truncate">{hint}</div>}
    </div>
  )
}

function Section({ title, items, tone }: { title: string; items: string[]; tone: 'check' | 'warn' }) {
  const symbol = tone === 'check' ? '✓' : '!'
  const color = tone === 'check' ? 'text-green-600' : 'text-amber-600'
  return (
    <div>
      <h6 className="text-xs font-semibold text-slate-800 mb-1.5">{title}</h6>
      <ul className="space-y-1 text-xs text-slate-700">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className={`${color} font-bold shrink-0`}>{symbol}</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-white border border-slate-200 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">{label}</div>
      <div className="text-xs leading-relaxed">{children}</div>
    </div>
  )
}

const fmtINR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function sortByRecommendation<T extends { schemeCode: string }>(funds: T[], recommended: Set<string>): T[] {
  if (recommended.size === 0) return funds
  return [...funds].sort((a, b) => {
    const ar = recommended.has(a.schemeCode) ? 0 : 1
    const br = recommended.has(b.schemeCode) ? 0 : 1
    return ar - br
  })
}

function borderForBucket(palette: typeof BUCKET_COLOR[BucketKey]): string {
  // Convert the palette's bar bg class (e.g. 'bg-blue-500') to a border equivalent
  return palette.bar.replace('bg-', 'border-')
}

// Re-export for typecheck linting compatibility
export { ASSET_CLASSES }
