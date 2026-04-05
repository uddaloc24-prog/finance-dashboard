import { useState } from 'react'
import { Card } from './ui/Card'

const STEPS = [
  {
    id: 'b4',
    color: 'bg-purple-600',
    lightBg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    label: 'Bucket 4',
    sub: 'Equity / Flexi Cap',
    pct: '40%',
    icon: '📈',
    headline: 'Grows the most, touched the least',
    why: "B4 is invested in equity mutual funds (Flexi Cap, Large Cap). Equity grows at ~12% a year over the long term. We never spend the original amount you put in — only the profit it earns gets moved to B3. This is why B4 stays roughly intact: the principal keeps compounding while profits flow down.",
    doesnt_deplete: "Only accumulated profits above the original amount are ever moved. The principal stays invested and keeps growing.",
  },
  {
    id: 'b3',
    color: 'bg-emerald-600',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    label: 'Bucket 3',
    sub: 'Hybrid / BAF',
    pct: '30%',
    icon: '⚙️',
    headline: 'The engine that keeps everything running',
    why: "B3 holds Balanced Advantage Funds (BAF) and hybrid funds. These automatically shift between stocks and bonds based on market conditions — so they grow steadily at ~9–10% without the wild swings of pure equity. B3's job is to refill B2 whenever B2 runs low, and it gets topped up by B4's profits.",
    doesnt_deplete: "B3 earns ~9.5% annually on its own balance, and periodically receives profits from B4. It only gives money to B2 when B2 needs it — it doesn't drain continuously.",
  },
  {
    id: 'b2',
    color: 'bg-amber-500',
    lightBg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    label: 'Bucket 2',
    sub: 'Short-term Debt',
    pct: '20%',
    icon: '🔄',
    headline: 'Buffer between growth and spending',
    why: "B2 holds short-term debt funds and corporate bonds — safe, stable ~8% returns. It's the go-between: B3 refills it, and it refills B1. This separation protects your spending money (B1) from having to depend directly on equity markets.",
    doesnt_deplete: "B2 earns ~8% on its own, receives top-ups from B3, and only moves money to B1 when B1 drops below 1 year of expenses.",
  },
  {
    id: 'b1',
    color: 'bg-blue-600',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    label: 'Bucket 1',
    sub: 'Liquid / SCSS / FD',
    pct: '10%',
    icon: '💵',
    headline: 'Your monthly spending account',
    why: "B1 is your 'salary account' in retirement. It holds liquid funds, SCSS, and senior FDs — safe, instantly accessible. You withdraw from B1 every month. When it drops below 1 year of expenses, B2 automatically tops it back up to 2 years.",
    doesnt_deplete: "B2 keeps B1 topped up to a 2-year buffer. B1 drains slowly month by month, but gets refilled before it runs out.",
  },
]

export function CascadeExplainer() {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">How Your Money Flows</h2>
          <p className="text-xs text-gray-400 mt-0.5">Tap any bucket to understand its role</p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">4-bucket cascade</span>
      </div>

      {/* Flow diagram */}
      <div className="flex flex-col sm:flex-row items-center gap-0 sm:gap-0 mb-4">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex flex-col sm:flex-row items-center flex-1 w-full sm:w-auto">
            {/* Bucket pill */}
            <button
              onClick={() => setOpenId(openId === step.id ? null : step.id)}
              className={`w-full sm:flex-1 rounded-xl border-2 p-3 text-left transition-all ${step.lightBg} ${
                openId === step.id ? step.border + ' shadow-md' : 'border-transparent hover:' + step.border
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{step.icon}</span>
                <div>
                  <p className={`text-xs font-bold ${step.text}`}>{step.label} · {step.pct}</p>
                  <p className="text-xs text-gray-500">{step.sub}</p>
                </div>
              </div>
              <p className={`text-xs font-medium ${step.text}`}>{step.headline}</p>
            </button>

            {/* Arrow between buckets */}
            {i < STEPS.length - 1 && (
              <div className="flex flex-col sm:flex-row items-center my-1 sm:my-0 sm:mx-1 shrink-0">
                {/* vertical on mobile, horizontal on desktop */}
                <div className="flex sm:hidden flex-col items-center gap-0.5">
                  <div className="w-0.5 h-3 bg-gray-300" />
                  <svg className="w-3 h-2 text-gray-400" fill="currentColor" viewBox="0 0 12 8">
                    <path d="M6 8L0 0h12z" />
                  </svg>
                  <p className="text-xs text-gray-400 text-center leading-tight">profits flow</p>
                </div>
                <div className="hidden sm:flex flex-col items-center">
                  <div className="flex items-center gap-0.5">
                    <div className="h-0.5 w-3 bg-gray-300" />
                    <svg className="w-2 h-3 text-gray-400" fill="currentColor" viewBox="0 0 8 12">
                      <path d="M8 6L0 0v12z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-center leading-tight whitespace-nowrap">profits<br/>flow</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* You */}
        <div className="flex flex-col sm:flex-row items-center mt-1 sm:mt-0">
          <div className="flex sm:hidden flex-col items-center gap-0.5">
            <div className="w-0.5 h-3 bg-gray-300" />
            <svg className="w-3 h-2 text-gray-400" fill="currentColor" viewBox="0 0 12 8">
              <path d="M6 8L0 0h12z" />
            </svg>
          </div>
          <div className="hidden sm:flex items-center gap-0.5 mx-1">
            <div className="h-0.5 w-3 bg-gray-300" />
            <svg className="w-2 h-3 text-gray-400" fill="currentColor" viewBox="0 0 8 12">
              <path d="M8 6L0 0v12z" />
            </svg>
          </div>
          <div className="bg-gray-900 rounded-xl px-4 py-3 text-center shrink-0">
            <p className="text-white text-xs font-bold">You</p>
            <p className="text-gray-300 text-xs">monthly SWP</p>
          </div>
        </div>
      </div>

      {/* Expanded explanation */}
      {openId && (() => {
        const step = STEPS.find(s => s.id === openId)!
        return (
          <div className={`rounded-xl border p-4 mt-2 ${step.lightBg} ${step.border}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">{step.icon}</span>
              <div className="space-y-3">
                <div>
                  <p className={`text-sm font-bold ${step.text}`}>{step.label} — {step.headline}</p>
                  <p className="text-sm text-gray-600 mt-1">{step.why}</p>
                </div>
                <div className={`border-t ${step.border} pt-3`}>
                  <p className={`text-xs font-semibold ${step.text} mb-1`}>Why doesn't it run out?</p>
                  <p className="text-xs text-gray-600">{step.doesnt_deplete}</p>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Summary */}
      <p className="text-xs text-gray-400 mt-4 text-center">
        Market crashes hurt B4 short-term, but B1 + B2 cover 3+ years of spending — giving B4 time to recover without forced selling.
      </p>
    </Card>
  )
}
