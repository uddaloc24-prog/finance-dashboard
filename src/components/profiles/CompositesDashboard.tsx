// v10 — composites results dashboard.
// Replaces V10Quiz's minimal phase-2 stat cards with:
//   1. Big semicircular SVG gauge for the primary Risk Profile score
//   2. Five mini-gauges for risk appetite, capacity, bias, planning, scam
//   3. Money-script panel (4-bar horizontal chart with the dominant flagged)
//   4. Construct breakdown bars (only constructs the user actually answered)

import type { CompositesResult, ConstructId, MoneyScriptId } from '../../types/psychometric'
import { profileById } from '../../lib/data/riskProfiles'
import { Button } from '../ui/Button'

interface Props {
  composites: CompositesResult
  onAccept: () => void
  onRetake: () => void
  onExit: () => void
}

const ZONES = [
  { start: 0,  end: 20,  color: '#dc2626', label: 'Ultra-Conservative' },
  { start: 20, end: 40,  color: '#f59e0b', label: 'Conservative' },
  { start: 40, end: 60,  color: '#eab308', label: 'Moderate' },
  { start: 60, end: 80,  color: '#84cc16', label: 'Growth-Oriented' },
  { start: 80, end: 100, color: '#16a34a', label: 'Aggressive' },
] as const

const SCRIPT_LABELS: Record<MoneyScriptId, string> = {
  avoidance: 'Money Avoidance',
  worship:   'Money Worship',
  status:    'Money Status',
  vigilance: 'Money Vigilance',
}

const CONSTRUCT_NAMES: Record<ConstructId, string> = {
  'C-1':  'Risk Tolerance',
  'C-2':  'Loss Aversion',
  'C-3':  'Time Preference',
  'C-4':  'Self-Efficacy',
  'C-5':  'Locus of Control',
  'C-6':  'Money Avoidance',
  'C-7':  'Money Worship',
  'C-8':  'Money Status',
  'C-9':  'Money Vigilance',
  'C-10': 'Mental Accounting',
  'C-11': 'Herding / Social',
  'C-12': 'Recency / Overconfidence',
  'C-13': 'Financial Literacy',
  'C-14': 'Scam Vulnerability',
  'C-15': 'Family Dynamics',
  'C-16': 'Future Time Perspective',
}

const ALL_CONSTRUCTS: ConstructId[] = [
  'C-1','C-2','C-3','C-4','C-5','C-6','C-7','C-8','C-9','C-10',
  'C-11','C-12','C-13','C-14','C-15','C-16',
]

export function CompositesDashboard({ composites, onAccept, onRetake, onExit }: Props) {
  const profile = profileById(composites.profileId)
  const profileBand = ZONES.find((z) => composites.riskProfile >= z.start && composites.riskProfile < z.end)
    ?? ZONES[ZONES.length - 1]

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 space-y-5 ring-1 ring-blue-100">
      {/* ─── Header ───────────────────────────────────────────── */}
      <div className="text-center space-y-1">
        <span className="inline-block bg-blue-100 text-blue-800 text-[10px] font-bold tracking-[2px] uppercase px-3 py-1 rounded-full">
          v10 assessment complete
        </span>
      </div>

      {/* ─── Primary gauge + profile narrative ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] items-center gap-5">
        <Gauge value={composites.riskProfile} size="large" />
        <div className="space-y-2">
          <div>
            <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-500">Risk profile</div>
            <h3 className="font-serif text-2xl font-extralight tracking-tight text-slate-900 mt-0.5">
              <span className="font-extrabold" style={{ color: profileBand.color }}>{profile.name}</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-snug">{profile.tagline}</p>
          </div>
          <p className="text-[12px] text-slate-700 leading-relaxed">{profile.description}</p>
        </div>
      </div>

      {/* ─── Five mini-gauges ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <MiniGauge label="Risk appetite"     value={composites.riskAppetite}     tone="positive" />
        <MiniGauge label="Risk capacity"     value={composites.riskCapacity}     tone="positive" />
        <MiniGauge label="Bias index"        value={composites.biasIndex}        tone="negative" />
        <MiniGauge label="Planning ready"    value={composites.planningReadiness} tone="positive" />
        <MiniGauge label="Scam vulnerability" value={composites.scamVulnerability} tone="negative" />
      </div>

      {/* ─── Money scripts ────────────────────────────────────── */}
      <section className="rounded-md border-2 border-slate-200 p-3 space-y-2">
        <div className="flex items-baseline justify-between">
          <h4 className="text-xs font-bold tracking-[2px] uppercase text-slate-700">Money Scripts</h4>
          <span className="text-[11px] text-slate-500">
            Dominant:{' '}
            <strong className="text-slate-900">
              {composites.dominantMoneyScript ? SCRIPT_LABELS[composites.dominantMoneyScript] : '—'}
            </strong>
          </span>
        </div>
        <div className="space-y-1.5">
          {(Object.keys(composites.moneyScripts) as MoneyScriptId[]).map((id) => (
            <Bar
              key={id}
              label={SCRIPT_LABELS[id]}
              value={composites.moneyScripts[id]}
              flagged={composites.dominantMoneyScript === id}
            />
          ))}
        </div>
      </section>

      {/* ─── Response consistency (acquiescence) ─────────────── */}
      {composites.acquiescenceIndex != null && (
        <ConsistencyCard value={composites.acquiescenceIndex} />
      )}

      {/* ─── Construct breakdown ──────────────────────────────── */}
      <section className="rounded-md border-2 border-slate-200 p-3 space-y-2">
        <h4 className="text-xs font-bold tracking-[2px] uppercase text-slate-700">Construct Breakdown</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {ALL_CONSTRUCTS.map((c) => {
            const v = composites.constructScores[c]
            return (
              <Bar
                key={c}
                label={`${c}  ${CONSTRUCT_NAMES[c]}`}
                value={v ?? null}
                muted={v == null}
              />
            )
          })}
        </div>
        <p className="text-[10px] text-slate-500 italic mt-1">
          Muted rows had no scorable answers. Skipped or multi-select items don't contribute.
        </p>
      </section>

      {/* ─── Controls ─────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
        <Button variant="ghost" size="sm" onClick={onRetake}>Retake</Button>
        <Button variant="ghost" size="sm" onClick={onExit}>Close</Button>
        <Button onClick={onAccept}>Use this profile →</Button>
      </div>
    </div>
  )
}

// ─── Response-consistency indicator ─────────────────────────────────────

function ConsistencyCard({ value }: { value: number }) {
  // value = mean gap (0..100) between forward and reverse items per construct
  const label = value < 15 ? 'Consistent' : value < 30 ? 'Some inconsistency' : 'Possible acquiescence'
  const tone = value < 15 ? 'emerald' : value < 30 ? 'amber' : 'rose'
  const palette = {
    emerald: { fg: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
    amber:   { fg: '#92400e', bg: '#fffbeb', border: '#fde68a' },
    rose:    { fg: '#9f1239', bg: '#fff1f2', border: '#fecdd3' },
  }[tone]
  return (
    <section
      className="rounded-md border-2 p-3 flex items-baseline justify-between gap-3"
      style={{ borderColor: palette.border, background: palette.bg }}
    >
      <div>
        <h4 className="text-xs font-bold tracking-[2px] uppercase" style={{ color: palette.fg }}>
          Response consistency
        </h4>
        <p className="text-[11px] text-slate-700 mt-0.5 leading-snug max-w-2xl">
          Gap between forward and reverse-coded items in the same construct. Lower is better. High values may indicate
          yea-saying — re-review answers if uncertain.
        </p>
      </div>
      <div className="text-right">
        <div className="text-xl font-extrabold tabular-nums" style={{ color: palette.fg }}>
          {Math.round(value)}
        </div>
        <div className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ color: palette.fg }}>
          {label}
        </div>
      </div>
    </section>
  )
}

// ─── Big gauge ──────────────────────────────────────────────────────────

function Gauge({ value, size = 'medium' }: { value: number; size?: 'medium' | 'large' }) {
  // ViewBox: 200 wide, 120 tall. Center at (100, 100). Radius 80.
  const cx = 100
  const cy = 100
  const r = 80
  const strokeW = size === 'large' ? 18 : 14

  function valueToAngle(v: number): number {
    // 0 → 180° (left), 100 → 0° (right). Standard-math convention.
    return 180 - (Math.max(0, Math.min(100, v)) / 100) * 180
  }
  function polarToCart(angleDeg: number, radius: number) {
    const rad = (angleDeg * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) }
  }
  function arcPath(startVal: number, endVal: number): string {
    const s = polarToCart(valueToAngle(startVal), r)
    const e = polarToCart(valueToAngle(endVal), r)
    return `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`
  }

  const needleTip = polarToCart(valueToAngle(value), r - 4)
  const valueRounded = Math.round(value)

  return (
    <div className="w-full max-w-[260px] mx-auto">
      <svg viewBox="0 0 200 130" className="w-full h-auto" aria-label={`Risk profile gauge: ${valueRounded} out of 100`}>
        {ZONES.map((z) => (
          <path
            key={z.start}
            d={arcPath(z.start, z.end)}
            stroke={z.color}
            strokeWidth={strokeW}
            fill="none"
            strokeLinecap="butt"
            opacity={0.85}
          />
        ))}
        <line
          x1={cx} y1={cy}
          x2={needleTip.x} y2={needleTip.y}
          stroke="#0f172a"
          strokeWidth={size === 'large' ? 3 : 2}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={size === 'large' ? 7 : 5} fill="#0f172a" />
        <text x={cx} y={cy + 24} textAnchor="middle" className="fill-slate-900" style={{ fontSize: 22, fontWeight: 800 }}>
          {valueRounded}
        </text>
        <text x={cx} y={cy + 40} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 10, letterSpacing: 1 }}>
          / 100
        </text>
      </svg>
    </div>
  )
}

// ─── Mini gauge (vertical bar with score on top) ────────────────────────

function MiniGauge({
  label, value, tone = 'positive',
}: { label: string; value: number; tone?: 'positive' | 'negative' }) {
  const pct = Math.max(0, Math.min(100, value))
  // For "positive" composites (more is better) green at high. For "negative"
  // composites (bias / vulnerability) red at high.
  const color =
    tone === 'positive'
      ? pct < 40 ? '#f59e0b' : pct < 70 ? '#84cc16' : '#16a34a'
      : pct < 30 ? '#16a34a' : pct < 60 ? '#f59e0b' : '#dc2626'
  return (
    <div className="rounded-md border-2 border-slate-200 p-2.5 flex flex-col items-center text-center">
      <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-slate-500 mb-1.5">{label}</div>
      <div className="text-2xl font-extrabold tabular-nums" style={{ color }}>{Math.round(pct)}</div>
      <div className="text-[9px] text-slate-400 tabular-nums">/ 100</div>
      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1.5">
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ─── Horizontal bar (used by money scripts + constructs) ────────────────

function Bar({
  label, value, flagged = false, muted = false,
}: { label: string; value: number | null; flagged?: boolean; muted?: boolean }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value))
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
      <div>
        <div className={`flex items-baseline justify-between gap-2 ${muted ? 'opacity-50' : ''}`}>
          <span className={`text-[11px] truncate ${flagged ? 'font-extrabold text-slate-900' : 'text-slate-700'}`}>
            {flagged && '★ '}{label}
          </span>
          <span className="text-[11px] tabular-nums text-slate-500">
            {value == null ? '—' : Math.round(value)}
          </span>
        </div>
        <div className={`h-1.5 rounded-full bg-slate-100 overflow-hidden ${muted ? 'opacity-50' : ''}`}>
          <div
            className="h-full transition-all"
            style={{
              width: `${pct}%`,
              background: flagged ? '#1d4ed8' : value == null ? '#cbd5e1' : '#475569',
            }}
          />
        </div>
      </div>
    </div>
  )
}
