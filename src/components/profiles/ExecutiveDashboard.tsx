// Executive Dashboard — the user's "financial cockpit".
// One-screen overview that summarises every other dashboard:
//   - KPI tiles (Net Worth · Liabilities · Runway · Ready-at · Risk Profile · Goal Clarity)
//   - Overall Health composite with band indicator
//   - 10-item score breakdown bars
//   - Goal cards (P1, P2, …) with horizon / target / SIP / tilt
//   - Top action items
//   - Download row (same exporters as the other dashboards)

import { useState } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions, AssetEntry, LoanEntry } from '../../types'
import type { GoalDiscoveryState, V10QuizState } from '../../types/psychometric'
import type { QuizState } from '../../types/profiles'
import { storage } from '../../lib/storage'
import { downloadV10Json } from '../../lib/exporters/v10Json'
import { exportReport, FORMATS, type ExportFormat } from '../../lib/exporters'
import { deriveRiskCapacity } from '../../lib/psychometric/capacityInputs'
import { GD_GOAL_TYPES } from '../../lib/data/goalDiscovery'

interface Props {
  userProfile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
  gdState: GoalDiscoveryState | null
  v10State: V10QuizState | null
  quizState: QuizState | null
  deepRiskPercent: number | null
}

// ─── Money formatters ──────────────────────────────────────────────────

function fmtINR(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(1)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)}k`
  return `${sign}₹${Math.round(abs)}`
}

// ─── Calculation primitives ────────────────────────────────────────────

function sumAssets(p: UserProfile, predicate?: (a: AssetEntry) => boolean): number {
  if (!p.assetInventory) return 0
  const entries = Object.values(p.assetInventory) as AssetEntry[]
  return entries.filter((e) => e && (predicate ? predicate(e) : true)).reduce((s, e) => s + (e.amount || 0), 0)
}

function sumLoanOutstanding(p: UserProfile): number {
  if (!p.loanProfile) return 0
  const { strategy: _s, ...rest } = p.loanProfile
  void _s
  const entries = Object.values(rest) as LoanEntry[]
  return entries.filter((l) => l && l.active).reduce((s, l) => s + (l.outstanding || 0), 0)
}

// Map GD goal-amount string to a midpoint rupee value
const AMOUNT_MIDPOINT: Record<string, number> = {
  lt10L:    5_00_000,
  '10L_25L':  17_50_000,
  '25L_50L':  37_50_000,
  '50L_1Cr':  75_00_000,
  '1Cr_2Cr':  1_50_00_000,
  '2Cr_5Cr':  3_50_00_000,
  '5Cr_plus': 6_00_00_000,
  dontknow:   0,
}

const HORIZON_YEARS: Record<string, number> = {
  lt5:      3,
  '5_10':   7,
  '10_15': 12,
  '15_20': 17,
  '20_25': 22,
  '25_plus': 27,
  unsure:    0,
}

// SIP needed (simplified future-value) — solve for monthly amount that reaches target over years
function requiredSip(targetINR: number, years: number, annualReturnPct = 10): number {
  if (years <= 0 || targetINR <= 0) return 0
  const r = annualReturnPct / 100 / 12
  const n = years * 12
  // FV of monthly SIP = sip × ((1+r)^n − 1) / r × (1+r)
  const factor = ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
  return Math.round(targetINR / factor)
}

function horizonTilt(years: number): { label: string; color: string } {
  if (years <= 0)       return { label: 'Liquid',       color: '#3b82f6' }
  if (years < 3)        return { label: 'Conservative', color: '#0ea5e9' }
  if (years < 8)        return { label: 'Moderate',     color: '#10b981' }
  if (years < 15)       return { label: 'Growth',       color: '#84cc16' }
  return                       { label: 'Equity',       color: '#8b5cf6' }
}

// ─── Health bands ──────────────────────────────────────────────────────

interface BandInfo { label: string; color: string }
function bandFor(score: number): BandInfo {
  if (score < 20)  return { label: 'AT RISK',     color: '#dc2626' }
  if (score < 60)  return { label: 'DEVELOPING',  color: '#f59e0b' }
  if (score < 80)  return { label: 'STRONG',      color: '#65a30d' }
  return                  { label: 'OPTIMAL',     color: '#16a34a' }
}

// ─── KPI tile ──────────────────────────────────────────────────────────

function Kpi({
  icon, label, value, sub,
}: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border-2 border-slate-200 bg-white px-2.5 py-2 text-center">
      <div className="text-xl leading-none mb-0.5" aria-hidden="true">{icon}</div>
      <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-slate-500">{label}</div>
      <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5 leading-tight">{value}</div>
      {sub && <div className="text-[9px] text-slate-500 mt-0.5 leading-tight">{sub}</div>}
    </div>
  )
}

// ─── Score breakdown bar ───────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const isNull = value == null
  const pct = isNull ? 0 : Math.max(0, Math.min(100, value))
  const fill = isNull ? '#cbd5e1' : pct < 20 ? '#dc2626' : pct < 60 ? '#f59e0b' : pct < 80 ? '#65a30d' : '#16a34a'
  return (
    <div className="grid grid-cols-[1fr_28px] gap-2 items-center">
      <div>
        <div className="flex items-baseline justify-between text-[10px] mb-0.5">
          <span className={isNull ? 'text-slate-400' : 'text-slate-700'}>{label}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full" style={{ width: `${pct}%`, background: fill }} />
        </div>
      </div>
      <div className="text-[11px] tabular-nums font-semibold text-right" style={{ color: isNull ? '#94a3b8' : '#0f172a' }}>
        {isNull ? '—' : Math.round(pct)}
      </div>
    </div>
  )
}

// ─── Executive Dashboard ───────────────────────────────────────────────

export function ExecutiveDashboard({
  userProfile, buckets, returnAssumptions, gdState, v10State, quizState,
}: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [exportErr, setExportErr] = useState<string | null>(null)

  // ── Identity + horizon ─────────────────────────────────────────────
  const identity = storage.getIdentity()
  const userName = identity?.fullName?.trim() || 'You'
  const currentAge = userProfile.demographics?.currentAge ?? 60
  const retirementAge = userProfile.demographics?.retirementAge ?? 60
  const horizon = Math.max(0, retirementAge - currentAge)
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  // ── Money KPIs ─────────────────────────────────────────────────────
  const grossAssets = sumAssets(userProfile)
  const liabilities = sumLoanOutstanding(userProfile)
  const netWorth = grossAssets - liabilities
  const liabilityPctOfAssets = grossAssets > 0 ? (liabilities / grossAssets) * 100 : (liabilities > 0 ? Infinity : 0)
  const liquidCorpus = sumAssets(userProfile, (a) => a.status === 'liquid')
  const monthlyBurn = userProfile.monthlyWithdrawal ?? 0
  const runwayYrs = monthlyBurn > 0 ? liquidCorpus / (monthlyBurn * 12) : Infinity

  // ── Composite scores (0–100) ───────────────────────────────────────
  const capacityInputs = deriveRiskCapacity(userProfile)
  const capacityScore = (
    Math.min(100, capacityInputs.savingsRate * 100 * 2.5) +
    Math.max(0, 100 - capacityInputs.debtToIncome * 100 * 1.8) +
    Math.min(100, capacityInputs.emergencyMonths * 15)
  ) / 3
  const appetiteScore = ((userProfile.riskAppetite - 1) / 4) * 100
  const profileScore = v10State?.composites?.riskProfile
    ?? (quizState?.completed ? ((quizState.totalScore - 10) / 40) * 100 : 0.5 * appetiteScore + 0.5 * capacityScore)
  const cognitiveBias = v10State?.composites ? Math.max(0, 100 - v10State.composites.biasIndex) : null
  const scamResilience = v10State?.composites ? Math.max(0, 100 - v10State.composites.scamVulnerability) : null

  // Net worth score: positive net worth → scaled to 1 Cr = 100; negative → 0
  const netWorthScore = netWorth <= 0 ? 0 : Math.min(100, (netWorth / 1_00_00_000) * 100)
  // Debt freedom: low DTI = high score
  const debtFreedomScore = Math.max(0, Math.min(100, 100 - capacityInputs.debtToIncome * 100 * 1.8))
  // Money Health: savings rate × scale
  const moneyHealthScore = Math.min(100, capacityInputs.savingsRate * 100 * 2.5)

  // ── Goal Clarity (from GD) ─────────────────────────────────────────
  const goals: Array<{ name: string; type: string; amount: string; horizon: string; priority: string }> = (() => {
    const raw = gdState?.answers['block-1']?.['goals']
    return Array.isArray(raw) && typeof raw[0] === 'object' ? (raw as unknown as typeof goals) : []
  })()
  const namedGoals = goals.filter((g) => g.name.trim().length > 0)
  function goalClarityFor(g: typeof goals[number]): number {
    const have = [g.name.trim().length > 0, !!g.type, !!g.amount && g.amount !== 'dontknow', !!g.horizon && g.horizon !== 'unsure', !!g.priority].filter(Boolean).length
    return (have / 5) * 100
  }
  const goalClarityScore = namedGoals.length === 0 ? 0
    : namedGoals.reduce((s, g) => s + goalClarityFor(g), 0) / namedGoals.length
  const goalClarityBand = goalClarityScore < 25 ? 'Broad' : goalClarityScore < 60 ? 'Forming' : goalClarityScore < 85 ? 'Defined' : 'Sharp'

  // ── Spousal Alignment ──────────────────────────────────────────────
  let spousalScore: number | null = null
  const partner = gdState?.answers['block-5']?.['applicable'] as string | undefined
  if (partner === 'yes' || partner === 'partial') {
    if (gdState?.inference?.partnerDivergence) {
      spousalScore = gdState.inference.partnerDivergence.diverged ? 40 : 90
    } else {
      spousalScore = 60   // applicable but no divergence data
    }
  } else if (partner === 'no') {
    spousalScore = null   // not applicable
  }

  // ── Overall Health composite ───────────────────────────────────────
  const subScores: Array<{ key: string; label: string; value: number | null }> = [
    { key: 'netWorth',       label: 'Net Worth',         value: netWorthScore },
    { key: 'debtFreedom',    label: 'Debt Freedom',      value: debtFreedomScore },
    { key: 'profile',        label: 'Risk Profile',      value: profileScore },
    { key: 'appetite',       label: 'Risk Appetite',     value: appetiteScore },
    { key: 'capacity',       label: 'Risk Capacity',     value: capacityScore },
    { key: 'cognitiveBias',  label: 'Cognitive Bias',    value: cognitiveBias },
    { key: 'scamResilience', label: 'Scam Resilience',   value: scamResilience },
    { key: 'goalClarity',    label: 'Goal Clarity',      value: goalClarityScore },
    { key: 'moneyHealth',    label: 'Money Health',      value: moneyHealthScore },
    { key: 'spousal',        label: 'Spousal Alignment', value: spousalScore },
  ]
  const known = subScores.filter((s) => s.value != null) as Array<{ key: string; label: string; value: number }>
  const healthScore = known.length === 0 ? 0 : Math.round(known.reduce((s, x) => s + x.value, 0) / known.length)
  const healthBand = bandFor(healthScore)

  // ── Readiness ──────────────────────────────────────────────────────
  const readyAt = !v10State?.completed ? '—' : (
    profileScore >= 60 ? `${retirementAge}` : `${retirementAge + 3}+`
  )
  const readinessSub = !v10State?.completed ? 'finish questionnaire' : profileScore >= 60 ? 'at target age' : 'small delay likely'

  // ── Profile label ──────────────────────────────────────────────────
  const profileLabel =
    profileScore < 20 ? 'Ultra-Conservative' :
    profileScore < 40 ? 'Conservative' :
    profileScore < 60 ? 'Moderate' :
    profileScore < 80 ? 'Growth-Oriented' : 'Aggressive'

  // ── Top action items (rule-driven, short list) ─────────────────────
  interface Action { icon: string; tag: string; text: string }
  const actions: Action[] = []
  // P1 / P2 / … from goals
  namedGoals.slice(0, 3).forEach((g, i) => {
    const targetINR = AMOUNT_MIDPOINT[g.amount] ?? 0
    const years = HORIZON_YEARS[g.horizon] ?? 0
    const sip = requiredSip(targetINR, years)
    const tilt = horizonTilt(years)
    actions.push({
      icon: '📈',
      tag: `P${i + 1}`,
      text: `${g.name} — ${fmtINR(sip)}/mo for ${years || 0} years targets ${fmtINR(targetINR)}. Anchor band: ${tilt.label}.`,
    })
  })
  if (goalClarityScore < 60) {
    actions.push({
      icon: '💡', tag: 'T',
      text: 'Sharpen goals — set a specific corpus target and date for your top goal before next quarter.',
    })
  }
  if (cognitiveBias != null && cognitiveBias < 50) {
    actions.push({
      icon: '🛡️', tag: 'B',
      text: 'High cognitive-bias index — slow down major decisions, document the rationale, sleep on it 48 h.',
    })
  }
  if (scamResilience != null && scamResilience < 50) {
    actions.push({
      icon: '🚨', tag: 'S',
      text: 'Scam-vulnerability flag — verify every new scheme on sebi.gov.in/Intermediaries before any money moves.',
    })
  }
  if (!v10State?.completed) {
    actions.push({ icon: '📝', tag: 'A', text: 'Finish the v10 psychometric assessment to unlock the full readiness verdict.' })
  }

  // ── Goal "P1 / P2" card data ───────────────────────────────────────
  const goalCards = namedGoals.slice(0, 4).map((g, i) => {
    const targetINR = AMOUNT_MIDPOINT[g.amount] ?? 0
    const years = HORIZON_YEARS[g.horizon] ?? 0
    return {
      tag: `P${i + 1}`,
      name: g.name,
      typeLabel: GD_GOAL_TYPES.find((t) => t.value === g.type)?.label ?? g.type,
      years,
      target: targetINR,
      sip: requiredSip(targetINR, years),
      tilt: horizonTilt(years),
      priority: g.priority,
    }
  })

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt)
    setExportErr(null)
    try {
      await exportReport(fmt, {
        identity, profile: userProfile, buckets, returnAssumptions,
      })
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-lg border-2 border-slate-300 bg-gradient-to-br from-white via-white to-slate-50/40 p-3 sm:p-4 space-y-3.5 ring-1 ring-slate-100 shadow-sm">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="inline-block bg-slate-900 text-white text-[10px] font-bold tracking-[2px] uppercase px-2.5 py-0.5 rounded-full">
              📊 Executive Dashboard
            </span>
          </div>
          <h2 className="font-serif text-lg sm:text-xl font-extralight tracking-tight text-slate-900 mt-1">
            {userName}'s <em className="not-italic font-extrabold">financial cockpit</em>
          </h2>
          <p className="text-[11px] text-slate-600 italic mt-0.5 leading-snug">
            One-screen overview of where you stand · the rest of the report goes deeper, section by section.
          </p>
        </div>
        <div className="text-right text-[10px] text-slate-500 tabular-nums leading-tight">
          <div className="font-semibold text-slate-700">{today}</div>
          <div>Age {currentAge} · Retire @ {retirementAge}</div>
          <div className="italic">Horizon {horizon} yrs</div>
        </div>
      </header>

      {/* ── KPI tiles ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Kpi icon="💼" label="Net Worth"    value={fmtINR(netWorth)}     sub={`Gross ${fmtINR(grossAssets)}`} />
        <Kpi icon="💳" label="Liabilities"  value={fmtINR(liabilities)}  sub={liabilityPctOfAssets === Infinity ? '∞% of assets' : `${Math.round(liabilityPctOfAssets)}% of assets`} />
        <Kpi icon="⏳" label="Runway"       value={runwayYrs === Infinity ? '∞ yrs' : `${runwayYrs.toFixed(1)} yrs`} sub="at current burn" />
        <Kpi icon="🎯" label="Ready at"     value={readyAt} sub={readinessSub} />
        <Kpi icon="⚖️" label="Risk Profile" value={profileLabel} sub={`${Math.round(profileScore)}/100`} />
        <Kpi icon="🌟" label="Goal Clarity" value={`${Math.round(goalClarityScore)}/100`} sub={goalClarityBand} />
      </div>

      {/* ── Health composite bar ──────────────────────────────── */}
      <section className="rounded-md border-2 p-3 bg-white" style={{ borderColor: healthBand.color + '40' }}>
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Health</span>
            <span className="text-2xl font-extrabold tabular-nums" style={{ color: healthBand.color }}>{healthScore}</span>
            <span className="text-[10px] font-bold tracking-[2px] uppercase" style={{ color: healthBand.color }}>{healthBand.label}</span>
          </div>
          <span className="text-[10px] text-slate-500 italic">{known.length}/{subScores.length} sub-scores known</span>
        </div>
        <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
          {/* zone backgrounds */}
          <div className="absolute inset-y-0 left-0 bg-rose-100"     style={{ width: '20%' }} />
          <div className="absolute inset-y-0 left-[20%] bg-amber-100" style={{ width: '40%' }} />
          <div className="absolute inset-y-0 left-[60%] bg-lime-100"  style={{ width: '20%' }} />
          <div className="absolute inset-y-0 left-[80%] bg-emerald-100" style={{ width: '20%' }} />
          {/* needle */}
          <div className="absolute inset-y-0" style={{ left: `${healthScore}%` }}>
            <div className="w-0.5 h-full" style={{ background: healthBand.color }} />
          </div>
        </div>
        <div className="flex justify-between text-[9px] text-slate-500 tabular-nums mt-1">
          <span>0</span><span>20</span><span>60</span><span>80</span><span>100</span>
        </div>
      </section>

      {/* ── Sub-score breakdown ───────────────────────────────── */}
      <section className="rounded-md border border-slate-200 p-2.5 bg-white">
        <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Score breakdown</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          {subScores.map((s) => (
            <ScoreBar key={s.key} label={s.label} value={s.value} />
          ))}
        </div>
      </section>

      {/* ── Goals (P1 / P2 cards) ─────────────────────────────── */}
      {goalCards.length > 0 && (
        <section className="rounded-md border border-slate-200 p-2.5 bg-white">
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700 mb-2">Priority goals</h4>
          <div className="space-y-2">
            {goalCards.map((g) => (
              <article key={g.tag} className="rounded-md border border-slate-200 bg-slate-50/40 p-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-extrabold tabular-nums bg-slate-900 text-white px-1.5 py-0.5 rounded shrink-0">{g.tag}</span>
                  <span className="text-[12px] font-bold text-slate-900 truncate">{g.name}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider ml-auto shrink-0">{g.typeLabel}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-1.5 text-[10px]">
                  <Mini label="Horizon" value={g.years > 0 ? `${g.years}y` : '—'} />
                  <Mini label="Target"  value={g.target > 0 ? fmtINR(g.target) : '—'} />
                  <Mini label="SIP/mo"  value={g.sip > 0 ? fmtINR(g.sip) : '—'} />
                  <Mini label="Tilt"    value={g.tilt.label} color={g.tilt.color} />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Top action items ──────────────────────────────────── */}
      {actions.length > 0 && (
        <section className="rounded-md border-2 border-amber-200 bg-amber-50/40 p-2.5">
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-amber-800 mb-2">⚡ Top action items</h4>
          <ul className="space-y-1.5">
            {actions.slice(0, 5).map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-[11.5px] text-slate-800 leading-snug">
                <span aria-hidden="true" className="text-base leading-none shrink-0">{a.icon}</span>
                <span className="flex-1">{a.text}</span>
                <span className="text-[9px] font-extrabold tabular-nums bg-slate-900 text-white px-1.5 py-0.5 rounded shrink-0">{a.tag}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Download row ─────────────────────────────────────── */}
      <section className="rounded-md border-2 border-slate-200 bg-slate-50/40 p-2.5">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1.5">
          <h4 className="text-[10px] font-bold tracking-[2px] uppercase text-slate-700">Download report</h4>
          <span className="text-[10px] text-slate-500 italic">
            Same envelope as the Risk and Goal Discovery dashboards.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => downloadV10Json(gdState, v10State)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
            title="Bundles GD + v10 + inference into a single JSON envelope"
          >
            <span aria-hidden="true">⬇</span> JSON
          </button>
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleExport(f.id)}
              disabled={busy != null}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
              title={f.hint}
            >
              <span aria-hidden="true">⬇</span> {busy === f.id ? `${f.label}…` : f.label}
            </button>
          ))}
        </div>
        {exportErr && <div className="mt-2 text-[11px] text-rose-700">{exportErr}</div>}
      </section>
    </section>
  )
}

// ─── Mini stat row ─────────────────────────────────────────────────────

function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-slate-500">{label}</div>
      <div className="text-[12px] font-bold tabular-nums mt-0.5" style={{ color: color ?? '#0f172a' }}>{value}</div>
    </div>
  )
}
