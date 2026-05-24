// Net Worth & Balance Sheet — total asset / liability picture with
// concentration breakdown, liquid vs invested split, and group-level
// totals. Pure visualisation; reads from profile.

import type { UserProfile, BucketState, AssetEntry, LoanEntry } from '../../types'
import { storage } from '../../lib/storage'
import { downloadV10Json } from '../../lib/exporters/v10Json'
import { exportReport, FORMATS } from '../../lib/exporters'
import { useState } from 'react'
import type { ExportFormat } from '../../lib/exporters'

interface Props {
  profile: UserProfile
  buckets: BucketState
}

function fmtINR(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)}k`
  return `${sign}₹${Math.round(abs)}`
}

const ASSET_GROUPS: Array<{ key: string; label: string; color: string; keys: string[] }> = [
  { key: 'cash',       label: 'Liquid & Cash',  color: '#22d3ee', keys: ['savings', 'sweepFdr', 'cashOnHand'] },
  { key: 'fixed',      label: 'Fixed Income',   color: '#3b82f6', keys: ['bankFds', 'bankRds', 'corporateBonds', 'govtBonds', 'rbiFrb'] },
  { key: 'retirement', label: 'Retirement',     color: '#10b981', keys: ['scss', 'pomis', 'pmvvy', 'ppf', 'epfVpf', 'npsTier1', 'npsTier2', 'sukanya'] },
  { key: 'mf',         label: 'Mutual Funds',   color: '#f59e0b', keys: ['mutualFunds'] },
  { key: 'equity',     label: 'Direct Equity',  color: '#fb923c', keys: ['stocksIndia', 'stocksIntl'] },
  { key: 'realestate', label: 'Real Estate',    color: '#f43f5e', keys: ['selfOccupiedHome', 'secondHome', 'commercialProperty', 'landPlot', 'reits', 'invits'] },
  { key: 'gold',       label: 'Gold & Metals',  color: '#eab308', keys: ['physicalGold', 'sgb', 'silver'] },
  { key: 'alt',        label: 'Alternative',    color: '#a855f7', keys: ['ulipsEndowment', 'crypto', 'businessEquity', 'foreignAssets', 'collectibles'] },
]

function readAsset(p: UserProfile, key: string): AssetEntry | null {
  const inv = p.assetInventory as unknown as Record<string, AssetEntry> | undefined
  return inv?.[key] ?? null
}

export function NetWorthDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [exportErr, setExportErr] = useState<string | null>(null)

  const groupTotals = ASSET_GROUPS.map((g) => {
    const total = g.keys.reduce((s, k) => s + (readAsset(profile, k)?.amount ?? 0), 0)
    return { ...g, total }
  })
  const totalAssets = groupTotals.reduce((s, g) => s + g.total, 0)
  const liquidTotal = ASSET_GROUPS.flatMap((g) => g.keys)
    .map((k) => readAsset(profile, k))
    .filter((e): e is AssetEntry => !!e && e.status === 'liquid')
    .reduce((s, e) => s + e.amount, 0)
  const investedTotal = totalAssets - liquidTotal

  // Liabilities
  const lp = profile.loanProfile
  const liabilities = lp
    ? (Object.entries(lp).filter(([k]) => k !== 'strategy') as Array<[string, LoanEntry]>)
        .filter(([, l]) => l && l.active)
        .reduce((s, [, l]) => s + (l.outstanding || 0), 0)
    : 0
  const netWorth = totalAssets - liabilities

  // Top 5 concentration
  const allAssets = ASSET_GROUPS.flatMap((g) =>
    g.keys.map((k) => ({ key: k, amount: readAsset(profile, k)?.amount ?? 0, group: g.label, color: g.color })),
  ).filter((a) => a.amount > 0)
    .sort((a, b) => b.amount - a.amount)
  const top5 = allAssets.slice(0, 5)
  const top5Share = top5.reduce((s, a) => s + a.amount, 0) / Math.max(1, totalAssets) * 100

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setExportErr(null)
    try {
      await exportReport(fmt, { identity: storage.getIdentity(), profile, buckets, returnAssumptions: storage.getReturnAssumptions() })
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`)
    } finally { setBusy(null) }
  }

  return (
    <section className="space-y-3">
      {/* Top-line KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi label="Net Worth"     value={fmtINR(netWorth)}     tone={netWorth >= 0 ? 'emerald' : 'rose'} />
        <Kpi label="Gross Assets"  value={fmtINR(totalAssets)}  tone="navy" />
        <Kpi label="Liabilities"   value={fmtINR(liabilities)}  tone="amber" />
        <Kpi label="Liquid : Invested" value={`${pct(liquidTotal, totalAssets)} : ${pct(investedTotal, totalAssets)}`} tone="slate" />
      </div>

      {/* Asset-class donut */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Asset class breakdown</h4>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-center">
          <Donut groups={groupTotals.filter((g) => g.total > 0)} total={totalAssets} />
          <ul className="space-y-1 text-[11.5px]">
            {groupTotals.filter((g) => g.total > 0).map((g) => (
              <li key={g.key} className="grid grid-cols-[14px_1fr_auto_auto] items-baseline gap-2">
                <span aria-hidden="true" className="inline-block w-3 h-3 rounded-sm" style={{ background: g.color }} />
                <span className="text-slate-700">{g.label}</span>
                <span className="text-slate-500 tabular-nums">{pct(g.total, totalAssets)}</span>
                <span className="font-semibold text-slate-900 tabular-nums">{fmtINR(g.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Liquid vs Invested bar */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Liquid vs Invested</h4>
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
          {liquidTotal > 0 && <div className="bg-emerald-500" style={{ width: `${(liquidTotal / Math.max(1, totalAssets)) * 100}%` }} />}
          {investedTotal > 0 && <div className="bg-blue-500" style={{ width: `${(investedTotal / Math.max(1, totalAssets)) * 100}%` }} />}
        </div>
        <div className="flex justify-between mt-1.5 text-[11px]">
          <span className="text-emerald-700"><strong>{fmtINR(liquidTotal)}</strong> Liquid · {pct(liquidTotal, totalAssets)}</span>
          <span className="text-blue-700"><strong>{fmtINR(investedTotal)}</strong> Invested · {pct(investedTotal, totalAssets)}</span>
        </div>
      </section>

      {/* Top 5 concentration */}
      {top5.length > 0 && (
        <section className="rounded-md border-2 border-slate-200 bg-white p-3">
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Top 5 holdings</h4>
            <span className="text-[10px] text-slate-500 italic">
              {top5Share > 70
                ? `⚠ ${Math.round(top5Share)}% concentrated — consider diversifying`
                : `${Math.round(top5Share)}% of gross assets`}
            </span>
          </div>
          <ul className="space-y-1.5 text-[11.5px]">
            {top5.map((a, i) => (
              <li key={i} className="grid grid-cols-[20px_1fr_60px] gap-2 items-center">
                <span className="text-slate-400 tabular-nums">{i + 1}.</span>
                <div>
                  <div className="flex items-baseline justify-between mb-0.5">
                    <span className="text-slate-700 capitalize">{a.key.replace(/([A-Z])/g, ' $1').toLowerCase()} <span className="text-slate-400">· {a.group}</span></span>
                    <span className="font-semibold text-slate-900 tabular-nums">{fmtINR(a.amount)}</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${(a.amount / top5[0].amount) * 100}%`, background: a.color }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Insights */}
      <section className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-emerald-800 mb-1.5">Insights</h4>
        <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
          {netWorth < 0 && <li>● Net worth is negative — focus on debt payoff before adding to invested assets.</li>}
          {liquidTotal / Math.max(1, totalAssets) < 0.05 && <li>● Liquid corpus is &lt; 5% of total — consider building emergency / B1 buffer.</li>}
          {top5Share > 70 && <li>● Top 5 holdings carry {Math.round(top5Share)}% of net worth — concentration risk is elevated.</li>}
          {liabilities > totalAssets * 0.5 && totalAssets > 0 && <li>● Liabilities exceed 50% of assets — DTI likely above comfortable range.</li>}
          <li>● Drill into each asset row under Step 01 to update market values.</li>
        </ul>
      </section>

      {/* Download row */}
      <DownloadRow busy={busy} onExport={handleExport} err={exportErr} profile={profile} buckets={buckets} />
    </section>
  )
}

// ─── Small subcomponents ───────────────────────────────────────────────

function Kpi({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'navy' | 'amber' | 'rose' | 'slate' }) {
  const bg = tone === 'emerald' ? 'bg-emerald-50' : tone === 'navy' ? 'bg-blue-50' : tone === 'amber' ? 'bg-amber-50' : tone === 'rose' ? 'bg-rose-50' : 'bg-slate-50'
  const fg = tone === 'emerald' ? 'text-emerald-700' : tone === 'navy' ? 'text-blue-700' : tone === 'amber' ? 'text-amber-700' : tone === 'rose' ? 'text-rose-700' : 'text-slate-700'
  return (
    <div className={`rounded-md border-2 border-slate-200 ${bg} px-2.5 py-2`}>
      <div className={`text-[9px] font-bold tracking-[1.5px] uppercase ${fg}`}>{label}</div>
      <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5 leading-tight">{value}</div>
    </div>
  )
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return '0%'
  return `${Math.round((part / whole) * 100)}%`
}

function Donut({ groups, total }: { groups: Array<{ label: string; color: string; total: number }>; total: number }) {
  const cx = 90, cy = 90, R = 80, r = 48
  let angle = -90
  function slicePath(fraction: number): string {
    if (fraction <= 0) return ''
    const start = angle
    const sweep = fraction * 360
    const end = start + sweep
    angle = end
    const a1 = (start * Math.PI) / 180, a2 = (end * Math.PI) / 180
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1)
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2)
    const x3 = cx + r * Math.cos(a2), y3 = cy + r * Math.sin(a2)
    const x4 = cx + r * Math.cos(a1), y4 = cy + r * Math.sin(a1)
    const largeArc = sweep > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4} Z`
  }
  return (
    <svg viewBox="0 0 180 180" className="block w-full max-w-[180px] h-auto mx-auto" aria-label="Asset breakdown donut">
      {groups.map((g, i) => (
        <path key={i} d={slicePath(g.total / Math.max(1, total))} fill={g.color} stroke="white" strokeWidth={1.5} />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 10, fill: '#64748b' }}>Total</text>
      <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 14, fontWeight: 800, fill: '#0f172a' }}>
        {total >= 1e7 ? `₹${(total / 1e7).toFixed(1)}Cr` : total >= 1e5 ? `₹${(total / 1e5).toFixed(0)}L` : `₹${total}`}
      </text>
    </svg>
  )
}

export function DownloadRow({ busy, onExport, err, profile: _p, buckets: _b }: { busy: ExportFormat | null; onExport: (f: ExportFormat) => void; err: string | null; profile: UserProfile; buckets: BucketState }) {
  void _p; void _b
  return (
    <section className="rounded-md border-2 border-slate-200 bg-slate-50/40 p-2.5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1.5">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Download report</h4>
        <span className="text-[10px] text-slate-500 italic">Same envelope as other dashboards.</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => downloadV10Json(storage.getGoalDiscovery(), storage.getV10QuizState())}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
        >
          <span aria-hidden="true">⬇</span> JSON
        </button>
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onExport(f.id)}
            disabled={busy != null}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <span aria-hidden="true">⬇</span> {busy === f.id ? `${f.label}…` : f.label}
          </button>
        ))}
      </div>
      {err && <div className="mt-2 text-[11px] text-rose-700">{err}</div>}
    </section>
  )
}
