import { useState, type ReactNode } from 'react'
import type { UserIdentity, MaritalStatus } from '../types/identity'
import { storage } from '../lib/storage'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
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
  const [uploadOpen, setUploadOpen] = useState(false)

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative">

        {/* ── 3D Upload Plan button — top-right of the page ──── */}
        <UploadPlanButton onClick={() => setUploadOpen(true)} />

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

        {/* ── About you (compact toolbar — required for "Start planning") ── */}
        <IdentityForm identity={identity} onChange={setIdentity} />

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

        {/* ── Setup page replica — full v10 Adaptive psychometric setup ── */}
        <SetupReplica />
      </div>

      {/* Upload-plan modal — opened by the top-right 3D button */}
      <Modal
        open={uploadOpen}
        title="Upload an existing plan"
        subtitle="Drop a .pdf · .docx · .json export — we'll pre-fill your inputs"
        accent="indigo"
        size="lg"
        onClose={() => setUploadOpen(false)}
      >
        <UploadSection />
      </Modal>
    </div>
  )
}

// ── Top-right 3D Upload Plan button ───────────────────────────────────

function UploadPlanButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Upload an existing plan (.pdf · .docx · .json)"
      className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-b from-indigo-400 via-indigo-600 to-indigo-800 hover:from-indigo-300 hover:via-indigo-500 hover:to-indigo-700 border border-black/15 select-none active:translate-y-[2px] transition-all"
      style={{
        boxShadow: '0 4px 0 0 rgb(49,46,129), 0 8px 14px -4px rgba(15,23,42,0.40), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.20)',
        textShadow: '0 1px 1px rgba(0,0,0,0.40)',
      }}
    >
      <span aria-hidden="true" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))' }}>📂</span>
      <span className="hidden sm:inline">Upload Plan</span>
      <span className="sm:hidden">Upload</span>
    </button>
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
  const [moreOpen, setMoreOpen] = useState(false)
  const set = (patch: Partial<UserIdentity>) => onChange({ ...identity, ...patch })
  const setAddr = (patch: Partial<NonNullable<UserIdentity['address']>>) =>
    onChange({ ...identity, address: { ...(identity.address ?? { line1: '', city: '', state: '', pincode: '' }), ...patch } })

  const inputCls = 'w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-[12.5px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 placeholder:text-slate-400'

  // Count optional-detail fields that have content, so we can show "More (3)" badge
  const moreFilled =
    (identity.spouseName ? 1 : 0) +
    (identity.occupation ? 1 : 0) +
    (identity.panCard ? 1 : 0) +
    (identity.address?.line1 ? 1 : 0) +
    (identity.address?.city ? 1 : 0)

  return (
    <section className="bg-white rounded-lg border border-slate-200 ring-1 ring-inset ring-slate-50 px-3 py-2.5 mb-6 shadow-sm">
      {/* Compact toolbar header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-amber-700 shrink-0">About you</span>
        <span className="h-px flex-1 bg-gradient-to-r from-amber-300/60 to-transparent" aria-hidden="true" />
        <span className="text-[9px] text-slate-500 italic shrink-0">stays in your browser</span>
      </div>

      {/* Single-row essentials — 4 inputs on lg, stacks on smaller */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.4fr_1fr_1fr] gap-2">
        <CompactField label="Name" required>
          <input
            type="text" value={identity.fullName} placeholder="Anand Kumar"
            onChange={(e) => set({ fullName: e.target.value })}
            className={inputCls} autoFocus
          />
        </CompactField>
        <CompactField label="DOB">
          <input
            type="date" value={identity.dateOfBirth ?? ''}
            onChange={(e) => set({ dateOfBirth: e.target.value })}
            className={inputCls}
          />
        </CompactField>
        <CompactField label="Email">
          <input
            type="email" value={identity.email ?? ''} placeholder="you@example.com"
            onChange={(e) => set({ email: e.target.value })}
            className={inputCls}
          />
        </CompactField>
        <CompactField label="Phone">
          <input
            type="tel" value={identity.phone ?? ''} placeholder="+91 9…"
            onChange={(e) => set({ phone: e.target.value })}
            className={inputCls}
          />
        </CompactField>
        <CompactField label="Marital">
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
        </CompactField>
      </div>

      {/* More-details disclosure */}
      <button
        type="button"
        onClick={() => setMoreOpen((o) => !o)}
        className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
      >
        <span>{moreOpen ? '−' : '+'}</span>
        <span>More details</span>
        {!moreOpen && moreFilled > 0 && <span className="bg-amber-100 text-amber-800 rounded-full px-1.5 py-0.5 text-[9px] tabular-nums">{moreFilled}</span>}
      </button>

      {moreOpen && (
        <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {identity.maritalStatus === 'married' && (
            <CompactField label="Spouse">
              <input
                type="text" value={identity.spouseName ?? ''} placeholder="Spouse's name"
                onChange={(e) => set({ spouseName: e.target.value })}
                className={inputCls}
              />
            </CompactField>
          )}
          <CompactField label="Occupation">
            <input
              type="text" value={identity.occupation ?? ''} placeholder="Retired Civil Engineer"
              onChange={(e) => set({ occupation: e.target.value })}
              className={inputCls}
            />
          </CompactField>
          <CompactField label="PAN">
            <input
              type="text" value={identity.panCard ?? ''} placeholder="ABCDE1234F" maxLength={10}
              onChange={(e) => set({ panCard: e.target.value.toUpperCase() })}
              className={`${inputCls} uppercase tracking-wider`}
            />
          </CompactField>
          <CompactField label="City">
            <input
              type="text" value={identity.address?.city ?? ''} placeholder="Bengaluru"
              onChange={(e) => setAddr({ city: e.target.value })}
              className={inputCls}
            />
          </CompactField>
          <CompactField label="State">
            <input
              type="text" value={identity.address?.state ?? ''} placeholder="Karnataka"
              onChange={(e) => setAddr({ state: e.target.value })}
              className={inputCls}
            />
          </CompactField>
          <CompactField label="Pincode">
            <input
              type="text" value={identity.address?.pincode ?? ''} placeholder="560001" maxLength={6}
              onChange={(e) => setAddr({ pincode: e.target.value.replace(/[^0-9]/g, '') })}
              className={inputCls}
            />
          </CompactField>
          <CompactField label="Address line">
            <input
              type="text" value={identity.address?.line1 ?? ''} placeholder="Street / building / area"
              onChange={(e) => setAddr({ line1: e.target.value })}
              className={`${inputCls} sm:col-span-2 lg:col-span-1`}
            />
          </CompactField>
        </div>
      )}
    </section>
  )
}

function CompactField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-[9px] font-bold uppercase tracking-[1.5px] text-slate-500 mb-0.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}

