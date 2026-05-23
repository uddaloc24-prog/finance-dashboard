// HoverExplain — reusable wrapper that shows an inline tooltip
// underneath its children on pointer-enter / focus and hides on
// pointer-leave / blur. On touch devices (no hover capability) the
// hint stays visible so phone / tablet users don't lose context.

import { useState, type ReactNode } from 'react'

interface Props {
  hint: ReactNode
  /** Force the hint to render even without hover (used as override). */
  alwaysShow?: boolean
  /** Tone keyed left-rail colour. Defaults to indigo. */
  tone?: 'indigo' | 'amber' | 'navy' | 'emerald' | 'slate'
  children: ReactNode
  /** Extra Tailwind classes on the wrapping div. */
  className?: string
}

const TONE_CLASSES = {
  indigo:  'border-indigo-300 bg-indigo-50/70 text-slate-700',
  amber:   'border-amber-300 bg-amber-50/70 text-slate-700',
  navy:    'border-blue-300 bg-blue-50/70 text-slate-700',
  emerald: 'border-emerald-300 bg-emerald-50/70 text-slate-700',
  slate:   'border-slate-300 bg-slate-50/70 text-slate-700',
} as const

export function HoverExplain({ hint, alwaysShow, tone = 'indigo', children, className }: Props) {
  const [show, setShow] = useState(false)
  // Touch devices: no hover capability, keep hints visible always.
  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches

  const visible = show || !!alwaysShow || isTouch
  return (
    <div
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setShow(false)
      }}
      className={className}
    >
      {children}
      {hint && visible && (
        <div
          role="tooltip"
          aria-live="polite"
          className={`mt-2 rounded-md border-l-4 px-3 py-2 text-[12px] italic leading-relaxed shadow-sm ${TONE_CLASSES[tone]}`}
        >
          <span className="inline-flex items-baseline gap-1.5">
            <span aria-hidden="true">💡</span>
            <span className="not-italic font-medium">{hint}</span>
          </span>
        </div>
      )}
    </div>
  )
}
