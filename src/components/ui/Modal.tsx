// Resizable, minimizable, maximizable modal/dialog used across the app.
//
//   • Three window-control buttons in the header — minimize · maximize ·
//     close. Minimize collapses to a small bar at the bottom-right with
//     only the title visible (backdrop is hidden so the page underneath
//     is interactive). Maximize fills the viewport. Restore returns to
//     last size.
//   • Six mouse-resize handles around the panel — N · S · E · W edges
//     (single-axis) and SE · SW corners (diagonal). The modal is
//     viewport-centred, so dragging any edge grows / shrinks symmetrically
//     about the centre. The SE corner shows a small grip marker for
//     discoverability.
//   • Closes on backdrop click and on Escape. Body scroll is locked while
//     a non-minimized modal is open.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react'

interface Props {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  /** Default Tailwind max-width when not custom-resized. Default: `xl` → `max-w-3xl`. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
  /** Tone-keyed accent stripe across the top. Defaults to slate. */
  accent?: 'navy' | 'amber' | 'indigo' | 'emerald' | 'rose' | 'slate'
  /** When provided, renders a "?" help button next to the window controls. */
  onHelp?: () => void
  /** Set true to mark the help button as currently expanded. */
  helpActive?: boolean
}

const SIZE_CLASS: Record<NonNullable<Props['size']>, string> = {
  sm:  'max-w-md',
  md:  'max-w-lg',
  lg:  'max-w-2xl',
  xl:  'max-w-3xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-5xl',
  '4xl': 'max-w-6xl',
  '5xl': 'max-w-7xl',
}

const ACCENT_CLASS: Record<NonNullable<Props['accent']>, string> = {
  navy:    'bg-blue-700',
  amber:   'bg-amber-600',
  indigo:  'bg-indigo-700',
  emerald: 'bg-emerald-600',
  rose:    'bg-rose-600',
  slate:   'bg-slate-700',
}

type WindowState = 'normal' | 'minimized' | 'maximized'
type ResizeDir = 'n' | 's' | 'e' | 'w' | 'se' | 'sw'

const CURSOR_FOR_DIR: Record<ResizeDir, string> = {
  n: 'ns-resize', s: 'ns-resize',
  e: 'ew-resize', w: 'ew-resize',
  se: 'nwse-resize', sw: 'nesw-resize',
}

export function Modal({ open, title, subtitle, onClose, children, size = 'xl', accent = 'slate', onHelp, helpActive }: Props) {
  const [windowState, setWindowState] = useState<WindowState>('normal')
  const [customSize, setCustomSize] = useState<{ w: number; h: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    // Only lock body scroll for non-minimized modals. Minimized lets the
    // page behind stay interactive.
    if (windowState !== 'minimized') document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, windowState])

  function handleClose() {
    // Reset state so next open is fresh, then bubble to parent.
    setWindowState('normal')
    setCustomSize(null)
    onClose()
  }

  function toggleMin() { setWindowState((s) => s === 'minimized' ? 'normal' : 'minimized') }
  function toggleMax() { setWindowState((s) => s === 'maximized' ? 'normal' : 'maximized') }

  function startResize(e: ReactMouseEvent, dir: ResizeDir) {
    e.preventDefault()
    e.stopPropagation()
    if (windowState !== 'normal') setWindowState('normal')
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const startW = rect.width
    const startH = rect.height
    const startX = e.clientX
    const startY = e.clientY

    function onMove(ev: globalThis.MouseEvent) {
      ev.preventDefault()
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      let newW = startW
      let newH = startH
      // Modal is viewport-centred, so width/height changes grow symmetrically
      // about the centre — drag distance is doubled to make the dragged edge
      // track the cursor.
      if (dir.includes('e')) newW = startW + 2 * dx
      if (dir.includes('w')) newW = startW - 2 * dx
      if (dir.includes('s')) newH = startH + 2 * dy
      if (dir.includes('n')) newH = startH - 2 * dy
      const minW = 320
      const minH = 240
      const maxW = window.innerWidth - 16
      const maxH = window.innerHeight - 16
      newW = Math.max(minW, Math.min(maxW, newW))
      newH = Math.max(minH, Math.min(maxH, newH))
      setCustomSize({ w: newW, h: newH })
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = CURSOR_FOR_DIR[dir]
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (!open) return null

  const isMin = windowState === 'minimized'
  const isMax = windowState === 'maximized'

  // ── Minimized — small bar at bottom-right; backdrop hidden ────────
  if (isMin) {
    return (
      <div
        className="fixed bottom-3 right-3 z-[100] bg-white border border-slate-200 rounded-lg shadow-xl flex items-stretch overflow-hidden animate-[fadeIn_0.15s_ease-out]"
        style={{ minWidth: 280, maxWidth: 380 }}
        role="dialog"
        aria-label={title}
      >
        <div className={`w-1 ${ACCENT_CLASS[accent]}`} aria-hidden="true" />
        <button
          type="button"
          onClick={toggleMin}
          className="flex-1 text-left px-3 py-2 min-w-0 hover:bg-slate-50 transition-colors"
          title="Restore"
        >
          <div className="font-serif text-[12px] font-bold text-slate-900 truncate leading-tight">{title}</div>
          {subtitle && <div className="text-[10px] text-slate-500 truncate mt-0.5">{subtitle}</div>}
        </button>
        <div className="flex items-stretch border-l border-slate-100">
          <WindowBtn title="Restore" onClick={toggleMin} glyph={Glyph.Restore} />
          <WindowBtn title="Close"   onClick={handleClose} glyph={Glyph.Close} danger />
        </div>
      </div>
    )
  }

  // ── Panel sizing ──────────────────────────────────────────────────
  let panelStyle: CSSProperties = {}
  let panelClass = ''
  if (isMax) {
    panelStyle = { width: 'calc(100vw - 16px)', height: 'calc(100vh - 16px)', maxWidth: 'none', maxHeight: 'none' }
  } else if (customSize) {
    panelStyle = { width: `${customSize.w}px`, height: `${customSize.h}px`, maxWidth: 'none', maxHeight: 'none' }
  } else {
    panelClass = `${SIZE_CLASS[size]} max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-3rem)]`
  }
  const useFullWidthClass = !isMax && !customSize

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className={`relative ${useFullWidthClass ? 'w-full' : ''} ${panelClass} bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden`}
        style={panelStyle}
      >
        {/* ── Resize handles (only in normal / custom-size modes) ── */}
        {!isMax && (
          <>
            <ResizeHandle dir="n"  onStart={startResize} />
            <ResizeHandle dir="s"  onStart={startResize} />
            <ResizeHandle dir="e"  onStart={startResize} />
            <ResizeHandle dir="w"  onStart={startResize} />
            <ResizeHandle dir="sw" onStart={startResize} />
            <ResizeHandle dir="se" onStart={startResize} showGrip />
          </>
        )}

        <div className={`h-1 w-full ${ACCENT_CLASS[accent]}`} aria-hidden="true" />
        <header className="flex items-start justify-between gap-2 px-4 sm:px-5 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-base sm:text-lg font-extralight tracking-tight text-slate-900 leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
            )}
          </div>

          {onHelp && (
            <button
              type="button"
              onClick={onHelp}
              aria-label={helpActive ? 'Hide examples' : 'Show examples'}
              aria-pressed={helpActive}
              title={helpActive ? 'Hide help / examples' : 'Show help / examples'}
              className={[
                'shrink-0 inline-flex items-center justify-center gap-1 select-none',
                'rounded-md font-extrabold tracking-[2px] text-xs',
                'h-9 px-3.5 transition-all duration-100',
                'border border-amber-700',
                helpActive
                  ? [
                      'translate-y-[1px]',
                      'bg-gradient-to-b from-amber-600 to-amber-700 text-amber-50',
                      'shadow-[inset_0_2px_4px_rgba(120,53,15,0.5),0_1px_0_rgba(120,53,15,0.4)]',
                    ].join(' ')
                  : [
                      'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-white',
                      'shadow-[0_3px_0_0_rgb(120,53,15),0_5px_8px_-2px_rgba(120,53,15,0.45),inset_0_1px_0_rgba(255,255,255,0.45)]',
                      'hover:from-amber-300 hover:via-amber-400 hover:to-amber-500',
                      'active:translate-y-[2px]',
                      'active:shadow-[0_1px_0_0_rgb(120,53,15),inset_0_1px_2px_rgba(120,53,15,0.3)]',
                    ].join(' '),
              ].join(' ')}
              style={{
                textShadow: helpActive
                  ? '0 1px 1px rgba(120,53,15,0.6)'
                  : '0 1px 1px rgba(120,53,15,0.55), 0 -1px 0 rgba(255,255,255,0.25)',
              }}
            >
              <span aria-hidden="true" className="text-sm leading-none">?</span>
              <span>HELP</span>
            </button>
          )}

          {/* Window controls — minimise · maximise/restore · close */}
          <div className="flex items-center gap-0.5 shrink-0">
            <WindowBtn title="Minimize" onClick={toggleMin} glyph={Glyph.Minimize} />
            <WindowBtn title={isMax ? 'Restore' : 'Maximize'} onClick={toggleMax} glyph={isMax ? Glyph.Restore : Glyph.Maximize} />
            <WindowBtn title="Close" onClick={handleClose} glyph={Glyph.Close} danger />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-50/40">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Window-control button ────────────────────────────────────────────

const Glyph = {
  Minimize: (
    <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden="true">
      <rect x="2" y="9" width="8" height="1.5" fill="currentColor" rx="0.5" />
    </svg>
  ),
  Maximize: (
    <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden="true">
      <rect x="2" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1.5" fill="none" rx="0.5" />
    </svg>
  ),
  Restore: (
    <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden="true">
      <rect x="2.5" y="4" width="6" height="6" stroke="currentColor" strokeWidth="1.3" fill="none" rx="0.5" />
      <path d="M 4.5 4 L 4.5 2.5 L 10 2.5 L 10 8 L 8.5 8" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  ),
  Close: (
    <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden="true">
      <path d="M 3 3 L 9 9 M 9 3 L 3 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
} as const

function WindowBtn({ title, onClick, glyph, danger }: { title: string; onClick: () => void; glyph: ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        'w-8 h-8 rounded-md transition-colors flex items-center justify-center',
        danger
          ? 'text-slate-500 hover:text-white hover:bg-rose-600'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
      ].join(' ')}
    >
      {glyph}
    </button>
  )
}

// ── Resize handle ────────────────────────────────────────────────────

function ResizeHandle({ dir, onStart, showGrip }: { dir: ResizeDir; onStart: (e: ReactMouseEvent, dir: ResizeDir) => void; showGrip?: boolean }) {
  const base: CSSProperties = { position: 'absolute', zIndex: 30, userSelect: 'none', cursor: CURSOR_FOR_DIR[dir] }
  let pos: CSSProperties = {}
  // Edge handles — 5 px thick, inset 14 px from corners so they don't
  // overlap with header buttons / SE grip.
  if (dir === 'n') pos = { top: 0,    left: 14,   right: 14,  height: 5 }
  if (dir === 's') pos = { bottom: 0, left: 14,   right: 14,  height: 5 }
  if (dir === 'e') pos = { right: 0,  top: 14,    bottom: 14, width: 5 }
  if (dir === 'w') pos = { left: 0,   top: 14,    bottom: 14, width: 5 }
  // Bottom corners — 14×14 hit area.
  if (dir === 'se') pos = { bottom: 0, right: 0, width: 14, height: 14 }
  if (dir === 'sw') pos = { bottom: 0, left: 0,  width: 14, height: 14 }

  // Visual grip marks on SE corner so the resize affordance is discoverable.
  const grip: CSSProperties = showGrip
    ? {
        backgroundImage:
          'linear-gradient(135deg, transparent 0, transparent 55%, rgba(100,116,139,0.55) 55%, rgba(100,116,139,0.55) 65%, transparent 65%, transparent 75%, rgba(100,116,139,0.55) 75%, rgba(100,116,139,0.55) 85%, transparent 85%)',
      }
    : {}

  return (
    <div
      role="separator"
      aria-orientation={dir === 'n' || dir === 's' ? 'horizontal' : 'vertical'}
      aria-label={`Resize ${dir.toUpperCase()}`}
      onMouseDown={(e) => onStart(e, dir)}
      style={{ ...base, ...pos, ...grip }}
    />
  )
}
