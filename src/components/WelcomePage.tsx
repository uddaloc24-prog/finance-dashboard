import { useState, useEffect, type ReactNode } from 'react'
import type { UserIdentity, MaritalStatus } from '../types/identity'
import { storage } from '../lib/storage'
import { Button } from './ui/Button'
import { UploadSection } from './UploadSection'

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

        {/* ── Setup Workbench — full Claude.ai Project setup with input boxes ── */}
        <SetupWorkbench />
      </div>
    </div>
  )
}

// ── Setup Workbench (full setup page replica with inputs) ─────────────

const SETUP_FILES = [
  '01-plan-structure.md',
  '02-cashflow-summary.md',
  '03-plan-engine-rules.md',
  '04-plan-schema.md',
  '05-verdict-logic.md',
]

const DEFAULT_PROJECT_NAME = 'Indian Retirement Planner'
const DEFAULT_PROJECT_DESC = 'Builds an Indian retirement plan using the 4-bucket cascade method. Walks through 7 sections and produces a verdict at the end.'
const DEFAULT_FIRST_MSG = 'Hi, I’d like to build a retirement plan.'
const SOURCE_PATH = 'Claude/Projects/Financial Planning/'

interface SetupState {
  projectName: string
  projectDesc: string
  firstMessage: string
  step1Done: boolean
  step2Done: boolean
  uploadedFiles: Record<string, boolean>     // filename → checked
  step4Done: boolean
}

const STORAGE_KEY = 'rp_setup_workbench'
const DEFAULT_STATE: SetupState = {
  projectName: DEFAULT_PROJECT_NAME,
  projectDesc: DEFAULT_PROJECT_DESC,
  firstMessage: DEFAULT_FIRST_MSG,
  step1Done: false,
  step2Done: false,
  uploadedFiles: Object.fromEntries(SETUP_FILES.map((f) => [f, false])),
  step4Done: false,
}

function readSetupState(): SetupState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<SetupState>
    return {
      ...DEFAULT_STATE,
      ...parsed,
      uploadedFiles: { ...DEFAULT_STATE.uploadedFiles, ...(parsed.uploadedFiles ?? {}) },
    }
  } catch { return DEFAULT_STATE }
}

function SetupWorkbench() {
  const [state, setState] = useState<SetupState>(() => readSetupState())

  // Persist on every change (auto-save pattern, same as the rest of the app)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* ignore */ }
  }, [state])

  const update = (patch: Partial<SetupState>) => setState((s) => ({ ...s, ...patch }))
  const toggleFile = (f: string) => setState((s) => ({
    ...s,
    uploadedFiles: { ...s.uploadedFiles, [f]: !s.uploadedFiles[f] },
  }))

  const allFilesUploaded = SETUP_FILES.every((f) => state.uploadedFiles[f])
  const stepsDone =
    (state.step1Done ? 1 : 0) +
    (state.step2Done ? 1 : 0) +
    (allFilesUploaded ? 1 : 0) +
    (state.step4Done ? 1 : 0)
  const pct = Math.round((stepsDone / 4) * 100)

  function reset() {
    if (typeof window === 'undefined') return
    if (!window.confirm('Reset all setup workbench inputs and checks?')) return
    setState(DEFAULT_STATE)
  }

  return (
    <section className="mt-12 mb-6">
      {/* Header */}
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-[10px] font-bold tracking-[3px] uppercase text-indigo-700 tabular-nums">★★</span>
        <span className="h-px flex-1 bg-gradient-to-r from-indigo-500/60 to-transparent" aria-hidden="true" />
        <span className="text-[10px] font-bold tracking-[3px] uppercase text-indigo-700">Setup Workbench</span>
      </div>
      <h2 className="font-serif text-xl sm:text-2xl font-extralight tracking-tight text-slate-900 leading-tight">
        Walk through the <em className="not-italic font-extrabold text-indigo-700">Claude.ai Project</em> install — fill, copy, tick.
      </h2>
      <p className="text-[12px] text-slate-600 mt-1.5 max-w-2xl leading-snug">
        Every input is auto-saved to your browser. Progress persists across refresh and reopen — only cleared by the Reset button below.
      </p>

      {/* Progress bar */}
      <div className="mt-3 mb-4 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-bold tabular-nums text-indigo-700 shrink-0">{stepsDone}/4 · {pct}%</span>
      </div>

      <div className="space-y-3">
        {/* STEP 1 — Create a Project */}
        <StepCard num="1" title="Create a new Project" done={state.step1Done}>
          <Steps items={[
            'Go to claude.ai and sign in.',
            'In the left sidebar, click Projects → New Project.',
            'Give it a name (suggested below).',
            'Add a short description (suggested below).',
          ]} />
          <FieldBox label="Project name">
            <input
              type="text"
              value={state.projectName}
              onChange={(e) => update({ projectName: e.target.value })}
              className="flex-1 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
              placeholder={DEFAULT_PROJECT_NAME}
            />
            <CopyBtn text={state.projectName || DEFAULT_PROJECT_NAME} />
          </FieldBox>
          <FieldBox label="Project description">
            <textarea
              rows={3}
              value={state.projectDesc}
              onChange={(e) => update({ projectDesc: e.target.value })}
              className="flex-1 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-[12.5px] leading-snug focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 resize-y"
            />
            <CopyBtn text={state.projectDesc || DEFAULT_PROJECT_DESC} />
          </FieldBox>
          <DoneToggle checked={state.step1Done} onChange={(v) => update({ step1Done: v })} />
        </StepCard>

        {/* STEP 2 — Custom Instructions */}
        <StepCard num="2" title="Add the Custom Instructions" done={state.step2Done}>
          <Steps items={[
            'Open the Project.',
            'Click Set custom instructions (or Edit instructions, depending on the UI).',
            <span>Open <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">system-prompt.md</code> from the source folder below.</span>,
            <span>Copy <strong>everything below the <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">---</code></strong> near the top of that file.</span>,
            'Paste into the Custom Instructions box. Save.',
          ]} />
          <FieldBox label="Source path">
            <input
              type="text"
              readOnly
              value={`${SOURCE_PATH}system-prompt.md`}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-[12px] font-mono text-slate-800 focus:outline-none"
            />
            <CopyBtn text={`${SOURCE_PATH}system-prompt.md`} />
          </FieldBox>
          <DoneToggle checked={state.step2Done} onChange={(v) => update({ step2Done: v })} label="Pasted ✓" />
        </StepCard>

        {/* STEP 3 — Knowledge files */}
        <StepCard num="3" title="Upload the Knowledge files" done={allFilesUploaded}>
          <Steps items={[
            'In the same Project view, look for Project Knowledge (or Add files).',
            'Upload these five files from the source folder below.',
            <span>Do <strong>not</strong> upload <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">system-prompt.md</code> or <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">README.md</code>.</span>,
          ]} />
          <FieldBox label="Source folder">
            <input
              type="text"
              readOnly
              value={SOURCE_PATH}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-[12px] font-mono text-slate-800"
            />
            <CopyBtn text={SOURCE_PATH} />
          </FieldBox>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
            {SETUP_FILES.map((f) => (
              <li key={f}>
                <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 hover:bg-slate-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!state.uploadedFiles[f]}
                    onChange={() => toggleFile(f)}
                    className="accent-indigo-600 w-3.5 h-3.5"
                  />
                  <code className="flex-1 font-mono text-[12px] text-slate-800">{f}</code>
                  <CopyBtn text={f} small />
                </label>
              </li>
            ))}
          </ul>
          <div className="text-[10.5px] text-slate-500 italic mt-1.5">
            {Object.values(state.uploadedFiles).filter(Boolean).length} / {SETUP_FILES.length} uploaded
          </div>
        </StepCard>

        {/* STEP 4 — First chat */}
        <StepCard num="4" title="Start a new chat in the Project" done={state.step4Done}>
          <Steps items={[
            'Click New chat inside the Project.',
            'Type something simple to start (suggested below).',
            'Claude will greet you and begin Section 01 (Wealth Snapshot).',
          ]} />
          <FieldBox label="First message">
            <input
              type="text"
              value={state.firstMessage}
              onChange={(e) => update({ firstMessage: e.target.value })}
              className="flex-1 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
              placeholder={DEFAULT_FIRST_MSG}
            />
            <CopyBtn text={state.firstMessage || DEFAULT_FIRST_MSG} />
          </FieldBox>
          <DoneToggle checked={state.step4Done} onChange={(v) => update({ step4Done: v })} label="Sent ✓" />
        </StepCard>
      </div>

      {/* Footer — source + reset */}
      <div className="mt-4 flex items-baseline justify-between gap-2 flex-wrap text-[10px] text-slate-500">
        <span>
          Source: <code className="font-mono text-slate-700">{SOURCE_PATH}README.md</code> — &ldquo;Setting up the Claude.ai Project&rdquo;
        </span>
        <button
          type="button"
          onClick={reset}
          className="text-[10px] font-bold uppercase tracking-[2px] text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded px-2 py-0.5 transition-colors"
        >
          Reset workbench
        </button>
      </div>
    </section>
  )
}

function StepCard({ num, title, done, children }: { num: string; title: string; done: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-lg border-2 ${done ? 'border-emerald-400 bg-emerald-50/30' : 'border-indigo-200 bg-white'} p-4 transition-colors`}>
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-serif italic text-base font-extrabold tabular-nums border-[3px] ${done ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-indigo-700 border-indigo-500'}`}
          style={{ boxShadow: done ? '0 3px 0 0 rgb(6,78,59)' : '0 3px 0 0 rgb(49,46,129)' }}
        >
          {done ? '✓' : num}
        </span>
        <h3 className="font-serif italic text-base sm:text-lg font-extrabold text-slate-900 leading-tight">{title}</h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="list-decimal pl-5 text-[12px] text-slate-700 space-y-1 leading-snug">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ol>
  )
}

function FieldBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1">{label}</div>
      <div className="flex items-start gap-2">{children}</div>
    </div>
  )
}

function DoneToggle({ checked, onChange, label = 'Done' }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex items-center gap-2 mt-1 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-emerald-600 w-4 h-4"
      />
      <span className={`text-[12px] font-bold uppercase tracking-[1.5px] ${checked ? 'text-emerald-700' : 'text-slate-600'}`}>{label}</span>
    </label>
  )
}

function CopyBtn({ text, small }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false)
  async function handle() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked — user can select manually */ }
  }
  return (
    <button
      type="button"
      onClick={handle}
      className={`shrink-0 rounded font-bold uppercase tracking-wider transition-colors ${small ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1.5'} ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
      title="Copy to clipboard"
    >
      {copied ? '✓ copied' : 'copy'}
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
