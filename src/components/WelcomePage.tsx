import { useState, useEffect } from 'react'
import { Button } from './ui/Button'

interface Props {
  onStart: () => void
  isReturning?: boolean    // true if user has been here before (≥ 1 week ago)
  daysSince?: number        // days since last visit (for "welcome back")
}

interface Step {
  eyebrow: string
  heading: React.ReactNode
  body: React.ReactNode
  panel: React.ReactNode
}

export function WelcomePage({ onStart, isReturning, daysSince }: Props) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd')
  const [animKey, setAnimKey] = useState(0)

  // Bump anim key on step change so React re-mounts the panel and the
  // CSS keyframe re-fires (giving us the slide-fade transition).
  useEffect(() => { setAnimKey((k) => k + 1) }, [step])

  const steps: Step[] = [
    {
      eyebrow: isReturning ? 'Welcome back' : 'Welcome',
      heading: isReturning ? (
        <>It's been <span className="font-bold text-blue-700">{daysSince ?? 0} days</span>.<br />Quick refresher?</>
      ) : (
        <>Plan your retirement<br /><span className="font-bold text-blue-700">with confidence.</span></>
      ),
      body: isReturning
        ? `Things may have changed since you were last here — your inputs, the market, even the tax rules. Take 60 seconds to step through what this tool does, or jump straight back to your dashboard.`
        : `A guided four-bucket withdrawal strategy, tested against ten global frameworks and the Indian tax code — for retirees who want a defensible plan, not a guess.`,
      panel: <HeroPanel />,
    },
    {
      eyebrow: 'The problem',
      heading: <>The Indian retirement<br /><span className="font-bold text-blue-700">income challenge.</span></>,
      body: `Standard "park it in FDs" advice loses two-thirds of its real purchasing power over 20 years. The 4% Rule was designed for US 60/40 portfolios. There is no "set and forget" answer for an Indian retiree.`,
      panel: (
        <div className="space-y-3">
          <Bullet icon="↑" text="Inflation eats principal — general 6.5%, healthcare 10%, education 12%." />
          <Bullet icon="₹" text="Tax favours equity over debt — debt MFs at slab, equity LTCG only 12.5% above ₹1.25L." />
          <Bullet icon="!" text="Sequence-of-returns risk — a year-5 crash permanently impairs even a well-funded plan." />
        </div>
      ),
    },
    {
      eyebrow: 'The solution',
      heading: <>A <span className="font-bold text-blue-700">four-bucket</span> strategy with guardrails.</>,
      body: `Split the corpus across four time horizons. B4 grows. B3 produces income. B1 is the cash buffer. B2 is the safety floor — held to maturity, untouched. Refills cascade automatically.`,
      panel: <BucketPanel />,
    },
    {
      eyebrow: 'How it works',
      heading: <>Five minutes <span className="font-bold text-blue-700">to your verdict.</span></>,
      body: `Walk through the dashboard tabs in order — or jump around freely. The Summary page synthesises everything into a single take-home recommendation.`,
      panel: (
        <div className="space-y-3">
          <NumberStep n="1" label="Plan" desc="Enter corpus, monthly target, demographics" />
          <NumberStep n="2" label="Profile" desc="Take the 90-second risk quiz" />
          <NumberStep n="3" label="Compare" desc="See 10 strategies scored side-by-side" />
          <NumberStep n="4" label="Simulate" desc="Run Monte Carlo, verify success rate" />
          <NumberStep n="5" label="Tax · Summary" desc="Review tax + see the final verdict" />
        </div>
      ),
    },
  ]

  const cur = steps[step]
  const isLast = step === steps.length - 1

  const handleNext = () => {
    if (isLast) {
      onStart()
    } else {
      setDirection('fwd')
      setStep(step + 1)
    }
  }
  const handleBack = () => {
    setDirection('back')
    setStep(Math.max(0, step - 1))
  }
  const handleSkip = () => onStart()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col">
      {/* Top progress dots */}
      <div className="pt-6 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-[2px] uppercase text-blue-700">
            {cur.eyebrow}
          </div>
          <div className="flex items-center gap-1.5" aria-label="Progress">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-blue-600' : i < step ? 'w-1.5 bg-blue-600' : 'w-1.5 bg-slate-300'
                }`}
                aria-current={i === step ? 'step' : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="text-[11px] text-slate-500 hover:text-slate-800 underline"
          >
            Skip intro
          </button>
        </div>
      </div>

      {/* Main panel */}
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="max-w-3xl w-full">
          <div
            key={animKey}
            className={`grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-center ${direction === 'fwd' ? 'wp-anim-fwd' : 'wp-anim-back'}`}
          >
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-slate-900 leading-tight">
                {cur.heading}
              </h1>
              <p className="text-base text-slate-600 mt-5 leading-relaxed max-w-md">
                {cur.body}
              </p>
            </div>
            <div>
              {cur.panel}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom controls */}
      <footer className="px-6 pb-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className="text-sm text-slate-600 hover:text-slate-900 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors px-2 py-2"
          >
            ← Back
          </button>

          <div className="text-[11px] text-slate-500 tabular-nums">
            {step + 1} of {steps.length}
          </div>

          <Button onClick={handleNext} className="!px-6 !py-2.5">
            {isLast ? 'Start planning →' : 'Next →'}
          </Button>
        </div>
      </footer>

      {/* Inline keyframes for slide-fade transitions */}
      <style>{`
        @keyframes wpFwd {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes wpBack {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .wp-anim-fwd  { animation: wpFwd 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        .wp-anim-back { animation: wpBack 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
      `}</style>
    </div>
  )
}

// ── Sub-panels ────────────────────────────────────────────────────────

function HeroPanel() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat label="Strategies compared" value="10" />
      <Stat label="Risk profiles" value="5" />
      <Stat label="Monte Carlo paths" value="200" />
      <Stat label="Tax engine FY" value="24-25" />
    </div>
  )
}

function BucketPanel() {
  const buckets = [
    { id: 'B1', label: 'Liquidity',   pct: 10, color: 'bg-blue-500',   desc: '0–2 yr cash buffer' },
    { id: 'B2', label: 'Fixed Floor', pct: 20, color: 'bg-teal-500',   desc: '5-yr ladder, untouched' },
    { id: 'B3', label: 'Stability',   pct: 25, color: 'bg-violet-500', desc: 'BAF / hybrid SWP' },
    { id: 'B4', label: 'Growth',      pct: 45, color: 'bg-orange-500', desc: 'Equity refill engine' },
  ]
  return (
    <div className="space-y-2">
      {buckets.map((b) => (
        <div key={b.id} className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${b.color}`} aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-900">{b.id} · {b.label}</span>
            </div>
            <span className="text-xs font-bold text-slate-700 tabular-nums">{b.pct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
            <div className={`h-full ${b.color}`} style={{ width: `${b.pct * 2}%` }} />
          </div>
          <div className="text-[11px] text-slate-500">{b.desc}</div>
        </div>
      ))}
    </div>
  )
}

function Bullet({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3.5 flex gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      <p className="text-xs text-slate-700 leading-relaxed flex-1">{text}</p>
    </div>
  )
}

function NumberStep({ n, label, desc }: { n: string; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 px-3.5 py-2.5">
      <span className="shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="text-[11px] text-slate-500">{desc}</div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
      <div className="text-3xl font-bold text-blue-700 tabular-nums">{value}</div>
      <div className="text-[11px] text-slate-500 uppercase tracking-wide mt-1 font-medium">{label}</div>
    </div>
  )
}
