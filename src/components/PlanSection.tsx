// PlanSection — numbered, bordered, drop-down wrapper used in the Plan tab
// to lay out the four subsections (Profile, Demographics, Expenses, Inflation)
// in a cozy, professional grid.

import { useState, type ReactNode } from 'react'

type Tone = 'navy' | 'amber' | 'green' | 'rose'

const TONES: Record<Tone, {
  border: string; ring: string; bar: string; text: string; bg: string; numBg: string; numBorder: string
}> = {
  navy:  { border: 'border-blue-400',    ring: 'ring-blue-100',    bar: 'bg-blue-700',    text: 'text-blue-700',    bg: 'bg-blue-50',    numBg: 'bg-blue-50',    numBorder: 'border-blue-300' },
  amber: { border: 'border-amber-400',   ring: 'ring-amber-100',   bar: 'bg-amber-600',   text: 'text-amber-700',   bg: 'bg-amber-50',   numBg: 'bg-amber-50',   numBorder: 'border-amber-300' },
  green: { border: 'border-emerald-400', ring: 'ring-emerald-100', bar: 'bg-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50', numBg: 'bg-emerald-50', numBorder: 'border-emerald-300' },
  rose:  { border: 'border-rose-400',    ring: 'ring-rose-100',    bar: 'bg-rose-600',    text: 'text-rose-700',    bg: 'bg-rose-50',    numBg: 'bg-rose-50',    numBorder: 'border-rose-300' },
}

interface Props {
  num: string
  title: string
  subtitle?: string
  tone: Tone
  defaultOpen?: boolean
  status?: ReactNode
  children: ReactNode
}

export function PlanSection({ num, title, subtitle, tone, defaultOpen = false, status, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const t = TONES[tone]

  const panelId = `plan-section-${num}`

  return (
    <section
      className={`relative bg-white rounded-lg border-[3px] ${t.border} ring-1 ring-inset ${t.ring} overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* Top tone-coloured accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${t.bar}`} aria-hidden="true" />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`w-full px-4 sm:px-5 pt-5 pb-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 transition-colors`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Number badge */}
          <span
            className={`shrink-0 w-10 h-10 rounded-md ${t.numBg} ${t.text} font-serif text-lg font-extralight tabular-nums flex items-center justify-center border-2 ${t.numBorder}`}
            aria-hidden="true"
          >
            {num}
          </span>

          {/* Title block */}
          <div className="min-w-0 flex-1">
            <div className={`text-[10px] font-bold tracking-[2px] uppercase ${t.text} mb-0.5`}>
              Step {parseInt(num, 10)}
            </div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-snug">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status && <div className="hidden md:block">{status}</div>}
          <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full border-2 ${t.numBorder} ${t.numBg} ${t.text} text-xs transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
      </button>

      {/* Mobile-only status row (since the desktop status is hidden < md) */}
      {status && (
        <div className="md:hidden px-4 pb-2 -mt-1">
          <div className="text-[11px] text-slate-600">{status}</div>
        </div>
      )}

      {open && (
        <div
          id={panelId}
          className="border-t-2 border-slate-100 px-4 py-4 sm:px-5 sm:py-5 flex-1 bg-white"
        >
          {children}
        </div>
      )}
    </section>
  )
}
