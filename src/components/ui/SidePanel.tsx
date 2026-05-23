// SidePanel — right-side drawer used by the Plan tab when a step is
// opened. Holds the active step's editor and exposes a Save & Exit
// footer + a "?" help toggle in the header (same affordance as Modal).
// Renders inline as a flex/grid child so the wheel column can shrink
// next to it instead of being covered by a centred backdrop.

import { useEffect, useState, type ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  /** Tone accent for the top stripe + help button. */
  accent?: 'navy' | 'amber' | 'emerald' | 'rose' | 'slate'
  /** When provided, renders a "?" HELP button in the header. */
  helpExamples?: ReactNode
  /** Step number badge shown in the header (e.g. "01"). */
  num?: string
  onClose: () => void
  children: ReactNode
}

const ACCENT_BAR: Record<NonNullable<Props['accent']>, string> = {
  navy:    'bg-blue-700',
  amber:   'bg-amber-600',
  emerald: 'bg-emerald-600',
  rose:    'bg-rose-600',
  slate:   'bg-slate-700',
}

const ACCENT_NUM_BG: Record<NonNullable<Props['accent']>, string> = {
  navy:    'bg-blue-50 text-blue-700 border-blue-300',
  amber:   'bg-amber-50 text-amber-700 border-amber-300',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  rose:    'bg-rose-50 text-rose-700 border-rose-300',
  slate:   'bg-slate-50 text-slate-700 border-slate-300',
}

export function SidePanel({ title, subtitle, accent = 'slate', helpExamples, num, onClose, children }: Props) {
  const [helpOpen, setHelpOpen] = useState(false)
  // Close on Escape — same affordance the Modal had.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <aside
      className="relative rounded-xl bg-white border-2 border-slate-200 shadow-2xl flex flex-col overflow-hidden"
      style={{ maxHeight: 'calc(100vh - 9rem)' }}
      role="region"
      aria-label={title}
    >
      <div className={`h-1 w-full ${ACCENT_BAR[accent]}`} aria-hidden="true" />
      <header className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {num && (
            <span
              className={`shrink-0 w-9 h-9 rounded-md font-serif text-lg font-extralight tabular-nums flex items-center justify-center border-2 ${ACCENT_NUM_BG[accent]}`}
              aria-hidden="true"
            >
              {num}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-serif text-base sm:text-lg font-extralight tracking-tight text-slate-900 leading-tight truncate">
              {title}
            </h3>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 leading-snug truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {helpExamples && (
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              aria-label={helpOpen ? 'Hide examples' : 'Show examples'}
              aria-pressed={helpOpen}
              title={helpOpen ? 'Hide help / examples' : 'Show help / examples'}
              className={[
                'shrink-0 inline-flex items-center justify-center gap-1 select-none',
                'rounded-md font-extrabold tracking-[2px] text-xs',
                'h-9 px-3 transition-all duration-100 border border-amber-700',
                helpOpen
                  ? 'translate-y-[1px] bg-gradient-to-b from-amber-600 to-amber-700 text-amber-50 shadow-[inset_0_2px_4px_rgba(120,53,15,0.5),0_1px_0_rgba(120,53,15,0.4)]'
                  : 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-white shadow-[0_3px_0_0_rgb(120,53,15),0_5px_8px_-2px_rgba(120,53,15,0.45),inset_0_1px_0_rgba(255,255,255,0.45)] hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 active:translate-y-[2px]',
              ].join(' ')}
              style={{ textShadow: helpOpen ? '0 1px 1px rgba(120,53,15,0.6)' : '0 1px 1px rgba(120,53,15,0.55), 0 -1px 0 rgba(255,255,255,0.25)' }}
            >
              <span aria-hidden="true" className="text-sm leading-none">?</span>
              <span>HELP</span>
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
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-50/40">
        {helpExamples && helpOpen && (
          <div className="rounded-lg border-2 border-amber-200 bg-amber-50 px-4 py-3 shadow-sm mb-3">
            <div className="flex items-baseline gap-2 mb-2 pb-2 border-b border-amber-200/70">
              <span aria-hidden="true" className="text-lg leading-none">💡</span>
              <span className="text-[11px] font-extrabold tracking-[2px] uppercase text-amber-800">Examples for this step</span>
            </div>
            <div className="text-[12.5px] font-medium text-slate-800 leading-relaxed">{helpExamples}</div>
          </div>
        )}
        {children}
      </div>

      <footer className="flex-shrink-0 flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 border-t-2 border-slate-100 bg-slate-50">
        <span className="text-[10px] text-slate-500 italic">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 align-middle" aria-hidden="true" />
          All changes auto-saved
        </span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-extrabold tracking-wide bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <span aria-hidden="true">✓</span> Save &amp; Exit
        </button>
      </footer>
    </aside>
  )
}
