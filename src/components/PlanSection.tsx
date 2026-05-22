// PlanSection — compact summary card used in the Plan tab. Clicking the
// "Open inputs" button pops the section's full editor in a modal so each
// asset / loan / budget row can render at full width as a single row,
// regardless of the parent's 2-column grid.

import { useState, type ReactNode } from 'react'
import { Modal } from './ui/Modal'

type Tone = 'navy' | 'amber' | 'green' | 'rose'

const TONES: Record<Tone, {
  border: string; ring: string; bar: string; text: string; bg: string; numBg: string; numBorder: string; btn: string; btnHover: string;
}> = {
  navy:  { border: 'border-blue-400',    ring: 'ring-blue-100',    bar: 'bg-blue-700',    text: 'text-blue-700',    bg: 'bg-blue-50',    numBg: 'bg-blue-50',    numBorder: 'border-blue-300',    btn: 'bg-blue-700',    btnHover: 'hover:bg-blue-800' },
  amber: { border: 'border-amber-400',   ring: 'ring-amber-100',   bar: 'bg-amber-600',   text: 'text-amber-700',   bg: 'bg-amber-50',   numBg: 'bg-amber-50',   numBorder: 'border-amber-300',   btn: 'bg-amber-600',   btnHover: 'hover:bg-amber-700' },
  green: { border: 'border-emerald-400', ring: 'ring-emerald-100', bar: 'bg-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50', numBg: 'bg-emerald-50', numBorder: 'border-emerald-300', btn: 'bg-emerald-600', btnHover: 'hover:bg-emerald-700' },
  rose:  { border: 'border-rose-400',    ring: 'ring-rose-100',    bar: 'bg-rose-600',    text: 'text-rose-700',    bg: 'bg-rose-50',    numBg: 'bg-rose-50',    numBorder: 'border-rose-300',    btn: 'bg-rose-600',    btnHover: 'hover:bg-rose-700' },
}

const TONE_TO_MODAL: Record<Tone, 'navy' | 'amber' | 'emerald' | 'rose'> = {
  navy: 'navy', amber: 'amber', green: 'emerald', rose: 'rose',
}

interface Props {
  num: string
  title: string
  subtitle?: string
  tone: Tone
  /** Controlled mode — supply both to delegate single-open management upstream. */
  open?: boolean
  onToggle?: () => void
  status?: ReactNode
  children: ReactNode
}

export function PlanSection({ num, title, subtitle, tone, open: openProp, onToggle, status, children }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? !!openProp : internalOpen
  const t = TONES[tone]

  function handleOpen()  { isControlled ? onToggle?.() : setInternalOpen(true)  }
  function handleClose() { isControlled ? onToggle?.() : setInternalOpen(false) }

  return (
    <>
      {/* Compact summary card — sits in the Plan-tab grid */}
      <section
        className={`relative bg-white rounded-lg border-[3px] ${t.border} ring-1 ring-inset ${t.ring} overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow h-full`}
      >
        <div className={`absolute top-0 left-0 right-0 h-1 ${t.bar}`} aria-hidden="true" />
        <button
          type="button"
          onClick={handleOpen}
          className="w-full px-4 sm:px-5 pt-4 pb-3 text-left hover:bg-slate-50/60 transition-colors flex-1 flex flex-col"
          aria-label={`Open ${title} inputs`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`shrink-0 w-10 h-10 rounded-md ${t.numBg} ${t.text} font-serif text-lg font-extralight tabular-nums flex items-center justify-center border-2 ${t.numBorder}`}
              aria-hidden="true"
            >
              {num}
            </span>
            <div className="min-w-0 flex-1">
              <div className={`text-[10px] font-bold tracking-[2px] uppercase ${t.text} mb-0.5`}>
                Step {parseInt(num, 10)}
              </div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
              )}
            </div>
          </div>

          {status && (
            <div className="mt-2.5 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
              {status}
            </div>
          )}
        </button>

        {/* Open-inputs CTA — pops the modal */}
        <div className="px-4 sm:px-5 pb-3.5 pt-1">
          <button
            type="button"
            onClick={handleOpen}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold text-white shadow-sm transition-colors w-full justify-center ${t.btn} ${t.btnHover}`}
          >
            <span aria-hidden="true">✎</span>
            {open ? 'Inputs open' : 'Open inputs'}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>

      {/* Modal — wide enough that all asset rows render as a single row */}
      <Modal
        open={open}
        title={`Step ${parseInt(num, 10)} · ${title}`}
        subtitle={subtitle}
        accent={TONE_TO_MODAL[tone]}
        size="3xl"
        onClose={handleClose}
      >
        {children}
      </Modal>
    </>
  )
}
