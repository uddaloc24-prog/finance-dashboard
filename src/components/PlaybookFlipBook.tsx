// PlaybookFlipBook — interactive page-turning book that renders inside
// the Playbook modal. 8 pages: Cover · TOC · 6 content pages. Pure
// React + Tailwind + inline keyframes; no framer-motion / no library.
//
// Page-flip mechanics:
//   - perspective on the book container gives the 3D depth
//   - the outgoing page is a translucent absolute overlay that rotates
//     around its spine edge while the incoming page is already visible
//     underneath, so the new page is revealed as the old one peels away
//   - 700 ms ease-in-out timing; navigation locks during the flip
//
// Controls:
//   - Click the left third / right third of the book to turn back / forward
//   - ← / → keyboard arrows
//   - Prev / Next buttons below the book + page indicator + chapter pills

import { useState, useEffect, useCallback, type ReactNode } from 'react'

// ─── Page definitions ─────────────────────────────────────────────────

type PageKind = 'cover' | 'toc' | 'content'

interface PageDef {
  kind: PageKind
  id: string
  shortTitle: string
  pageLabel?: string
  render: () => ReactNode
}

const TOC_ENTRIES: Array<{ n: number; title: string; teaser: string; page: number }> = [
  { n: 1, title: 'The Reality Check',           teaser: 'India\'s retirement gap, in four numbers.',         page: 3 },
  { n: 2, title: 'Two Stages, Two Playbooks',   teaser: 'Active (50–65) and Preservation (65+).',            page: 4 },
  { n: 3, title: 'Wisdom Across Traditions',    teaser: 'Chāṇakya · Buffett · Seneca · Gītā.',                page: 5 },
  { n: 4, title: 'Mistakes and Solutions',      teaser: 'The four common errors — and the fix for each.',    page: 6 },
  { n: 5, title: 'Four Themes, One List',       teaser: 'Money · Health · Time · Purpose.',                  page: 7 },
  { n: 6, title: 'Five Questions to Reflect',   teaser: 'Answer these before any number-crunching.',         page: 8 },
]

const PAGES: PageDef[] = [
  { kind: 'cover', id: 'cover', shortTitle: 'Cover', render: () => <CoverPage /> },
  { kind: 'toc',   id: 'toc',   shortTitle: 'Contents', render: () => <TocPage /> },
  { kind: 'content', id: 'reality',  shortTitle: 'Reality',  pageLabel: 'Chapter 1 · The Reality Check',         render: () => <RealityPage /> },
  { kind: 'content', id: 'phases',   shortTitle: 'Phases',   pageLabel: 'Chapter 2 · Two Stages, Two Playbooks', render: () => <PhasesPage /> },
  { kind: 'content', id: 'wisdom',   shortTitle: 'Wisdom',   pageLabel: 'Chapter 3 · Wisdom Across Traditions',  render: () => <WisdomPage /> },
  { kind: 'content', id: 'mistakes', shortTitle: 'Mistakes', pageLabel: 'Chapter 4 · Mistakes and Solutions',    render: () => <MistakesPage /> },
  { kind: 'content', id: 'action',   shortTitle: 'Action',   pageLabel: 'Chapter 5 · Four Themes, One List',     render: () => <ActionPage /> },
  { kind: 'content', id: 'reflect',  shortTitle: 'Reflect',  pageLabel: 'Chapter 6 · Five Questions to Reflect', render: () => <ReflectPage /> },
]

const FLIP_MS = 700

// ─── Main component ───────────────────────────────────────────────────

export function PlaybookFlipBook() {
  const [page, setPage]         = useState(0)
  const [outgoing, setOutgoing] = useState<number | null>(null)
  const [flipDir, setFlipDir]   = useState<'next' | 'prev' | null>(null)

  const turn = useCallback((dir: 'next' | 'prev') => {
    if (flipDir !== null) return
    setPage((p) => {
      const target = dir === 'next' ? p + 1 : p - 1
      if (target < 0 || target >= PAGES.length) return p
      setOutgoing(p)
      setFlipDir(dir)
      window.setTimeout(() => { setOutgoing(null); setFlipDir(null) }, FLIP_MS)
      return target
    })
  }, [flipDir])

  const jumpTo = useCallback((target: number) => {
    if (flipDir !== null || target === page || target < 0 || target >= PAGES.length) return
    const dir = target > page ? 'next' : 'prev'
    setOutgoing(page)
    setFlipDir(dir)
    setPage(target)
    window.setTimeout(() => { setOutgoing(null); setFlipDir(null) }, FLIP_MS)
  }, [flipDir, page])

  // ← / → keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') { e.preventDefault(); turn('next') }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); turn('prev') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [turn])

  const isFirst = page === 0
  const isLast = page === PAGES.length - 1

  return (
    <div className="flex flex-col items-center select-none">
      {/* Inline keyframes for the page-flip */}
      <style>{`
        @keyframes pf-flip-next {
          from { transform: rotateY(0deg);    box-shadow: -8px 0 18px rgba(0,0,0,0.08); }
          to   { transform: rotateY(-180deg); box-shadow: -16px 0 28px rgba(0,0,0,0.18); }
        }
        @keyframes pf-flip-prev {
          from { transform: rotateY(0deg);    box-shadow: 8px 0 18px rgba(0,0,0,0.08); }
          to   { transform: rotateY(180deg);  box-shadow: 16px 0 28px rgba(0,0,0,0.18); }
        }
        .pf-flip-next { animation: pf-flip-next ${FLIP_MS}ms cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards; }
        .pf-flip-prev { animation: pf-flip-prev ${FLIP_MS}ms cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards; }
      `}</style>

      {/* Book — perspective wrapper + bound aspect */}
      <div
        className="relative w-full max-w-3xl aspect-[4/3] sm:aspect-[5/4] rounded-md"
        style={{ perspective: '1800px' }}
      >
        {/* Spine + outer book shadow (behind everything) */}
        <div
          className="absolute inset-0 rounded-md bg-amber-900"
          style={{ boxShadow: '0 30px 60px -20px rgba(0,0,0,0.55), 0 12px 24px -8px rgba(0,0,0,0.35)' }}
          aria-hidden="true"
        />

        {/* Incoming page (current page, sits underneath the rotating one) */}
        <PageFace pageDef={PAGES[page]} number={page + 1} total={PAGES.length} />

        {/* Outgoing page (rotates away on flip) */}
        {outgoing !== null && (
          <div
            className={`absolute inset-0 ${flipDir === 'next' ? 'pf-flip-next' : 'pf-flip-prev'}`}
            style={{
              transformOrigin: flipDir === 'next' ? 'left center' : 'right center',
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
            }}
          >
            <PageFace pageDef={PAGES[outgoing]} number={outgoing + 1} total={PAGES.length} />
          </div>
        )}

        {/* Click zones for edge-tap navigation */}
        <button
          type="button"
          onClick={() => turn('prev')}
          disabled={isFirst}
          aria-label="Previous page"
          className="absolute left-0 top-0 bottom-0 w-1/5 z-20 cursor-w-resize disabled:cursor-not-allowed disabled:opacity-0 group"
        >
          <span className="absolute top-1/2 -translate-y-1/2 left-3 sm:left-5 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/0 group-hover:bg-white/70 group-hover:shadow-md text-amber-800 transition-all opacity-0 group-hover:opacity-100" aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          onClick={() => turn('next')}
          disabled={isLast}
          aria-label="Next page"
          className="absolute right-0 top-0 bottom-0 w-1/5 z-20 cursor-e-resize disabled:cursor-not-allowed disabled:opacity-0 group"
        >
          <span className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-5 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/0 group-hover:bg-white/70 group-hover:shadow-md text-amber-800 transition-all opacity-0 group-hover:opacity-100" aria-hidden="true">›</span>
        </button>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center gap-3 flex-wrap justify-center">
        <button
          type="button" onClick={() => turn('prev')} disabled={isFirst || flipDir !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>
        <span className="text-[12px] tabular-nums font-mono text-slate-700">
          <strong className="text-slate-900">{page + 1}</strong> / {PAGES.length}
        </span>
        <button
          type="button" onClick={() => turn('next')} disabled={isLast || flipDir !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md bg-amber-600 text-white border border-amber-700 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          Next →
        </button>
      </div>

      {/* Chapter quick-jump pills */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
        {PAGES.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => jumpTo(i)}
            aria-current={i === page ? 'page' : undefined}
            className={[
              'text-[10px] font-bold uppercase tracking-[1.5px] rounded-full px-2 py-0.5 transition-colors',
              i === page
                ? 'bg-amber-700 text-white border border-amber-800'
                : 'bg-white text-slate-700 border border-slate-300 hover:border-amber-400 hover:text-amber-800',
            ].join(' ')}
          >
            {p.shortTitle}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-slate-500 italic mt-3 text-center max-w-md">
        Tap the edges, use ← / → arrow keys, or click the chapter pills above.
      </p>
    </div>
  )
}

// ─── Page face — paper-textured card that holds a page's content ──────

function PageFace({ pageDef, number, total }: { pageDef: PageDef; number: number; total: number }) {
  return (
    <article
      className="absolute inset-0 rounded-md overflow-hidden"
      style={{
        background:
          // Subtle paper texture: a soft diagonal cream with a faint vertical grain
          'linear-gradient(135deg, #fefcf3 0%, #fbf6e3 100%)',
        boxShadow: 'inset 0 0 50px rgba(120,53,15,0.05), inset 2px 0 0 rgba(120,53,15,0.10)',
      }}
    >
      {/* Inner page padding + content slot */}
      <div className="absolute inset-0 px-6 py-6 sm:px-12 sm:py-10 overflow-y-auto">
        {pageDef.render()}
      </div>

      {/* Page footer — chapter label + page number */}
      {pageDef.kind !== 'cover' && (
        <footer className="absolute bottom-2 left-0 right-0 flex items-baseline justify-between px-6 sm:px-12 text-[9.5px] uppercase tracking-[2.5px] text-amber-800/70 pointer-events-none">
          <span>{pageDef.pageLabel ?? 'The Indian Retirement Playbook'}</span>
          <span className="tabular-nums">{number} / {total}</span>
        </footer>
      )}
    </article>
  )
}

// ─── Page content — Cover ─────────────────────────────────────────────

function CoverPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center relative">
      {/* Decorative double border */}
      <div className="absolute inset-3 border-2 border-amber-700 rounded-sm" aria-hidden="true" />
      <div className="absolute inset-5 border border-amber-500/60 rounded-sm" aria-hidden="true" />

      <div className="relative z-10">
        <div className="text-[10px] font-bold tracking-[5px] uppercase text-amber-700 mb-3">
          Welcome · नमस्ते
        </div>
        <div className="text-7xl sm:text-8xl mb-4 leading-none" role="img" aria-label="Namaste">🙏</div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-amber-900 leading-tight">
          The Indian Retirement Playbook
        </h1>
        <p className="font-serif italic text-base sm:text-lg text-slate-700 mt-3 max-w-md mx-auto leading-snug">
          Plan the years. Live the days.
          <br />
          Live without fear — head held high.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3" aria-hidden="true">
          <span className="h-px w-12 bg-amber-500" />
          <span className="text-amber-700 text-sm">◆</span>
          <span className="h-px w-12 bg-amber-500" />
        </div>
        <p className="text-[11px] uppercase tracking-[3px] font-bold text-amber-800 mt-5">FY 2025–26</p>
        <p className="text-[10px] text-slate-500 italic mt-2">Calibrated for Indians 50+ · Updated annually</p>
      </div>
    </div>
  )
}

// ─── Page content — Table of Contents ────────────────────────────────

function TocPage() {
  return (
    <div className="h-full flex flex-col">
      <PageHeading eyebrow="Contents" title="Six chapters, one playbook." />
      <ol className="mt-5 space-y-3 flex-1">
        {TOC_ENTRIES.map((e) => (
          <li key={e.n} className="grid grid-cols-[28px_1fr_50px] items-baseline gap-3 border-b border-amber-200/60 pb-2.5">
            <span className="font-serif italic text-2xl font-extrabold text-amber-700 tabular-nums leading-none">{e.n}</span>
            <div>
              <div className="font-serif text-base font-bold text-slate-900 leading-tight">{e.title}</div>
              <div className="text-[11.5px] text-slate-600 italic mt-0.5 leading-snug">{e.teaser}</div>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-amber-800/80 text-right">p. {e.page}</span>
          </li>
        ))}
      </ol>
      <p className="text-[10px] text-slate-500 italic text-center mt-3">Tap chapter pills below the book to jump.</p>
    </div>
  )
}

// ─── Page content — Reality ───────────────────────────────────────────

function RealityPage() {
  return (
    <div className="h-full flex flex-col">
      <PageHeading eyebrow="Chapter 1 · The Reality Check" title="India's retirement gap." dropCap="I" />
      <p className="font-serif text-[13.5px] leading-relaxed text-slate-800 mt-2">
        India scored a <strong>D-grade</strong> on the Mercer-CFA Global Pension Index 2025 (45.9 / 100). Only <strong>29%</strong> of seniors receive any pension. Joint families are shrinking, healthcare inflation runs at 12–14%, and a 60-year-old today must plan for <strong>25–35 years</strong> of expenses with rising costs every year.
      </p>
      <div className="grid grid-cols-2 gap-2.5 mt-4">
        <StatCard tone="saffron" stat="₹5–7 Cr"   label="What a metro household typically needs" />
        <StatCard tone="rose"    stat="12–14%"    label="India healthcare inflation per year" />
        <StatCard tone="navy"    stat="90 yrs"    label="Plan to age 90 — outliving savings is the real risk" />
        <StatCard tone="emerald" stat="CPI + 3%"  label="Real-return target — beats FD-only by miles" />
      </div>
      <blockquote className="font-serif italic text-[13px] text-amber-900 border-l-4 border-amber-500 pl-3 mt-4 leading-snug">
        “The first hour of work was for tomorrow, not today.” — village proverb, eastern India
      </blockquote>
    </div>
  )
}

// ─── Page content — Phases ────────────────────────────────────────────

function PhasesPage() {
  return (
    <div className="h-full flex flex-col">
      <PageHeading eyebrow="Chapter 2 · The Two Phases" title="Two stages, two playbooks." dropCap="E" />
      <p className="font-serif text-[13px] leading-relaxed text-slate-800 mt-2">
        Every Indian after 50 is in one of two stages. The strategy must match the stage — mixing them is the most common error.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 flex-1">
        <PhaseCardCompact
          tone="amber" title="Active phase" age="50–65"
          focus="Build · accumulate · de-risk"
          pillars={['Compound in equity until 60.', 'Insure aggressively while healthy.', 'Lock SCSS / SCSS-spouse at 60.', 'Map a glide-path to retirement.']}
        />
        <PhaseCardCompact
          tone="emerald" title="Preservation" age="65+"
          focus="Withdraw · protect · simplify"
          pillars={['4-bucket cascade for SWP.', 'Annual inflation guardrails.', 'Estate + nominee tidied.', 'Healthcare on autopilot.']}
        />
      </div>
    </div>
  )
}

// ─── Page content — Wisdom ────────────────────────────────────────────

function WisdomPage() {
  return (
    <div className="h-full flex flex-col">
      <PageHeading eyebrow="Chapter 3 · Wisdom" title="A few words to begin." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 flex-1">
        <Quote origin="India · Chāṇakya"  verse="उद्योगिनं पुरुषसिंहमुपैति लक्ष्मीः" text="“Fortune favours the diligent — never the timid who blame fate.”" />
        <Quote origin="West · Buffett"                                                text="“Do not save what is left after spending — spend what is left after saving.”" />
        <Quote origin="India · Bhagavad Gītā 2.47" verse="कर्मण्येवाधिकारस्ते मा फलेषु कदाचन" text="“Set thy heart upon thy work — but never on its reward.”" />
        <Quote origin="West · Seneca"     text="“It is not that we have a short time to live — but that we waste much of it.”" />
      </div>
    </div>
  )
}

// ─── Page content — Mistakes ──────────────────────────────────────────

function MistakesPage() {
  const rows = [
    { mistake: 'Treating FDs as the whole plan.',          fix: 'Mix FD floor + bond ladder + equity refill (4-bucket cascade).' },
    { mistake: 'Buying ULIPs / endowments for protection.', fix: 'Pure term + ELSS / index funds. Never mix insurance with investment.' },
    { mistake: 'Ignoring healthcare inflation.',            fix: 'Senior-specific plan + super top-up at 60. Lock in early.' },
    { mistake: 'No will / no nominees.',                    fix: 'Registered will + nominees on every demat / MF / EPF / NPS account.' },
  ]
  return (
    <div className="h-full flex flex-col">
      <PageHeading eyebrow="Chapter 4 · Mistakes" title="Four common errors." dropCap="M" />
      <ul className="mt-3 space-y-2.5 flex-1">
        {rows.map((r, i) => (
          <li key={i} className="grid grid-cols-[24px_1fr] gap-2 items-baseline border-b border-amber-200/60 pb-2 last:border-b-0">
            <span className="font-serif italic text-lg font-extrabold text-rose-700 tabular-nums">{i + 1}</span>
            <div>
              <div className="font-serif text-[13px] font-bold text-rose-900 leading-snug">⚠ {r.mistake}</div>
              <div className="font-serif text-[12.5px] text-emerald-900 leading-snug mt-0.5">✓ {r.fix}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Page content — Action ────────────────────────────────────────────

function ActionPage() {
  const themes = [
    { tone: 'amber',  emoji: '💰', name: 'Money',   items: ['4-bucket allocation locked.', 'Annual rebalance.', 'Tax-loss harvest each FY.'] },
    { tone: 'emerald',emoji: '🩺', name: 'Health',  items: ['₹25–50L health cover.', 'Annual full-body checkup.', 'Walk 8000 steps daily.'] },
    { tone: 'navy',   emoji: '⏳', name: 'Time',    items: ['Block 1 hour weekly for review.', 'Spend with intention, not impulse.'] },
    { tone: 'rose',   emoji: '✨', name: 'Purpose', items: ['Define one project beyond money.', 'Volunteer 2 hrs / month.', 'Mentor someone younger.'] },
  ]
  return (
    <div className="h-full flex flex-col">
      <PageHeading eyebrow="Chapter 5 · Action" title="Four themes, one master list." />
      <div className="grid grid-cols-2 gap-2.5 mt-3 flex-1">
        {themes.map((t) => (
          <ThemeCard key={t.name} {...t} />
        ))}
      </div>
    </div>
  )
}

// ─── Page content — Reflect ───────────────────────────────────────────

function ReflectPage() {
  const questions = [
    'What does a fulfilled day look like for me at 70?',
    'Whose life depends on the decisions I make this year?',
    'What would I regret not doing in the next decade?',
    'How much is "enough" — in numbers and in feelings?',
    'If money were no object, what would I still do?',
  ]
  return (
    <div className="h-full flex flex-col">
      <PageHeading eyebrow="Chapter 6 · Reflect" title="Five questions to answer first." dropCap="B" />
      <p className="font-serif text-[13px] text-slate-700 italic leading-snug mt-2">
        Before any number-crunching, sit with these. There are no wrong answers — only honest ones.
      </p>
      <ol className="mt-4 space-y-3 flex-1">
        {questions.map((q, i) => (
          <li key={i} className="grid grid-cols-[36px_1fr] items-baseline gap-3">
            <span className="font-serif italic text-3xl font-extrabold text-amber-700 tabular-nums leading-none">{i + 1}</span>
            <span className="font-serif text-[13.5px] text-slate-900 leading-snug">{q}</span>
          </li>
        ))}
      </ol>
      <p className="text-center font-serif italic text-[12px] text-amber-800 mt-4 pt-3 border-t border-amber-300">
        ~ End of Playbook · नमस्ते ~
      </p>
    </div>
  )
}

// ─── Reusable page primitives ─────────────────────────────────────────

function PageHeading({ eyebrow, title, dropCap }: { eyebrow: string; title: string; dropCap?: string }) {
  return (
    <header className="mb-1">
      <div className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700">{eyebrow}</div>
      <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-amber-900 leading-tight mt-1">
        {dropCap && <span className="float-left font-serif text-5xl sm:text-6xl font-extrabold text-amber-700 mr-2 mt-1 leading-[0.85]">{dropCap}</span>}
        {dropCap ? title.slice(dropCap.length) : title}
      </h2>
    </header>
  )
}

function StatCard({ tone, stat, label }: { tone: 'saffron' | 'rose' | 'navy' | 'emerald'; stat: string; label: string }) {
  const border = tone === 'saffron' ? 'border-amber-400 bg-amber-50' : tone === 'rose' ? 'border-rose-400 bg-rose-50' : tone === 'navy' ? 'border-blue-400 bg-blue-50' : 'border-emerald-400 bg-emerald-50'
  const fg = tone === 'saffron' ? 'text-amber-800' : tone === 'rose' ? 'text-rose-800' : tone === 'navy' ? 'text-blue-800' : 'text-emerald-800'
  return (
    <div className={`rounded-md border-2 ${border} px-2.5 py-2`}>
      <div className={`font-serif text-xl font-extrabold tabular-nums ${fg} leading-none`}>{stat}</div>
      <div className="text-[10.5px] text-slate-700 leading-snug mt-1">{label}</div>
    </div>
  )
}

function Quote({ origin, verse, text }: { origin: string; verse?: string; text: string }) {
  return (
    <figure className="rounded-md border border-amber-300 bg-white/70 p-3">
      <figcaption className="text-[9px] font-bold uppercase tracking-[2px] text-amber-700 mb-1.5">{origin}</figcaption>
      {verse && <p className="font-serif italic text-[12px] text-amber-900 leading-snug mb-1">{verse}</p>}
      <blockquote className="font-serif text-[12.5px] text-slate-900 leading-snug">{text}</blockquote>
    </figure>
  )
}

function PhaseCardCompact({ tone, title, age, focus, pillars }: { tone: 'amber' | 'emerald'; title: string; age: string; focus: string; pillars: string[] }) {
  const border = tone === 'amber' ? 'border-amber-400 bg-amber-50/60' : 'border-emerald-400 bg-emerald-50/60'
  const fg = tone === 'amber' ? 'text-amber-800' : 'text-emerald-800'
  return (
    <article className={`rounded-md border-2 ${border} p-3`}>
      <div className="flex items-baseline justify-between mb-1">
        <h3 className={`font-serif text-base font-extrabold ${fg} leading-tight`}>{title}</h3>
        <span className={`text-[10px] font-bold tracking-[1.5px] uppercase ${fg}`}>{age}</span>
      </div>
      <div className="text-[10.5px] text-slate-700 italic mb-2">{focus}</div>
      <ul className="text-[11.5px] text-slate-800 space-y-1 leading-snug">
        {pillars.map((p, i) => <li key={i}>· {p}</li>)}
      </ul>
    </article>
  )
}

function ThemeCard({ tone, emoji, name, items }: { tone: string; emoji: string; name: string; items: string[] }) {
  const palette: Record<string, string> = {
    amber:   'border-amber-400 bg-amber-50',
    emerald: 'border-emerald-400 bg-emerald-50',
    navy:    'border-blue-400 bg-blue-50',
    rose:    'border-rose-400 bg-rose-50',
  }
  return (
    <article className={`rounded-md border-2 ${palette[tone]} p-2.5`}>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className="text-lg leading-none">{emoji}</span>
        <h3 className="font-serif text-[13px] font-extrabold text-slate-900 leading-tight">{name}</h3>
      </div>
      <ul className="text-[11px] text-slate-800 space-y-0.5 leading-snug">
        {items.map((it, i) => <li key={i}>· {it}</li>)}
      </ul>
    </article>
  )
}
