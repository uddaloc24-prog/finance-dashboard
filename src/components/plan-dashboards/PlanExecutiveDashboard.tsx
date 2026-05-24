// Plan Executive Dashboard — orchestrates every Plan-tab input (the
// six wheel steps + Profile & Settings) into a single command surface:
//
//   1. Plan Health Score  — composite 0-100 with sub-score breakdown
//   2. Compass            — strategic posture across 4 axes (growth /
//                           protection / liquidity / efficiency)
//   3. Step Pulse         — 6 step cards with status dot + headline metric
//   4. Action Priorities  — ranked top 5 actions with effort × impact
//   5. Strategic Direction — 3 next-quarter plays + 3 long-arc moves
//
// NO Profile-tab data (psychometric quiz, Goal Discovery, v10) is used —
// this is purely a synthesis of Plan inputs.

import type { UserProfile, BucketState, AssetEntry, LoanEntry, InsuranceEntry } from '../../types'
import type { FitAction } from '../../types/orchestration'
import { totalCorpus } from '../../lib/calculations'
import { blendedReturn } from '../../lib/blendedReturn'
import { useFittedStrategy } from '../../hooks/useFittedStrategy'
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

// ─── Sub-score calculators ────────────────────────────────────────────

interface SubScore { key: string; label: string; score: number; note: string; tone: string }

function computeSubScores(profile: UserProfile, buckets: BucketState): SubScore[] {
  const inv = (profile.assetInventory ?? {}) as Record<string, AssetEntry>
  const totalAssets = Object.values(inv).reduce((s, e) => s + (e?.amount || 0), 0) || profile.corpus || 0
  const lp = profile.loanProfile
  const loans = lp ? (Object.entries(lp).filter(([k]) => k !== 'strategy') as Array<[string, LoanEntry]>).filter(([, l]) => l?.active) : []
  const liabilities = loans.reduce((s, [, l]) => s + (l.outstanding || 0), 0)
  const totalEMI = loans.reduce((s, [, l]) => s + (l.emi || 0), 0)
  const exp = profile.expenses
  const monthlyBurn = exp ? (exp.essential ?? 0) + (exp.lifestyle ?? 0) + (exp.healthcare ?? 0) + (exp.education ?? 0) : 0
  const passive = Object.values(inv).reduce((s, e) => s + (e?.monthlyIncome || 0), 0)
  const incomeProxy = (profile.monthlyWithdrawal ?? 0) + passive + (profile.sipAmount ?? 0)
  const liquidAssets = Object.values(inv).filter((e) => e?.status === 'liquid').reduce((s, e) => s + (e.amount || 0), 0)
  const corpus = totalCorpus(buckets) || totalAssets || 0
  const ins = profile.insuranceCover
  const age = profile.demographics?.currentAge ?? 60
  const lifeExp = profile.demographics?.lifeExpectancy ?? 88
  const retireAge = profile.demographics?.retirementAge ?? 60

  // 1. Net worth solvency
  const netWorth = totalAssets - liabilities
  const solvency = netWorth <= 0 ? 0 : Math.min(100, (netWorth / Math.max(1, totalAssets)) * 100)

  // 2. Cash flow surplus
  const surplus = incomeProxy - monthlyBurn - totalEMI
  const cashflow = surplus >= 0
    ? Math.min(100, 60 + (surplus / Math.max(1, monthlyBurn)) * 40)
    : Math.max(0, 50 + (surplus / Math.max(1, monthlyBurn)) * 50)

  // 3. Liquidity / runway
  const runway = monthlyBurn > 0 ? liquidAssets / monthlyBurn : 24
  const liquidity = Math.min(100, (runway / 12) * 100)

  // 4. Debt burden (inverted DTI)
  const dti = incomeProxy > 0 ? (totalEMI / incomeProxy) * 100 : 0
  const debt = liabilities === 0 ? 100 : Math.max(0, 100 - dti * 1.5)

  // 5. Retirement adequacy — uses the user's blended return assumption
  const horizon = Math.max(1, lifeExp - retireAge)
  const yearsTo = Math.max(0, retireAge - age)
  const nominalReturn = blendedReturn(storage.getReturnAssumptions(), profile.bucketAllocation) / 100
  const required = (profile.monthlyWithdrawal ?? 0) * 12 * horizon * 0.6  // rough PV proxy
  const projected = corpus * Math.pow(1 + nominalReturn, yearsTo)
  const adequacy = required > 0 ? Math.min(120, (projected / required) * 100) : 0
  const retirement = Math.min(100, adequacy)

  // 6. Protection (insurance)
  const healthCover = (['familyFloater', 'personalHealth', 'superTopUp', 'seniorCitizen'] as const)
    .map((k) => ins?.[k]).filter((e): e is InsuranceEntry => !!e?.active).reduce((s, e) => s + e.cover, 0)
  const lifeCover = (ins?.termPlan?.active ? ins.termPlan.cover : 0) + (ins?.wholeLife?.active ? ins.wholeLife.cover : 0)
  const healthScore = Math.min(100, (healthCover / Math.max(1, 1_500_000)) * 100)
  const lifeScore = age >= 70 ? 100 : Math.min(100, (lifeCover / Math.max(1, 8_000_000)) * 100)
  const ciBonus = ins?.criticalIllness?.active ? 10 : 0
  const mwpBonus = ins?.termPlan?.mwp ? 10 : 0
  const protection = Math.min(100, (healthScore + lifeScore) / 2 + ciBonus + mwpBonus)

  // 7. Diversification (concentration penalty)
  const sorted = Object.values(inv).map((e) => e?.amount || 0).sort((a, b) => b - a)
  const top3 = sorted.slice(0, 3).reduce((s, v) => s + v, 0)
  const top3Share = totalAssets > 0 ? (top3 / totalAssets) * 100 : 0
  const diversification = Math.max(0, 100 - (top3Share - 50))

  // 8. Tax discipline (NPS + 80D + senior 80TTB usage flags)
  const has80C = ((inv.ppf?.amount ?? 0) + (inv.epfVpf?.amount ?? 0) + (inv.sukanya?.amount ?? 0)) > 0
  const hasNps = (inv.npsTier1?.amount ?? 0) > 0
  const has80D = !!ins?.familyFloater?.active || !!ins?.personalHealth?.active
  const taxScore = (has80C ? 40 : 0) + (hasNps ? 30 : 0) + (has80D ? 30 : 0)

  return [
    { key: 'solvency',      label: 'Solvency',        score: solvency,       note: `Net worth ${fmtINR(netWorth)}`,        tone: '#10b981' },
    { key: 'cashflow',      label: 'Cash flow',       score: cashflow,       note: `${surplus >= 0 ? '+' : ''}${fmtINR(surplus)}/mo`, tone: '#22d3ee' },
    { key: 'liquidity',     label: 'Liquidity',       score: liquidity,      note: `${runway.toFixed(1)}m runway`,          tone: '#3b82f6' },
    { key: 'debt',          label: 'Debt discipline', score: debt,           note: liabilities ? `${dti.toFixed(0)}% DTI` : 'debt-free', tone: '#f59e0b' },
    { key: 'retirement',    label: 'Retirement',      score: retirement,     note: `Adequacy ${Math.round(adequacy)}%`,     tone: '#6366f1' },
    { key: 'protection',    label: 'Protection',      score: protection,     note: `Health ${fmtINR(healthCover)}`,          tone: '#a855f7' },
    { key: 'diversification', label: 'Diversification', score: diversification, note: `Top 3 = ${Math.round(top3Share)}%`,   tone: '#ec4899' },
    { key: 'tax',           label: 'Tax efficiency',  score: taxScore,       note: `${[has80C && '80C', hasNps && 'NPS', has80D && '80D'].filter(Boolean).join(' · ') || 'unused'}`, tone: '#eab308' },
  ]
}

// ─── Action mapping ───────────────────────────────────────────────────
//
// The orchestration engine's Strategy Fitter (Phase 6) is now the
// single source for actions. This dashboard maps each FitAction into
// the impact × effort framing the cockpit uses.

interface Action { priority: number; impact: 'high' | 'medium' | 'low'; effort: 'small' | 'medium' | 'large'; title: string; rationale: string }

function actionsFromFit(fitActions: FitAction[]): Action[] {
  return fitActions.slice(0, 5).map((a, i) => ({
    priority: i + 1,
    impact:  a.category === 'reserve' || a.category === 'flag' ? 'high'
           : a.category === 'sip'                                ? 'high'
           : a.category === 'rebalance' || a.category === 'allocate' ? 'medium'
           : 'low',
    effort: a.category === 'reserve' || a.category === 'sip' ? 'medium'
          : a.category === 'rebalance'                        ? 'small'
          : 'medium',
    title: a.title,
    rationale: a.detail,
  }))
}

// ─── Component ────────────────────────────────────────────────────────

export function PlanExecutiveDashboard({ profile, buckets }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const scores = computeSubScores(profile, buckets)
  const overall = Math.round(scores.reduce((s, sc) => s + sc.score, 0) / scores.length)
  const verdict =
    overall >= 80 ? { label: 'STRONG',     tone: '#16a34a', sub: 'Tune annually — no urgent moves needed.' } :
    overall >= 65 ? { label: 'STEADY',     tone: '#84cc16', sub: 'A few tactical fixes will move the needle.' } :
    overall >= 50 ? { label: 'STRETCHED',  tone: '#f59e0b', sub: 'Material gaps — execute the action list this quarter.' } :
                    { label: 'AT RISK',    tone: '#dc2626', sub: 'Foundation gaps — protection + cash flow first, then optimise.' }

  // Engine-driven actions (Phase 7 wiring)
  const { fit } = useFittedStrategy(profile, buckets)
  const actions = actionsFromFit(fit.actions)
  const strategic = buildStrategicPlays(scores, profile)
  const longArc = buildLongArc(profile)

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setErr(null)
    try { await exportReport(fmt, { identity: storage.getIdentity(), profile, buckets, returnAssumptions: storage.getReturnAssumptions() }) }
    catch (e) { setErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`) }
    finally { setBusy(null) }
  }

  return (
    <section className="space-y-3">
      {/* ── 1. PLAN HEALTH SCORE — big verdict band + score gauge ── */}
      <div className="rounded-xl p-4 sm:p-5" style={{ background: `linear-gradient(135deg, ${verdict.tone}18, ${verdict.tone}05)`, border: `2px solid ${verdict.tone}40` }}>
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
          <ScoreDial score={overall} color={verdict.tone} />
          <div>
            <div className="text-[10px] font-bold tracking-[3px] uppercase" style={{ color: verdict.tone }}>Plan Health Score</div>
            <div className="font-serif text-3xl sm:text-4xl font-extrabold mt-1" style={{ color: verdict.tone }}>{verdict.label}</div>
            <div className="text-sm text-slate-700 mt-1">{verdict.sub}</div>
            <div className="text-[11px] text-slate-500 mt-2 italic">
              Composite across 8 sub-scores derived from the six Plan steps + Profile & Settings.
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. COMPASS — 8-axis radial bar ── */}
      <section className="rounded-md border-2 border-slate-200 bg-white p-3">
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Strategic posture · 8-axis</h4>
          <span className="text-[10px] text-slate-500 italic">scale 0-100</span>
        </div>
        <RadialBars scores={scores} />
      </section>

      {/* ── 3. STEP PULSE — six step cards + Profile ── */}
      <section>
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Step pulse — what each input is telling us</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {buildStepPulse(profile, buckets, scores).map((p) => (
            <StepCard key={p.key} pulse={p} />
          ))}
        </div>
      </section>

      {/* ── 4. ACTION PRIORITIES — engine-driven (Phase 7) ── */}
      <section className="rounded-md border-2 border-amber-200 bg-amber-50/40 p-3">
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-amber-800">Top action priorities</h4>
          <span className="text-[9px] font-bold tracking-[2px] uppercase bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5">engine-driven</span>
        </div>
        {actions.length === 0 ? (
          <div className="text-[12px] text-slate-700 italic">No high-priority actions identified — plan looks solid. Continue annual reviews.</div>
        ) : (
          <ul className="space-y-1.5 text-[11.5px]">
            {actions.map((a, i) => (
              <li key={i} className="grid grid-cols-[28px_1fr_auto] gap-3 items-baseline border-b border-amber-200/60 last:border-b-0 pb-1.5 last:pb-0">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-[11px] tabular-nums ${a.priority === 1 ? 'bg-rose-600 text-white' : a.priority === 2 ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white'}`}>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-[12px]">{a.title}</div>
                  <div className="text-[10.5px] text-slate-600 italic mt-0.5">{a.rationale}</div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <Tag txt={`${a.impact.toUpperCase()} impact`}  tone={a.impact === 'high' ? 'rose' : a.impact === 'medium' ? 'amber' : 'slate'} />
                  <Tag txt={`${a.effort} effort`} tone="slate" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 5. STRATEGIC DIRECTION — quarter plays + long arc ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <div className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-3">
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-emerald-800 mb-1.5">Next quarter · play list</h4>
          <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
            {strategic.map((s, i) => <li key={i}>● {s}</li>)}
          </ul>
        </div>
        <div className="rounded-md border-2 border-indigo-200 bg-indigo-50/40 p-3">
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-indigo-800 mb-1.5">Long arc · 2–5 year moves</h4>
          <ul className="text-[11px] text-slate-700 space-y-1 leading-snug">
            {longArc.map((s, i) => <li key={i}>● {s}</li>)}
          </ul>
        </div>
      </section>

      {/* ── 6. ORCHESTRATION FOOTER — data lineage ── */}
      <section className="rounded-md border border-slate-200 bg-slate-50/60 p-2.5">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1">Synthesised from</h4>
        <div className="flex flex-wrap gap-1.5">
          <Chip>01 · Wealth ({Object.keys(profile.assetInventory ?? {}).length} classes)</Chip>
          <Chip>02 · Loans ({profile.loanProfile ? Object.entries(profile.loanProfile).filter(([k, v]) => k !== 'strategy' && (v as LoanEntry)?.active).length : 0} active)</Chip>
          <Chip>03 · Budget ({fmtINR(((profile.expenses?.essential ?? 0) + (profile.expenses?.lifestyle ?? 0) + (profile.expenses?.healthcare ?? 0) + (profile.expenses?.education ?? 0)) * 12)}/yr)</Chip>
          <Chip>04 · Demographics ({profile.demographics?.currentAge ?? '?'}→{profile.demographics?.retirementAge ?? '?'})</Chip>
          <Chip>05 · Inflation ({profile.inflationRate ?? 6}%)</Chip>
          <Chip>06 · Insurance ({profile.insuranceCover ? Object.values(profile.insuranceCover).filter((e) => (e as InsuranceEntry)?.active).length : 0} policies)</Chip>
          <Chip>★ Profile (corpus {fmtINR(totalCorpus(buckets) || profile.corpus || 0)})</Chip>
        </div>
      </section>

      <DownloadRow busy={busy} onExport={handleExport} err={err} profile={profile} buckets={buckets} />
    </section>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────

function ScoreDial({ score, color }: { score: number; color: string }) {
  const cx = 70, cy = 70, R = 58, sw = 12
  const C = 2 * Math.PI * R
  const dash = (score / 100) * C
  return (
    <div className="relative w-[140px] h-[140px] mx-auto">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <circle cx={cx} cy={cy} r={R} stroke="#e2e8f0" strokeWidth={sw} fill="none" />
        <circle cx={cx} cy={cy} r={R} stroke={color} strokeWidth={sw} fill="none"
                strokeDasharray={`${dash} ${C - dash}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif text-3xl font-extrabold tabular-nums" style={{ color }}>{score}</div>
        <div className="text-[9px] font-bold tracking-[2px] uppercase text-slate-500">/ 100</div>
      </div>
    </div>
  )
}

function RadialBars({ scores }: { scores: SubScore[] }) {
  const N = scores.length, innerR = 36, maxBar = 60
  const cx = 130, cy = 130
  const slice = (2 * Math.PI) / N
  return (
    <svg viewBox="0 0 260 260" className="block w-full max-w-[260px] h-auto mx-auto">
      {/* concentric reference rings */}
      {[25, 50, 75, 100].map((p) => (
        <circle key={p} cx={cx} cy={cy} r={innerR + (p / 100) * maxBar} stroke="#e2e8f0" strokeWidth={0.5} fill="none" strokeDasharray="2 2" />
      ))}
      {/* bars */}
      {scores.map((s, i) => {
        const a0 = -Math.PI / 2 + i * slice + 0.04
        const a1 = -Math.PI / 2 + (i + 1) * slice - 0.04
        const r = innerR + (Math.min(100, s.score) / 100) * maxBar
        const x1 = cx + innerR * Math.cos(a0), y1 = cy + innerR * Math.sin(a0)
        const x2 = cx + r * Math.cos(a0),       y2 = cy + r * Math.sin(a0)
        const x3 = cx + r * Math.cos(a1),       y3 = cy + r * Math.sin(a1)
        const x4 = cx + innerR * Math.cos(a1), y4 = cy + innerR * Math.sin(a1)
        const large = slice > Math.PI ? 1 : 0
        const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x3.toFixed(2)} ${y3.toFixed(2)} L ${x4.toFixed(2)} ${y4.toFixed(2)} A ${innerR} ${innerR} 0 ${large} 0 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
        return <path key={i} d={d} fill={s.tone} opacity={0.85} />
      })}
      {/* axis labels */}
      {scores.map((s, i) => {
        const a = -Math.PI / 2 + (i + 0.5) * slice
        const lr = innerR + maxBar + 14
        const x = cx + lr * Math.cos(a), y = cy + lr * Math.sin(a)
        return (
          <g key={i}>
            <text x={x} y={y} textAnchor="middle" style={{ fontSize: 8, fontWeight: 800, fill: '#334155', letterSpacing: 1 }}>{s.label.toUpperCase()}</text>
            <text x={x} y={y + 9} textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: s.tone }}>{Math.round(s.score)}</text>
          </g>
        )
      })}
      {/* centre score */}
      <circle cx={cx} cy={cy} r={innerR - 2} fill="white" stroke="#cbd5e1" strokeWidth={1.5} />
      <text x={cx} y={cy + 5} textAnchor="middle" style={{ fontSize: 18, fontWeight: 900, fill: '#0f172a' }}>
        {Math.round(scores.reduce((s, sc) => s + sc.score, 0) / scores.length)}
      </text>
    </svg>
  )
}

interface StepPulse { key: string; num: string; title: string; status: 'good' | 'ok' | 'warn' | 'empty'; head: string; sub: string; tone: string }

function buildStepPulse(profile: UserProfile, buckets: BucketState, scores: SubScore[]): StepPulse[] {
  const inv = profile.assetInventory ?? {}
  const lp = profile.loanProfile
  const exp = profile.expenses
  const demo = profile.demographics
  const ins = profile.insuranceCover
  const assetCount = Object.values(inv).filter((e) => (e as AssetEntry)?.amount > 0).length
  const loanActive = lp ? Object.entries(lp).filter(([k]) => k !== 'strategy').filter(([, l]) => (l as LoanEntry)?.active).length : 0
  const burn = exp ? (exp.essential ?? 0) + (exp.lifestyle ?? 0) + (exp.healthcare ?? 0) + (exp.education ?? 0) : 0
  const insActive = ins ? Object.values(ins).filter((e) => (e as InsuranceEntry)?.active).length : 0
  const sScore = (k: string) => scores.find((s) => s.key === k)?.score ?? 0

  return [
    { key: '01', num: '01', title: 'Wealth',       tone: '#3b82f6', status: assetCount === 0 ? 'empty' : sScore('solvency') >= 70 ? 'good' : sScore('solvency') >= 40 ? 'ok' : 'warn',
      head: `${assetCount} asset classes`, sub: assetCount === 0 ? 'Add at least 3 asset classes' : `Net worth ${fmtINR((Object.values(inv) as AssetEntry[]).reduce((s, e) => s + (e?.amount || 0), 0))}` },
    { key: '02', num: '02', title: 'Loans',        tone: '#dc2626', status: !lp ? 'empty' : loanActive === 0 ? 'good' : sScore('debt') >= 70 ? 'good' : sScore('debt') >= 40 ? 'ok' : 'warn',
      head: loanActive === 0 ? 'Debt-free' : `${loanActive} active`, sub: scores.find((s) => s.key === 'debt')?.note ?? '' },
    { key: '03', num: '03', title: 'Budget',       tone: '#10b981', status: burn === 0 ? 'empty' : sScore('cashflow') >= 70 ? 'good' : sScore('cashflow') >= 40 ? 'ok' : 'warn',
      head: `${fmtINR(burn)}/mo`, sub: scores.find((s) => s.key === 'cashflow')?.note ?? '' },
    { key: '04', num: '04', title: 'Demographics', tone: '#f59e0b', status: !demo ? 'empty' : sScore('retirement') >= 80 ? 'good' : sScore('retirement') >= 50 ? 'ok' : 'warn',
      head: demo ? `Age ${demo.currentAge} → ${demo.retirementAge}` : '—', sub: demo ? `Horizon ${Math.max(0, demo.lifeExpectancy - demo.currentAge)}y` : 'Set ages' },
    { key: '05', num: '05', title: 'Inflation',    tone: '#ec4899', status: profile.inflationRate ? 'good' : 'empty',
      head: `${profile.inflationRate ?? 6}% general`, sub: 'Healthcare ~8.5% · Education ~10%' },
    { key: '06', num: '06', title: 'Insurance',    tone: '#a855f7', status: insActive === 0 ? 'warn' : sScore('protection') >= 70 ? 'good' : 'ok',
      head: `${insActive} policies`, sub: scores.find((s) => s.key === 'protection')?.note ?? '' },
    { key: 'profile', num: '★', title: 'Profile & Settings', tone: '#6366f1', status: 'good',
      head: `Corpus ${fmtINR(totalCorpus(buckets) || profile.corpus || 0)}`, sub: `Tax ${profile.taxBracket}% · Risk ${profile.riskAppetite}/5` },
  ]
}

function StepCard({ pulse }: { pulse: StepPulse }) {
  const statusColor = pulse.status === 'good' ? '#16a34a' : pulse.status === 'ok' ? '#84cc16' : pulse.status === 'warn' ? '#dc2626' : '#94a3b8'
  return (
    <div className="rounded-md border-2 border-slate-200 bg-white p-2.5 flex items-start gap-2.5">
      <span className="shrink-0 w-9 h-9 rounded-md flex items-center justify-center font-serif font-extrabold text-sm tabular-nums"
            style={{ background: `${pulse.tone}18`, color: pulse.tone, border: `2px solid ${pulse.tone}55` }}>
        {pulse.num}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span className="font-serif italic text-[13px] font-extrabold text-slate-900 leading-tight">{pulse.title}</span>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider tabular-nums" style={{ color: statusColor }}>
            <span className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
            {pulse.status}
          </span>
        </div>
        <div className="text-[12px] font-bold text-slate-900 tabular-nums">{pulse.head}</div>
        <div className="text-[10.5px] text-slate-500 leading-snug mt-0.5">{pulse.sub}</div>
      </div>
    </div>
  )
}

function Tag({ txt, tone }: { txt: string; tone: 'rose' | 'amber' | 'slate' }) {
  const bg = tone === 'rose' ? 'bg-rose-100 text-rose-700' : tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
  return <span className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 whitespace-nowrap ${bg}`}>{txt}</span>
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-semibold text-slate-700 bg-white border border-slate-200 rounded px-2 py-0.5 whitespace-nowrap">{children}</span>
}

// ─── Strategy generators ──────────────────────────────────────────────

function buildStrategicPlays(scores: SubScore[], profile: UserProfile): string[] {
  const by = Object.fromEntries(scores.map((s) => [s.key, s.score]))
  const out: string[] = []
  if (by.liquidity < 50) out.push('Pump emergency fund to 6× monthly burn this quarter (any liquid MF/sweep FD).')
  if (by.protection < 70 && profile.insuranceCover?.termPlan?.active !== true) out.push('Take quotes for ₹80L-1.25Cr MWP-tagged term plan before next birthday.')
  if (by.tax < 70) out.push('Plug ONE tax gap before FY end: max 80C, add 80CCD(1B) NPS, or top up health cover for 80D.')
  if (by.debt < 50) out.push('Reroute next 3 months of SIP toward the highest-rate loan (Avalanche).')
  if (by.cashflow < 50) out.push('Cut ONE lifestyle category by 15% AND audit subscriptions — small wins compound.')
  if (out.length === 0) out.push('Continue current SIP cadence; annual review covers all maintenance items.')
  return out.slice(0, 4)
}

function buildLongArc(profile: UserProfile): string[] {
  const out: string[] = []
  const age = profile.demographics?.currentAge ?? 60
  const retireAge = profile.demographics?.retirementAge ?? 60
  const yearsLeft = retireAge - age

  if (yearsLeft > 5) out.push(`Map a 2-year glide-path: shift equity → BAF → conservative hybrid as you approach ${retireAge}.`)
  if (yearsLeft > 0) out.push('Lock SCSS at age 60 (₹30L cap), open SCSS for spouse at age 60 (another ₹30L).')
  if (age < 70) out.push('Re-evaluate health cover at 60: senior-specific plans price in only post-60 once locked.')
  out.push('Set 3-year will & nominee review reminder; refresh after any major life event.')
  out.push('Test the 4-bucket cascade in a market drawdown (paper) before live deployment.')
  return out.slice(0, 4)
}
