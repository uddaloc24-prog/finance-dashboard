// UploadSection — drop a previously-exported plan file (PDF / DOCX / XLSX /
// MD / CSV / JSON / TXT) and have the planner extract identity, profile, and
// bucket allocations and save them to local storage.

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { storage } from '../lib/storage'
import { parseUploadedFile, type ParsedPlan } from '../lib/uploadParser'
import { BUCKET_ALLOCATION, DEFAULT_DEMOGRAPHICS, DEFAULT_EXPENSES } from '../constants'
import type { UserIdentity } from '../types/identity'
import type { UserProfile, BucketState } from '../types'

const ACCEPTED = '.pdf,.docx,.xlsx,.xls,.md,.markdown,.csv,.json,.txt'

const FORMAT_HINTS: Array<{ ext: string; label: string; hint: string }> = [
  { ext: '.pdf',  label: 'PDF',      hint: 'Print-ready report' },
  { ext: '.docx', label: 'Word',     hint: 'Editable narrative' },
  { ext: '.xlsx', label: 'Excel',    hint: 'Sheets & tables' },
  { ext: '.md',   label: 'Markdown', hint: 'Plain-text notes' },
  { ext: '.csv',  label: 'CSV',      hint: 'Tabular data' },
  { ext: '.json', label: 'JSON',     hint: 'Round-trip data' },
]

const FALLBACK_PROFILE: UserProfile = {
  corpus: 0,
  monthlyWithdrawal: 0,
  withdrawalFrequency: 'monthly',
  withdrawalAmount: 0,
  sipAmount: 0,
  sipFrequency: 'monthly',
  inflationRate: 6.5,
  riskAppetite: 3,
  taxBracket: 20,
  refreshInterval: 6,
  groqApiKey: '',
  bucketAllocation: { ...BUCKET_ALLOCATION },
  demographics: { ...DEFAULT_DEMOGRAPHICS },
  expenses: { ...DEFAULT_EXPENSES },
}

export function UploadSection() {
  const [parsed, setParsed] = useState<ParsedPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [applied, setApplied] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setApplied(false)
    setParsed(null)
    setBusy(true)
    try {
      const result = await parseUploadedFile(file)
      setParsed(result)
      if (result.matchedFields.length === 0) {
        setError(
          "No retirement-plan fields detected in this file. Upload a plan exported from this app for best results.",
        )
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to read this file'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const apply = () => {
    if (!parsed) return
    const now = new Date().toISOString()

    if (parsed.identity) {
      const cur = storage.getIdentity()
      const merged: UserIdentity = {
        fullName: parsed.identity.fullName ?? cur?.fullName ?? '',
        email: parsed.identity.email ?? cur?.email,
        phone: parsed.identity.phone ?? cur?.phone,
        dateOfBirth: parsed.identity.dateOfBirth ?? cur?.dateOfBirth,
        panCard: parsed.identity.panCard ?? cur?.panCard,
        maritalStatus: parsed.identity.maritalStatus ?? cur?.maritalStatus,
        spouseName: parsed.identity.spouseName ?? cur?.spouseName,
        occupation: parsed.identity.occupation ?? cur?.occupation,
        address: parsed.identity.address ?? cur?.address,
        createdAt: cur?.createdAt || now,
        updatedAt: now,
      }
      storage.setIdentity(merged)
    }

    if (parsed.profile) {
      const cur = storage.getProfile() ?? FALLBACK_PROFILE
      const merged: UserProfile = {
        ...cur,
        ...parsed.profile,
        demographics: { ...cur.demographics, ...(parsed.profile.demographics ?? {}) } as UserProfile['demographics'],
        expenses: { ...cur.expenses, ...(parsed.profile.expenses ?? {}) } as UserProfile['expenses'],
      }
      storage.setProfile(merged)
    }

    if (parsed.buckets) {
      const cur = storage.getBuckets()
      const merged: BucketState = {
        b1: parsed.buckets.b1 ?? cur?.b1 ?? 0,
        b2: parsed.buckets.b2 ?? cur?.b2 ?? 0,
        b3: parsed.buckets.b3 ?? cur?.b3 ?? 0,
        b4: parsed.buckets.b4 ?? cur?.b4 ?? 0,
      }
      storage.setBuckets(merged)
    }

    setApplied(true)
  }

  return (
    <section className="mt-10 bg-white rounded-lg border-2 border-slate-300 ring-1 ring-inset ring-slate-100 p-4 sm:p-5">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700 tabular-nums">11</span>
        <span className="h-px flex-1 bg-gradient-to-r from-amber-500/60 to-transparent" aria-hidden="true" />
        <span className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700">Upload an existing plan</span>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">
            Have a previous plan? Pick up where you left off.
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-snug">
            Upload a PDF, Word, Excel, Markdown, CSV, JSON, or TXT plan — we'll read your name, corpus, monthly draw,
            demographics, expenses, and bucket allocations and pre-fill the planner.
          </p>
        </div>
      </div>

      {/* Drop zone */}
      <label
        className={[
          'block rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors cursor-pointer',
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : applied
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40',
        ].join(' ')}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={onPick}
          className="sr-only"
          disabled={busy}
        />
        <div className="text-2xl mb-1.5" aria-hidden="true">↥</div>
        <div className="text-sm font-bold text-slate-800">
          {busy ? 'Reading your file…' : 'Click to upload, or drag and drop'}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          PDF · DOCX · XLSX · MD · CSV · JSON · TXT
        </div>
        {!busy && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              inputRef.current?.click()
            }}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition-colors"
          >
            Choose file
          </button>
        )}
      </label>

      {/* Format chip strip */}
      <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {FORMAT_HINTS.map((f) => (
          <li
            key={f.ext}
            className="bg-slate-50 border-2 border-slate-200 rounded px-2.5 py-1.5"
          >
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[12px] font-bold text-slate-900">{f.label}</span>
              <span className="text-[9px] font-mono text-slate-400">{f.ext}</span>
            </div>
            <div className="text-[10px] text-slate-600 leading-tight mt-0.5">{f.hint}</div>
          </li>
        ))}
      </ul>

      {/* Status */}
      {error && (
        <div className="mt-4 rounded-md border-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ⚠ {error}
        </div>
      )}

      {parsed && parsed.matchedFields.length > 0 && (
        <div className="mt-4 rounded-lg border-2 border-blue-400 bg-blue-50/60 p-3">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <div>
              <div className="text-[10px] font-bold tracking-[2px] uppercase text-blue-700">Found in {parsed.fileName}</div>
              <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                {parsed.matchedFields.length} {parsed.matchedFields.length === 1 ? 'field' : 'fields'} extracted
              </div>
            </div>
            {!applied && (
              <button
                type="button"
                onClick={apply}
                className="px-3 py-1.5 rounded-md bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition-colors shrink-0"
              >
                Apply to my plan →
              </button>
            )}
            {applied && (
              <div className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider shrink-0">
                ✓ Applied
              </div>
            )}
          </div>

          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2">
            {parsed.matchedFields.map((f) => (
              <li key={f} className="text-[11px] text-slate-700 flex items-center gap-1.5">
                <span className="text-blue-700" aria-hidden="true">•</span> {f}
              </li>
            ))}
          </ul>

          {parsed.identity?.fullName && (
            <div className="text-[11px] text-slate-600 mt-2 italic">
              Name detected: <strong className="not-italic text-slate-900">{parsed.identity.fullName}</strong>
            </div>
          )}

          {applied && (
            <div className="text-[11px] text-emerald-800 mt-2">
              Saved. Click <strong>Start planning</strong> at the top to load these values.
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-slate-500 mt-3 italic">
        We read the file in your browser only — nothing is uploaded to a server.
      </p>
    </section>
  )
}
