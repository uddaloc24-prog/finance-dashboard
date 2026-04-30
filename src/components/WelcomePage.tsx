import { useState, useEffect } from 'react'
import type { UserIdentity, MaritalStatus } from '../types/identity'
import { storage } from '../lib/storage'
import { Button } from './ui/Button'

interface Props {
  onStart: (identity: UserIdentity) => void
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

  // Identity form state — pre-populated from storage if user is returning
  const existing = storage.getIdentity()
  const [identity, setIdentity] = useState<UserIdentity>(() =>
    existing ?? {
      fullName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      panCard: '',
      maritalStatus: undefined,
      spouseName: '',
      occupation: '',
      address: { line1: '', line2: '', city: '', state: '', pincode: '' },
      createdAt: '',
      updatedAt: '',
    },
  )

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
      body: `Walk through the dashboard tabs in order — or jump around freely. The Summary page synthesises everything into a single take-home recommendation, exportable as a personalised PDF.`,
      panel: (
        <div className="space-y-3">
          <NumberStep n="1" label="Plan" desc="Enter corpus, monthly target, demographics" />
          <NumberStep n="2" label="Profile" desc="Take the 90-second risk quiz" />
          <NumberStep n="3" label="Compare" desc="See 10 strategies scored side-by-side" />
          <NumberStep n="4" label="Simulate" desc="Run Monte Carlo, verify success rate" />
          <NumberStep n="5" label="Tax · Summary" desc="Review tax + download your full plan" />
        </div>
      ),
    },
    {
      eyebrow: 'About you',
      heading: <>A few personal <span className="font-bold text-blue-700">details.</span></>,
      body: `Used to personalise the dashboard, stamp your downloadable PDF report, and pre-fill demographics. Stored only in your browser — never transmitted off-device.`,
      panel: <IdentityForm identity={identity} onChange={setIdentity} />,
    },
  ]

  const cur = steps[step]
  const isLast = step === steps.length - 1
  const isIdentityStep = isLast    // identity form is the last step
  const canProceed = !isIdentityStep || identity.fullName.trim().length > 0

  const finalise = () => {
    const now = new Date().toISOString()
    const out: UserIdentity = {
      ...identity,
      fullName: identity.fullName.trim(),
      createdAt: identity.createdAt || now,
      updatedAt: now,
    }
    storage.setIdentity(out)
    onStart(out)
  }

  const handleNext = () => {
    if (isLast) {
      if (!canProceed) return
      finalise()
    } else {
      setDirection('fwd')
      setStep(step + 1)
    }
  }
  const handleBack = () => {
    setDirection('back')
    setStep(Math.max(0, step - 1))
  }
  const handleSkip = () => {
    // Skipping still saves whatever the user has entered (likely empty)
    const now = new Date().toISOString()
    const out: UserIdentity = {
      ...identity,
      fullName: identity.fullName.trim() || 'Anonymous',
      createdAt: identity.createdAt || now,
      updatedAt: now,
    }
    storage.setIdentity(out)
    onStart(out)
  }

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

          <Button onClick={handleNext} disabled={!canProceed} className="!px-6 !py-2.5">
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

interface IdentityFormProps {
  identity: UserIdentity
  onChange: (next: UserIdentity) => void
}

function IdentityForm({ identity, onChange }: IdentityFormProps) {
  const set = (patch: Partial<UserIdentity>) => onChange({ ...identity, ...patch })
  const setAddr = (patch: Partial<NonNullable<UserIdentity['address']>>) =>
    onChange({ ...identity, address: { ...(identity.address ?? { line1: '', city: '', state: '', pincode: '' }), ...patch } })

  const inputCls = 'w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 placeholder:text-slate-400'

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 max-h-[440px] overflow-y-auto space-y-3">
      <Field label="Full name" required>
        <input
          type="text"
          value={identity.fullName}
          onChange={(e) => set({ fullName: e.target.value })}
          placeholder="e.g. Anand Kumar"
          className={inputCls}
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Date of birth">
          <input
            type="date"
            value={identity.dateOfBirth ?? ''}
            onChange={(e) => set({ dateOfBirth: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Marital status">
          <select
            value={identity.maritalStatus ?? ''}
            onChange={(e) => set({ maritalStatus: (e.target.value || undefined) as MaritalStatus })}
            className={inputCls}
          >
            <option value="">—</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </Field>
      </div>
      {identity.maritalStatus === 'married' && (
        <Field label="Spouse name">
          <input
            type="text"
            value={identity.spouseName ?? ''}
            onChange={(e) => set({ spouseName: e.target.value })}
            placeholder="Spouse's full name"
            className={inputCls}
          />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Email">
          <input
            type="email"
            value={identity.email ?? ''}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="you@example.com"
            className={inputCls}
          />
        </Field>
        <Field label="Phone">
          <input
            type="tel"
            value={identity.phone ?? ''}
            onChange={(e) => set({ phone: e.target.value })}
            placeholder="+91 90000 00000"
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Occupation">
        <input
          type="text"
          value={identity.occupation ?? ''}
          onChange={(e) => set({ occupation: e.target.value })}
          placeholder="e.g. Retired Civil Engineer"
          className={inputCls}
        />
      </Field>
      <Field label="PAN" hint="Optional. Used only on the printed PDF report.">
        <input
          type="text"
          value={identity.panCard ?? ''}
          onChange={(e) => set({ panCard: e.target.value.toUpperCase() })}
          placeholder="ABCDE1234F"
          maxLength={10}
          className={`${inputCls} uppercase tracking-wider`}
        />
      </Field>
      <div className="pt-1.5 border-t border-slate-100">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Address</div>
        <div className="space-y-2">
          <input
            type="text"
            value={identity.address?.line1 ?? ''}
            onChange={(e) => setAddr({ line1: e.target.value })}
            placeholder="Address line 1"
            className={inputCls}
          />
          <input
            type="text"
            value={identity.address?.line2 ?? ''}
            onChange={(e) => setAddr({ line2: e.target.value })}
            placeholder="Address line 2 (optional)"
            className={inputCls}
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={identity.address?.city ?? ''}
              onChange={(e) => setAddr({ city: e.target.value })}
              placeholder="City"
              className={inputCls}
            />
            <input
              type="text"
              value={identity.address?.state ?? ''}
              onChange={(e) => setAddr({ state: e.target.value })}
              placeholder="State"
              className={inputCls}
            />
            <input
              type="text"
              value={identity.address?.pincode ?? ''}
              onChange={(e) => setAddr({ pincode: e.target.value.replace(/[^0-9]/g, '') })}
              placeholder="Pincode"
              maxLength={6}
              className={inputCls}
            />
          </div>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed">
        All fields except the name are optional. Data is stored only in your browser and never transmitted off your device. You can edit any of these later from the dashboard header.
      </p>
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </label>
  )
}
