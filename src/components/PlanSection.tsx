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
  /** Example entries shown inside the modal under the "Show examples" toggle. */
  helpExamples?: ReactNode
  /** Compact mode renders a circular 3D badge instead of the full card. */
  compact?: boolean
  /** Optional shorter title shown only in compact mode. */
  shortTitle?: string
  /** Optional icon glyph shown in compact mode. */
  icon?: string
  children: ReactNode
}

const TONE_3D: Record<Tone, { body: string; bodyHover: string; lip: string }> = {
  navy:  { body: 'from-blue-400 via-blue-500 to-blue-700',           bodyHover: 'hover:from-blue-300 hover:via-blue-400 hover:to-blue-600',           lip: 'rgb(30,58,138)' },
  amber: { body: 'from-amber-400 via-amber-500 to-amber-700',         bodyHover: 'hover:from-amber-300 hover:via-amber-400 hover:to-amber-600',         lip: 'rgb(120,53,15)' },
  green: { body: 'from-emerald-400 via-emerald-500 to-emerald-700',   bodyHover: 'hover:from-emerald-300 hover:via-emerald-400 hover:to-emerald-600',   lip: 'rgb(6,78,59)' },
  rose:  { body: 'from-rose-400 via-rose-500 to-rose-700',            bodyHover: 'hover:from-rose-300 hover:via-rose-400 hover:to-rose-600',            lip: 'rgb(136,19,55)' },
}

export function PlanSection({ num, title, subtitle, tone, open: openProp, onToggle, status, helpExamples, compact, shortTitle, icon, children }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? !!openProp : internalOpen
  const t = TONES[tone]
  const t3d = TONE_3D[tone]

  function handleOpen()  { isControlled ? onToggle?.() : setInternalOpen(true)  }
  function handleClose() { isControlled ? onToggle?.() : setInternalOpen(false); setHelpOpen(false) }

  // ─── Compact circular badge (used by the Plan-tab wheel) ─────────────
  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={handleOpen}
          aria-label={`Open ${title} inputs`}
          title={`Step ${parseInt(num, 10)} · ${title}`}
          className={[
            'group relative w-32 h-32 sm:w-36 sm:h-36 rounded-full select-none flex flex-col items-center justify-center gap-0.5 text-white',
            'transition-all duration-100 border-2 border-white/60',
            'focus:outline-none focus:ring-4 focus:ring-amber-300',
            'active:translate-y-[2px]',
            `bg-gradient-to-b ${t3d.body} ${t3d.bodyHover}`,
          ].join(' ')}
          style={{
            boxShadow: `0 5px 0 0 ${t3d.lip}, 0 10px 18px -6px rgba(15,23,42,0.45), inset 0 2px 0 rgba(255,255,255,0.42), inset 0 -2px 0 rgba(0,0,0,0.22)`,
            textShadow: '0 1px 1px rgba(0,0,0,0.40)',
          }}
        >
          <span className="font-serif italic text-[11px] font-bold tracking-wider opacity-90 leading-none">step</span>
          <span className="font-serif text-3xl font-extrabold tabular-nums leading-none drop-shadow-sm">{num}</span>
          {icon && <span className="text-xl leading-none mt-0.5" aria-hidden="true" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))' }}>{icon}</span>}
          <span className="text-[11px] font-extrabold uppercase tracking-[1.5px] mt-0.5 leading-tight text-center px-2">
            {shortTitle ?? title}
          </span>
        </button>
        <PlanModal
          open={open} num={num} title={title} subtitle={subtitle} tone={tone}
          helpExamples={helpExamples} helpOpen={helpOpen} setHelpOpen={setHelpOpen}
          onClose={handleClose}
        >
          {children}
        </PlanModal>
      </>
    )
  }

  // ─── Full-card mode (legacy / fallback) ────────────────────────────
  return (
    <>
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

      <PlanModal
        open={open} num={num} title={title} subtitle={subtitle} tone={tone}
        helpExamples={helpExamples} helpOpen={helpOpen} setHelpOpen={setHelpOpen}
        onClose={handleClose}
      >
        {children}
      </PlanModal>
    </>
  )
}

// ─── Shared modal renderer used by both compact and card modes ─────────

interface PlanModalProps {
  open: boolean
  num: string
  title: string
  subtitle?: string
  tone: Tone
  helpExamples?: ReactNode
  helpOpen: boolean
  setHelpOpen: (fn: (v: boolean) => boolean) => void
  onClose: () => void
  children: ReactNode
}

function PlanModal({ open, num, title, subtitle, tone, helpExamples, helpOpen, setHelpOpen, onClose, children }: PlanModalProps) {
  const t = TONES[tone]
  return (
    <Modal
      open={open}
      title={`Step ${parseInt(num, 10)} · ${title}`}
      subtitle={subtitle}
      accent={TONE_TO_MODAL[tone]}
      size="3xl"
      onClose={onClose}
      onHelp={helpExamples ? (() => setHelpOpen((v) => !v)) : undefined}
      helpActive={helpOpen && !!helpExamples}
    >
      <div className="space-y-3">
        {helpExamples && helpOpen && (
          <div className={`rounded-lg border-2 ${t.border} ${t.numBg} px-4 py-3 shadow-sm`}>
            <div className="flex items-baseline gap-2 mb-2 pb-2 border-b border-slate-200/70">
              <span aria-hidden="true" className="text-lg leading-none">💡</span>
              <span className={`text-[11px] font-extrabold tracking-[2px] uppercase ${t.text}`}>Examples for this step</span>
              <span className="text-[11px] font-bold text-slate-700">
                · Step {parseInt(num, 10)} · {title}
              </span>
            </div>
            <div className="text-[12.5px] font-medium text-slate-800 leading-relaxed">
              {helpExamples}
            </div>
          </div>
        )}
        {children}
      </div>
    </Modal>
  )
}
