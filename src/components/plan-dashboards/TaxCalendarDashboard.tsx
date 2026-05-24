// Tax & Policy Calendar — upcoming statutory + policy dates: advance
// tax, SCSS quarterly rate reviews, ITR deadline, insurance renewals,
// will review reminder.

import type { UserProfile, BucketState, InsuranceEntry } from '../../types'
import { DownloadRow } from './NetWorthDashboard'
import { useState } from 'react'
import type { ExportFormat } from '../../lib/exporters'
import { exportReport } from '../../lib/exporters'
import { storage } from '../../lib/storage'

interface Props { profile: UserProfile; buckets: BucketState }

interface Item {
  date: Date
  label: string
  kind: 'tax' | 'rate' | 'insurance' | 'estate' | 'compliance'
  recur?: 'annual' | 'quarterly'
}

const KIND_COLOR: Record<Item['kind'], string> = {
  tax: '#f59e0b', rate: '#3b82f6', insurance: '#10b981', estate: '#a855f7', compliance: '#64748b',
}

function nextOccurrence(month: number, day: number, after: Date): Date {
  let d = new Date(after.getFullYear(), month - 1, day)
  if (d < after) d = new Date(after.getFullYear() + 1, month - 1, day)
  return d
}

export function TaxCalendarDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const today = new Date()
  const items: Item[] = []

  // Advance tax (15th of Jun / Sep / Dec / Mar) — only for those with TDS gap
  const slab = profile.taxBracket
  if (slab >= 20) {
    items.push({ date: nextOccurrence(6, 15, today),  label: 'Advance Tax Q1 (15%)',  kind: 'tax', recur: 'quarterly' })
    items.push({ date: nextOccurrence(9, 15, today),  label: 'Advance Tax Q2 (45% cumulative)', kind: 'tax', recur: 'quarterly' })
    items.push({ date: nextOccurrence(12, 15, today), label: 'Advance Tax Q3 (75% cumulative)', kind: 'tax', recur: 'quarterly' })
    items.push({ date: nextOccurrence(3, 15, today),  label: 'Advance Tax Q4 (100%)', kind: 'tax', recur: 'quarterly' })
  }

  // ITR filing
  items.push({ date: nextOccurrence(7, 31, today),  label: 'ITR-1/2 deadline (non-audit)', kind: 'tax', recur: 'annual' })
  items.push({ date: nextOccurrence(10, 31, today), label: 'ITR audit-cases deadline',     kind: 'tax', recur: 'annual' })

  // SCSS rate review (1st of Apr / Jul / Oct / Jan)
  items.push({ date: nextOccurrence(4, 1, today),  label: 'SCSS / Small-savings rate revision', kind: 'rate', recur: 'quarterly' })
  items.push({ date: nextOccurrence(7, 1, today),  label: 'SCSS rate revision (Q2)',            kind: 'rate', recur: 'quarterly' })
  items.push({ date: nextOccurrence(10, 1, today), label: 'SCSS rate revision (Q3)',            kind: 'rate', recur: 'quarterly' })
  items.push({ date: nextOccurrence(1, 1, today),  label: 'SCSS rate revision (Q4)',            kind: 'rate', recur: 'quarterly' })

  // Insurance renewals — assume same month as today + 1y for any active policy
  const ins = profile.insuranceCover ?? {}
  const insLabels: Record<string, string> = {
    familyFloater: 'Family floater renewal',
    personalHealth: 'Personal health renewal',
    superTopUp: 'Super top-up renewal',
    criticalIllness: 'Critical-illness renewal',
    seniorCitizen: 'Senior-citizen plan renewal',
    termPlan: 'Term plan premium due',
    wholeLife: 'Whole-life premium due',
  }
  Object.entries(insLabels).forEach(([k, label]) => {
    const e = (ins as unknown as Record<string, InsuranceEntry>)[k]
    if (e?.active) {
      // Placeholder: renewal one year from today (proxy)
      const d = new Date(today)
      d.setFullYear(d.getFullYear() + 1)
      items.push({ date: d, label, kind: 'insurance', recur: 'annual' })
    }
  })

  // Estate review — every 3 years
  const estate = new Date(today)
  estate.setFullYear(estate.getFullYear() + 3)
  items.push({ date: estate, label: 'Will / nominee review (3-yearly)', kind: 'estate', recur: 'annual' })

  // KYC update — banks need every 2y
  const kyc = new Date(today)
  kyc.setFullYear(kyc.getFullYear() + 2)
  items.push({ date: kyc, label: 'Bank KYC re-verification (2-yearly)', kind: 'compliance', recur: 'annual' })

  items.sort((a, b) => a.date.getTime() - b.date.getTime())
  const upcoming = items.filter((i) => i.date >= today).slice(0, 12)

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setErr(null)
    try { await exportReport(fmt, { identity: storage.getIdentity(), profile, buckets, returnAssumptions: storage.getReturnAssumptions() }) }
    catch (e) { setErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`) }
    finally { setBusy(null) }
  }

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi label="In next 30 days" value={`${items.filter((i) => i.date >= today && (i.date.getTime() - today.getTime()) < 30 * 86400_000).length}`} tone="rose" />
        <Kpi label="In next 90 days" value={`${items.filter((i) => i.date >= today && (i.date.getTime() - today.getTime()) < 90 * 86400_000).length}`} tone="amber" />
        <Kpi label="Tax items"       value={`${items.filter((i) => i.kind === 'tax' && i.date >= today).length}`} />
        <Kpi label="Renewals"        value={`${items.filter((i) => i.kind === 'insurance' && i.date >= today).length}`} />
      </div>

      {/* Upcoming list */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Next 12 upcoming dates</h4>
        <ul className="text-[11.5px] divide-y divide-slate-100">
          {upcoming.map((i, idx) => {
            const days = Math.round((i.date.getTime() - today.getTime()) / 86400_000)
            const dateStr = i.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            return (
              <li key={idx} className="grid grid-cols-[14px_90px_60px_1fr] gap-2 items-baseline py-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: KIND_COLOR[i.kind] }} aria-hidden="true" />
                <span className="text-slate-700 font-bold tabular-nums">{dateStr}</span>
                <span className={`text-[10px] uppercase tracking-wider tabular-nums ${days < 30 ? 'text-rose-700' : days < 90 ? 'text-amber-700' : 'text-slate-500'}`}>
                  in {days}d
                </span>
                <span className="text-slate-800">{i.label}</span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Legend */}
      <section className="rounded-md border-2 border-slate-200 bg-slate-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Category legend</h4>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          {(Object.keys(KIND_COLOR) as Array<keyof typeof KIND_COLOR>).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} />
              <span className="text-slate-700 capitalize">{k}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-emerald-800 mb-1.5">Reminders</h4>
        <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
          {slab >= 20 && <li>● 20%/30% slab — pay advance tax 4× a year (15 Jun/Sep/Dec/Mar) to avoid 234B/234C interest.</li>}
          <li>● SCSS/PPF/NSC rates revise every quarter — use the dates above to time fresh deposits.</li>
          <li>● Insurance renewals are <em>estimated as one year ahead</em>; for exact dates use the Policy Renewal Date in each policy.</li>
          <li>● Update will + nominee details after any major event (death, divorce, new asset, child marriage).</li>
        </ul>
      </section>

      <DownloadRow busy={busy} onExport={handleExport} err={err} profile={profile} buckets={buckets} />
    </section>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'rose' | 'amber' }) {
  const bg = tone === 'rose' ? 'bg-rose-50' : tone === 'amber' ? 'bg-amber-50' : 'bg-white'
  const fg = tone === 'rose' ? 'text-rose-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-700'
  return (
    <div className={`rounded-md border-2 border-slate-200 ${bg} px-2.5 py-2`}>
      <div className={`text-[9px] font-bold tracking-[1.5px] uppercase ${fg}`}>{label}</div>
      <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5 leading-tight">{value}</div>
    </div>
  )
}
