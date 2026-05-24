// Estate / Legacy — assets to bequeath, MWP-Act coverage, will &
// succession readiness, gift-tax planning checklist.

import type { UserProfile, BucketState, AssetEntry, LoanEntry } from '../../types'
import { DownloadRow } from './NetWorthDashboard'
import { useState } from 'react'
import type { ExportFormat } from '../../lib/exporters'
import { exportReport } from '../../lib/exporters'
import { storage } from '../../lib/storage'

interface Props { profile: UserProfile; buckets: BucketState }

function fmtINR(n: number): string {
  const abs = Math.abs(n), sign = n < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)}k`
  return `${sign}₹${Math.round(abs)}`
}

interface CheckItem { label: string; done: boolean; note: string }

export function EstateDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Bequeathable: assets − liabilities + life cover (paid to nominees outside the estate)
  const inv = (profile.assetInventory ?? {}) as Record<string, AssetEntry>
  const totalAssets = Object.values(inv).reduce((s, e) => s + (e?.amount || 0), 0)

  const lp = profile.loanProfile
  const liabilities = lp
    ? (Object.entries(lp).filter(([k]) => k !== 'strategy') as Array<[string, LoanEntry]>)
        .filter(([, l]) => l && l.active)
        .reduce((s, [, l]) => s + (l.outstanding || 0), 0)
    : 0

  const ins = profile.insuranceCover
  const lifeCover = ((ins?.termPlan?.active ? ins.termPlan.cover : 0)
                   + (ins?.wholeLife?.active ? ins.wholeLife.cover : 0))

  const bequeathable = totalAssets - liabilities + lifeCover

  const termActive = !!ins?.termPlan?.active
  const termMwp = !!ins?.termPlan?.mwp

  // Illiquid / specific-handling categories
  const realEstate = (inv.selfOccupiedHome?.amount ?? 0) + (inv.secondHome?.amount ?? 0)
                   + (inv.commercialProperty?.amount ?? 0) + (inv.landPlot?.amount ?? 0)
  const businessEquity = inv.businessEquity?.amount ?? 0
  const collectibles = inv.collectibles?.amount ?? 0

  // Checklist
  const checklist: CheckItem[] = [
    { label: 'Registered will exists (not just draft)', done: false, note: 'Stamp + register at sub-registrar — admissible without probate in most states.' },
    { label: 'Term plan held under MWP Act', done: termMwp, note: termActive ? (termMwp ? 'Creditors cannot touch proceeds.' : 'Re-issue your term plan under MWP — proceeds otherwise at risk.') : 'No term plan recorded.' },
    { label: 'Nominees recorded on every demat / MF folio', done: false, note: 'SEBI now mandates nominee declaration; trading freezes otherwise.' },
    { label: 'Joint holding on bank / FD accounts', done: false, note: '"Either or Survivor" mode avoids succession-certificate delay.' },
    { label: 'PPF / EPF / NPS nominees updated', done: false, note: 'Without it, claim drags 6–18 months under probate.' },
    { label: 'Locker access / will lodged with bank', done: false, note: 'Bank-locker access alone needs nominee + KYC + indemnity.' },
    { label: 'Original property papers + chain documented', done: false, note: 'Lost title chain = years lost to revenue court.' },
    { label: 'Digital estate (Gmail / iCloud / WhatsApp) plan exists', done: false, note: 'Two-factor + recovery contacts to a trusted person.' },
  ]

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setErr(null)
    try { await exportReport(fmt, { identity: storage.getIdentity(), profile, buckets, returnAssumptions: storage.getReturnAssumptions() }) }
    catch (e) { setErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`) }
    finally { setBusy(null) }
  }

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi label="Bequeathable"  value={fmtINR(bequeathable)} sub="net assets + life cover" tone="emerald" />
        <Kpi label="Life cover"    value={fmtINR(lifeCover)}    sub={termMwp ? 'MWP ✓' : (termActive ? 'NOT under MWP' : 'no term plan')} tone={termMwp ? 'emerald' : 'rose'} />
        <Kpi label="Illiquid (RE)" value={fmtINR(realEstate)}   sub="needs nominee + chain" tone="amber" />
        <Kpi label="Outstanding debt" value={fmtINR(liabilities)} sub="reduces what passes" />
      </div>

      {/* MWP banner */}
      {termActive && !termMwp && (
        <section className="rounded-md border-2 border-rose-300 bg-rose-50 p-3">
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-rose-800">Critical action</div>
          <div className="text-[12px] text-slate-800 mt-1 leading-snug">
            Your <strong>term plan is active but NOT held under the MWP Act, 1874</strong>. On a claim, proceeds form part of your estate and any creditor can attach them.
            Re-issue the policy (or a new equivalent) MWP-tagged to your spouse / children before any other estate move.
          </div>
        </section>
      )}

      {/* Checklist */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Estate readiness checklist</h4>
        <ul className="text-[11.5px] space-y-1.5">
          {checklist.map((c, i) => (
            <li key={i} className="grid grid-cols-[16px_1fr] gap-2 items-baseline border-b border-slate-100 last:border-b-0 py-1">
              <span className={`text-[12px] leading-none ${c.done ? 'text-emerald-600' : 'text-slate-400'}`}>{c.done ? '✓' : '○'}</span>
              <div>
                <div className={`font-semibold ${c.done ? 'text-emerald-800' : 'text-slate-800'}`}>{c.label}</div>
                <div className="text-[10.5px] text-slate-600 italic mt-0.5">{c.note}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Special-handling assets */}
      {(businessEquity > 0 || collectibles > 0 || realEstate > 0) && (
        <section className="rounded-md border-2 border-amber-200 bg-amber-50/40 p-3">
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-amber-800 mb-1.5">Special handling required</h4>
          <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
            {realEstate > 0 && <li>● Real estate {fmtINR(realEstate)} — confirm <em>title chain, EC, mutation</em> are up to date and stored together.</li>}
            {businessEquity > 0 && <li>● Business equity {fmtINR(businessEquity)} — requires shareholders' agreement / buy-sell clause to avoid family conflict.</li>}
            {collectibles > 0 && <li>● Collectibles {fmtINR(collectibles)} — provenance records and bequest-by-name in will (separate from cash assets).</li>}
          </ul>
        </section>
      )}

      <section className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-emerald-800 mb-1.5">Gift-tax / wealth-transfer notes</h4>
        <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
          <li>● Gifts to <strong>specified relatives</strong> (spouse, children, siblings, parents) are tax-free regardless of amount under Sec 56.</li>
          <li>● Gifts to non-relatives over ₹50,000/year are taxable to the recipient at their slab rate.</li>
          <li>● Clubbing of income applies on gifts to spouse / minor children — the donor's tax slab still owns the income from gifted assets.</li>
          <li>● HUF route: useful for inherited assets that can grow as a separate PAN once partitioned.</li>
        </ul>
      </section>

      <DownloadRow busy={busy} onExport={handleExport} err={err} profile={profile} buckets={buckets} />
    </section>
  )
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'emerald' | 'rose' | 'amber' }) {
  const bg = tone === 'emerald' ? 'bg-emerald-50' : tone === 'rose' ? 'bg-rose-50' : tone === 'amber' ? 'bg-amber-50' : 'bg-white'
  const fg = tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-700'
  return (
    <div className={`rounded-md border-2 border-slate-200 ${bg} px-2.5 py-2`}>
      <div className={`text-[9px] font-bold tracking-[1.5px] uppercase ${fg}`}>{label}</div>
      <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5 leading-tight">{value}</div>
      {sub && <div className="text-[9px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}
