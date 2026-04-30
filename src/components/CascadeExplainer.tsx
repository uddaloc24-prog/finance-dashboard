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
    sub: 'SCSS · Senior FD · Short Debt',
    pct: '20%',
    icon: '🏦',
    headline: 'Fixed income — interest flows to B1',
    why: "B2 holds SCSS (8.2%), Senior Citizen FDs (7.25–7.5%), and short-duration debt MFs. These are fixed-term instruments — your principal stays locked in, but the interest they earn (quarterly/monthly) is sent directly to B1 every year as a regular payment. Think of it like a pension that pays your B1 account.",
    doesnt_deplete: "B2's principal (the FD/SCSS amount) never shrinks in normal operation — only the interest leaves. The principal is only touched in a last-resort emergency if B1 runs completely dry.",
  },
  {
    id: 'b1',
    color: 'bg-blue-600',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    label: 'Bucket 1',
    sub: 'Liquid MF · Money Market · Overnight',
    pct: '10%',
    icon: '💵',
    headline: 'Your monthly spending account',
    why: "B1 is your 'salary account' in retirement. It holds only fully liquid instruments — Liquid MFs, Money Market MFs, Overnight Funds — that can be redeemed in T+1 day. Every year, B2's interest payment lands here, along with cascaded interest from B3 and B4. You withdraw from B1 every month.",
    doesnt_deplete: "B1 receives all cascaded interest from B2, B3, and B4 every year. As long as those interest payments cover your withdrawals, B1 stays healthy. The interest income from your entire ₹X Cr corpus is pooled here annually to fund your lifestyle.",
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
                  <p className="text-xs text-gray-400 text-center leading-tight">interest flows</p>
                </div>
                <div className="hidden sm:flex flex-col items-center">
                  <div className="flex items-center gap-0.5">
                    <div className="h-0.5 w-3 bg-gray-300" />
                    <svg className="w-2 h-3 text-gray-400" fill="currentColor" viewBox="0 0 8 12">
                      <path d="M8 6L0 0v12z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-center leading-tight whitespace-nowrap">interest<br/>flows</p>
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
        Each year: B4 equity earns returns → sends interest to B3 → B3 adds its own interest and passes all to B2 → B2 adds SCSS/FD interest and sends all to B1 → B1 funds your monthly withdrawals. Principals stay locked.
      </p>
    </Card>
  )
}
