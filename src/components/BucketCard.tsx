import { Badge } from './ui/Badge'
import { Card } from './ui/Card'
import { BUCKET_INSTRUMENTS, BUCKET_HORIZON } from '../constants'

interface Props {
  id: 'b1' | 'b2' | 'b3' | 'b4'
  value: number
  total: number
  returnAssumption: number
  runway?: number  // only for b1
}

const CONFIG = {
  b1: {
    label: 'Bucket 1',
    subtitle: 'Emergency · 0–1 Year',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    bar: 'bg-blue-500',
    text: 'text-blue-700',
    badge: 'blue' as const,
  },
  b2: {
    label: 'Bucket 2',
    subtitle: 'Short Term · 1–5 Years',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    bar: 'bg-amber-500',
    text: 'text-amber-700',
    badge: 'amber' as const,
  },
  b3: {
    label: 'Bucket 3',
    subtitle: 'Growth Engine · 5–10 Years',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    bar: 'bg-emerald-500',
    text: 'text-emerald-700',
    badge: 'green' as const,
  },
  b4: {
    label: 'Bucket 4',
    subtitle: 'Legacy Equity · 10+ Years',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    bar: 'bg-purple-500',
    text: 'text-purple-700',
    badge: 'purple' as const,
  },
}

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

export function BucketCard({ id, value, total, returnAssumption, runway }: Props) {
  const cfg = CONFIG[id]
  const pct = total > 0 ? (value / total) * 100 : 0

  return (
    <Card className={`border ${cfg.border}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`font-bold text-lg ${cfg.text}`}>{cfg.label}</h3>
          <p className="text-xs text-gray-500">{cfg.subtitle}</p>
        </div>
        <Badge variant={cfg.badge}>{BUCKET_HORIZON[id]}</Badge>
      </div>

      {/* Value */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-gray-900">{INR(value)}</div>
        <div className="text-sm text-gray-400 mt-0.5">{pct.toFixed(1)}% of corpus</div>
      </div>

      {/* Fill bar */}
      <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${cfg.bar}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* Instruments */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {BUCKET_INSTRUMENTS[id].map((inst) => (
          <span
            key={inst}
            className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} font-medium`}
          >
            {inst}
          </span>
        ))}
      </div>

      {/* Return assumption */}
      <div className="flex items-center justify-between text-sm border-t pt-3">
        <span className="text-gray-500">Assumed return</span>
        <span className={`font-semibold ${cfg.text}`}>{returnAssumption}% p.a.</span>
      </div>

      {/* B1 runway */}
      {id === 'b1' && runway !== undefined && (
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-gray-500">SWP runway</span>
          <span className={`font-semibold ${runway < 6 ? 'text-red-600' : runway < 12 ? 'text-amber-600' : 'text-green-600'}`}>
            {runway} months
          </span>
        </div>
      )}
    </Card>
  )
}
