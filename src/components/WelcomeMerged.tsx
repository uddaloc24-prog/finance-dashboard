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

      {/* ── 0. Welcome banner — Namaste · the big why · three traditions ── */}
      <NamasteBanner />

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

// ── Namaste welcome banner — Indian-style figure + 3-tradition wisdom ──
//
// Calibrated for "eye-soothing, crisp, elegant": ivory background,
// hairline amber border, a single 🙏 with a soft gold halo, Devanagari
// नमस्ते in serif. Three wisdom cards (India · West · World) speak to
// the "big why" of retirement planning from different traditions.

function NamasteBanner() {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border-2 border-amber-400 ring-1 ring-inset ring-amber-100 bg-gradient-to-br from-amber-100 via-amber-50/80 to-emerald-50/60 px-6 py-12 sm:px-10 sm:py-16 mb-8 shadow-xl"
      style={{
        backgroundImage:
          // Layer 1: subtle paisley-like dot grid (amber)
          'radial-gradient(circle at 20px 20px, rgba(217,119,6,0.10) 1.5px, transparent 2px),' +
          // Layer 2: warm radial spotlight under the centre
          'radial-gradient(ellipse 60% 45% at 50% 28%, rgba(251,191,36,0.30), transparent 70%),' +
          // Layer 3: base gradient
          'linear-gradient(135deg, rgb(254,243,199) 0%, rgb(255,251,235) 50%, rgb(236,253,245) 100%)',
        backgroundSize: '40px 40px, 100% 100%, 100% 100%',
      }}
    >
      {/* Decorative corner mandala-line ornaments — pure SVG, stronger contrast */}
      <CornerOrnament className="absolute top-3 left-3 opacity-70" />
      <CornerOrnament className="absolute top-3 right-3 opacity-70 -scale-x-100" />
      <CornerOrnament className="absolute bottom-3 left-3 opacity-70 -scale-y-100" />
      <CornerOrnament className="absolute bottom-3 right-3 opacity-70 -scale-x-100 -scale-y-100" />

      <div className="relative max-w-3xl mx-auto text-center">
        {/* Eyebrow — two scripts, two languages */}
        <div className="text-[11px] font-bold tracking-[5px] uppercase text-amber-800 mb-4">
          Welcome <span className="mx-2 text-amber-600">·</span> <span className="font-serif normal-case font-extralight text-amber-900 text-base tracking-normal">नमस्ते</span>
        </div>

        {/* Namaste figure — 🙏 within a rich gold halo + concentric ring */}
        <div className="relative inline-flex items-center justify-center mb-1">
          {/* Outer ring — gold throne arc */}
          <span
            aria-hidden="true"
            className="absolute inset-0 m-auto w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 border-amber-300/70"
          />
          {/* Halo */}
          <span
            aria-hidden="true"
            className="absolute inset-0 m-auto w-32 h-32 sm:w-40 sm:h-40 rounded-full opacity-80 blur-2xl"
            style={{ background: 'radial-gradient(closest-side, rgba(245,158,11,0.65), rgba(245,158,11,0))' }}
          />
          {/* Figure */}
          <span
            role="img"
            aria-label="Namaste — folded hands greeting"
            className="relative text-6xl sm:text-7xl leading-none"
            style={{ filter: 'drop-shadow(0 3px 6px rgba(146,64,14,0.45))' }}
          >
            🙏
          </span>
        </div>

        {/* Devanagari greeting */}
        <h2 className="font-serif text-4xl sm:text-5xl font-extralight tracking-tight text-amber-900 leading-none mt-3 mb-1" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.6)' }}>
          नमस्ते
        </h2>

        {/* The big why — two lines, the second is the punch */}
        <h3 className="font-serif text-xl sm:text-2xl font-extralight tracking-tight text-slate-900 mt-6 leading-tight">
          Plan the <em className="not-italic font-extrabold text-amber-700">years</em>.
          <span className="mx-2 text-slate-400">·</span>
          Live the <em className="not-italic font-extrabold text-emerald-700">days</em>.
        </h3>
        <h3 className="font-serif text-lg sm:text-xl font-bold italic tracking-tight text-slate-900 mt-1.5 leading-tight">
          Live without <em className="not-italic font-extrabold text-rose-700">fear</em> — head held <em className="not-italic font-extrabold text-blue-700">high</em>.
        </h3>
        <p className="text-[13px] sm:text-sm text-slate-700 mt-4 max-w-xl mx-auto leading-relaxed font-medium">
          The second half of life deserves the same care as the first. Two traditions, one quiet answer — applied steadily, it compounds.
        </p>

        {/* Tricolor divider — saffron · gold · jade */}
        <div className="flex items-center justify-center gap-2 mt-6 mb-6" aria-hidden="true">
          <span className="h-[1.5px] w-14 bg-amber-600/80" />
          <span className="text-amber-700 text-sm leading-none">◆</span>
          <span className="h-[1.5px] w-14 bg-emerald-700/80" />
        </div>

        {/* Two wisdom cards — India · West, punchier */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mt-2">
          <WisdomCard
            origin="India"
            originColor="bg-amber-200 text-amber-900 border-amber-500"
            verse="उत्तिष्ठत · जाग्रत · प्राप्य वरान्निबोधत"
            translation="“Arise! Awake! And stop not until the goal is reached.”"
            attribution="Katha Upaniṣad · echoed by Vivekananda"
          />
          <WisdomCard
            origin="West"
            originColor="bg-blue-200 text-blue-900 border-blue-500"
            translation="“The only thing we have to fear — is fear itself.”"
            attribution="Franklin D. Roosevelt · Inaugural Address, 1933"
          />
        </div>
      </div>
    </section>
  )
}

function WisdomCard({ origin, originColor, verse, translation, attribution }: {
  origin: string; originColor: string; verse?: string; translation: string; attribution: string
}) {
  return (
    <figure className="rounded-xl bg-white border-2 border-slate-300 px-5 py-4 shadow-md hover:shadow-lg transition-shadow">
      <figcaption className={`inline-block text-[10px] font-extrabold tracking-[2.5px] uppercase rounded-full border-2 px-2.5 py-0.5 mb-2.5 ${originColor}`}>
        {origin}
      </figcaption>
      {verse && (
        <p className="font-serif italic text-[14px] text-amber-900 leading-snug mb-2 font-semibold">{verse}</p>
      )}
      <blockquote className="font-serif text-[14px] text-slate-900 leading-snug font-semibold">{translation}</blockquote>
      <p className="text-[10.5px] text-slate-600 italic mt-2.5 tracking-wide font-medium">— {attribution}</p>
    </figure>
  )
}

function CornerOrnament({ className }: { className?: string }) {
  return (
    <svg className={className} width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
      {/* Stylised mandala-corner — concentric quarter-arcs + lotus dots, stronger contrast */}
      <g fill="none" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round">
        <path d="M2 62 A 60 60 0 0 1 62 2" />
        <path d="M2 54 A 52 52 0 0 1 54 2" />
        <path d="M2 42 A 40 40 0 0 1 42 2" />
        <path d="M2 28 A 26 26 0 0 1 28 2" />
      </g>
      <g fill="#b45309">
        <circle cx="10" cy="10" r="2.5" />
        <circle cx="22" cy="6"  r="1.5" />
        <circle cx="6"  cy="22" r="1.5" />
        <circle cx="32" cy="4"  r="1" />
        <circle cx="4"  cy="32" r="1" />
      </g>
    </svg>
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
