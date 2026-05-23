// Lightweight modal/dialog used by the Profile-tab assessments.
// Renders a fixed full-viewport backdrop + a centred scrollable panel.
// Closes on backdrop click and on Escape. Body scroll is locked while open.

import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  /** Tailwind max-width class for the panel. Default: `max-w-3xl`. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
  /** Tone-keyed accent stripe across the top. Defaults to slate. */
  accent?: 'navy' | 'amber' | 'indigo' | 'emerald' | 'rose' | 'slate'
  /** When provided, renders a "?" help button next to the close button. */
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

export function Modal({ open, title, subtitle, onClose, children, size = 'xl', accent = 'slate', onHelp, helpActive }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${SIZE_CLASS[size]} bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden`}
      >
        <div className={`h-1 w-full ${ACCENT_CLASS[accent]}`} aria-hidden="true" />
        <header className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-100 flex-shrink-0">
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
              className={`shrink-0 w-9 h-9 rounded-md font-bold text-xl leading-none transition-colors flex items-center justify-center border-2 ${
                helpActive
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 hover:border-amber-400'
              }`}
              aria-label={helpActive ? 'Hide examples' : 'Show examples'}
              aria-pressed={helpActive}
              title={helpActive ? 'Hide help / examples' : 'Show help / examples'}
            >
              ?
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center"
            aria-label="Close"
          >
            <span aria-hidden="true" className="text-xl leading-none font-bold">×</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-50/40">
          {children}
        </div>
      </div>
    </div>
  )
}
