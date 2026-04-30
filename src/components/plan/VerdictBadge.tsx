import type { VerdictKind } from '../../types/v2'

interface VerdictBadgeProps {
  kind: VerdictKind
  headline: string
}

const palette: Record<VerdictKind, { bg: string; text: string; ring: string; label: string }> = {
  achievable: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    ring: 'ring-green-200',
    label: 'Achievable',
  },
  'achievable-with-adjustments': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    ring: 'ring-amber-200',
    label: 'Close — tweak needed',
  },
  'not-achievable': {
    bg: 'bg-red-50',
    text: 'text-red-800',
    ring: 'ring-red-200',
    label: 'Not achievable',
  },
}

export function VerdictBadge({ kind, headline }: VerdictBadgeProps) {
  const p = palette[kind]
  return (
    <div className={`rounded-xl ring-1 ${p.ring} ${p.bg} px-4 py-3`}>
      <div className={`text-[11px] uppercase tracking-wide font-semibold ${p.text}`}>
        {p.label}
      </div>
      <div className={`mt-1 text-base font-medium ${p.text}`}>{headline}</div>
    </div>
  )
}
