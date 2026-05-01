import { useState, useRef, useEffect } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from '../types'
import { storage } from '../lib/storage'
import { FORMATS, exportReport, type ExportFormat } from '../lib/exporters'

interface Props {
  profile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
  variant?: 'header' | 'cta'   // styling
  label?: string
}

export function ExportMenu({ profile, buckets, returnAssumptions, variant = 'header', label = 'Export' }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement | null>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const handlePick = async (fmt: ExportFormat) => {
    setBusy(fmt)
    setErr(null)
    try {
      await exportReport(fmt, {
        identity: storage.getIdentity(),
        profile,
        buckets,
        returnAssumptions,
      })
      setOpen(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : `Could not generate ${fmt.toUpperCase()}`)
    } finally {
      setBusy(null)
    }
  }

  const triggerCls = variant === 'cta'
    ? 'inline-flex items-center gap-1 px-5 py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors'
    : 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors'

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={triggerCls}
      >
        {busy ? `Generating ${busy.toUpperCase()}…` : label}
        <span aria-hidden="true" className="text-[10px] mt-px">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Choose format</div>
          </div>
          <ul className="py-1">
            {FORMATS.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handlePick(f.id)}
                  disabled={busy != null}
                  className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors group ${busy === f.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 flex items-center gap-2">
                        {f.label}
                        {busy === f.id && <span className="text-[10px] text-blue-600 italic">generating…</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-tight truncate">{f.hint}</div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">{f.ext}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {err && (
            <div className="px-3 py-2 text-[11px] text-red-700 bg-red-50 border-t border-red-200">
              {err}
            </div>
          )}
          <div className="px-3 py-2 border-t border-slate-100 text-[10px] text-slate-500 leading-snug">
            Files save to your Downloads folder. Filename: <code className="text-[9px] bg-slate-100 px-1 rounded">{'{name}-retirement-plan-{date}'}</code>
          </div>
        </div>
      )}
    </div>
  )
}
