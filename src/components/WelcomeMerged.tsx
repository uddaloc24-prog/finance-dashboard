// WelcomeMerged — single first-page experience that combines the old
// WelcomePage (3D clusters · compact About-you · setup replica · upload
// modal) with RetirementWelcome's editorial sections (reality check,
// two-phase journey, quotes, mistakes matrix, action checklist, five
// questions). Lives inside the Dashboard as the "Welcome" tab.
//
// The two original files (WelcomePage.tsx, RetirementWelcome.tsx) are
// preserved as-is — RetirementWelcome is reused here via the hideHero
// prop, WelcomePage stays in-tree as a dormant fallback. Pre-merge
// state pinned by git tag v2-pre-welcome-merge.

import { useState, useEffect, type ReactNode } from 'react'
import type { UserIdentity, MaritalStatus } from '../types/identity'
import { storage } from '../lib/storage'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { UploadSection } from './UploadSection'
import { SetupReplica } from './SetupReplica'
import { RetirementWelcome } from './RetirementWelcome'

interface Props {
  /** Fires when "Start planning →" is clicked. The parent (Dashboard)
   *  flips activeTab to 'plan' and persists getWelcomeSeen so this
   *  tab isn't auto-opened on subsequent launches. */
  onStart?: () => void
}

const SECTIONS = [
  { id: 'sec-mission',   label: 'Mission'   },
  { id: 'sec-aboutyou',  label: 'About you' },
  { id: 'sec-reality',   label: 'Reality'   },
  { id: 'sec-phases',    label: 'Phases'    },
  { id: 'sec-wisdom',    label: 'Wisdom'    },
  { id: 'sec-mistakes',  label: 'Mistakes'  },
  { id: 'sec-action',    label: 'Action'    },
  { id: 'sec-reflection',label: 'Reflect'   },
  { id: 'sec-setup',     label: 'Setup'     },
]

export function WelcomeMerged({ onStart }: Props) {
  const [identity, setIdentity] = useState<UserIdentity>(() =>
    storage.getIdentity() ?? {
      fullName: '', email: '', phone: '', dateOfBirth: '', panCard: '',
      maritalStatus: undefined, spouseName: '', occupation: '',
      address: { line1: '', line2: '', city: '', state: '', pincode: '' },
      createdAt: '', updatedAt: '',
    },
  )
  const [uploadOpen, setUploadOpen] = useState(false)

  // Identity is OPTIONAL on the merged page (defaults to Anonymous if
  // blank). Auto-save every change so partial input survives a refresh.
  useEffect(() => {
    const now = new Date().toISOString()
    const out: UserIdentity = {
      ...identity,
      createdAt: identity.createdAt || now,
      updatedAt: now,
    }
    storage.setIdentity(out)
  }, [identity])

  function start() {
    const now = new Date().toISOString()
    const out: UserIdentity = {
      ...identity,
      fullName: identity.fullName.trim() || 'Anonymous',
      createdAt: identity.createdAt || now,
      updatedAt: now,
    }
    storage.setIdentity(out)
    onStart?.()
  }

  return (
    <div className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2">

      {/* Top-right 3D Upload Plan button */}
      <UploadPlanButton onClick={() => setUploadOpen(true)} />

      {/* Anchor mini-nav — scroll target shortcuts */}
      <AnchorNav />

      {/* ── 1. Hero ────────────────────────────────────────────────── */}
      <header id="sec-mission" className="text-center mb-8 sm:mb-10 pt-2 scroll-mt-20">
        <div className="text-[10px] font-bold tracking-[4px] uppercase text-amber-700 mb-2.5">
          Indian Retirement Planner · Version 2.0
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-tight text-slate-900 leading-[1.05]">
          Plan your retirement <em className="font-extrabold not-italic text-blue-700">with confidence.</em>
        </h1>
        <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Four-bucket strategy · ten frameworks compared · Indian tax engine · Monte Carlo stress-tested.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-amber-500/60" aria-hidden="true" />
          <span className="text-amber-700 text-[10px]">◆</span>
          <span className="h-px w-12 bg-amber-500/60" aria-hidden="true" />
        </div>
      </header>

      {/* ── 2. Three circular clusters ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-3 mb-8 justify-items-center">
        <CircleCluster
          theme="navy" hubLabel="The Offer" hubTag="01·02·03"
          satellites={[
            { num: '01', title: 'Plan with confidence', tag: 'Mission',     body: 'A guided four-bucket withdrawal model — defensible, not a guess.' },
            { num: '02', title: '10 strategies · 5 profiles', tag: 'At a glance', body: '200 Monte Carlo paths · FY 24-25 Indian tax engine.' },
            { num: '03', title: '5 min',                tag: 'Time',        body: 'From corpus inputs to a downloadable take-home PDF.' },
          ]}
        />
        <CircleCluster
          theme="amber" hubLabel="The Challenge" hubTag="04·05·06"
          satellites={[
            { num: '04', title: 'Inflation',     tag: 'Erosion',     body: 'General 6.5% · healthcare 10% · education 12% — eats real purchasing power.' },
            { num: '05', title: 'Indian tax',    tag: 'Vehicle drag', body: 'Debt MFs at slab; equity LTCG only above ₹1.25L. The vehicle matters.' },
            { num: '06', title: 'Sequence risk', tag: 'Timing',      body: 'A year-5 crash permanently impairs even a "well-funded" plan.' },
          ]}
        />
        <CircleCluster
          theme="green" hubLabel="The Answer" hubTag="07·08·09"
          satellites={[
            { num: '07', title: 'Four buckets', tag: 'B1·B2·B3·B4', body: '10 / 20 / 25 / 45 split — staged liquidity, debt, hybrid, growth.' },
            { num: '08', title: 'Guardrails',   tag: 'Safety net',  body: 'Skip equity sales in down years · freeze inflation below 85% · cut 10% below 70%.' },
            { num: '09', title: 'Your verdict', tag: 'PDF report',  body: 'Personalised PDF with TOC, page borders, and your name on every page.' },
          ]}
        />
      </div>

      {/* ── 3. About-you compact toolbar + CTA (action-first) ────── */}
      <div id="sec-aboutyou" className="scroll-mt-20">
        <IdentityForm identity={identity} onChange={setIdentity} />
      </div>

      <div className="text-center mb-10">
        <Button onClick={start} className="!px-7 !py-3 !text-sm">
          Start planning →
        </Button>
        <p className="text-[10px] text-slate-500 mt-2.5">
          Free · No signup · Everything stays in your browser · Name defaults to "Anonymous" if blank
        </p>
      </div>

      {/* ── 4-8. Editorial sections (RetirementWelcome, hero suppressed) ── */}
      <div id="sec-reality" className="scroll-mt-20" />
      <RetirementWelcome hideHero={true} />

      {/* Section anchors for the editorial body — RetirementWelcome
          doesn't expose IDs, so we drop invisible markers near each
          eyebrow when the anchor nav fires. */}
      <ScrollAnchors />

      {/* ── 9. Setup replica — full v10 Adaptive psychometric setup ── */}
      <div id="sec-setup" className="scroll-mt-20">
        <SetupReplica />
      </div>

      {/* Upload-plan modal */}
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

// ── Anchor mini-nav (top of page) ─────────────────────────────────────

function AnchorNav() {
  return (
    <nav className="sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 mb-4 bg-white/85 backdrop-blur border-b border-slate-200 overflow-x-auto">
      <ul className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="inline-block px-2 py-1 rounded text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition-colors"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Invisible scroll-target markers for the editorial body. Positioned
 *  absolutely so they don't break RetirementWelcome's layout. */
function ScrollAnchors() {
  return (
    <>
      {(['sec-phases', 'sec-wisdom', 'sec-mistakes', 'sec-action', 'sec-reflection'] as const).map((id) => (
        <span key={id} id={id} className="block scroll-mt-20" aria-hidden="true" />
      ))}
    </>
  )
}

// ── Top-right 3D Upload Plan button ───────────────────────────────────

function UploadPlanButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Upload an existing plan (.pdf · .docx · .json)"
      className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-b from-indigo-400 via-indigo-600 to-indigo-800 hover:from-indigo-300 hover:via-indigo-500 hover:to-indigo-700 border border-black/15 select-none active:translate-y-[2px] transition-all"
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

// ── Circular cluster primitives (copied from WelcomePage) ─────────────

type Tone = 'navy' | 'amber' | 'green'

interface ToneSpec {
  hubBody: string
  hubLip: string
  satBorder: string
  satLip: string
  satText: string
  satTagBg: string
  dashedRing: string
}

const TONES_3D: Record<Tone, ToneSpec> = {
  navy:  { hubBody: 'from-blue-400 via-blue-600 to-blue-800',         hubLip: 'rgb(30,58,138)',  satBorder: 'border-blue-500',    satLip: 'rgb(30,58,138)',  satText: 'text-blue-700',    satTagBg: 'bg-blue-50 text-blue-700',       dashedRing: 'border-blue-200' },
  amber: { hubBody: 'from-amber-400 via-amber-500 to-amber-700',       hubLip: 'rgb(120,53,15)',  satBorder: 'border-amber-500',   satLip: 'rgb(120,53,15)',  satText: 'text-amber-700',   satTagBg: 'bg-amber-50 text-amber-700',     dashedRing: 'border-amber-200' },
  green: { hubBody: 'from-emerald-400 via-emerald-500 to-emerald-700', hubLip: 'rgb(6,78,59)',    satBorder: 'border-emerald-500', satLip: 'rgb(6,78,59)',    satText: 'text-emerald-700', satTagBg: 'bg-emerald-50 text-emerald-700', dashedRing: 'border-emerald-200' },
}

interface Satellite { num: string; title: string; tag: string; body: string }

function CircleCluster({ theme, hubLabel, hubTag, satellites }: {
  theme: Tone; hubLabel: string; hubTag: string; satellites: [Satellite, Satellite, Satellite]
}) {
  const t = TONES_3D[theme]
  const angles = [-90, 30, 150]
  const radius = 122
  return (
    <div className="relative w-[320px] h-[320px] sm:w-[340px] sm:h-[340px]">
      <div className={`absolute inset-[24%] rounded-full border-2 border-dashed ${t.dashedRing}`} aria-hidden="true" />
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
      {satellites.map((s, i) => {
        const a = angles[i] * Math.PI / 180
        const x = Math.cos(a) * radius
        const y = Math.sin(a) * radius
        return (
          <div key={s.num} className="absolute" style={{ left: '50%', top: '50%', transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))` }}>
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

// ── Compact identity form (copied from WelcomePage) ───────────────────

interface IdentityFormProps { identity: UserIdentity; onChange: (n: UserIdentity) => void }

function IdentityForm({ identity, onChange }: IdentityFormProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const set = (patch: Partial<UserIdentity>) => onChange({ ...identity, ...patch })
  const setAddr = (patch: Partial<NonNullable<UserIdentity['address']>>) =>
    onChange({ ...identity, address: { ...(identity.address ?? { line1: '', city: '', state: '', pincode: '' }), ...patch } })

  const inputCls = 'w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-[12.5px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 placeholder:text-slate-400'

  const moreFilled =
    (identity.spouseName ? 1 : 0) +
    (identity.occupation ? 1 : 0) +
    (identity.panCard ? 1 : 0) +
    (identity.address?.line1 ? 1 : 0) +
    (identity.address?.city ? 1 : 0)

  return (
    <section className="bg-white rounded-lg border border-slate-200 ring-1 ring-inset ring-slate-50 px-3 py-2.5 mb-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-amber-700 shrink-0">About you</span>
        <span className="h-px flex-1 bg-gradient-to-r from-amber-300/60 to-transparent" aria-hidden="true" />
        <span className="text-[9px] text-slate-500 italic shrink-0">optional · stays in your browser</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.4fr_1fr_1fr] gap-2">
        <CompactField label="Name">
          <input type="text" value={identity.fullName} placeholder="Anand Kumar" onChange={(e) => set({ fullName: e.target.value })} className={inputCls} />
        </CompactField>
        <CompactField label="DOB">
          <input type="date" value={identity.dateOfBirth ?? ''} onChange={(e) => set({ dateOfBirth: e.target.value })} className={inputCls} />
        </CompactField>
        <CompactField label="Email">
          <input type="email" value={identity.email ?? ''} placeholder="you@example.com" onChange={(e) => set({ email: e.target.value })} className={inputCls} />
        </CompactField>
        <CompactField label="Phone">
          <input type="tel" value={identity.phone ?? ''} placeholder="+91 9…" onChange={(e) => set({ phone: e.target.value })} className={inputCls} />
        </CompactField>
        <CompactField label="Marital">
          <select value={identity.maritalStatus ?? ''} onChange={(e) => set({ maritalStatus: (e.target.value || undefined) as MaritalStatus })} className={inputCls}>
            <option value="">—</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </CompactField>
      </div>

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
              <input type="text" value={identity.spouseName ?? ''} placeholder="Spouse's name" onChange={(e) => set({ spouseName: e.target.value })} className={inputCls} />
            </CompactField>
          )}
          <CompactField label="Occupation">
            <input type="text" value={identity.occupation ?? ''} placeholder="Retired Civil Engineer" onChange={(e) => set({ occupation: e.target.value })} className={inputCls} />
          </CompactField>
          <CompactField label="PAN">
            <input type="text" value={identity.panCard ?? ''} placeholder="ABCDE1234F" maxLength={10} onChange={(e) => set({ panCard: e.target.value.toUpperCase() })} className={`${inputCls} uppercase tracking-wider`} />
          </CompactField>
          <CompactField label="City">
            <input type="text" value={identity.address?.city ?? ''} placeholder="Bengaluru" onChange={(e) => setAddr({ city: e.target.value })} className={inputCls} />
          </CompactField>
          <CompactField label="State">
            <input type="text" value={identity.address?.state ?? ''} placeholder="Karnataka" onChange={(e) => setAddr({ state: e.target.value })} className={inputCls} />
          </CompactField>
          <CompactField label="Pincode">
            <input type="text" value={identity.address?.pincode ?? ''} placeholder="560001" maxLength={6} onChange={(e) => setAddr({ pincode: e.target.value.replace(/[^0-9]/g, '') })} className={inputCls} />
          </CompactField>
          <CompactField label="Address line">
            <input type="text" value={identity.address?.line1 ?? ''} placeholder="Street / building / area" onChange={(e) => setAddr({ line1: e.target.value })} className={inputCls} />
          </CompactField>
        </div>
      )}
    </section>
  )
}

function CompactField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-[9px] font-bold uppercase tracking-[1.5px] text-slate-500 mb-0.5">{label}</span>
      {children}
    </label>
  )
}
