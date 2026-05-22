// Executive Dashboard — "Financial Cockpit".
// Visual language borrowed from aviation glass cockpits: dark instrument
// panel, radial dials with needles, LED status indicators, attitude-style
// central health gauge, waypoint-list navigation, master-caution alerts.
//
// All metrics computed live from the user's Plan / GD / v10 data.

import { useState } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions, AssetEntry, LoanEntry } from '../../types'
import type { GoalDiscoveryState, V10QuizState } from '../../types/psychometric'
import type { QuizState } from '../../types/profiles'
import { storage } from '../../lib/storage'
import { downloadV10Json } from '../../lib/exporters/v10Json'
import { exportReport, FORMATS, type ExportFormat } from '../../lib/exporters'
import { deriveRiskCapacity } from '../../lib/psychometric/capacityInputs'

interface Props {
  userProfile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
  gdState: GoalDiscoveryState | null
  v10State: V10QuizState | null
  quizState: QuizState | null
  deepRiskPercent: number | null
}

// ─── formatters & math ─────────────────────────────────────────────────

function fmtINR(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(1)}Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)}L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(0)}k`
  return `${sign}₹${Math.round(abs)}`
}

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

const AMOUNT_MIDPOINT: Record<string, number> = {
  lt10L: 5_00_000, '10L_25L': 17_50_000, '25L_50L': 37_50_000, '50L_1Cr': 75_00_000,
  '1Cr_2Cr': 1_50_00_000, '2Cr_5Cr': 3_50_00_000, '5Cr_plus': 6_00_00_000, dontknow: 0,
}
const HORIZON_YEARS: Record<string, number> = {
  lt5: 3, '5_10': 7, '10_15': 12, '15_20': 17, '20_25': 22, '25_plus': 27, unsure: 0,
}

function requiredSip(targetINR: number, years: number, annualReturnPct = 10): number {
  if (years <= 0 || targetINR <= 0) return 0
  const r = annualReturnPct / 100 / 12, n = years * 12
  const factor = ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
  return Math.round(targetINR / factor)
}

function horizonTilt(years: number): { label: string; color: string } {
  if (years <= 0) return { label: 'LIQUID',       color: '#22d3ee' }
  if (years < 3)  return { label: 'CONSERVATIVE', color: '#38bdf8' }
  if (years < 8)  return { label: 'MODERATE',     color: '#34d399' }
  if (years < 15) return { label: 'GROWTH',       color: '#bef264' }
  return            { label: 'EQUITY',          color: '#c084fc' }
}

// ─── cockpit palette ───────────────────────────────────────────────────

const COCKPIT = {
  bg:        '#0f172a',       // slate-900
  panel:     '#1e293b',       // slate-800
  trim:      '#334155',       // slate-700
  textHi:    '#e2e8f0',       // slate-200
  textLo:    '#94a3b8',       // slate-400
  accent:    '#22d3ee',       // cyan-400
  ok:        '#34d399',       // emerald-400
  warn:      '#fbbf24',       // amber-400
  alert:     '#f87171',       // red-400
  inactive:  '#475569',       // slate-600
}

function statusColor(score: number | null): string {
  if (score == null) return COCKPIT.inactive
  if (score < 20) return COCKPIT.alert
  if (score < 60) return COCKPIT.warn
  if (score < 80) return '#a3e635'      // lime-400
  return COCKPIT.ok
}

// ─── Circular instrument dial ──────────────────────────────────────────

interface DialProps {
  value: number | null
  max: number
  label: string
  primary?: string
  caption?: string
  size?: number
}

function Dial({ value, max, label, primary, caption, size = 96 }: DialProps) {
  const cx = size / 2, cy = size / 2
  const r = size * 0.38
  const stroke = 4

  // 270° arc from 135° to 405°, clockwise (visible angle range)
  const START = 135
  const SWEEP = 270
  const pct = value == null ? 0 : Math.max(0, Math.min(max, value)) / max
  const needleAngle = START + pct * SWEEP

  function polar(deg: number, radius: number) {
    const rad = (deg * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  // Background arc
  const startPt = polar(START, r)
  const endPt = polar(START + SWEEP, r)
  const bgPath = `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 1 1 ${endPt.x} ${endPt.y}`

  // Filled arc (value)
  const valEnd = polar(needleAngle, r)
  const largeArc = pct > 0.5 ? 1 : 0
  const valPath = value != null && value > 0
    ? `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 1 ${valEnd.x} ${valEnd.y}`
    : ''

  // Tick marks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const a = START + t * SWEEP
    const inner = polar(a, r - 5)
    const outer = polar(a, r - 1)
    return `M ${inner.x} ${inner.y} L ${outer.x} ${outer.y}`
  }).join(' ')

  // Needle
  const needle = polar(needleAngle, r - 8)
  const fill = primary ?? statusColor(value)

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="block" style={{ width: size, height: size }}>
        {/* Outer bezel */}
        <circle cx={cx} cy={cy} r={r + 6} fill={COCKPIT.panel} stroke={COCKPIT.trim} strokeWidth={1.5} />
        {/* Background track */}
        <path d={bgPath} stroke={COCKPIT.trim} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        {/* Filled value arc */}
        {valPath && (
          <path d={valPath} stroke={fill} strokeWidth={stroke} fill="none" strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 2px ${fill})` }} />
        )}
        {/* Ticks */}
        <path d={ticks} stroke={COCKPIT.textLo} strokeWidth={1} opacity={0.6} />
        {/* Needle */}
        {value != null && (
          <line x1={cx} y1={cy} x2={needle.x} y2={needle.y}
                stroke={COCKPIT.textHi} strokeWidth={2} strokeLinecap="round" />
        )}
        <circle cx={cx} cy={cy} r={3} fill={COCKPIT.textHi} />
      </svg>
      <div className="text-[8px] font-bold tracking-[1.5px] uppercase text-center mt-0.5" style={{ color: COCKPIT.textLo, letterSpacing: '0.1em' }}>
        {label}
      </div>
      {caption && (
        <div className="text-[10px] font-bold tabular-nums mt-0.5" style={{ color: fill }}>
          {caption}
        </div>
      )}
    </div>
  )
}

// ─── Attitude indicator — big health gauge ─────────────────────────────

function AttitudeIndicator({ score, band, sub }: { score: number; band: string; sub: string }) {
  const size = 220
  const cx = size / 2, cy = size / 2 + 10
  const r = size * 0.4
  const accent = statusColor(score)

  // Horizon-line attitude: pitch tied to score (0 = nose down, 100 = nose up)
  const tilt = (score - 50) * 0.5   // -25° to +25°

  return (
    <div className="relative inline-block">
      <svg viewBox={`0 0 ${size} ${size + 10}`} style={{ width: size, height: size + 10 }}>
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r + 10} fill={COCKPIT.panel} stroke={COCKPIT.trim} strokeWidth={2} />
        {/* Clipped sphere — sky + ground */}
        <defs>
          <clipPath id="att-sphere">
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>
        <g clipPath="url(#att-sphere)">
          <g transform={`rotate(${tilt} ${cx} ${cy})`}>
            <rect x={cx - r * 2} y={cy - r * 2} width={r * 4} height={r * 2} fill="#0c4a6e" />
            <rect x={cx - r * 2} y={cy}        width={r * 4} height={r * 2} fill="#7c2d12" />
            {/* Pitch ladder lines */}
            {[-30, -20, -10, 0, 10, 20, 30].map((p) => {
              const y = cy - (p * r * 0.06)
              const w = p === 0 ? r * 1.4 : r * 0.5
              return (
                <line key={p} x1={cx - w / 2} y1={y} x2={cx + w / 2} y2={y}
                      stroke={p === 0 ? COCKPIT.textHi : COCKPIT.textLo}
                      strokeWidth={p === 0 ? 1.5 : 0.5} />
              )
            })}
          </g>
        </g>
        {/* Aircraft symbol */}
        <line x1={cx - 20} y1={cy} x2={cx - 6} y2={cy} stroke="#fbbf24" strokeWidth={2} />
        <line x1={cx + 6}  y1={cy} x2={cx + 20} y2={cy} stroke="#fbbf24" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={2.5} fill="#fbbf24" />
        {/* Bezel ticks */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const rad = (a - 90) * Math.PI / 180
          const x1 = cx + (r + 6) * Math.cos(rad)
          const y1 = cy + (r + 6) * Math.sin(rad)
          const x2 = cx + (r + 11) * Math.cos(rad)
          const y2 = cy + (r + 11) * Math.sin(rad)
          return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={COCKPIT.textLo} strokeWidth={1} />
        })}
        {/* Center health readout */}
        <text x={cx} y={size - 2} textAnchor="middle" style={{ fontSize: 26, fontWeight: 800, fill: accent, fontFamily: 'monospace' }}>
          {Math.round(score)}
        </text>
      </svg>
      <div className="text-center mt-1">
        <div className="text-[10px] font-bold tracking-[2px]" style={{ color: accent }}>{band}</div>
        <div className="text-[9px]" style={{ color: COCKPIT.textLo }}>{sub}</div>
      </div>
    </div>
  )
}

// ─── Radar / spider chart for the systems indicators ───────────────────

function RadarChart({
  items, size = 280,
}: { items: Array<{ label: string; value: number | null }>; size?: number }) {
  const cx = size / 2, cy = size / 2
  const r = size * 0.30                      // outer-ring radius
  const n = items.length

  function angleFor(i: number): number {
    return (i / n) * 360 - 90               // index 0 at the top
  }
  function point(i: number, ratio: number) {
    const a = (angleFor(i) * Math.PI) / 180
    return { x: cx + r * ratio * Math.cos(a), y: cy + r * ratio * Math.sin(a) }
  }

  // Background ring polygons
  const rings = [0.25, 0.5, 0.75, 1].map((t) => {
    const pts = Array.from({ length: n }, (_, i) => {
      const p = point(i, t)
      return `${p.x},${p.y}`
    }).join(' ')
    return { t, pts }
  })

  // Score polygon
  const scorePts = items.map((item, i) => {
    const ratio = item.value == null ? 0 : Math.max(0, Math.min(100, item.value)) / 100
    const p = point(i, ratio)
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="block" style={{ width: '100%', maxWidth: size, height: 'auto' }} aria-label="Systems radar">
      <defs>
        <radialGradient id="radar-fill" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor={COCKPIT.accent} stopOpacity={0.30} />
          <stop offset="100%" stopColor={COCKPIT.accent} stopOpacity={0.05} />
        </radialGradient>
      </defs>
      {/* Background rings */}
      {rings.map((g, i) => (
        <polygon
          key={i}
          points={g.pts}
          fill={i === rings.length - 1 ? 'rgba(15,23,42,0.6)' : 'none'}
          stroke={COCKPIT.trim}
          strokeWidth={0.5}
        />
      ))}
      {/* Ring labels (only at 25/50/75/100 along the right axis) */}
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <text
          key={t}
          x={cx + 3}
          y={cy - r * t}
          dominantBaseline="middle"
          style={{ fontSize: 7, fill: COCKPIT.textLo, fontFamily: 'monospace' }}
        >
          {Math.round(t * 100)}
        </text>
      ))}
      {/* Axes */}
      {items.map((_, i) => {
        const p = point(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={COCKPIT.trim} strokeWidth={0.5} />
      })}
      {/* Score polygon */}
      <polygon
        points={scorePts}
        fill="url(#radar-fill)"
        stroke={COCKPIT.accent}
        strokeWidth={1.5}
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${COCKPIT.accent})` }}
      />
      {/* Score dots */}
      {items.map((item, i) => {
        if (item.value == null) return (
          <circle key={i} cx={point(i, 0).x} cy={point(i, 0).y} r={2} fill={COCKPIT.inactive} />
        )
        const ratio = Math.max(0, Math.min(100, item.value)) / 100
        const p = point(i, ratio)
        return (
          <circle
            key={i}
            cx={p.x} cy={p.y} r={3}
            fill={statusColor(item.value)}
            stroke={COCKPIT.bg}
            strokeWidth={1}
            style={{ filter: `drop-shadow(0 0 3px ${statusColor(item.value)})` }}
          />
        )
      })}
      {/* Axis labels */}
      {items.map((item, i) => {
        const p = point(i, 1.20)
        const cosA = Math.cos((angleFor(i) * Math.PI) / 180)
        const ta = cosA > 0.35 ? 'start' : cosA < -0.35 ? 'end' : 'middle'
        return (
          <text
            key={i}
            x={p.x} y={p.y}
            textAnchor={ta}
            dominantBaseline="middle"
            style={{ fontSize: 8.5, fill: item.value == null ? COCKPIT.inactive : COCKPIT.textHi, fontFamily: 'monospace', letterSpacing: '0.5px' }}
          >
            {item.label.toUpperCase()}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Waypoint (goal as a navigation row) ───────────────────────────────

function Waypoint({ tag, name, years, target, sip, tilt }: {
  tag: string; name: string; years: number; target: number; sip: number; tilt: { label: string; color: string }
}) {
  const distancePct = Math.min(100, (years / 30) * 100)
  return (
    <div className="rounded border border-slate-700 bg-slate-800/60 p-2">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: tilt.color, color: '#0f172a' }}>{tag}</span>
        <span className="text-[11.5px] font-bold text-slate-100 truncate flex-1">{name}</span>
        <span className="font-mono text-[10px] tracking-wider" style={{ color: tilt.color }}>{tilt.label}</span>
      </div>
      {/* Range-to-waypoint runway */}
      <div className="mt-1.5 relative h-3 bg-slate-900 rounded overflow-hidden border border-slate-700">
        <div className="absolute inset-y-0 left-0" style={{ width: '100%' }}>
          {/* Tick marks every 5 yrs */}
          {[5, 10, 15, 20, 25, 30].map((y) => (
            <span key={y} className="absolute top-0 bottom-0 w-px" style={{ left: `${(y / 30) * 100}%`, background: COCKPIT.trim }} />
          ))}
          {/* Aircraft position (now = 0) */}
          <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[10px] leading-none" style={{ left: '0%', color: COCKPIT.accent }} aria-hidden="true">▶</span>
          {/* Waypoint marker */}
          <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[10px] leading-none" style={{ left: `${distancePct}%`, color: tilt.color }} aria-hidden="true">◆</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-1.5 text-[10px] font-mono">
        <span style={{ color: COCKPIT.textLo }}>RNG <span style={{ color: COCKPIT.textHi }}>{years}y</span></span>
        <span style={{ color: COCKPIT.textLo }}>TGT <span style={{ color: COCKPIT.textHi }}>{target > 0 ? fmtINR(target) : '—'}</span></span>
        <span style={{ color: COCKPIT.textLo }}>SIP <span style={{ color: COCKPIT.textHi }}>{sip > 0 ? fmtINR(sip) : '—'}</span></span>
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
  const userName = identity?.fullName?.trim() || 'PILOT'
  const currentAge = userProfile.demographics?.currentAge ?? 60
  const retirementAge = userProfile.demographics?.retirementAge ?? 60
  const horizon = Math.max(0, retirementAge - currentAge)
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

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
  const netWorthScore = netWorth <= 0 ? 0 : Math.min(100, (netWorth / 1_00_00_000) * 100)
  const debtFreedomScore = Math.max(0, Math.min(100, 100 - capacityInputs.debtToIncome * 100 * 1.8))
  const moneyHealthScore = Math.min(100, capacityInputs.savingsRate * 100 * 2.5)

  // ── Goal clarity ───────────────────────────────────────────────────
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

  // ── Spousal alignment ──────────────────────────────────────────────
  let spousalScore: number | null = null
  const partner = gdState?.answers['block-5']?.['applicable'] as string | undefined
  if (partner === 'yes' || partner === 'partial') {
    spousalScore = gdState?.inference?.partnerDivergence
      ? (gdState.inference.partnerDivergence.diverged ? 40 : 90)
      : 60
  }

  // ── Health composite ───────────────────────────────────────────────
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
  const healthBand =
    healthScore < 20 ? 'CRITICAL' :
    healthScore < 60 ? 'DEVELOPING' :
    healthScore < 80 ? 'NOMINAL' : 'OPTIMAL'

  const profileLabel =
    profileScore < 20 ? 'ULTRA-CONS' :
    profileScore < 40 ? 'CONSERVATIVE' :
    profileScore < 60 ? 'MODERATE' :
    profileScore < 80 ? 'GROWTH' : 'AGGRESSIVE'

  // ── Action items ───────────────────────────────────────────────────
  interface Action { sev: 'caution' | 'advisory'; tag: string; text: string }
  const actions: Action[] = []
  namedGoals.slice(0, 3).forEach((g, i) => {
    const targetINR = AMOUNT_MIDPOINT[g.amount] ?? 0
    const years = HORIZON_YEARS[g.horizon] ?? 0
    const sip = requiredSip(targetINR, years)
    const tilt = horizonTilt(years)
    actions.push({
      sev: 'advisory', tag: `P${i + 1}`,
      text: `${g.name} — ${fmtINR(sip)}/mo for ${years || 0} yrs → ${fmtINR(targetINR)}. Band: ${tilt.label}.`,
    })
  })
  if (goalClarityScore < 60) actions.push({ sev: 'caution', tag: 'GC', text: 'Sharpen goals — set explicit target + date for your top goal this quarter.' })
  if (cognitiveBias != null && cognitiveBias < 50) actions.push({ sev: 'caution', tag: 'CB', text: 'Elevated cognitive bias — slow major decisions, document rationale, sleep 48 h.' })
  if (scamResilience != null && scamResilience < 50) actions.push({ sev: 'caution', tag: 'SR', text: 'Scam-resilience low — verify every new scheme on sebi.gov.in before funds move.' })
  if (!v10State?.completed) actions.push({ sev: 'advisory', tag: 'AS', text: 'Finish v10 psychometric assessment to enable full readiness verdict.' })

  // ── Goal cards ─────────────────────────────────────────────────────
  const goalCards = namedGoals.slice(0, 4).map((g, i) => {
    const targetINR = AMOUNT_MIDPOINT[g.amount] ?? 0
    const years = HORIZON_YEARS[g.horizon] ?? 0
    return {
      tag: `P${i + 1}`, name: g.name, years,
      target: targetINR, sip: requiredSip(targetINR, years), tilt: horizonTilt(years),
    }
  })

  async function handleExport(fmt: ExportFormat) {
    setBusy(fmt); setExportErr(null)
    try {
      await exportReport(fmt, { identity, profile: userProfile, buckets, returnAssumptions })
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`)
    } finally { setBusy(null) }
  }

  return (
    <section
      className="rounded-lg border-2 border-slate-700 p-3 sm:p-4 space-y-3 font-mono"
      style={{
        background: `radial-gradient(circle at 20% 0%, #1e293b 0%, ${COCKPIT.bg} 60%)`,
        boxShadow: 'inset 0 0 30px rgba(34, 211, 238, 0.05)',
      }}
    >
      {/* ── Header: callsign strip ────────────────────────────── */}
      <header className="flex items-baseline justify-between gap-3 flex-wrap pb-2 border-b border-slate-700">
        <div className="min-w-0">
          <div className="text-[9px] font-bold tracking-[3px]" style={{ color: COCKPIT.accent }}>
            ▲ FINANCIAL COCKPIT · CAPTAIN
          </div>
          <h2 className="font-mono text-xl font-bold tracking-tight uppercase" style={{ color: COCKPIT.textHi }}>
            {userName}
          </h2>
        </div>
        <div className="text-right text-[10px] tabular-nums leading-tight" style={{ color: COCKPIT.textLo }}>
          <div style={{ color: COCKPIT.accent }}>{today}</div>
          <div>AGE <span style={{ color: COCKPIT.textHi }}>{currentAge}</span> · TGT <span style={{ color: COCKPIT.textHi }}>{retirementAge}</span></div>
          <div>HORIZON <span style={{ color: COCKPIT.textHi }}>{horizon}y</span></div>
        </div>
      </header>

      {/* ── Top row: 6 instrument dials ──────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <Dial value={netWorthScore} max={100} label="NET WORTH" caption={fmtINR(netWorth)} primary={statusColor(netWorthScore)} />
        <Dial value={Math.min(100, liabilityPctOfAssets === Infinity ? 100 : liabilityPctOfAssets)} max={100} label="LIABILITIES" caption={fmtINR(liabilities)} primary={liabilities > grossAssets ? COCKPIT.alert : COCKPIT.warn} />
        <Dial value={runwayYrs === Infinity ? 100 : Math.min(100, runwayYrs * 5)} max={100} label="RUNWAY" caption={runwayYrs === Infinity ? '∞ yrs' : `${runwayYrs.toFixed(1)}y`} primary={COCKPIT.accent} />
        <Dial value={v10State?.completed ? profileScore : null} max={100} label="READINESS" caption={v10State?.completed ? `Age ${retirementAge}` : 'PENDING'} primary={v10State?.completed ? statusColor(profileScore) : COCKPIT.inactive} />
        <Dial value={profileScore} max={100} label="RISK PROF" caption={profileLabel} primary={statusColor(profileScore)} />
        <Dial value={goalClarityScore} max={100} label="GOAL CLAR" caption={`${Math.round(goalClarityScore)}/100`} primary={statusColor(goalClarityScore)} />
      </div>

      {/* ── Center: Attitude indicator + Systems panel ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3 items-start">
        {/* Attitude / Health */}
        <div className="rounded-md border border-slate-700 p-3 flex flex-col items-center" style={{ background: COCKPIT.panel }}>
          <div className="text-[9px] font-bold tracking-[3px] mb-1" style={{ color: COCKPIT.accent }}>
            ◉ HEALTH · ATTITUDE
          </div>
          <AttitudeIndicator score={healthScore} band={healthBand} sub={`${known.length}/${subScores.length} sub-scores`} />
          {/* Band scale */}
          <div className="flex items-center gap-1 mt-2 text-[8px]" style={{ color: COCKPIT.textLo }}>
            <span style={{ color: COCKPIT.alert }}>CRIT</span>
            <span>·</span>
            <span style={{ color: COCKPIT.warn }}>DEV</span>
            <span>·</span>
            <span style={{ color: '#a3e635' }}>NOM</span>
            <span>·</span>
            <span style={{ color: COCKPIT.ok }}>OPT</span>
          </div>
        </div>

        {/* Systems panel — radar */}
        <div className="rounded-md border border-slate-700 p-3 flex flex-col" style={{ background: COCKPIT.panel }}>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[9px] font-bold tracking-[3px]" style={{ color: COCKPIT.accent }}>◉ SYSTEMS · RADAR</span>
            <span className="text-[8px]" style={{ color: COCKPIT.textLo }}>● GRN OK · ● AMB caution · ● RED critical · ● --- unknown</span>
          </div>
          <div className="flex items-center justify-center flex-1 min-h-[260px]">
            <RadarChart items={subScores} size={300} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-0.5 mt-2 text-[9px] font-mono">
            {subScores.map((s) => (
              <div key={s.key} className="flex items-center gap-1">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: statusColor(s.value) }}
                  aria-hidden="true"
                />
                <span className="truncate" style={{ color: s.value == null ? COCKPIT.inactive : COCKPIT.textHi }}>
                  {s.label.split(' ')[0].toUpperCase()}
                </span>
                <span className="tabular-nums ml-auto" style={{ color: s.value == null ? COCKPIT.inactive : COCKPIT.textHi }}>
                  {s.value == null ? '---' : Math.round(s.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Navigation: waypoints + master caution ───────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Waypoints */}
        <div className="rounded-md border border-slate-700 p-3" style={{ background: COCKPIT.panel }}>
          <div className="text-[9px] font-bold tracking-[3px] mb-2" style={{ color: COCKPIT.accent }}>
            ◉ NAVIGATION · WAYPOINTS
          </div>
          {goalCards.length > 0 ? (
            <div className="space-y-2">
              {goalCards.map((g) => (
                <Waypoint key={g.tag} {...g} />
              ))}
            </div>
          ) : (
            <div className="text-[10px] italic text-center py-6" style={{ color: COCKPIT.textLo }}>
              NO WAYPOINTS · Add goals in Goal Discovery to chart your course.
            </div>
          )}
        </div>

        {/* Master caution */}
        <div className="rounded-md border border-amber-700/60 p-3" style={{ background: 'rgba(120, 53, 15, 0.20)' }}>
          <div className="text-[9px] font-bold tracking-[3px] mb-2" style={{ color: COCKPIT.warn }}>
            ⚠ MASTER CAUTION · ACTION ITEMS
          </div>
          {actions.length > 0 ? (
            <ul className="space-y-1.5">
              {actions.slice(0, 6).map((a, i) => {
                const sevColor = a.sev === 'caution' ? COCKPIT.warn : COCKPIT.accent
                return (
                  <li key={i} className="grid grid-cols-[14px_1fr_auto] items-start gap-2">
                    <span
                      className="inline-block w-2 h-2 rounded-full mt-1"
                      style={{
                        background: sevColor,
                        boxShadow: a.sev === 'caution' ? `0 0 6px ${sevColor}` : 'none',
                      }}
                      aria-hidden="true"
                    />
                    <span className="text-[10.5px] leading-snug" style={{ color: COCKPIT.textHi }}>
                      {a.text}
                    </span>
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: sevColor, color: '#0f172a' }}>{a.tag}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="text-[10px] italic text-center py-3" style={{ color: COCKPIT.textLo }}>
              ALL CLEAR · No active cautions.
            </div>
          )}
        </div>
      </div>

      {/* ── Download / Telemetry export ───────────────────────── */}
      <section className="rounded-md border border-slate-700 p-2.5" style={{ background: COCKPIT.panel }}>
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1.5">
          <span className="text-[9px] font-bold tracking-[3px]" style={{ color: COCKPIT.accent }}>◉ TELEMETRY · EXPORT</span>
          <span className="text-[9px]" style={{ color: COCKPIT.textLo }}>JSON envelope + PDF/DOCX/PPTX/MD/CSV</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => downloadV10Json(gdState, v10State)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider border border-cyan-700/50 hover:border-cyan-400 transition-colors"
            style={{ background: 'rgba(8, 51, 68, 0.4)', color: COCKPIT.accent }}
            title="JSON envelope: GD + v10 + inference"
          >
            <span aria-hidden="true">⬇</span> JSON
          </button>
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleExport(f.id)}
              disabled={busy != null}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider border border-slate-600 hover:border-slate-400 transition-colors disabled:opacity-50"
              style={{ background: 'rgba(15, 23, 42, 0.6)', color: COCKPIT.textHi }}
              title={f.hint}
            >
              <span aria-hidden="true">⬇</span> {busy === f.id ? `${f.label}…` : f.label}
            </button>
          ))}
        </div>
        {exportErr && <div className="mt-1.5 text-[10px]" style={{ color: COCKPIT.alert }}>{exportErr}</div>}
      </section>
    </section>
  )
}
