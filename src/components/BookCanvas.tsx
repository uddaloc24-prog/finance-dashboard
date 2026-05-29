// BookCanvas — reusable interactive 2-page-spread book chrome.
//
// Consumers (PlaybookFlipBook, GuideFlipBook) supply `spreads` (each with
// a left and right ReactNode) plus a `chapters` index for the pill rail.
// All of the physical-book aesthetic (leather binding, page-edge stack,
// spine shadow, leaf-flip animation, 3D arrow buttons, chapter pills,
// keyboard) lives here.

import { useState, useEffect, useLayoutEffect, useCallback, useRef, type ReactNode } from 'react'

// Pages are authored at this fixed reference size; PageSlot scales the
// content uniformly so the same layout works at any modal width.
// Aspect 4 : 5 matches a half-page of an 8 : 5 book.
const BASE_PAGE_W = 360
const BASE_PAGE_H = 450

export interface Spread {
  id: string
  left:  ReactNode
  right: ReactNode
}

export interface Chapter {
  name: string
  spreadIdx: number
}

interface Props {
  spreads: Spread[]
  chapters: Chapter[]
  flipMs?: number
  /** Label shown above the chapter-pill column (e.g., "Chapters", "Sections"). */
  pillRailLabel?: string
}

export function BookCanvas({ spreads, chapters, flipMs = 800, pillRailLabel = 'Chapters' }: Props) {
  const [spread, setSpread]     = useState(0)
  const [outgoing, setOutgoing] = useState<number | null>(null)
  const [flipDir, setFlipDir]   = useState<'next' | 'prev' | null>(null)

  const turn = useCallback((dir: 'next' | 'prev') => {
    if (flipDir !== null) return
    setSpread((cur) => {
      const target = dir === 'next' ? cur + 1 : cur - 1
      if (target < 0 || target >= spreads.length) return cur
      setOutgoing(cur)
      setFlipDir(dir)
      window.setTimeout(() => { setOutgoing(null); setFlipDir(null) }, flipMs)
      return target
    })
  }, [flipDir, flipMs, spreads.length])

  const jumpTo = useCallback((target: number) => {
    if (flipDir !== null || target === spread || target < 0 || target >= spreads.length) return
    const dir: 'next' | 'prev' = target > spread ? 'next' : 'prev'
    setOutgoing(spread); setSpread(target); setFlipDir(dir)
    window.setTimeout(() => { setOutgoing(null); setFlipDir(null) }, flipMs)
  }, [flipDir, spread, flipMs, spreads.length])

  // Keyboard ← / →
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') { e.preventDefault(); turn('next') }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); turn('prev') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [turn])

  const isFirst = spread === 0
  const isLast  = spread === spreads.length - 1
  const current = spreads[spread]
  const out     = outgoing !== null ? spreads[outgoing] : null
  const flipping = flipDir !== null

  // During flip: keep the "leaving behind" content visible on the non-flipping side.
  const showLeftStatic  = flipDir === 'next' && out ? out.left  : current.left
  const showRightStatic = flipDir === 'prev' && out ? out.right : current.right

  return (
    <div className="flex flex-col items-center">
      <style>{`
        @keyframes pf-leaf-next {
          0%   { transform: rotateY(0deg);     box-shadow: -4px 0 8px rgba(0,0,0,0.05); }
          50%  { transform: rotateY(-90deg);   box-shadow: -22px 0 32px rgba(0,0,0,0.25); }
          100% { transform: rotateY(-180deg);  box-shadow: 4px 0 8px rgba(0,0,0,0.05); }
        }
        @keyframes pf-leaf-prev {
          0%   { transform: rotateY(0deg);     box-shadow: 4px 0 8px rgba(0,0,0,0.05); }
          50%  { transform: rotateY(90deg);    box-shadow: 22px 0 32px rgba(0,0,0,0.25); }
          100% { transform: rotateY(180deg);   box-shadow: -4px 0 8px rgba(0,0,0,0.05); }
        }
        .pf-leaf-next { animation: pf-leaf-next ${flipMs}ms cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards; }
        .pf-leaf-prev { animation: pf-leaf-prev ${flipMs}ms cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards; }
      `}</style>

      <div className="flex items-center w-full gap-2 sm:gap-3">

        {/* Book group — fills remaining horizontal space, centred inside it. */}
        <div className="flex-1 min-w-0 flex items-center justify-center gap-2 sm:gap-3">

          <NavArrow direction="prev" onClick={() => turn('prev')} disabled={isFirst || flipping} />

          {/* ── Book ─────────────────────────────────────────────── */}
          <div
            className="relative shrink"
            style={{
              perspective: '2800px',
              // Container-relative so the book scales with a resized modal.
              // 100% of the book group minus space for the two arrows + gaps.
              width: 'clamp(320px, calc(100% - 120px), 1100px)',
              aspectRatio: '8 / 5',
            }}
          >
          {/* Leather binding */}
          <div
            className="absolute -inset-2 rounded-r-md rounded-l-sm"
            aria-hidden="true"
            style={{
              background:
                'linear-gradient(135deg, #7c2d12 0%, #92400e 35%, #b45309 50%, #92400e 65%, #7c2d12 100%)',
              boxShadow:
                '0 30px 60px -20px rgba(0,0,0,0.65), 0 12px 24px -8px rgba(0,0,0,0.40)',
            }}
          />

          {/* Page-edge stack (top/bottom/outer sides) */}
          <div className="absolute -top-1 left-1 right-1 h-1 rounded-t-sm overflow-hidden pointer-events-none" aria-hidden="true"
               style={{ background: 'repeating-linear-gradient(to bottom, #fef3c7 0, #fef3c7 1px, #d97706 1px, #d97706 1.5px)' }} />
          <div className="absolute -bottom-1 left-1 right-1 h-1 rounded-b-sm overflow-hidden pointer-events-none" aria-hidden="true"
               style={{ background: 'repeating-linear-gradient(to top, #fef3c7 0, #fef3c7 1px, #d97706 1px, #d97706 1.5px)' }} />
          <div className="absolute -left-1 top-2 bottom-2 w-1 rounded-l-sm overflow-hidden pointer-events-none" aria-hidden="true"
               style={{ background: 'repeating-linear-gradient(to right, #fef3c7 0, #fef3c7 1px, #d97706 1px, #d97706 1.5px)' }} />
          <div className="absolute -right-1 top-2 bottom-2 w-1 rounded-r-sm overflow-hidden pointer-events-none" aria-hidden="true"
               style={{ background: 'repeating-linear-gradient(to left, #fef3c7 0, #fef3c7 1px, #d97706 1px, #d97706 1.5px)' }} />

          {/* Two-page spread */}
          <div className="absolute inset-0 grid grid-cols-2 rounded-sm overflow-hidden" style={{ transformStyle: 'preserve-3d' }}>

            <PageSlot side="left">{showLeftStatic}</PageSlot>
            <PageSlot side="right">{showRightStatic}</PageSlot>

            {/* Spine shadow */}
            <div
              className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-3 pointer-events-none"
              aria-hidden="true"
              style={{
                background:
                  'linear-gradient(to right, rgba(120,53,15,0.30), rgba(120,53,15,0.00) 35%, rgba(120,53,15,0.00) 65%, rgba(120,53,15,0.30))',
              }}
            />

            {/* Flipping leaf */}
            {flipping && out && (
              <div
                className={`absolute top-0 bottom-0 ${flipDir === 'next' ? 'right-0' : 'left-0'} w-1/2 ${flipDir === 'next' ? 'pf-leaf-next' : 'pf-leaf-prev'}`}
                style={{
                  transformStyle: 'preserve-3d',
                  transformOrigin: flipDir === 'next' ? 'left center' : 'right center',
                  zIndex: 5,
                }}
                aria-hidden="true"
              >
                <div
                  className="absolute inset-0"
                  style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
                >
                  <PageSlot side={flipDir === 'next' ? 'right' : 'left'}>
                    {flipDir === 'next' ? out.right : out.left}
                  </PageSlot>
                </div>
                <div
                  className="absolute inset-0"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', transformStyle: 'preserve-3d' }}
                >
                  <PageSlot side={flipDir === 'next' ? 'left' : 'right'}>
                    {flipDir === 'next' ? current.left : current.right}
                  </PageSlot>
                </div>
              </div>
            )}
          </div>
        </div>

          <NavArrow direction="next" onClick={() => turn('next')} disabled={isLast || flipping} />
        </div>{/* /book group */}

        {/* TOC rail — narrow vertical list pushed to the extreme right */}
        <nav
          className="hidden md:flex flex-col shrink-0 w-[96px] self-stretch border-l border-amber-200/70 pl-2"
          aria-label={pillRailLabel}
        >
          <div className="text-[8.5px] font-bold tracking-[1.5px] uppercase text-amber-700 mb-1.5 px-1">{pillRailLabel}</div>
          <div className="flex-1 flex flex-col gap-[1px] overflow-y-auto pr-0.5 -mr-0.5">
            {chapters.map((c) => {
              const active = c.spreadIdx === spread
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => jumpTo(c.spreadIdx)}
                  aria-current={active ? 'page' : undefined}
                  title={c.name}
                  className={[
                    'text-left text-[10px] py-[3px] pl-1.5 pr-1 rounded-r-sm border-l-[2px] transition-colors leading-tight truncate',
                    active
                      ? 'border-amber-700 text-amber-900 bg-amber-50 font-bold'
                      : 'border-slate-200 text-slate-600 hover:text-amber-800 hover:border-amber-400 hover:bg-amber-50/40',
                  ].join(' ')}
                >
                  {c.name}
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Counter + hint */}
      <div className="mt-5 text-center">
        <p className="text-[11px] text-slate-700 tabular-nums">
          <span className="font-mono font-bold text-amber-900">Spread {spread + 1}</span>
          <span className="text-slate-400 mx-1.5">·</span>
          <span className="text-slate-500">of {spreads.length}</span>
        </p>
        <p className="text-[10px] text-slate-500 italic mt-1">
          Use the side arrows · ← / → keys · or {pillRailLabel.toLowerCase()} →
        </p>
      </div>

      {/* Mobile pill row */}
      <nav className="md:hidden mt-3 flex flex-wrap items-center justify-center gap-1.5" aria-label={`${pillRailLabel} (mobile)`}>
        {chapters.map((c) => {
          const active = c.spreadIdx === spread
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => jumpTo(c.spreadIdx)}
              className={[
                'text-[10px] font-bold uppercase tracking-[1.5px] rounded-full px-2 py-0.5 transition-colors',
                active ? 'bg-amber-700 text-white border border-amber-800' : 'bg-white text-slate-700 border border-slate-300',
              ].join(' ')}
            >
              {c.name}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// ─── Page slot (cream paper face) ─────────────────────────────────────
//
// The outer ref div gets sized by the book grid (½ book width × full
// book height). A ResizeObserver measures it and computes a uniform
// scale so the inner content (authored at BASE_PAGE_W × BASE_PAGE_H) is
// rendered at the actual rect size — every font, padding, border, and
// icon inside scales together.

function PageSlot({ side, children }: { side: 'left' | 'right'; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    function measure() {
      if (!el) return
      const w = el.getBoundingClientRect().width
      if (w > 0) setScale(w / BASE_PAGE_W)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const spineSide = side === 'left' ? 'right' : 'left'
  const outerSide = side === 'left' ? 'left'  : 'right'
  return (
    <div
      ref={ref}
      className="relative h-full overflow-hidden"
      style={{
        background:
          'linear-gradient(' + (side === 'left' ? '135deg' : '225deg') + ', #fefcf3 0%, #fbf6e3 100%)',
        boxShadow: `inset ${spineSide === 'left' ? '6px' : '-6px'} 0 12px rgba(120,53,15,0.10), inset ${outerSide === 'left' ? '2px' : '-2px'} 0 0 rgba(120,53,15,0.10)`,
      }}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: BASE_PAGE_W,
          height: BASE_PAGE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="relative w-full h-full px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── 3D arrow button ──────────────────────────────────────────────────

function NavArrow({ direction, onClick, disabled }: { direction: 'next' | 'prev'; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'next' ? 'Next page' : 'Previous page'}
      title={direction === 'next' ? 'Next page →' : '← Previous page'}
      className={[
        'shrink-0 inline-flex items-center justify-center rounded-full select-none transition-all',
        'w-10 h-10 sm:w-12 sm:h-12 text-2xl sm:text-3xl font-bold text-white',
        'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 hover:from-amber-300 hover:via-amber-400 hover:to-amber-600',
        'border border-black/15 active:translate-y-[2px]',
        'disabled:opacity-30 disabled:cursor-not-allowed disabled:active:translate-y-0',
      ].join(' ')}
      style={{
        boxShadow: '0 5px 0 0 rgb(120,53,15), 0 10px 18px -4px rgba(15,23,42,0.45), inset 0 2px 0 rgba(255,255,255,0.50), inset 0 -2px 0 rgba(0,0,0,0.20)',
        textShadow: '0 1px 1px rgba(0,0,0,0.45)',
      }}
    >
      <span aria-hidden="true" className="leading-none">{direction === 'next' ? '›' : '‹'}</span>
    </button>
  )
}

// ─── Shared page primitives (for content authors) ─────────────────────

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="relative h-full flex flex-col">{children}</div>
}

export function PageHeading({ eyebrow, title, dropCap }: { eyebrow: string; title: string; dropCap?: string }) {
  return (
    <header className="mb-1">
      <div className="text-[9px] font-bold tracking-[2.5px] uppercase text-amber-700">{eyebrow}</div>
      <h2 className="font-serif text-lg sm:text-xl font-extrabold text-amber-900 leading-tight mt-0.5">
        {dropCap && <span className="float-left font-serif text-4xl sm:text-5xl font-extrabold text-amber-700 mr-1.5 mt-0.5 leading-[0.85]">{dropCap}</span>}
        {dropCap ? title.slice(dropCap.length) : title}
      </h2>
    </header>
  )
}

export function PageFooter({ chapter, pageNum }: { chapter: string; pageNum: number }) {
  return (
    <footer className="absolute bottom-0 left-0 right-0 flex items-baseline justify-between text-[8.5px] uppercase tracking-[2px] text-amber-800/70 pointer-events-none pt-1.5 border-t border-amber-200/40">
      <span>{chapter}</span>
      <span className="tabular-nums">{pageNum}</span>
    </footer>
  )
}
