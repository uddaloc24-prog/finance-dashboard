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
import { PlaybookFlipBook } from './PlaybookFlipBook'

interface Props {
  /** Fires when "Start planning →" is clicked. The parent (Dashboard)
   *  flips activeTab to 'plan' and persists getWelcomeSeen so this
   *  tab isn't auto-opened on subsequent launches. */
  onStart?: () => void
}

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
  const [playbookOpen, setPlaybookOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)

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
    <div className="relative -mx-3 sm:-mx-4 px-3 sm:px-4 py-3 bg-gradient-to-br from-slate-50 via-white to-blue-50">

      {/* ── WELCOME watermark — huge serif text behind everything ─── */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <span
          className="font-serif font-extrabold text-amber-700/[0.13] select-none whitespace-nowrap leading-none tracking-[0.05em]"
          style={{ fontSize: 'clamp(140px, 26vw, 420px)', transform: 'rotate(-12deg)' }}
        >
          WELCOME
        </span>
      </div>

      {/* ── Bordered inner frame with 4 corner ornaments ─────────── */}
      <div className="relative z-10 rounded-3xl border-2 border-amber-300 ring-1 ring-inset ring-amber-100 bg-white/55 shadow-xl p-4 sm:p-6 lg:p-7">

        {/* Corner mandala ornaments — frame the whole page */}
        <CornerOrnament className="absolute top-1.5 left-1.5 w-10 h-10 sm:w-12 sm:h-12 opacity-60" />
        <CornerOrnament className="absolute top-1.5 right-1.5 w-10 h-10 sm:w-12 sm:h-12 opacity-60 -scale-x-100" />
        <CornerOrnament className="absolute bottom-1.5 left-1.5 w-10 h-10 sm:w-12 sm:h-12 opacity-60 -scale-y-100" />
        <CornerOrnament className="absolute bottom-1.5 right-1.5 w-10 h-10 sm:w-12 sm:h-12 opacity-60 -scale-x-100 -scale-y-100" />

      {/* ── 1+2. MERGED: Hero prelude + Namaste banner in a single card ── */}
      <NamasteBanner />


      {/* ── 2.5. Action strip — Playbook + Upload, right-aligned, above clusters ─── */}
      <div className="flex justify-end items-center gap-2 mb-3">
        <PlaybookButton onClick={() => setPlaybookOpen(true)} />
        <UploadPlanButton onClick={() => setUploadOpen(true)} />
      </div>

      {/* ── 3. Three circular clusters ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-3 mb-3 justify-items-center px-4 py-6 sm:px-6 sm:py-6 rounded-2xl border-2 border-amber-300 ring-1 ring-inset ring-amber-100 bg-white/90 shadow-md">
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

      {/* ── 5. Merged Profile block — About-you toolbar + full Setup ── */}
      <section className="mb-4 px-4 py-4 sm:px-5 sm:py-5 rounded-2xl border-2 border-amber-300 ring-1 ring-inset ring-amber-100 bg-white/90 shadow-md">
        <IdentityForm identity={identity} onChange={setIdentity} />

        {/* Full profile setup — collapsed by default to keep the CTA reachable */}
        <button
          type="button"
          onClick={() => setSetupOpen((o) => !o)}
          className="mt-1 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded px-2 py-1 transition-colors"
          aria-expanded={setupOpen}
        >
          <span className="text-base leading-none">{setupOpen ? '−' : '+'}</span>
          <span>{setupOpen ? 'Hide full profile setup' : 'Full profile setup'}</span>
          <span className="text-[9px] font-normal normal-case tracking-normal text-slate-500 italic">33 fields · 7 sections · auto-saved</span>
        </button>

        {setupOpen && (
          <div className="mt-2 rounded-xl border-2 border-amber-200 bg-white shadow-sm overflow-hidden">
            <SetupReplica />
          </div>
        )}
      </section>

      {/* ── 6. CTA — always reachable just below the toolbar ────── */}
      <div className="text-center mb-6">
        <Button onClick={start} className="!px-7 !py-3 !text-sm">
          Start planning →
        </Button>
        <p className="text-[10px] text-slate-500 mt-2.5">
          Free · No signup · Everything stays in your browser · Name defaults to "Anonymous" if blank
        </p>
      </div>

      </div>{/* /bordered inner frame */}

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

      {/* Playbook modal — interactive page-flipping book */}
      <Modal
        open={playbookOpen}
        title="The Indian Retirement Playbook"
        subtitle="Reality · Phases · Wisdom · Mistakes · Action · Reflect — turn the pages"
        accent="amber"
        size="5xl"
        onClose={() => setPlaybookOpen(false)}
      >
        <PlaybookFlipBook />
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

// Merged Hero + Namaste card: Hero prelude on top (centred, announces
// the planner), followed by a thin amber divider, followed by the
// existing temple-diptych (medallion left · headlines + wisdom right).
// One frame, two related zones — replaces what used to be two cards.

function NamasteBanner() {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border-2 border-amber-400 ring-1 ring-inset ring-amber-100 mb-8 shadow-xl"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20px 20px, rgba(217,119,6,0.10) 1.5px, transparent 2px),' +
          'radial-gradient(ellipse 35% 80% at 18% 70%, rgba(251,191,36,0.30), transparent 70%),' +
          'linear-gradient(115deg, rgb(254,243,199) 0%, rgb(255,251,235) 45%, rgb(236,253,245) 100%)',
        backgroundSize: '40px 40px, 100% 100%, 100% 100%',
      }}
    >
      {/* Corner mandala ornaments — frame the whole merged card */}
      <CornerOrnament className="absolute top-2 left-2 opacity-70 w-12 h-12 sm:w-14 sm:h-14" />
      <CornerOrnament className="absolute top-2 right-2 opacity-70 -scale-x-100 w-12 h-12 sm:w-14 sm:h-14" />
      <CornerOrnament className="absolute bottom-2 left-2 opacity-70 -scale-y-100 w-12 h-12 sm:w-14 sm:h-14" />
      <CornerOrnament className="absolute bottom-2 right-2 opacity-70 -scale-x-100 -scale-y-100 w-12 h-12 sm:w-14 sm:h-14" />

      {/* ── Hero prelude — centred, sets the promise ──────────── */}
      <div className="relative text-center px-6 pt-5 pb-4 sm:px-10 sm:pt-7 sm:pb-5">
        <div className="text-[10px] font-bold tracking-[4px] uppercase text-amber-700 mb-2">
          Indian Retirement Planner · Version 2.0
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-[2.5rem] font-extralight tracking-tight text-slate-900 leading-[1.08]">
          Plan your retirement <em className="font-extrabold not-italic text-blue-700">with confidence.</em>
        </h1>
        <p className="mt-2 text-[12px] sm:text-[13px] text-slate-600 max-w-xl mx-auto leading-relaxed">
          Four-bucket strategy · ten frameworks compared · Indian tax engine · Monte Carlo stress-tested.
        </p>
      </div>

      {/* Soft divider between Hero prelude and Namaste diptych */}
      <div className="relative flex items-center justify-center gap-3 px-6 sm:px-10" aria-hidden="true">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/60 to-amber-400/60" />
        <span className="text-amber-700 text-[10px] leading-none">◆</span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-400/60 to-amber-400/60" />
      </div>

      {/* ── Namaste diptych — existing structure ─────────────── */}
      <div className="relative grid grid-cols-1 md:grid-cols-[220px_1px_1fr] lg:grid-cols-[240px_1px_1fr] gap-0 px-5 pt-4 pb-5 sm:px-7 sm:pt-5 sm:pb-6">

        {/* ── Left panel — medallion ───────────────────────────── */}
        <div className="flex flex-col items-center justify-center text-center px-1 py-2 md:py-1">
          <div className="text-[10px] font-bold tracking-[4px] uppercase text-amber-800 mb-2">
            Welcome <span className="mx-1 text-amber-600">·</span> <span className="font-serif normal-case font-extralight text-amber-900 text-sm tracking-normal">नमस्ते</span>
          </div>

          {/* Namaste figure — compact medallion */}
          <div className="relative inline-flex items-center justify-center my-1">
            <span aria-hidden="true" className="absolute inset-0 m-auto w-24 h-24 rounded-full border-2 border-amber-300/80" />
            <span
              aria-hidden="true"
              className="absolute inset-0 m-auto w-20 h-20 rounded-full opacity-90 blur-xl"
              style={{ background: 'radial-gradient(closest-side, rgba(245,158,11,0.70), rgba(245,158,11,0))' }}
            />
            <span
              role="img"
              aria-label="Namaste — folded hands greeting"
              className="relative text-5xl leading-none"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(146,64,14,0.45))' }}
            >
              🙏
            </span>
          </div>

          <h2
            className="font-serif text-3xl sm:text-4xl font-extralight tracking-tight text-amber-900 leading-none mt-2"
            style={{ textShadow: '0 1px 0 rgba(255,255,255,0.7)' }}
          >
            नमस्ते
          </h2>
        </div>

        {/* ── Vertical divider — temple gateway with diamond ornament ─── */}
        <div className="hidden md:flex flex-col items-center justify-center relative" aria-hidden="true">
          <span className="absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-amber-300/0 via-amber-500/70 to-amber-300/0" />
          <span className="relative bg-white border-2 border-amber-500 rounded-full w-5 h-5 rotate-45 flex items-center justify-center shadow-sm">
            <span className="block w-1.5 h-1.5 bg-amber-600 rotate-45" />
          </span>
        </div>

        {/* ── Right panel — headline + 2 wisdom cards ─────────────── */}
        <div className="md:pl-4 lg:pl-6 pt-3 md:pt-0 flex flex-col justify-center">
          {/* The big why — centred · highlightable but not big · italic-smaller second line */}
          <h3 className="text-center font-serif text-base sm:text-[15px] lg:text-base font-semibold tracking-wide text-slate-900 leading-tight">
            Plan the <em className="not-italic font-extrabold text-amber-700">years</em>.
            <span className="mx-1.5 text-slate-400">·</span>
            Live the <em className="not-italic font-extrabold text-emerald-700">days</em>.
          </h3>
          <h3 className="text-center font-serif italic text-[12.5px] sm:text-[13px] font-medium tracking-tight text-slate-700 leading-snug mt-1">
            Live without <em className="font-extrabold text-rose-700 not-italic">fear</em> — head held <em className="font-extrabold text-blue-700 not-italic">high</em>.
          </h3>

          {/* Two wisdom cards — side by side, compact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5">
            <WisdomCard
              origin="India"
              originColor="bg-amber-200 text-amber-900 border-amber-500"
              verse="उद्योगिनं पुरुषसिंहमुपैति लक्ष्मीः"
              translation="“Fortune favours the diligent — never the timid who blame fate.”"
              attribution="Chāṇakya · Hitopadeśa"
            />
            <WisdomCard
              origin="West"
              originColor="bg-blue-200 text-blue-900 border-blue-500"
              translation="“Do not save what is left after spending — spend what is left after saving.”"
              attribution="Warren Buffett"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function WisdomCard({ origin, originColor, verse, translation, attribution }: {
  origin: string; originColor: string; verse?: string; translation: string; attribution: string
}) {
  return (
    <figure className="rounded-lg bg-white/95 border-2 border-slate-300 px-3 py-2.5 shadow-sm">
      <figcaption className={`inline-block text-[9px] font-extrabold tracking-[2px] uppercase rounded-full border px-1.5 py-0.5 mb-1.5 ${originColor}`}>
        {origin}
      </figcaption>
      {verse && (
        <p className="font-serif italic text-[12px] text-amber-900 leading-snug mb-1 font-semibold">{verse}</p>
      )}
      <blockquote className="font-serif text-[12.5px] text-slate-900 leading-snug font-semibold">{translation}</blockquote>
      <p className="text-[9.5px] text-slate-600 italic mt-1.5 tracking-wide font-medium">— {attribution}</p>
    </figure>
  )
}

function CornerOrnament({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
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
      </g>
    </svg>
  )
}

// ── Top-right 3D Playbook button ─────────────────────────────────────

function PlaybookButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Open the Indian Retirement Playbook — reality · phases · wisdom · mistakes · action · reflect"
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[1.5px] text-white bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 hover:from-amber-200 hover:via-amber-400 hover:to-amber-600 border border-black/15 select-none active:translate-y-[1px] transition-all"
      style={{
        boxShadow: '0 2px 0 0 rgb(120,53,15), 0 4px 8px -3px rgba(15,23,42,0.35), inset 0 1px 0 rgba(255,255,255,0.55)',
        textShadow: '0 1px 1px rgba(0,0,0,0.40)',
      }}
    >
      <span aria-hidden="true" className="text-[11px] leading-none">🪔</span>
      <span>Playbook</span>
    </button>
  )
}

// ── Top-right 3D Upload Plan button ───────────────────────────────────

function UploadPlanButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Upload an existing plan (.pdf · .docx · .json)"
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[1.5px] text-white bg-gradient-to-b from-indigo-400 via-indigo-600 to-indigo-800 hover:from-indigo-300 hover:via-indigo-500 hover:to-indigo-700 border border-black/15 select-none active:translate-y-[1px] transition-all"
      style={{
        boxShadow: '0 2px 0 0 rgb(49,46,129), 0 4px 8px -3px rgba(15,23,42,0.35), inset 0 1px 0 rgba(255,255,255,0.45)',
        textShadow: '0 1px 1px rgba(0,0,0,0.40)',
      }}
    >
      <span aria-hidden="true" className="text-[11px] leading-none">📂</span>
      <span>Upload</span>
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
