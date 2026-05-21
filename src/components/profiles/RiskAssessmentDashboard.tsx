// Risk Profile & Risk Assessment dashboard — visual summary of
// everything Section 02 collects, plus computed Risk Capacity from the
// user's Plan-tab data. Mirrors the Goal Discovery dashboard's layout
// pattern (header, gauges, breakdown bars, profile chip, allocation,
// quiz history, download row).

import { useState } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from '../../types'
import type { GoalDiscoveryState, V10QuizState } from '../../types/psychometric'
import { storage } from '../../lib/storage'
import { downloadV10Json } from '../../lib/exporters/v10Json'
import { exportReport, FORMATS, type ExportFormat } from '../../lib/exporters'
import { deriveRiskCapacity } from '../../lib/psychometric/capacityInputs'
import { profileById, profileFromScore } from '../../lib/data/riskProfiles'
import type { QuizState } from '../../types/profiles'

interface Props {
  userProfile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
  quizState: QuizState | null
  v10State: V10QuizState | null
  gdState: GoalDiscoveryState | null
  /** Risk-profiler "Deep" result percent score (0..100), if present. */
  deepRiskPercent: number | null
}

// ─── Big semicircular SVG gauge (reused pattern) ────────────────────────

interface GaugeProps {
  value: number
  max: number
  zones: { start: number; end: number; color: string }[]
  label: string
  unit?: string
  caption?: string
}

function Gauge({ value, max, zones, label, unit, caption }: GaugeProps) {
  const cx = 100, cy = 100, r = 78
  const strokeW = 16
  const pct = Math.max(0, Math.min(max, value)) / max
  const angle = 180 - pct * 180
  const rad = (angle * Math.PI) / 180
  const tipX = cx + (r - 4) * Math.cos(rad)
  const tipY = cy - (r - 4) * Math.sin(rad)
  function ang(v: number) {
    return 180 - (v / max) * 180
  }
  function path(start: number, end: number): string {
    const a1 = ang(start), a2 = ang(end)
    const s = { x: cx + r * Math.cos((a1 * Math.PI) / 180), y: cy - r * Math.sin((a1 * Math.PI) / 180) }
    const e = { x: cx + r * Math.cos((a2 * Math.PI) / 180), y: cy - r * Math.sin((a2 * Math.PI) / 180) }
    return `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`
  }
  return (
    <div className="flex flex-col items-center text-center">
      <svg viewBox="0 0 200 130" className="w-full max-w-[200px]" aria-label={`${label}: ${value}`}>
        {zones.map((z) => (
          <path key={z.start} d={path(z.start, z.end)} stroke={z.color} strokeWidth={strokeW} fill="none" opacity={0.85} />
        ))}
        <line x1={cx} y1={cy} x2={tipX} y2={tipY} stroke="#0f172a" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5.5} fill="#0f172a" />
        <text x={cx} y={cy + 24} textAnchor="middle" className="fill-slate-900" style={{ fontSize: 22, fontWeight: 800 }}>
          {Math.round(value)}{unit ? <tspan style={{ fontSize: 12, fontWeight: 400 }} dx={2} className="fill-slate-400">{unit}</tspan> : null}
        </text>
      </svg>
      <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mt-0.5">{label}</div>
      {caption && <div className="text-[10px] text-slate-500 italic mt-0.5">{caption}</div>}
    </div>
  )
}

// ─── Horizontal bar (used by capacity breakdown + quiz history) ─────────

function Bar({ label, valueLabel, pct, tone = 'navy' }: { label: string; valueLabel: string; pct: number; tone?: 'navy' | 'amber' | 'emerald' | 'rose' }) {
  const fill = tone === 'amber' ? '#b45309' : tone === 'emerald' ? '#047857' : tone === 'rose' ? '#9f1239' : '#1d4ed8'
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-0.5">
        <span className="text-[11px] text-slate-700">{label}</span>
        <span className="text-[11px] font-semibold text-slate-900 tabular-nums">{valueLabel}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: fill }} />
      </div>
    </div>
  )
}

// ─── Allocation donut (B1 / B2 / B3 / B4) ───────────────────────────────

function AllocationDonut({ b1, b2, b3, b4 }: { b1: number; b2: number; b3: number; b4: number }) {
  const total = b1 + b2 + b3 + b4
  const safe = total > 0 ? { b1: b1 / total, b2: b2 / total, b3: b3 / total, b4: b4 / total } : { b1: 0.25, b2: 0.25, b3: 0.25, b4: 0.25 }
  const colors = { b1: '#3b82f6', b2: '#f59e0b', b3: '#10b981', b4: '#8b5cf6' }
  const cx = 70, cy = 70, R = 60, r = 36
  let angle = -90  // start at 12 o'clock
  function arcPath(fraction: number, color: string): { d: string; color: string } {
    const start = angle
    const sweep = fraction * 360
    const end = start + sweep
    angle = end
    if (sweep <= 0) return { d: '', color }
    const a1 = (start * Math.PI) / 180
    const a2 = (end * Math.PI) / 180
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1)
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2)
    const x3 = cx + r * Math.cos(a2), y3 = cy + r * Math.sin(a2)
    const x4 = cx + r * Math.cos(a1), y4 = cy + r * Math.sin(a1)
    const largeArc = sweep > 180 ? 1 : 0
    return {
      d: `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4} Z`,
      color,
    }
  }
  const slices = [
    arcPath(safe.b1, colors.b1),
    arcPath(safe.b2, colors.b2),
    arcPath(safe.b3, colors.b3),
    arcPath(safe.b4, colors.b4),
  ]
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 140 140" className="w-32 h-32" aria-label="Bucket allocation">
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth={1.5} />
        ))}
      </svg>
      <div className="text-[11px] space-y-1">
        <LegendRow color={colors.b1} label="B1 Liquid"      pct={safe.b1 * 100} />
        <LegendRow color={colors.b2} label="B2 Fixed"       pct={safe.b2 * 100} />
        <LegendRow color={colors.b3} label="B3 Hybrid"      pct={safe.b3 * 100} />
        <LegendRow color={colors.b4} label="B4 Equity"      pct={safe.b4 * 100} />
      </div>
    </div>
  )
}

function LegendRow({ color, label, pct }: { color: string; label: string; pct: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span aria-hidden="true" className="inline-block w-3 h-3 rounded-sm" style={{ background: color }} />
      <span className="text-slate-700 w-20">{label}</span>
      <span className="font-semibold text-slate-900 tabular-nums">{Math.round(pct)}%</span>
    </div>
  )
}

// ─── Stat tile ──────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border-2 border-slate-200 px-2.5 py-1.5 text-center bg-white">
      <div className="text-[8px] font-bold tracking-[1.5px] uppercase text-slate-500">{label}</div>
      <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5">{value}</div>
    </div>
  )
}

// ─── Dashboard ──────────────────────────────────────────────────────────

const APPETITE_ZONES = [
  { start: 0,   end: 1.2, color: '#dc2626' },
  { start: 1.2, end: 2.2, color: '#f59e0b' },
  { start: 2.2, end: 3.2, color: '#eab308' },
  { start: 3.2, end: 4.2, color: '#84cc16' },
  { start: 4.2, end: 5,   color: '#16a34a' },
]

const CAPACITY_ZONES = [
  { start: 0,  end: 30,  color: '#dc2626' },
  { start: 30, end: 55,  color: '#f59e0b' },
  { start: 55, end: 75,  color: '#84cc16' },
  { start: 75, end: 100, color: '#16a34a' },
]

const PROFILE_ZONES = [
  { start: 0,  end: 20,  color: '#dc2626' },
  { start: 20, end: 40,  color: '#f59e0b' },
  { start: 40, end: 60,  color: '#eab308' },
  { start: 60, end: 80,  color: '#84cc16' },
  { start: 80, end: 100, color: '#16a34a' },
]

type MetricKey = 'profile' | 'appetite' | 'capacity'

const METRIC_META: Record<MetricKey, {
  label: string
  subtitle: string
  oneLiner: string
  detail: string
  formula: string
  source: string
}> = {
  profile: {
    label: 'Risk Profile',
    subtitle: 'The blended composite that drives bucket allocation',
    oneLiner: 'Your overall risk position — the weighted blend of appetite and capacity.',
    detail:
      'Risk Profile is the single 0–100 number the engine uses to pick your bucket allocation. It blends your subjective willingness (Appetite) with your financial ability (Capacity), weighted by life-stage. Closer to retirement weights Capacity more; longer horizons let Appetite carry more weight.',
    formula: 'Profile = wRA · Appetite + wRC · Capacity   (wRA = 0.4 if <5 yrs to retirement, else 0.5)',
    source: 'Composite from v10 psychometric assessment + computed Risk Capacity.',
  },
  appetite: {
    label: 'Risk Appetite',
    subtitle: 'How much volatility you are psychologically willing to accept',
    oneLiner: 'A personality trait — how much you can stomach, not how much you can afford.',
    detail:
      'Risk Appetite is purely subjective: how comfortable you are watching your portfolio swing, how you react to losses, and what return / volatility trade-offs you prefer. It is largely stable across time and does not change in a market crash — only in life-stage transitions.',
    formula: 'Slider 1–5  OR  C-1 (Risk Tolerance) construct from the v10 psychometric quiz, normalised to 0–100.',
    source: 'Slider value (Profile tab) and v10 quiz items C1-Q1 to C1-Q5.',
  },
  capacity: {
    label: 'Risk Capacity',
    subtitle: 'How much risk your financial situation can absorb',
    oneLiner: 'An objective measure — derived from your Plan data, not your feelings.',
    detail:
      'Risk Capacity is computed live from your Wealth Snapshot, Loans & Liabilities, and Monthly Budget. It rises when your savings rate is high, your debt-to-income is low, and your emergency-fund cover is deep. It shifts when life events change those inputs.',
    formula: 'Capacity = mean(savingsRate · 2.5 · 100,  100 − DTI · 1.8 · 100,  emergencyMonths · 15)   (all clamped 0–100)',
    source: 'deriveRiskCapacity() on your Plan-tab inputs.',
  },
}

// ─── Stress-test scenarios ─────────────────────────────────────────────
// Conservative directional deltas. Appetite is a personality trait and is
// largely shock-invariant; Capacity moves with cash buffers and income;
// Profile is a weighted blend so its delta is dampened.
interface StressScenario {
  id: string
  icon: string
  label: string
  description: string
  /** Δ percentage-points on each composite (0–100 scale) */
  deltaProfile: number
  deltaAppetite: number
  deltaCapacity: number
}

const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: 'crash',
    icon: '📉',
    label: '30% equity crash',
    description: 'B3 + B4 lose 30% overnight; emergency cash unchanged but psychological pressure spikes.',
    deltaProfile:  -8,
    deltaAppetite:  0,
    deltaCapacity: -10,
  },
  {
    id: 'jobloss',
    icon: '💼',
    label: '6-month job loss',
    description: 'Monthly income drops to ₹0 for 6 months. Liquid cash bleeds; savings rate collapses; DTI ratio spikes.',
    deltaProfile: -15,
    deltaAppetite:  0,
    deltaCapacity: -30,
  },
  {
    id: 'illness',
    icon: '🏥',
    label: 'Major illness (₹15 L surprise)',
    description: 'Large unplanned medical expense draws down liquid emergency reserves; ongoing care erodes monthly buffer.',
    deltaProfile: -10,
    deltaAppetite:  0,
    deltaCapacity: -20,
  },
  {
    id: 'inflation',
    icon: '📈',
    label: 'Inflation spike (10y at 9%)',
    description: 'Real returns compress; expenses balloon; corpus longevity shrinks. Capacity erodes slowly but persistently.',
    deltaProfile:  -6,
    deltaAppetite:  0,
    deltaCapacity:  -8,
  },
]

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v))
}

function StressRow({
  before, after, label,
}: { before: number; after: number; label: 'Profile' | 'Appetite' | 'Capacity' }) {
  const delta = after - before
  const color = delta < -10 ? '#9f1239' : delta < 0 ? '#b45309' : '#475569'
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-[11px]">
      <span className="text-slate-700">{label}</span>
      <span className="tabular-nums text-slate-500 w-10 text-right">{Math.round(before)}</span>
      <span aria-hidden="true" className="text-slate-300">→</span>
      <span className="tabular-nums font-semibold w-12 text-right" style={{ color }}>
        {Math.round(after)} <span className="text-[9px] font-normal">({delta > 0 ? '+' : ''}{Math.round(delta)})</span>
      </span>
    </div>
  )
}

export function RiskAssessmentDashboard({
  userProfile, buckets, returnAssumptions,
  quizState, v10State, gdState, deepRiskPercent,
}: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [exportErr, setExportErr] = useState<string | null>(null)

  // ── Compute capacity from the user's Plan data ────────────────────
  const capacity = deriveRiskCapacity(userProfile)
  const capacityScore = (
    Math.min(100, capacity.savingsRate * 100 * 2.5) +
    Math.max(0, 100 - capacity.debtToIncome * 100 * 1.8) +
    Math.min(100, capacity.emergencyMonths * 15)
  ) / 3

  // ── Matched profile (from manual / quiz / v10) ────────────────────
  const chosenId = storage.getRiskProfile()
    ?? quizState?.profileId
    ?? v10State?.composites?.profileId
    ?? null
  const matched = chosenId ? profileById(chosenId) : null

  // ── Bucket allocation snapshot ────────────────────────────────────
  const alloc = userProfile.bucketAllocation ?? matched?.bucketShare ?? { b1: 0.10, b2: 0.20, b3: 0.30, b4: 0.40 }

  // ── Quiz history ──────────────────────────────────────────────────
  const quickScore = quizState?.completed ? quizState.totalScore : null
  const quickProfile = quickScore != null ? profileFromScore(quickScore).name : null
  const v10Score = v10State?.composites?.riskProfile ?? null

  // Render only when there's at least one data point to show
  const hasAnything = quickScore != null || deepRiskPercent != null || v10Score != null || matched != null
  if (!hasAnything) return null

  // Composite values for the stress test (all 0–100)
  const appetitePct = ((userProfile.riskAppetite - 1) / 4) * 100  // slider 1–5 → 0–100
  const profilePct = v10State?.composites?.riskProfile ?? (0.5 * appetitePct + 0.5 * capacityScore)

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt)
    setExportErr(null)
    try {
      await exportReport(fmt, {
        identity: storage.getIdentity(),
        profile: userProfile,
        buckets,
        returnAssumptions,
      })
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="mt-3 rounded-lg border-2 border-blue-300 bg-white p-4 space-y-4 ring-1 ring-blue-100 shadow-sm">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <span className="inline-block bg-blue-100 text-blue-800 text-[10px] font-bold tracking-[2px] uppercase px-2.5 py-0.5 rounded-full">
            Risk Profile & Risk Assessment dashboard
          </span>
          <p className="text-[10px] text-slate-500 italic mt-1">
            Visual summary of your appetite, capacity, matched profile, and assessment history.
          </p>
        </div>
      </div>

      {/* ── All three gauges side-by-side ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-md border-2 border-blue-200 bg-blue-50/40 p-3">
          <Gauge
            value={profilePct}
            max={100}
            zones={PROFILE_ZONES}
            label="Risk Profile"
            unit="/100"
            caption={
              profilePct < 20 ? 'Ultra-Conservative' :
              profilePct < 40 ? 'Conservative' :
              profilePct < 60 ? 'Moderate' :
              profilePct < 80 ? 'Growth-Oriented' : 'Aggressive'
            }
          />
        </div>
        <div className="rounded-md border-2 border-amber-200 bg-amber-50/40 p-3">
          <Gauge
            value={userProfile.riskAppetite}
            max={5}
            zones={APPETITE_ZONES}
            label="Risk Appetite"
            unit="/5"
            caption={userProfile.riskAppetite <= 2 ? 'Conservative' : userProfile.riskAppetite === 3 ? 'Moderate' : 'Aggressive'}
          />
        </div>
        <div className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-3">
          <Gauge
            value={capacityScore}
            max={100}
            zones={CAPACITY_ZONES}
            label="Risk Capacity"
            unit="/100"
            caption={capacityScore < 30 ? 'Stretched' : capacityScore < 55 ? 'Constrained' : capacityScore < 75 ? 'Adequate' : 'Strong'}
          />
        </div>
      </div>

      {/* ── Explanations of all three ────────────────────────── */}
      <section className="rounded-md border-2 border-slate-200 p-3 space-y-2.5">
        <h4 className="text-xs font-bold tracking-[2px] uppercase text-slate-700">How to read these three scores</h4>
        {(['profile', 'appetite', 'capacity'] as MetricKey[]).map((m) => {
          const meta = METRIC_META[m]
          return (
            <div key={m} className="rounded p-2.5 border-2 border-slate-100 bg-white">
              <div className="text-[11px] font-bold tracking-wide text-slate-800">
                {meta.label} <span className="font-normal text-slate-500 italic">— {meta.oneLiner}</span>
              </div>
              <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">{meta.detail}</p>
              <div className="text-[10px] text-slate-500 mt-1 font-mono leading-snug bg-slate-50 border border-slate-100 rounded px-2 py-1">
                {meta.formula}
              </div>
              <div className="text-[10px] text-slate-500 italic mt-1">Source: {meta.source}</div>
            </div>
          )
        })}
      </section>

      {/* ── Stress test ──────────────────────────────────────── */}
      <section className="rounded-md border-2 border-amber-200 bg-amber-50/40 p-3">
        <div className="flex items-baseline justify-between gap-2 mb-2 flex-wrap">
          <h4 className="text-xs font-bold tracking-[2px] uppercase text-amber-800">Stress test — how would these scores shift?</h4>
          <span className="text-[10px] text-slate-500 italic">
            Directional only. Appetite is a personality trait so it barely moves; Capacity moves with cash and income.
          </span>
        </div>
        <div className="space-y-2">
          {STRESS_SCENARIOS.map((s) => {
            const newProfile  = clamp(profilePct  + s.deltaProfile)
            const newAppetite = clamp(appetitePct + s.deltaAppetite)
            const newCapacity = clamp(capacityScore + s.deltaCapacity)
            return (
              <div key={s.id} className="rounded-md border border-amber-200 bg-white p-2.5">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-[12px] font-bold text-slate-900">
                    <span className="mr-1" aria-hidden="true">{s.icon}</span>
                    {s.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 italic leading-snug mb-2">{s.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1">
                  <StressRow label="Profile"  before={profilePct}    after={newProfile} />
                  <StressRow label="Appetite" before={appetitePct}   after={newAppetite} />
                  <StressRow label="Capacity" before={capacityScore} after={newCapacity} />
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-500 italic mt-2 leading-snug">
          A robust profile is one where the worst-case scenario above still leaves you above 40 on the Capacity score.
          Below 40 indicates you should build the floor (emergency fund + insurance) before tilting further to equity.
        </p>
      </section>

      {/* ── Capacity breakdown bars ──────────────────────────── */}
      <section className="rounded-md border-2 border-slate-200 p-3">
        <h4 className="text-xs font-bold tracking-[2px] uppercase text-slate-700 mb-2">Risk Capacity — breakdown</h4>
        <p className="text-[11px] text-slate-500 italic mb-2 leading-snug">
          Derived from your Wealth Snapshot, Loans &amp; Liabilities, and Monthly Budget. Higher is better.
        </p>
        <div className="space-y-2.5">
          <Bar
            label="Savings rate"
            valueLabel={`${Math.round(capacity.savingsRate * 100)}%`}
            pct={Math.min(100, capacity.savingsRate * 100 * 2.5)}
            tone="emerald"
          />
          <Bar
            label="Debt-to-income (inverted — lower DTI = higher score)"
            valueLabel={`${Math.round(capacity.debtToIncome * 100)}% DTI`}
            pct={Math.max(0, 100 - capacity.debtToIncome * 100 * 1.8)}
            tone={capacity.debtToIncome > 0.45 ? 'rose' : capacity.debtToIncome > 0.3 ? 'amber' : 'emerald'}
          />
          <Bar
            label={`Emergency-fund cover (${capacity.emergencyMonths.toFixed(1)} months of expenses)`}
            valueLabel={`${capacity.emergencyMonths.toFixed(1)} mo`}
            pct={Math.min(100, capacity.emergencyMonths * 15)}
            tone={capacity.emergencyMonths < 3 ? 'rose' : capacity.emergencyMonths < 6 ? 'amber' : 'emerald'}
          />
        </div>
      </section>

      {/* ── Matched profile + allocation donut ──────────────── */}
      {matched && (
        <section className="rounded-md border-2 border-slate-200 p-3">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h4 className="text-xs font-bold tracking-[2px] uppercase text-slate-700">Matched profile</h4>
            <span className="text-[10px] text-slate-500 italic">{matched.tagline}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
            <div>
              <h3 className="font-serif text-xl font-extralight tracking-tight text-slate-900">{matched.name}</h3>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">{matched.description}</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Stat label="Yr-1 monthly /Cr"   value={`₹${(matched.expectedMonthlyOn1Cr / 1000).toFixed(0)}k`} />
                <Stat label="Yr-10 monthly /Cr"  value={`₹${(matched.expectedYr10MonthlyOn1Cr / 1000).toFixed(0)}k`} />
                <Stat label="Yr-20 corpus /Cr"   value={`₹${(matched.expected20yrCorpusFromCr / 10000000).toFixed(2)} Cr`} />
                <Stat label="Principal safe"     value={matched.principalSafe} />
              </div>
            </div>
            <AllocationDonut b1={alloc.b1} b2={alloc.b2} b3={alloc.b3} b4={alloc.b4} />
          </div>
        </section>
      )}

      {/* ── Assessment history bars ──────────────────────────── */}
      <section className="rounded-md border-2 border-slate-200 p-3">
        <h4 className="text-xs font-bold tracking-[2px] uppercase text-slate-700 mb-2">Assessment history</h4>
        <div className="space-y-2.5">
          <Bar
            label={`Quick · 10-question quiz${quickProfile ? ` · ${quickProfile}` : ''}`}
            valueLabel={quickScore != null ? `${quickScore}/50` : '— not taken'}
            pct={quickScore != null ? ((quickScore - 10) / 40) * 100 : 0}
            tone="navy"
          />
          <Bar
            label="Deep · 15-question detailed assessment"
            valueLabel={deepRiskPercent != null ? `${Math.round(deepRiskPercent)}/100` : '— not taken'}
            pct={deepRiskPercent ?? 0}
            tone="amber"
          />
          <Bar
            label={`Full · v10 psychometric${v10Score != null && v10State?.composites ? ` · ${profileById(v10State.composites.profileId).name}` : ''}`}
            valueLabel={v10Score != null ? `${Math.round(v10Score)}/100` : '— not taken'}
            pct={v10Score ?? 0}
            tone="emerald"
          />
        </div>
      </section>

      {/* ── Download row ─────────────────────────────────────── */}
      <section className="rounded-md border-2 border-blue-200 bg-blue-50/30 p-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
          <h4 className="text-xs font-bold tracking-[2px] uppercase text-blue-700">Download report</h4>
          <span className="text-[10px] text-slate-500 italic">
            Same envelope as the Goal Discovery and v10 dashboards.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadV10Json(gdState, v10State)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold text-blue-800 bg-white border border-blue-200 hover:bg-blue-50 transition-colors"
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
