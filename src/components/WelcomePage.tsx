import { useState, type ReactNode } from 'react'
import type { UserIdentity, MaritalStatus } from '../types/identity'
import { storage } from '../lib/storage'
import { Button } from './ui/Button'
import { UploadSection } from './UploadSection'
import { SetupReplica } from './SetupReplica'

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

        {/* ── Three circular clusters — Mission · Challenge · Answer ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-3 mb-8 justify-items-center">
          <CircleCluster
            theme="navy"
            hubLabel="The Offer"
            hubTag="01·02·03"
            satellites={[
              { num: '01', title: 'Plan with confidence', tag: 'Mission',     body: 'A guided four-bucket withdrawal model — defensible, not a guess.' },
              { num: '02', title: '10 strategies · 5 profiles', tag: 'At a glance', body: '200 Monte Carlo paths · FY 24-25 Indian tax engine.' },
              { num: '03', title: '5 min',                tag: 'Time',        body: 'From corpus inputs to a downloadable take-home PDF.' },
            ]}
          />
          <CircleCluster
            theme="amber"
            hubLabel="The Challenge"
            hubTag="04·05·06"
            satellites={[
              { num: '04', title: 'Inflation',     tag: 'Erosion',     body: 'General 6.5% · healthcare 10% · education 12% — eats real purchasing power.' },
              { num: '05', title: 'Indian tax',    tag: 'Vehicle drag', body: 'Debt MFs at slab; equity LTCG only above ₹1.25L. The vehicle matters.' },
              { num: '06', title: 'Sequence risk', tag: 'Timing',      body: 'A year-5 crash permanently impairs even a "well-funded" plan.' },
            ]}
          />
          <CircleCluster
            theme="green"
            hubLabel="The Answer"
            hubTag="07·08·09"
            satellites={[
              { num: '07', title: 'Four buckets', tag: 'B1·B2·B3·B4', body: '10 / 20 / 25 / 45 split — staged liquidity, debt, hybrid, growth.' },
              { num: '08', title: 'Guardrails',   tag: 'Safety net',  body: 'Skip equity sales in down years · freeze inflation below 85% · cut 10% below 70%.' },
              { num: '09', title: 'Your verdict', tag: 'PDF report',  body: 'Personalised PDF with TOC, page borders, and your name on every page.' },
            ]}
          />
        </div>

        {/* ── The Setup — Claude.ai Project install (4 steps) ────────── */}
        <section className="mb-10">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-[10px] font-bold tracking-[3px] uppercase text-indigo-700 tabular-nums">★</span>
            <span className="h-px flex-1 bg-gradient-to-r from-indigo-500/60 to-transparent" aria-hidden="true" />
            <span className="text-[10px] font-bold tracking-[3px] uppercase text-indigo-700">The Setup</span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-extralight tracking-tight text-slate-900 leading-tight">
            Or run it as a <em className="not-italic font-extrabold text-indigo-700">Claude.ai Project</em> — same logic, chat-driven, ~5 minutes to install.
          </h2>
          <p className="text-[12px] text-slate-600 mt-1.5 max-w-2xl leading-snug">
            The four-bucket engine is also packaged as a Claude.ai Project. Walk through the same 7 sections in plain English, get the same verdict — no web app needed.
          </p>

          {/* 4-step strip */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_24px_1fr_24px_1fr_24px_1fr] gap-y-4 items-start">
            <SetupStep num="1" title="Create a Project"      body="claude.ai → Projects → New Project. Name it &ldquo;Retirement Planner&rdquo;." />
            <StepArrow />
            <SetupStep num="2" title="Add Custom Instructions" body="Paste system-prompt.md (everything below the --- line)." />
            <StepArrow />
            <SetupStep num="3" title="Upload Knowledge files"  body="5 .md files: plan-structure · cashflow · engine rules · schema · verdict." />
            <StepArrow />
            <SetupStep num="4" title="Start a chat"            body="&ldquo;Help me plan my retirement.&rdquo; Claude walks you through all 7 sections." />
          </div>

          <p className="text-[10px] text-slate-500 italic mt-4">
            Source: <code className="font-mono text-slate-700">Claude/Projects/Financial Planning/README.md</code> § "Setting up the Claude.ai Project".
          </p>
        </section>

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

        {/* ── Upload an existing plan ─────────────────────────── */}
        <UploadSection />

        {/* ── Setup page replica — full v10 Adaptive psychometric setup ── */}
        <SetupReplica />
      </div>
    </div>
  )
}

// ── Circular cluster primitives ───────────────────────────────────────

type Tone = 'navy' | 'amber' | 'green'

interface ToneSpec {
  hubBody: string         // tailwind gradient classes for the central hub
  hubLip: string          // box-shadow rgb() for the hub's bottom lip
  satBorder: string       // satellite border colour (Tailwind)
  satLip: string          // satellite bottom-lip rgb()
  satText: string         // satellite text colour (Tailwind)
  satTagBg: string        // satellite tag chip background
  dashedRing: string      // decorative connector ring colour
}

const TONES_3D: Record<Tone, ToneSpec> = {
  navy: {
    hubBody: 'from-blue-400 via-blue-600 to-blue-800',
    hubLip:  'rgb(30,58,138)',
    satBorder: 'border-blue-500',
    satLip:    'rgb(30,58,138)',
    satText:   'text-blue-700',
    satTagBg:  'bg-blue-50 text-blue-700',
    dashedRing: 'border-blue-200',
  },
  amber: {
    hubBody: 'from-amber-400 via-amber-500 to-amber-700',
    hubLip:  'rgb(120,53,15)',
    satBorder: 'border-amber-500',
    satLip:    'rgb(120,53,15)',
    satText:   'text-amber-700',
    satTagBg:  'bg-amber-50 text-amber-700',
    dashedRing: 'border-amber-200',
  },
  green: {
    hubBody: 'from-emerald-400 via-emerald-500 to-emerald-700',
    hubLip:  'rgb(6,78,59)',
    satBorder: 'border-emerald-500',
    satLip:    'rgb(6,78,59)',
    satText:   'text-emerald-700',
    satTagBg:  'bg-emerald-50 text-emerald-700',
    dashedRing: 'border-emerald-200',
  },
}

interface Satellite { num: string; title: string; tag: string; body: string }

/** A circular cluster — central 3D hub orbited by three satellite circles. */
function CircleCluster({ theme, hubLabel, hubTag, satellites }: {
  theme: Tone
  hubLabel: string
  hubTag: string
  satellites: [Satellite, Satellite, Satellite]
}) {
  const t = TONES_3D[theme]
  // Satellites at 12, 4, 8 o'clock — clean triangle around the hub.
  const angles = [-90, 30, 150]
  const radius = 122       // px from center to satellite center
  return (
    <div className="relative w-[320px] h-[320px] sm:w-[340px] sm:h-[340px]">
      {/* Decorative connector ring */}
      <div className={`absolute inset-[24%] rounded-full border-2 border-dashed ${t.dashedRing}`} aria-hidden="true" />

      {/* Central 3D hub */}
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[108px] h-[108px] rounded-full flex flex-col items-center justify-center text-center bg-gradient-to-b ${t.hubBody} text-white border border-black/15 select-none`}
        style={{
          boxShadow: `0 5px 0 0 ${t.hubLip}, 0 10px 18px -4px rgba(15,23,42,0.40), inset 0 2px 0 rgba(255,255,255,0.45), inset 0 -2px 0 rgba(0,0,0,0.22)`,
          textShadow: '0 1px 1px rgba(0,0,0,0.45)',
        }}
      >
        <span className="text-[9px] font-bold tracking-[2.5px] uppercase opacity-90">{hubTag}</span>
        <span className="font-serif italic text-base font-extrabold leading-tight mt-0.5 px-2">{hubLabel}</span>
      </div>

      {/* Three satellites */}
      {satellites.map((s, i) => {
        const a = angles[i] * Math.PI / 180
        const x = Math.cos(a) * radius
        const y = Math.sin(a) * radius
        return (
          <div
            key={s.num}
            className="absolute"
            style={{ left: '50%', top: '50%', transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))` }}
          >
            <CircleNode tone={t} sat={s} />
          </div>
        )
      })}
    </div>
  )
}

// ── Setup-strip primitives (indigo tone — separate from the 3 clusters) ──

function SetupStep({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center text-center px-2">
      <div
        className="relative w-[88px] h-[88px] rounded-full bg-white border-[3px] border-indigo-500 flex items-center justify-center select-none mb-2"
        style={{
          boxShadow: '0 5px 0 0 rgb(49,46,129), 0 10px 16px -4px rgba(15,23,42,0.30), inset 0 2px 0 rgba(255,255,255,0.95)',
        }}
      >
        <span className="font-serif italic text-3xl font-extrabold tabular-nums text-indigo-700 leading-none">{num}</span>
      </div>
      <div className="font-serif italic text-[14px] font-extrabold text-slate-900 leading-tight">{title}</div>
      <p
        className="text-[11px] text-slate-600 leading-snug mt-1 max-w-[180px]"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </div>
  )
}

function StepArrow() {
  return (
    <div className="hidden lg:flex items-center justify-center pt-10">
      <span className="text-indigo-400 text-xl font-bold select-none" aria-hidden="true">→</span>
    </div>
  )
}

function CircleNode({ tone, sat }: { tone: ToneSpec; sat: Satellite }) {
  return (
    <div
      className={`relative w-[120px] h-[120px] rounded-full bg-white border-[3px] ${tone.satBorder} flex flex-col items-center justify-center text-center px-3 select-none`}
      title={sat.body}
      style={{
        boxShadow: `0 5px 0 0 ${tone.satLip}, 0 10px 16px -4px rgba(15,23,42,0.28), inset 0 2px 0 rgba(255,255,255,0.92), inset 0 -2px 4px rgba(15,23,42,0.05)`,
      }}
    >
      <div className={`text-[9px] font-bold tracking-[2px] tabular-nums opacity-80 ${tone.satText}`}>{sat.num}</div>
      <div className={`font-serif italic text-[13px] font-extrabold leading-tight ${tone.satText}`}>{sat.title}</div>
      <div className={`mt-1 inline-block text-[8px] font-bold uppercase tracking-[1.5px] rounded px-1.5 py-0.5 ${tone.satTagBg}`}>{sat.tag}</div>
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
