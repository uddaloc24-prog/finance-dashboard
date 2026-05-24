// Tax Optimisation — slab utilisation, 80C / 80CCD(1B) / 80D / 80TTB
// headroom, LTCG harvesting opportunity, withdrawal sequencing guidance.

import type { UserProfile, BucketState, AssetEntry } from '../../types'
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

const SLAB_LABELS: Record<number, string> = { 0: 'Below taxable', 5: '5% slab', 20: '20% slab', 30: '30% slab' }

// Approximate annual headroom under old regime (FY 25-26)
const HEADROOM = {
  s80c:        150_000,
  s80ccd_1b:    50_000,   // NPS additional
  s80d_self:    25_000,   // < 60
  s80d_senior:  50_000,
  s80ttb:       50_000,   // savings + FD interest (senior)
  ltcgEquity: 1_25_000,   // tax-free LTCG threshold (Budget 2024 onwards)
}

export function TaxOptimisationDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const slab = profile.taxBracket
  const slabLabel = SLAB_LABELS[slab] ?? `${slab}% slab`
  const age = profile.demographics?.currentAge ?? 60
  const isSenior = age >= 60

  const inv = (profile.assetInventory ?? {}) as Record<string, AssetEntry>
  const ppf80c = inv.ppf?.amount ?? 0
  const epf80c = inv.epfVpf?.amount ?? 0
  const tier1   = inv.npsTier1?.amount ?? 0

  // Headroom — show known instruments minus a yearly contribution proxy.
  // (We don't have separate "current-year contribution" fields, so flag the
  // category if a known vehicle is present and zero-balance otherwise.)
  const has80c     = ppf80c > 0 || epf80c > 0 || (inv.sukanya?.amount ?? 0) > 0
  const hasNps     = tier1 > 0
  const has80d     = !!profile.insuranceCover?.familyFloater?.active || !!profile.insuranceCover?.personalHealth?.active

  // Equity holdings — for LTCG harvesting note
  const equityHoldings = (inv.mutualFunds?.amount ?? 0) + (inv.stocksIndia?.amount ?? 0) + (inv.stocksIntl?.amount ?? 0)

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setErr(null)
    try { await exportReport(fmt, { identity: storage.getIdentity(), profile, buckets, returnAssumptions: storage.getReturnAssumptions() }) }
    catch (e) { setErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`) }
    finally { setBusy(null) }
  }

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi label="Current slab"      value={slabLabel} sub={slab === 30 ? 'top bracket' : ''} />
        <Kpi label="80C headroom"      value={fmtINR(HEADROOM.s80c)} sub={has80c ? 'partially used' : 'unused'} tone="emerald" />
        <Kpi label="80CCD(1B) NPS"     value={fmtINR(HEADROOM.s80ccd_1b)} sub={hasNps ? 'NPS active' : 'no NPS'} tone="emerald" />
        <Kpi label="LTCG tax-free"     value={fmtINR(HEADROOM.ltcgEquity)} sub="equity / yr / PAN" tone="amber" />
      </div>

      {/* Deduction headroom */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3 space-y-2">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Deduction utilisation (old regime)</h4>
        <Row title="80C — PPF · EPF · ELSS · life premium · home loan principal"
             cap={HEADROOM.s80c}
             active={has80c}
             note="Cap is per-PAN per FY. If you have EPF, that often consumes most of it." />
        <Row title="80CCD(1B) — NPS additional"
             cap={HEADROOM.s80ccd_1b}
             active={hasNps}
             note="Over and above 80C. ₹50k extra → up to ₹15.6k tax saved in 30% slab." />
        <Row title={`80D — Health premium (${isSenior ? 'senior ₹50k' : 'self ₹25k'} + parents ₹50k)`}
             cap={isSenior ? HEADROOM.s80d_senior : HEADROOM.s80d_self}
             active={has80d}
             note="Add ₹50k more if parents are senior citizens." />
        {isSenior && (
          <Row title="80TTB — Savings + FD interest (senior)"
               cap={HEADROOM.s80ttb}
               active={true}
               note="₹50k of bank/post-office interest tax-free; reduces FD tax drag." />
        )}
      </section>

      {/* LTCG harvesting */}
      {equityHoldings > 0 && (
        <section className="rounded-md border-2 border-amber-200 bg-amber-50/40 p-3">
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-amber-800 mb-1.5">LTCG harvesting opportunity</h4>
          <div className="text-[11px] text-slate-700 leading-snug">
            You hold <strong>{fmtINR(equityHoldings)}</strong> in equity (MF + stocks). Booking up to <strong>{fmtINR(HEADROOM.ltcgEquity)}</strong> of long-term gains per PAN per FY is tax-free
            (12.5% above that, post Budget 2024). Sell + buy back on the same day to reset cost basis — a free annual step-up.
          </div>
        </section>
      )}

      {/* Withdrawal sequencing */}
      <section className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-emerald-800 mb-1.5">Tax-aware withdrawal sequence</h4>
        <ol className="text-[11px] text-slate-700 space-y-1 leading-snug list-decimal pl-5">
          <li><strong>PPF / EPF / Sukanya</strong> — tax-free withdrawals; spend last only if no rate-arb available.</li>
          <li><strong>SCSS interest + 80TTB ceiling</strong> — first ₹50k of bank interest tax-free for seniors.</li>
          <li><strong>Equity LTCG up to ₹1.25L/yr</strong> — harvest annually before turning to other taxable buckets.</li>
          <li><strong>Debt MF / Bonds (post-2023)</strong> — taxed at slab rate, no indexation. Realise during low-income years.</li>
          <li><strong>FD interest (non-senior, &gt; 80TTB)</strong> — fully taxable; pair with TDS-15G/H if eligible.</li>
        </ol>
      </section>

      <section className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-emerald-800 mb-1.5">FY 25-26 budget reminders</h4>
        <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
          <li>● New regime is default since FY 23-24 — pick old regime explicitly to claim 80C/80D/80CCD(1B).</li>
          <li>● Equity STCG taxed at <strong>20%</strong> (was 15%), LTCG at <strong>12.5%</strong> (was 10%) above ₹1.25L — Budget 2024 changes.</li>
          <li>● Indexation removed from debt MFs purchased on/after 1 Apr 2023 — taxed at slab rate on redemption.</li>
          <li>● Tax bracket noted: <strong>{slabLabel}</strong> ({slab}%) — change in Step 04 Profile & Settings.</li>
        </ul>
      </section>

      <DownloadRow busy={busy} onExport={handleExport} err={err} profile={profile} buckets={buckets} />
    </section>
  )
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'emerald' | 'amber' }) {
  const bg = tone === 'emerald' ? 'bg-emerald-50' : tone === 'amber' ? 'bg-amber-50' : 'bg-white'
  const fg = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-700'
  return (
    <div className={`rounded-md border-2 border-slate-200 ${bg} px-2.5 py-2`}>
      <div className={`text-[9px] font-bold tracking-[1.5px] uppercase ${fg}`}>{label}</div>
      <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5 leading-tight">{value}</div>
      {sub && <div className="text-[9px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function Row({ title, cap, active, note }: { title: string; cap: number; active: boolean; note: string }) {
  return (
    <div className="text-[11.5px]">
      <div className="flex items-baseline justify-between mb-0.5">
        <span className="text-slate-800 font-semibold">{title}</span>
        <span className="tabular-nums">
          <span className="text-slate-500">cap </span>
          <span className="font-bold text-slate-900">{fmtINR(cap)}</span>
          <span className={`ml-2 text-[10px] font-bold uppercase tracking-wider ${active ? 'text-emerald-700' : 'text-rose-700'}`}>
            {active ? 'using' : 'unused'}
          </span>
        </span>
      </div>
      <div className="text-[10.5px] text-slate-600 italic">{note}</div>
    </div>
  )
}
