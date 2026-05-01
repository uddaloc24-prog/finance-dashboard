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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <header className="text-center mb-8 sm:mb-10">
          <div className="text-[10px] font-bold tracking-[4px] uppercase text-amber-700 mb-2.5">
            {isReturning ? `Welcome back · ${daysSince ?? 0} days` : 'Indian Retirement Planner · Version 2.0'}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-tight text-slate-900 leading-[1.05]">
            {isReturning
              ? <>Quick <em className="font-extrabold not-italic text-blue-700">refresher</em>?</>
              : <>Plan your retirement <em className="font-extrabold not-italic text-blue-700">with confidence.</em></>}
          </h1>
          <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            {isReturning
              ? `It's been ${daysSince ?? 0} days. Refresh below or jump back in.`
              : 'Four-bucket strategy · ten frameworks compared · Indian tax engine · Monte Carlo stress-tested.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <span className="h-px w-12 bg-amber-500/60" aria-hidden="true" />
            <span className="text-amber-700 text-[10px]">◆</span>
            <span className="h-px w-12 bg-amber-500/60" aria-hidden="true" />
          </div>
        </header>

        {/* ── 3×3 grid of compact section cards ─────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">

          {/* Row 1 — the offer */}
          <Cell num="01" eyebrow="Mission" tone="navy">
            <CellTitle>Plan with confidence.</CellTitle>
            <CellBody>A guided four-bucket withdrawal model — defensible, not a guess.</CellBody>
          </Cell>

          <Cell num="02" eyebrow="At a glance" tone="navy">
            <div className="grid grid-cols-2 gap-1.5">
              <Mini value="10" label="Strategies" />
              <Mini value="5"  label="Profiles" />
              <Mini value="200" label="MC paths" />
              <Mini value="24-25" label="Tax FY" />
            </div>
          </Cell>

          <Cell num="03" eyebrow="Time" tone="navy">
            <div className="text-3xl font-extrabold text-blue-700 leading-none mt-1">5 min</div>
            <CellBody className="mt-2">From corpus inputs to a downloadable take-home PDF.</CellBody>
          </Cell>

          {/* Row 2 — the challenge */}
          <Cell num="04" eyebrow="The challenge" tone="amber">
            <CellTitle>Inflation.</CellTitle>
            <CellBody>General 6.5% · healthcare 10% · education 12% — eats real purchasing power.</CellBody>
          </Cell>

          <Cell num="05" eyebrow="The challenge" tone="amber">
            <CellTitle>Indian tax.</CellTitle>
            <CellBody>Debt MFs at slab; equity LTCG only above ₹1.25L. The vehicle matters.</CellBody>
          </Cell>

          <Cell num="06" eyebrow="The challenge" tone="amber">
            <CellTitle>Sequence risk.</CellTitle>
            <CellBody>A year-5 crash permanently impairs even a "well-funded" plan.</CellBody>
          </Cell>

          {/* Row 3 — the answer */}
          <Cell num="07" eyebrow="The answer" tone="green">
            <CellTitle>Four buckets.</CellTitle>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100 my-2">
              <span className="bg-blue-500"   style={{ width: '10%' }} />
              <span className="bg-teal-500"   style={{ width: '20%' }} />
              <span className="bg-violet-500" style={{ width: '25%' }} />
              <span className="bg-orange-500" style={{ width: '45%' }} />
            </div>
            <div className="text-[10px] text-slate-600 tabular-nums">B1 10 · B2 20 · B3 25 · B4 45</div>
          </Cell>

          <Cell num="08" eyebrow="The answer" tone="green">
            <CellTitle>Guardrails.</CellTitle>
            <CellBody>Skip equity sales in losing years · freeze inflation below 85% · cut 10% below 70%.</CellBody>
          </Cell>

          <Cell num="09" eyebrow="The answer" tone="green">
            <CellTitle>Your verdict.</CellTitle>
            <CellBody>Personalised PDF with TOC, page borders, and your name on every page.</CellBody>
          </Cell>
        </div>

        {/* ── Identity form (compact) ─────────────────────────── */}
        <section className="mb-6">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700 tabular-nums">10</span>
            <span className="h-px flex-1 bg-gradient-to-r from-amber-500/60 to-transparent" aria-hidden="true" />
            <span className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700">About you</span>
          </div>
          <IdentityForm identity={identity} onChange={setIdentity} />
        </section>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <div className="text-center">
          <Button onClick={finalise} disabled={!canProceed} className="!px-7 !py-3 !text-sm">
            Start planning →
          </Button>
          <p className="text-[10px] text-slate-500 mt-2.5">
            Free · No signup · Everything stays in your browser
          </p>
          {!canProceed && (
            <p className="text-[10px] text-amber-700 mt-1">Enter your full name above to continue.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Cell primitives ───────────────────────────────────────────────────

type Tone = 'navy' | 'amber' | 'green'

const TONES: Record<Tone, { eyebrow: string; accent: string; border: string; borderHover: string; ring: string; barTop: string }> = {
  navy:  { eyebrow: 'text-blue-700',    accent: 'bg-blue-500',    border: 'border-blue-400',    borderHover: 'hover:border-blue-600',    ring: 'ring-blue-100',    barTop: 'bg-blue-600' },
  amber: { eyebrow: 'text-amber-700',   accent: 'bg-amber-500',   border: 'border-amber-400',   borderHover: 'hover:border-amber-600',   ring: 'ring-amber-100',   barTop: 'bg-amber-500' },
  green: { eyebrow: 'text-emerald-700', accent: 'bg-emerald-500', border: 'border-emerald-400', borderHover: 'hover:border-emerald-600', ring: 'ring-emerald-100', barTop: 'bg-emerald-600' },
}

function Cell({ num, eyebrow, tone, children }: { num: string; eyebrow: string; tone: Tone; children: ReactNode }) {
  const t = TONES[tone]
  return (
    <div className={`relative bg-white rounded-lg border-[3px] ${t.border} ${t.borderHover} ring-1 ring-inset ${t.ring} p-3.5 hover:shadow-md transition-all min-h-[150px] flex flex-col overflow-hidden`}>
      {/* Thick tone-colored top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${t.barTop}`} aria-hidden="true" />
      <div className="flex items-baseline gap-2 mb-2 pt-1">
        <span className={`text-[10px] font-bold tracking-[2px] tabular-nums ${t.eyebrow}`}>{num}</span>
        <span className={`w-1 h-1 rounded-full ${t.accent}`} aria-hidden="true" />
        <span className={`text-[10px] font-bold uppercase tracking-[2px] ${t.eyebrow}`}>{eyebrow}</span>
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  )
}

function CellTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
      {children}
    </div>
  )
}

function CellBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] text-slate-600 leading-snug mt-1 ${className}`}>
      {children}
    </p>
  )
}

function Mini({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-center">
      <div className="text-base font-extrabold text-blue-700 tabular-nums leading-none">{value}</div>
      <div className="text-[8px] text-slate-500 uppercase tracking-wide mt-0.5 font-semibold">{label}</div>
    </div>
  )
}

// ── Identity form (kept compact) ──────────────────────────────────────

interface IdentityFormProps {
  identity: UserIdentity
  onChange: (next: UserIdentity) => void
}

function IdentityForm({ identity, onChange }: IdentityFormProps) {
  const set = (patch: Partial<UserIdentity>) => onChange({ ...identity, ...patch })
  const setAddr = (patch: Partial<NonNullable<UserIdentity['address']>>) =>
    onChange({ ...identity, address: { ...(identity.address ?? { line1: '', city: '', state: '', pincode: '' }), ...patch } })

  const inputCls = 'w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 placeholder:text-slate-400'

  return (
    <div className="bg-white rounded-lg border-2 border-slate-300 ring-1 ring-inset ring-slate-100 p-4">
      <div className="grid sm:grid-cols-2 gap-2.5">
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
        <Field label="Date of birth">
          <input
            type="date"
            value={identity.dateOfBirth ?? ''}
            onChange={(e) => set({ dateOfBirth: e.target.value })}
            className={inputCls}
          />
        </Field>
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
        <Field label="Occupation">
          <input
            type="text"
            value={identity.occupation ?? ''}
            onChange={(e) => set({ occupation: e.target.value })}
            placeholder="Retired Civil Engineer"
            className={inputCls}
          />
        </Field>
      </div>

      {identity.maritalStatus === 'married' && (
        <div className="mt-2.5">
          <Field label="Spouse name">
            <input
              type="text"
              value={identity.spouseName ?? ''}
              onChange={(e) => set({ spouseName: e.target.value })}
              placeholder="Spouse's full name"
              className={inputCls}
            />
          </Field>
        </div>
      )}

      <div className="mt-2.5">
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
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Address (optional)</div>
        <div className="grid sm:grid-cols-2 gap-2">
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
            placeholder="Address line 2"
            className={inputCls}
          />
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
            className={`${inputCls} sm:col-span-2`}
          />
        </div>
      </div>

      <p className="text-[9px] text-slate-500 mt-3 leading-relaxed">
        All fields except the name are optional. Stored only in your browser; never transmitted off-device.
      </p>
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-0.5">
        <span className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {hint && <span className="text-[9px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </label>
  )
}
