import { useState, type ReactNode } from 'react'
import type { UserIdentity, MaritalStatus } from '../types/identity'
import { storage } from '../lib/storage'
import { Button } from './ui/Button'

interface Props {
  onStart: (identity: UserIdentity) => void
  isReturning?: boolean
  daysSince?: number
}

export function WelcomePage({ onStart, isReturning, daysSince }: Props) {
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

  const canProceed = identity.fullName.trim().length > 0

  const finalise = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <header className="text-center mb-12 sm:mb-14">
          <div className="text-[11px] font-bold tracking-[4px] uppercase text-amber-700 mb-3">
            {isReturning ? `Welcome back · ${daysSince ?? 0} days` : 'Indian Retirement Planner · Version 2.0'}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extralight tracking-tight text-slate-900 leading-[1.05]">
            {isReturning
              ? <>Quick <em className="font-extrabold not-italic text-blue-700">refresher</em>?</>
              : <>Plan your retirement <em className="font-extrabold not-italic text-blue-700">with confidence.</em></>}
          </h1>
          <p className="mt-5 text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            {isReturning
              ? `It's been ${daysSince ?? 0} days. Things may have changed — your inputs, the market, even the tax rules. Take a minute to refresh, or jump back in below.`
              : 'A guided four-bucket withdrawal strategy, tested against ten global frameworks and the Indian tax code — for retirees who want a defensible plan, not a guess.'}
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <span className="h-px w-16 bg-amber-500/60" aria-hidden="true" />
            <span className="text-amber-700 text-xs">◆</span>
            <span className="h-px w-16 bg-amber-500/60" aria-hidden="true" />
          </div>
        </header>

        <div className="space-y-12">

          {/* ── 01 — At a glance ─────────────────────────────── */}
          <Section num="01" eyebrow="At a glance" title={<>What you'll <em>get</em>.</>}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Strategies compared" value="10" />
              <Stat label="Risk profiles" value="5" />
              <Stat label="Monte Carlo paths" value="200" />
              <Stat label="Tax engine FY" value="24-25" />
            </div>
          </Section>

          <Divider />

          {/* ── 02 — The problem ─────────────────────────────── */}
          <Section num="02" eyebrow="The problem" title={<>The Indian retirement <em>income challenge.</em></>}>
            <p className="text-sm text-slate-600 mb-3">
              Standard "park it in FDs" advice loses two-thirds of its real purchasing power over 20 years. The 4% Rule was designed for US 60/40 portfolios. There is no "set and forget" answer for an Indian retiree.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <Bullet icon="↑" title="Inflation" text="General 6.5% · healthcare 10% · education 12%" />
              <Bullet icon="₹" title="Tax structure" text="Debt MFs at slab; equity LTCG only above ₹1.25L" />
              <Bullet icon="!" title="Sequence risk" text="A year-5 crash permanently impairs retirement plans" />
            </div>
          </Section>

          <Divider />

          {/* ── 03 — The solution ────────────────────────────── */}
          <Section num="03" eyebrow="The solution" title={<>A <em>four-bucket</em> strategy with guardrails.</>}>
            <p className="text-sm text-slate-600 mb-4">
              Split the corpus across four time horizons. B4 grows. B3 produces income. B1 is the cash buffer. B2 is the safety floor — held to maturity, untouched. Refills cascade automatically.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Bucket id="B1" label="Liquidity"   pct={10} color="bg-blue-500"   horizon="0–2 years"  desc="Cash buffer for monthly draws" />
              <Bucket id="B2" label="Fixed Floor" pct={20} color="bg-teal-500"   horizon="5-yr ladder" desc="SCSS, FDs, RBI bonds — untouched" />
              <Bucket id="B3" label="Stability"   pct={25} color="bg-violet-500" horizon="5–10 years"  desc="BAF / hybrid SWP source" />
              <Bucket id="B4" label="Growth"      pct={45} color="bg-orange-500" horizon="10+ years"   desc="Equity engine — refills B3 each year" />
            </div>
          </Section>

          <Divider />

          {/* ── 04 — How it works ────────────────────────────── */}
          <Section num="04" eyebrow="How it works" title={<>Five minutes <em>to your verdict.</em></>}>
            <p className="text-sm text-slate-600 mb-4">
              Walk through the dashboard tabs in order — or jump around freely. The Summary page synthesises everything into a single take-home recommendation, exportable as a personalised PDF.
            </p>
            <div className="space-y-2">
              <Step n="1" label="Plan"             desc="Enter corpus, monthly target, demographics" />
              <Step n="2" label="Profile"          desc="Take the 90-second risk quiz" />
              <Step n="3" label="Compare"          desc="See 10 strategies scored side-by-side" />
              <Step n="4" label="Buckets · Simulate" desc="Allocate, run Monte Carlo, verify success rate" />
              <Step n="5" label="Tax · Summary"    desc="Review tax + download your full plan" />
            </div>
          </Section>

          <Divider />

          {/* ── 05 — About you ───────────────────────────────── */}
          <Section num="05" eyebrow="About you" title={<>A few personal <em>details.</em></>}>
            <p className="text-sm text-slate-600 mb-4">
              Used to personalise the dashboard, stamp your downloadable PDF report, and pre-fill demographics. Stored only in your browser — never transmitted off-device.
            </p>
            <IdentityForm identity={identity} onChange={setIdentity} />
          </Section>

          <Divider final />

          {/* ── CTA ──────────────────────────────────────────── */}
          <div className="text-center pt-2 pb-4">
            <Button onClick={finalise} disabled={!canProceed} className="!px-8 !py-3.5 !text-base">
              Start planning →
            </Button>
            <p className="text-[11px] text-slate-500 mt-3">
              Free · No signup · Everything stays in your browser
            </p>
            {!canProceed && (
              <p className="text-[11px] text-amber-700 mt-1">Enter your full name above to continue.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Section primitives ────────────────────────────────────────────────

function Section({ num, eyebrow, title, children }: { num: string; eyebrow: string; title: ReactNode; children: ReactNode }) {
  return (
    <section>
      <header className="mb-4 sm:mb-5">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-[11px] font-bold tracking-[3px] uppercase text-amber-700 tabular-nums">{num}</span>
          <span className="h-px flex-1 bg-gradient-to-r from-amber-500/60 to-transparent" aria-hidden="true" />
          <span className="text-[11px] font-bold tracking-[3px] uppercase text-amber-700">{eyebrow}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extralight tracking-tight text-slate-900 leading-[1.15]">
          {title}
        </h2>
      </header>
      {children}
    </section>
  )
}

function Divider({ final }: { final?: boolean } = {}) {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-slate-200" />
      <span className={`w-1.5 h-1.5 rounded-full ${final ? 'bg-amber-500' : 'bg-slate-300'}`} />
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
      <div className="text-2xl sm:text-3xl font-bold text-blue-700 tabular-nums leading-none">{value}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1.5 font-semibold">{label}</div>
    </div>
  )
}

function Bullet({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 w-6 h-6 rounded-full bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center" aria-hidden="true">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-900">{title}</div>
          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{text}</p>
        </div>
      </div>
    </div>
  )
}

function Bucket({ id, label, pct, color, horizon, desc }: { id: string; label: string; pct: number; color: string; horizon: string; desc: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${color}`} aria-hidden="true" />
          <span className="text-sm font-bold text-slate-900">{id}</span>
          <span className="text-xs text-slate-700">{label}</span>
        </div>
        <span className="text-xs font-bold text-slate-700 tabular-nums">{pct}%</span>
      </div>
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-1.5">
        <div className={`h-full ${color}`} style={{ width: `${pct * 2}%` }} />
      </div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-slate-700">{desc}</span>
        <span className="text-slate-400 tabular-nums shrink-0 ml-2">{horizon}</span>
      </div>
    </div>
  )
}

function Step({ n, label, desc }: { n: string; label: string; desc: string }) {
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

// ── Identity form (unchanged from before) ─────────────────────────────

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
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-3">
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

      <div className="pt-2 border-t border-slate-100">
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

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
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
