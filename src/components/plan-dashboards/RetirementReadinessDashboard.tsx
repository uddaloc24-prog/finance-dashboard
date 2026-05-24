// Retirement Readiness — "can I retire?" answered in one screen.
// Required corpus vs current corpus, sustainability, Monte-Carlo-style
// success heuristic, Ready-at-age verdict.

import type { UserProfile, BucketState } from '../../types'
import { totalCorpus } from '../../lib/calculations'
import { blendedReturn } from '../../lib/blendedReturn'
import { DownloadRow } from './NetWorthDashboard'
import { useState } from 'react'
import type { ExportFormat } from '../../lib/exporters'
import { exportReport } from '../../lib/exporters'
import { storage } from '../../lib/storage'

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

/** Present value of N years of monthly withdrawals growing at inflation,
 *  discounted at the portfolio's nominal return. Closed-form FV-of-annuity
 *  rearranged to PV. Returns INR. */
function requiredCorpus(monthly: number, years: number, nominalReturn: number, inflation: number): number {
  if (monthly <= 0 || years <= 0) return 0
  // Real return per year (Fisher)
  const realAnnual = (1 + nominalReturn / 100) / (1 + inflation / 100) - 1
  const r = realAnnual / 12
  const n = years * 12
  // Present value of an annuity-due
  if (Math.abs(r) < 1e-9) return monthly * n
  return monthly * (1 - Math.pow(1 + r, -n)) / r * (1 + r)
}

export function RetirementReadinessDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [exportErr, setExportErr] = useState<string | null>(null)

  const currentAge = profile.demographics?.currentAge ?? 60
  const retireAge  = profile.demographics?.retirementAge ?? 60
  const lifeExp    = profile.demographics?.lifeExpectancy ?? 88
  const yearsToRetirement = Math.max(0, retireAge - currentAge)
  const retirementHorizon = Math.max(1, lifeExp - retireAge)

  const monthly = profile.monthlyWithdrawal ?? 0
  const inflation = profile.inflationRate ?? 6
  // Blended nominal return read from user's actual ReturnAssumptions
  // weighted by their bucket allocation. Stays in sync if either changes.
  const nominalReturn = blendedReturn(storage.getReturnAssumptions(), profile.bucketAllocation)

  const target = requiredCorpus(monthly, retirementHorizon, nominalReturn, inflation)
  const current = totalCorpus(buckets) || profile.corpus || 0
  // Project current corpus forward to retirement at nominal return
  const projectedAtRetire = yearsToRetirement > 0
    ? current * Math.pow(1 + nominalReturn / 100, yearsToRetirement)
    : current

  const gap = target - projectedAtRetire
  const adequacy = target > 0 ? Math.min(120, (projectedAtRetire / target) * 100) : 0
  const verdict =
    adequacy >= 100 ? { label: 'ON TRACK',     color: '#16a34a' } :
    adequacy >= 80  ? { label: 'CLOSE — TUNE', color: '#84cc16' } :
    adequacy >= 60  ? { label: 'STRETCHED',    color: '#f59e0b' } :
                      { label: 'AT RISK',      color: '#dc2626' }

  // Runway at current burn (if already retiring today)
  const runwayYrs = monthly > 0 ? current / (monthly * 12) : Infinity

  // Heuristic success rate (simplified, not Monte-Carlo):
  // adequacy 100 = ~80%, 120 = ~90%, 80 = ~65%, 60 = ~50%, 40 = ~30%
  const successRate = Math.max(0, Math.min(98, Math.round(adequacy * 0.75 + 5)))

  // Ready at age
  const readyAt = (() => {
    if (adequacy >= 100) return retireAge
    // Project how many extra years of nominal growth needed
    if (projectedAtRetire <= 0 || target <= 0) return retireAge + 5
    const extra = Math.log(target / Math.max(1, projectedAtRetire)) / Math.log(1 + nominalReturn / 100)
    return Math.round(retireAge + Math.max(0, extra))
  })()

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
      {/* Verdict band */}
      <div className="rounded-lg p-4 text-center" style={{ background: `linear-gradient(180deg, ${verdict.color}22, ${verdict.color}10)`, border: `2px solid ${verdict.color}33` }}>
        <div className="text-[10px] font-bold tracking-[3px] uppercase" style={{ color: verdict.color }}>Verdict</div>
        <div className="font-serif text-3xl sm:text-4xl font-extrabold mt-1" style={{ color: verdict.color }}>{verdict.label}</div>
        <div className="text-sm text-slate-700 mt-1">
          Ready at <strong>age {readyAt}</strong> · adequacy <strong>{Math.round(adequacy)}%</strong> · success heuristic <strong>{successRate}%</strong>
        </div>
      </div>

      {/* Numbers — "Current corpus" tile moved to Net Worth (canonical) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Kpi label="Projected at retire"   value={fmtINR(projectedAtRetire)} sub={`+${yearsToRetirement}y · ${nominalReturn.toFixed(1)}% nominal`} />
        <Kpi label="Required corpus"       value={fmtINR(target)} sub={`${retirementHorizon}y horizon · ${inflation}% infl`} />
        <Kpi label={gap > 0 ? 'Gap (short by)' : 'Surplus'} value={fmtINR(Math.abs(gap))} tone={gap > 0 ? 'rose' : 'emerald'} />
      </div>

      {/* Adequacy bar */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <div className="flex items-baseline justify-between mb-1.5">
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Adequacy</h4>
          <span className="text-[11px] tabular-nums text-slate-700"><strong>{Math.round(adequacy)}%</strong> of target</span>
        </div>
        <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div className="absolute inset-y-0 left-0 bg-rose-200" style={{ width: '60%' }} />
          <div className="absolute inset-y-0 bg-amber-200" style={{ left: '60%', width: '20%' }} />
          <div className="absolute inset-y-0 bg-lime-200" style={{ left: '80%', width: '20%' }} />
          <div className="absolute inset-y-0 bg-emerald-500" style={{ width: `${Math.min(100, adequacy)}%`, opacity: 0.85 }} />
          <div className="absolute inset-y-0" style={{ left: `${Math.min(100, adequacy)}%` }}>
            <div className="w-0.5 h-full" style={{ background: verdict.color }} />
          </div>
        </div>
        <div className="flex justify-between text-[9px] text-slate-500 tabular-nums mt-1">
          <span>0</span><span>60</span><span>80</span><span>100%</span>
        </div>
      </section>

      {/* Runway & ages */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3 space-y-2">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Timeline</h4>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div className="text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Now</div>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">{currentAge}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Retire</div>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">{retireAge}</div>
            <div className="text-[10px] text-slate-500">{yearsToRetirement}y to go</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Plan to</div>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">{lifeExp}</div>
            <div className="text-[10px] text-slate-500">{retirementHorizon}y in retirement</div>
          </div>
        </div>
      </section>

      {/* Observations — lens-specific only */}
      <section className="rounded-md border-2 border-slate-200 bg-slate-50/40 p-3">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-1.5">Observations</h4>
        <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
          {adequacy >= 100 && <li>● Projected corpus meets the inflation-adjusted target.</li>}
          {adequacy >= 80 && adequacy < 100 && <li>● Within striking distance of the target ({Math.round(adequacy)}%).</li>}
          {adequacy >= 60 && adequacy < 80 && <li>● Adequacy is stretched ({Math.round(adequacy)}%) — multiple levers needed.</li>}
          {adequacy < 60 && <li>● Material gap — adequacy {Math.round(adequacy)}%.</li>}
          {monthly === 0 && <li>● Withdrawal target is ₹0 — set it under Profile & Settings.</li>}
          <li>● Today's burn-only runway (no returns) ≈ <strong>{runwayYrs === Infinity ? '∞' : `${runwayYrs.toFixed(1)} yrs`}</strong>.</li>
          <li>● Inputs: corpus = Step 01, withdrawal = Profile, inflation = Step 05, horizon = Step 04, return = blended from Step 04 Profile.</li>
        </ul>
      </section>

      <DownloadRow busy={busy} onExport={handleExport} err={exportErr} profile={profile} buckets={buckets} />
    </section>
  )
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'emerald' | 'rose' }) {
  const fg = tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : 'text-slate-900'
  return (
    <div className="rounded-md border-2 border-slate-200 bg-white px-2.5 py-2">
      <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-slate-500">{label}</div>
      <div className={`text-base font-extrabold tabular-nums mt-0.5 leading-tight ${fg}`}>{value}</div>
      {sub && <div className="text-[9px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}
