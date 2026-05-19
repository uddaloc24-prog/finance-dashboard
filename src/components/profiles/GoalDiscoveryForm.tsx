// Goal Discovery preflight (phase 3) — 5-block intake form.
// Persists every keystroke to localStorage via storage.setGoalDiscovery.
// Phase 3 ships blocks 0, 1, 2, 4, 5 ("block-3" goal interrogation is
// deferred). No audio upload (Groq path). No inference yet — phase 4 will
// mine the saved answers for persona + behavioural signals.

import { useRef, useState } from 'react'
import type {
  GdBlockAnswers,
  GdFieldValue,
  GoalDiscoveryBlockId,
  GoalDiscoveryState,
} from '../../types/psychometric'
import { storage } from '../../lib/storage'
import { runInference } from '../../lib/psychometric/inference'
import { transcribeAudio, TranscribeError } from '../../lib/psychometric/audioTranscribe'
import { Button } from '../ui/Button'
import {
  BLOCK3_PROBES,
  GD_BLOCKS,
  GD_GOAL_AMOUNTS,
  GD_GOAL_HORIZONS,
  GD_GOAL_LIBRARY,
  GD_GOAL_PRIORITIES,
  GD_GOAL_TYPES,
  GD_LIBRARY_COMPLEMENTARY_BY_ID,
  GD_MAX_GOALS,
  GD_SCENE_TAGS,
  KINDER_Q1,
  KINDER_Q1_ACTIVITY,
  KINDER_Q1_WHERE,
  KINDER_Q1_WHOM,
  KINDER_Q2,
  KINDER_Q2_START,
  KINDER_Q2_STOP,
  KINDER_Q3,
  KINDER_Q3_THEMES,
  PARTNER_INVOLVEMENT,
  TRADEOFF_FUND_OPTIONS,
  type GoalLibraryItem,
  type OptionLite,
  type ProbeDef,
} from '../../lib/data/goalDiscovery'

interface Props {
  initialState: GoalDiscoveryState | null
  groqApiKey?: string
  onComplete: (state: GoalDiscoveryState) => void
  onExit: () => void
}

interface GoalEntry { name: string; type: string; amount: string; horizon: string; priority: string }

function makeSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function freshState(): GoalDiscoveryState {
  const now = new Date().toISOString()
  return {
    sessionId: makeSessionId(),
    startedAt: now,
    updatedAt: now,
    currentBlock: 'block-0',
    visited: ['block-0'],
    answers: {},
    completed: false,
  }
}

const BLOCK_IDS: GoalDiscoveryBlockId[] = GD_BLOCKS.map((b) => b.id as GoalDiscoveryBlockId)

export function GoalDiscoveryForm({ initialState, groqApiKey, onComplete, onExit }: Props) {
  const [state, setState] = useState<GoalDiscoveryState>(() => initialState ?? freshState())

  function persist(next: GoalDiscoveryState) {
    const stamped = { ...next, updatedAt: new Date().toISOString() }
    storage.setGoalDiscovery(stamped)
    setState(stamped)
  }

  function setBlockField(block: GoalDiscoveryBlockId, key: string, value: GdFieldValue) {
    const prev = state.answers[block] ?? {}
    persist({
      ...state,
      answers: { ...state.answers, [block]: { ...prev, [key]: value } },
    })
  }

  function getField<T extends GdFieldValue = GdFieldValue>(block: GoalDiscoveryBlockId, key: string): T | undefined {
    return state.answers[block]?.[key] as T | undefined
  }

  function goTo(block: GoalDiscoveryBlockId) {
    const visited = state.visited.includes(block) ? state.visited : [...state.visited, block]
    persist({ ...state, currentBlock: block, visited })
  }

  function finish() {
    const finalised = { ...state, completed: true }
    const inference = runInference(finalised)
    const withInference = { ...finalised, inference }
    persist(withInference)
    onComplete(withInference)
  }

  // ─── Header / tabs ─────────────────────────────────────────────────
  const currentIdx = BLOCK_IDS.indexOf(state.currentBlock)
  const meta = GD_BLOCKS[currentIdx]
  const isLast = currentIdx === BLOCK_IDS.length - 1
  const isFirst = currentIdx === 0

  return (
    <div className="bg-white rounded-2xl border-2 border-amber-300 p-5 space-y-4 ring-1 ring-amber-100">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] font-bold tracking-[2px] uppercase text-amber-700">
              Goal Discovery · Step {currentIdx + 1} of {GD_BLOCKS.length}
            </div>
            <h3 className="text-base font-extrabold tracking-tight text-slate-900 mt-0.5">{meta.title}</h3>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{meta.tagline}</p>
          </div>
          <span className="text-[10px] text-slate-500 italic">{meta.time}</span>
        </div>

        {/* Progress rings */}
        <div className="grid grid-cols-6 gap-1.5">
          {GD_BLOCKS.map((b) => {
            const id = b.id as GoalDiscoveryBlockId
            const isActive = id === state.currentBlock
            const pct = blockProgress(id, state.answers)
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => goTo(id)}
                title={`${b.title} · ${Math.round(pct)}% complete`}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-md transition-colors ${
                  isActive ? 'bg-amber-50' : 'hover:bg-slate-50'
                }`}
              >
                <ProgressRing pct={pct} icon={b.tab} active={isActive} />
                <span className={`text-[9px] font-semibold tracking-tight text-center leading-tight ${
                  isActive ? 'text-amber-900' : 'text-slate-600'
                }`}>
                  {b.title}
                </span>
              </button>
            )
          })}
        </div>
      </header>

      {/* ─── Block body ────────────────────────────────────────────── */}
      <div className="pt-1">
        {state.currentBlock === 'block-0' && <BlockZero get={(k) => getField('block-0', k)} set={(k, v) => setBlockField('block-0', k, v)} groqApiKey={groqApiKey} />}
        {state.currentBlock === 'block-1' && <BlockOne get={(k) => getField('block-1', k)} set={(k, v) => setBlockField('block-1', k, v)} />}
        {state.currentBlock === 'block-2' && <BlockTwo get={(k) => getField('block-2', k)} set={(k, v) => setBlockField('block-2', k, v)} groqApiKey={groqApiKey} />}
        {state.currentBlock === 'block-3' && <BlockThree get={(k) => getField('block-3', k)} set={(k, v) => setBlockField('block-3', k, v)} goals={readGoals(state.answers['block-1'])} />}
        {state.currentBlock === 'block-4' && <BlockFour get={(k) => getField('block-4', k)} set={(k, v) => setBlockField('block-4', k, v)} goals={readGoals(state.answers['block-1'])} />}
        {state.currentBlock === 'block-5' && <BlockFive get={(k) => getField('block-5', k)} set={(k, v) => setBlockField('block-5', k, v)} goals={readGoals(state.answers['block-1'])} />}
      </div>

      {/* ─── Footer / nav ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => goTo(BLOCK_IDS[currentIdx - 1] ?? BLOCK_IDS[0])} disabled={isFirst}>
          ← Previous
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onExit}>Save &amp; exit</Button>
          {isLast ? (
            <Button onClick={finish}>Process &amp; apply →</Button>
          ) : (
            <Button onClick={() => goTo(BLOCK_IDS[currentIdx + 1])}>Next →</Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Block 0 ─────────────────────────────────────────────────────────────

interface BlockProps {
  get: <T extends GdFieldValue = GdFieldValue>(key: string) => T | undefined
  set: (key: string, value: GdFieldValue) => void
}

function BlockZero({ get, set, groqApiKey }: BlockProps & { groqApiKey?: string }) {
  const tags = (get<string[]>('tags') ?? []) as string[]
  const showOther = tags.includes('other')

  function toggleTag(value: string) {
    let next = tags.includes(value) ? tags.filter((t) => t !== value) : [...tags, value]
    // "Nothing major" clears all others; selecting anything else clears "Nothing major"
    if (value === 'none' && next.includes('none')) next = ['none']
    else if (value !== 'none' && next.includes('none')) next = next.filter((t) => t !== 'none')
    set('tags', next)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600 leading-snug">Select any that apply — or skip if nothing major is happening right now.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {GD_SCENE_TAGS.map((t) => {
          const isOn = tags.includes(t.value)
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => toggleTag(t.value)}
              className={`text-left px-2.5 py-2 rounded-md border-2 transition-colors text-[12px] flex items-center gap-1.5 ${
                isOn
                  ? 'bg-amber-50 border-amber-400 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              {t.icon && <span className="text-sm">{t.icon}</span>}
              <span className="leading-tight">{t.label}</span>
            </button>
          )
        })}
      </div>
      {showOther && (
        <div className="space-y-1.5">
          <label className="block">
            <span className="text-xs font-bold text-slate-700">✏️ Describe your "Other" situation</span>
            <textarea
              rows={3}
              value={(get<string>('notes') as string) ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="e.g. Expecting our first grandchild next month and want to set up an education trust."
              className="mt-1 w-full px-3 py-2 rounded-md border-2 border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-100 outline-none text-sm"
            />
          </label>
          <AudioInput
            groqApiKey={groqApiKey}
            onTranscribed={(text) => set('notes', appendTranscribed((get<string>('notes') as string) ?? '', text))}
          />
        </div>
      )}
    </div>
  )
}

// ─── Block 1 ─────────────────────────────────────────────────────────────

function readGoals(block: GdBlockAnswers | undefined): GoalEntry[] {
  const raw = block?.['goals']
  return Array.isArray(raw) && typeof raw[0] === 'object' ? (raw as unknown as GoalEntry[]) : []
}

function BlockOne({ get, set }: BlockProps) {
  const goals = (get('goals') as unknown as GoalEntry[]) ?? []
  const [libraryOpen, setLibraryOpen] = useState(goals.length === 0)
  // Single-open accordion: only one category expands at a time. Click the
  // same header again to collapse. null = all collapsed.
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  function update(i: number, patch: Partial<GoalEntry>) {
    const next = goals.map((g, idx) => (idx === i ? { ...g, ...patch } : g))
    set('goals', next as unknown as GdFieldValue)
  }

  function add() {
    if (goals.length >= GD_MAX_GOALS) return
    const next: GoalEntry[] = [...goals, { name: '', type: '', amount: '', horizon: '', priority: '' }]
    set('goals', next as unknown as GdFieldValue)
  }

  function entryFromItem(item: GoalLibraryItem): GoalEntry {
    return {
      name: item.label,
      type: item.type,
      amount: item.defaultAmount ?? '',
      horizon: item.defaultHorizon ?? '',
      priority: item.defaultPriority ?? '',
    }
  }

  function addFromLibrary(item: GoalLibraryItem) {
    if (goals.length >= GD_MAX_GOALS) return
    set('goals', [...goals, entryFromItem(item)] as unknown as GdFieldValue)
  }

  function remove(i: number) {
    const next = goals.filter((_, idx) => idx !== i)
    set('goals', next as unknown as GdFieldValue)
  }

  // Smart one-click handler for library items:
  //  - already in goals → remove it (toggle)
  //  - complementary conflict → swap in place (replace conflicting entry)
  //  - otherwise → add normally
  function handleLibraryClick(item: GoalLibraryItem) {
    // Case 1: already added → remove
    const existingIdx = goals.findIndex((g) => g.name.trim() === item.label)
    if (existingIdx >= 0) {
      remove(existingIdx)
      return
    }
    // Case 2: complementary conflict → swap in place so the user's
    // position in the list (and any custom amount/horizon/priority they
    // may have adjusted on the conflict's card) is preserved positionally.
    const conflict = conflictingLabel(item.id)
    if (conflict) {
      const idx = goals.findIndex((g) => g.name.trim() === conflict)
      if (idx >= 0) {
        const next = goals.map((g, i) => (i === idx ? { ...entryFromItem(item), amount: g.amount, horizon: g.horizon, priority: g.priority } : g))
        set('goals', next as unknown as GdFieldValue)
        return
      }
    }
    // Case 3: plain add (respecting the cap)
    addFromLibrary(item)
  }

  const libraryByType = GD_GOAL_LIBRARY.reduce<Record<string, GoalLibraryItem[]>>((acc, item) => {
    ;(acc[item.type] ||= []).push(item)
    return acc
  }, {})
  const libraryTypeOrder = GD_GOAL_TYPES.map((t) => t.value).filter((id) => libraryByType[id]?.length)
  const addedLibraryLabels = new Set(goals.map((g) => g.name.trim()).filter(Boolean))

  // For complementary disabling: build the set of library-item ids whose
  // label is currently in the goals list. Then, an item with a non-empty
  // intersection between its complementary set and this set is blocked.
  const addedLibraryIds = new Set(
    GD_GOAL_LIBRARY.filter((it) => addedLibraryLabels.has(it.label)).map((it) => it.id),
  )
  function conflictingLabel(itemId: string): string | null {
    const comp = GD_LIBRARY_COMPLEMENTARY_BY_ID[itemId]
    if (!comp) return null
    for (const otherId of comp) {
      if (addedLibraryIds.has(otherId)) {
        return GD_GOAL_LIBRARY.find((li) => li.id === otherId)?.label ?? otherId
      }
    }
    return null
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600 leading-snug">
        Add 3–7 financial goals (up to {GD_MAX_GOALS}). Don't worry about exact numbers — ranges are fine.
      </p>

      {/* ─── Goal library (collapsible, accordion subsections) ── */}
      {GD_GOAL_LIBRARY.length > 0 && (
        <div className="rounded-md border-2 border-amber-200 bg-amber-50/40 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              const next = !libraryOpen
              setLibraryOpen(next)
              if (!next) setOpenCategory(null)
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-amber-50 transition-colors"
            aria-expanded={libraryOpen}
          >
            <div>
              <div className="text-[10px] font-bold tracking-[2px] uppercase text-amber-700">
                Goal library
              </div>
              <div className="text-xs text-slate-700 leading-snug">
                {libraryOpen ? 'Hide' : 'Browse'} our goal library ·{' '}
                <span className="tabular-nums">{GD_GOAL_LIBRARY.length}</span> pre-defined goals across{' '}
                <span className="tabular-nums">{libraryTypeOrder.length}</span> categories
              </div>
            </div>
            <span className="text-amber-700 text-lg" aria-hidden="true">{libraryOpen ? '–' : '+'}</span>
          </button>
          {libraryOpen && (
            <div className="divide-y divide-amber-200/70 border-t-2 border-amber-200/70 bg-white">
              {libraryTypeOrder.map((typeId) => {
                const typeLabel = GD_GOAL_TYPES.find((t) => t.value === typeId)?.label ?? typeId
                const items = libraryByType[typeId]
                const isOpen = openCategory === typeId
                return (
                  <section key={typeId}>
                    <button
                      type="button"
                      onClick={() => setOpenCategory(isOpen ? null : typeId)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors ${
                        isOpen ? 'bg-amber-100/60' : 'bg-white hover:bg-amber-50/40'
                      }`}
                      aria-expanded={isOpen}
                    >
                      <span className="flex items-baseline gap-2 min-w-0">
                        <span className={`text-xs font-bold tracking-tight truncate ${
                          isOpen ? 'text-amber-900' : 'text-slate-800'
                        }`}>
                          {typeLabel}
                        </span>
                        <span className="text-[9px] tabular-nums text-slate-400">{items.length}</span>
                      </span>
                      <span
                        className={`text-[12px] leading-none text-slate-400 transition-transform ${
                          isOpen ? 'rotate-90' : ''
                        }`}
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    </button>
                    {isOpen && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 px-3 pb-2.5 pt-1.5 bg-amber-50/30">
                        {items.map((item) => {
                          const already = addedLibraryLabels.has(item.label)
                          const conflict = already ? null : conflictingLabel(item.id)
                          const atCap = !already && !conflict && goals.length >= GD_MAX_GOALS
                          const title = already
                            ? `Already in your goals — click to remove`
                            : conflict
                              ? `Click to swap with "${conflict}"`
                              : atCap
                                ? `Max ${GD_MAX_GOALS} goals reached`
                                : item.description ?? 'Click to add'
                          // Three live states + atCap. None is "truly disabled"
                          // except atCap (which blocks even adds).
                          const prefix = already ? '✓' : conflict ? '⇄' : '+'
                          const stateClass = already
                            ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200/70'
                            : conflict
                              ? 'bg-amber-50/40 text-amber-700 border-amber-200/70 hover:bg-amber-100/60 hover:border-amber-300 italic'
                              : atCap
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-transparent'
                                : 'bg-white text-slate-700 border-transparent hover:bg-amber-100/70 hover:text-amber-900 hover:border-amber-200'
                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={atCap}
                              onClick={() => handleLibraryClick(item)}
                              title={title}
                              className={`text-left text-[11px] leading-snug px-2 py-1 rounded border transition-colors ${stateClass}`}
                            >
                              <span className="font-semibold mr-0.5">{prefix}</span> {item.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </div>
      )}

      {goals.length === 0 && (
        <div className="rounded-md border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
          <div className="text-xs text-slate-500 mb-2">No goals yet</div>
          <Button size="sm" onClick={add}>+ Add a custom goal</Button>
        </div>
      )}

      {goals.map((g, i) => (
        <div key={i} className="rounded-md border-2 border-slate-200 bg-slate-50/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-500">Goal {i + 1}</div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-[11px] text-rose-700 hover:underline"
            >
              Remove
            </button>
          </div>
          <input
            type="text"
            value={g.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="Short name — e.g. 'Retire by 60'"
            className="w-full px-3 py-2 rounded-md border-2 border-slate-200 focus:border-amber-400 outline-none text-sm"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <SelectField label="Type" value={g.type} options={GD_GOAL_TYPES} onChange={(v) => update(i, { type: v })} />
            <SelectField label="Amount" value={g.amount} options={GD_GOAL_AMOUNTS} onChange={(v) => update(i, { amount: v })} />
            <SelectField label="Horizon" value={g.horizon} options={GD_GOAL_HORIZONS} onChange={(v) => update(i, { horizon: v })} />
            <SelectField label="Priority" value={g.priority} options={GD_GOAL_PRIORITIES} onChange={(v) => update(i, { priority: v })} />
          </div>
        </div>
      ))}

      {goals.length > 0 && goals.length < GD_MAX_GOALS && (
        <Button size="sm" variant="ghost" onClick={add}>+ Add a custom goal</Button>
      )}
    </div>
  )
}

// ─── Block 2 ─────────────────────────────────────────────────────────────

function BlockTwo({ get, set, groqApiKey }: BlockProps & { groqApiKey?: string }) {
  return (
    <div className="space-y-5">
      <KinderItem
        meta={KINDER_Q1}
        groqApiKey={groqApiKey}
        textValue={(get<string>('q1Text') as string) ?? ''}
        onTextChange={(v) => set('q1Text', v)}
        extra={
          <div className="space-y-2 mt-2">
            <div className="text-[11px] text-slate-500 italic">Or pick the closest visual options.</div>
            <PictureGrid
              label="Where would you be?"
              options={KINDER_Q1_WHERE}
              selected={(get<string[]>('q1Where') as string[]) ?? []}
              onChange={(v) => set('q1Where', v)}
            />
            <PictureGrid
              label="With whom?"
              options={KINDER_Q1_WHOM}
              selected={(get<string[]>('q1Whom') as string[]) ?? []}
              onChange={(v) => set('q1Whom', v)}
            />
            <PictureGrid
              label="Doing what?"
              options={KINDER_Q1_ACTIVITY}
              selected={(get<string[]>('q1Activity') as string[]) ?? []}
              onChange={(v) => set('q1Activity', v)}
            />
          </div>
        }
      />
      <KinderItem
        meta={KINDER_Q2}
        groqApiKey={groqApiKey}
        textValue={(get<string>('q2Text') as string) ?? ''}
        onTextChange={(v) => set('q2Text', v)}
        extra={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <SelectField label="What would you stop?" value={(get<string>('q2Stop') as string) ?? ''} options={KINDER_Q2_STOP} onChange={(v) => set('q2Stop', v)} />
            <SelectField label="What would you start?" value={(get<string>('q2Start') as string) ?? ''} options={KINDER_Q2_START} onChange={(v) => set('q2Start', v)} />
          </div>
        }
      />
      <KinderItem
        meta={KINDER_Q3}
        groqApiKey={groqApiKey}
        textValue={(get<string>('q3Text') as string) ?? ''}
        onTextChange={(v) => set('q3Text', v)}
        extra={
          <div className="mt-2">
            <SelectField label="Regret theme" value={(get<string>('q3Theme') as string) ?? ''} options={KINDER_Q3_THEMES} onChange={(v) => set('q3Theme', v)} />
          </div>
        }
      />
    </div>
  )
}

function KinderItem({
  meta, textValue, onTextChange, extra, groqApiKey,
}: {
  meta: { badge: string; tagline: string; prompt: string; placeholder: string }
  textValue: string
  onTextChange: (v: string) => void
  extra: React.ReactNode
  groqApiKey?: string
}) {
  return (
    <div className="rounded-md border-2 border-amber-100 bg-amber-50/30 p-3 space-y-2">
      <div>
        <div className="text-[10px] font-bold tracking-[2px] uppercase text-amber-700">{meta.badge}</div>
        <div className="text-[11px] text-slate-500 italic mt-0.5">{meta.tagline}</div>
      </div>
      <p className="text-sm text-slate-800 leading-relaxed">{meta.prompt}</p>
      <textarea
        rows={4}
        value={textValue}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={meta.placeholder}
        className="w-full px-3 py-2 rounded-md border-2 border-slate-200 focus:border-amber-400 outline-none text-sm bg-white"
      />
      <AudioInput
        groqApiKey={groqApiKey}
        onTranscribed={(text) => onTextChange(appendTranscribed(textValue, text))}
      />
      {extra}
    </div>
  )
}

// ─── progress ring (header step indicator) ──────────────────────────────

function ProgressRing({ pct, icon, active }: { pct: number; icon: string; active: boolean }) {
  const r = 14
  const stroke = 3
  const c = 2 * Math.PI * r
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c
  const trackColor = active ? '#fcd34d' : '#e2e8f0'
  const fillColor = pct > 0 ? '#b45309' : trackColor
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: 36, height: 36 }}>
      <svg width={36} height={36} viewBox="0 0 36 36" className="-rotate-90" aria-hidden="true">
        <circle cx={18} cy={18} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <circle
          cx={18} cy={18} r={r}
          stroke={fillColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <span className="absolute text-base leading-none select-none" style={{ transform: 'translate(0, 0)' }}>
        {icon}
      </span>
    </span>
  )
}

function blockProgress(blockId: GoalDiscoveryBlockId, answers: GoalDiscoveryState['answers']): number {
  const a = answers[blockId] ?? {}
  switch (blockId) {
    case 'block-0': {
      const tags = (a['tags'] as string[]) ?? []
      const notes = (a['notes'] as string) ?? ''
      if (tags.length > 0 || notes.trim().length > 0) return 100
      return 0
    }
    case 'block-1': {
      const goals = (a['goals'] as unknown as GoalEntry[]) ?? []
      const named = goals.filter((g) => g.name.trim().length > 0).length
      if (named === 0) return 0
      return Math.min(100, Math.round((named / 3) * 100))
    }
    case 'block-2': {
      const keys = ['q1Text', 'q2Text', 'q3Text'] as const
      const filled = keys.filter((k) => ((a[k] as string) ?? '').trim().length >= 20).length
      return Math.round((filled / keys.length) * 100)
    }
    case 'block-3': {
      const probeKeys = Object.keys(a)
      return probeKeys.length > 0 ? 100 : 0
    }
    case 'block-4': {
      const keys = ['pushBack', 'reduce', 'fund'] as const
      const filled = keys.filter((k) => !!((a[k] as string) ?? '')).length
      return Math.round((filled / keys.length) * 100)
    }
    case 'block-5': {
      const applicable = (a['applicable'] as string) ?? ''
      if (!applicable) return 0
      if (applicable === 'no') return 100
      const userTop = ((a['userTop3'] as string) ?? '').trim()
      const partnerTop = ((a['partnerTop3'] as string) ?? '').trim()
      const filled = [userTop, partnerTop].filter(Boolean).length
      return Math.min(100, 25 + Math.round((filled / 2) * 75))
    }
    default:
      return 0
  }
}

// ─── picture-card grid (multi-select, used by Kinder Q1) ───────────────

// "alone"-style values in picture grids should be exclusive with the rest:
// picking "alone / solitude" clears everything else; picking anything else
// clears the exclusive value.
const EXCLUSIVE_PICTURE_VALUES = new Set(['alone'])

function PictureGrid({
  label, options, selected, onChange,
}: { label: string; options: OptionLite[]; selected: string[]; onChange: (next: string[]) => void }) {
  function toggle(value: string) {
    const isOn = selected.includes(value)
    let next: string[]
    if (isOn) {
      next = selected.filter((s) => s !== value)
    } else if (EXCLUSIVE_PICTURE_VALUES.has(value)) {
      next = [value]
    } else {
      next = [...selected.filter((s) => !EXCLUSIVE_PICTURE_VALUES.has(s)), value]
    }
    onChange(next)
  }
  return (
    <div>
      <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-500 mb-1">{label}</div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
        {options.map((o) => {
          const isOn = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={`flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 rounded-md border-2 transition-colors text-center ${
                isOn
                  ? 'bg-amber-50 border-amber-400 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-xl" aria-hidden="true">{o.icon ?? '•'}</span>
              <span className="text-[10px] leading-tight">{o.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── shared audio input (Groq Whisper) ──────────────────────────────────

function appendTranscribed(current: string, transcribed: string): string {
  const t = transcribed.trim()
  if (!t) return current
  return current.trim() ? `${current.trim()}\n\n${t}` : t
}

function AudioInput({
  groqApiKey, onTranscribed,
}: { groqApiKey?: string; onTranscribed: (text: string) => void }) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const disabled = !groqApiKey || status === 'busy'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''  // allow re-selecting same file later
    if (!file || !groqApiKey) return
    setStatus('busy')
    setMessage(`Transcribing ${file.name}…`)
    try {
      const text = await transcribeAudio(file, groqApiKey)
      if (text) {
        onTranscribed(text)
        setStatus('idle')
        setMessage('')
      } else {
        setStatus('error')
        setMessage('No speech detected.')
      }
    } catch (err) {
      setStatus('error')
      if (err instanceof TranscribeError) setMessage(err.message)
      else setMessage(err instanceof Error ? err.message : 'Transcription failed')
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap text-[11px]">
      <label
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 transition-colors ${
          disabled
            ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'
            : 'border-amber-300 text-amber-800 bg-white hover:bg-amber-50 cursor-pointer'
        }`}
        title={!groqApiKey ? 'Set Groq API key in Profile / Onboarding to enable' : undefined}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          onChange={handleFile}
          disabled={disabled}
          className="hidden"
        />
        <span aria-hidden="true">🎤</span>
        <span className="font-semibold">
          {status === 'busy' ? 'Transcribing…' : 'Upload audio'}
        </span>
      </label>
      {!groqApiKey && (
        <span className="text-slate-500 italic">Needs Groq API key (set in Onboarding)</span>
      )}
      {status === 'error' && message && (
        <span className="text-rose-700">{message}</span>
      )}
      {status === 'idle' && message && (
        <span className="text-emerald-700">{message}</span>
      )}
    </div>
  )
}

// ─── Block 3 ─────────────────────────────────────────────────────────────

function BlockThree({ get, set, goals }: BlockProps & { goals: GoalEntry[] }) {
  const namedGoals = goals.filter((g) => g.name.trim().length > 0 && g.type)

  if (namedGoals.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic">
        Add at least one goal on the previous block before answering the per-goal probes.
      </div>
    )
  }

  // Answers are keyed `${goalIndex}.${probeKey}` so they're stable across
  // edits to the goal list. Renaming or reordering goals does not invalidate
  // existing probe answers tied to the original index.
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600 leading-snug">
        A few short follow-ups per goal. Pick what you would actually say — leave blank if uncertain.
      </p>
      {namedGoals.map((g, i) => {
        const probes: ProbeDef[] = BLOCK3_PROBES[g.type] ?? []
        return (
          <div key={i} className="rounded-md border-2 border-slate-200 bg-slate-50/40 p-3 space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-500">
                Goal {i + 1} · {GD_GOAL_TYPES.find((t) => t.value === g.type)?.label ?? g.type}
              </div>
              <div className="text-[11px] font-semibold text-slate-800 truncate max-w-[60%]">{g.name}</div>
            </div>
            {probes.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">No probes defined for this goal type yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {probes.map((probe) => (
                  <SelectField
                    key={probe.key}
                    label={probe.label}
                    value={(get<string>(`${i}.${probe.key}`) as string) ?? ''}
                    options={probe.options}
                    onChange={(v) => set(`${i}.${probe.key}`, v)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Block 4 ─────────────────────────────────────────────────────────────

function BlockFour({ get, set, goals }: BlockProps & { goals: GoalEntry[] }) {
  const goalOptions: OptionLite[] = goals
    .filter((g) => g.name.trim().length > 0)
    .map((g) => ({ value: g.name, label: g.name }))

  if (goals.length < 2) {
    return (
      <div className="text-xs text-slate-500 italic">
        Add at least two goals on the previous block before answering trade-offs.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700 leading-snug">
        If you had to push <strong>one</strong> of these goals back by 5 years to make the others easier, which would you push?
      </p>
      <SelectField
        label=""
        value={(get<string>('pushBack') as string) ?? ''}
        options={[...goalOptions, { value: 'None — all must hit on time', label: 'None — all must hit on time' }]}
        onChange={(v) => set('pushBack', v)}
      />

      <p className="text-sm text-slate-700 leading-snug pt-1">
        If you had to <strong>reduce</strong> one goal by 30% (to make others viable), which?
      </p>
      <SelectField
        label=""
        value={(get<string>('reduce') as string) ?? ''}
        options={[...goalOptions, { value: 'None — none can shrink', label: 'None — none can shrink' }]}
        onChange={(v) => set('reduce', v)}
      />

      <p className="text-sm text-slate-700 leading-snug pt-1">If a shortfall appeared, how would you bridge it?</p>
      <SelectField
        label=""
        value={(get<string>('fund') as string) ?? ''}
        options={TRADEOFF_FUND_OPTIONS}
        onChange={(v) => set('fund', v)}
      />
    </div>
  )
}

// ─── Block 5 ─────────────────────────────────────────────────────────────

function BlockFive({ get, set, goals }: BlockProps & { goals: GoalEntry[] }) {
  const applicable = (get<string>('applicable') as string) ?? ''
  const goalOptions: OptionLite[] = goals.filter((g) => g.name.trim().length > 0).map((g) => ({ value: g.name, label: g.name }))

  return (
    <div className="space-y-3">
      <SelectField
        label="Partner involved in financial decisions?"
        value={applicable}
        options={PARTNER_INVOLVEMENT}
        onChange={(v) => set('applicable', v)}
      />
      {(applicable === 'yes' || applicable === 'partial') && (
        <>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Your top 3 goals (in priority order)</span>
            <input
              type="text"
              value={(get<string>('userTop3') as string) ?? ''}
              onChange={(e) => set('userTop3', e.target.value)}
              placeholder="e.g. Retire by 60, Daughter's education, House upgrade"
              className="mt-1 w-full px-3 py-2 rounded-md border-2 border-slate-200 focus:border-amber-400 outline-none text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">What you think your partner's top 3 would be (in order)</span>
            <input
              type="text"
              value={(get<string>('partnerTop3') as string) ?? ''}
              onChange={(e) => set('partnerTop3', e.target.value)}
              placeholder="comma-separated"
              className="mt-1 w-full px-3 py-2 rounded-md border-2 border-slate-200 focus:border-amber-400 outline-none text-sm"
            />
          </label>
          {goalOptions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <SelectField
                label="If you had to drop one goal, which?"
                value={(get<string>('dropGoalUser') as string) ?? ''}
                options={goalOptions}
                onChange={(v) => set('dropGoalUser', v)}
              />
              <SelectField
                label="Which would your partner drop?"
                value={(get<string>('dropGoalPartner') as string) ?? ''}
                options={goalOptions}
                onChange={(v) => set('dropGoalPartner', v)}
              />
            </div>
          )}
          <p className="text-[11px] text-slate-500 italic">
            Divergence on the drop-goal question is the most diagnostic signal in the whole flow.
          </p>
        </>
      )}
    </div>
  )
}

// ─── shared SelectField ─────────────────────────────────────────────────

function SelectField({
  label, value, options, onChange,
}: { label: string; value: string; options: OptionLite[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      {label && <span className="text-[11px] font-bold text-slate-700">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${label ? 'mt-1 ' : ''}w-full px-3 py-2 rounded-md border-2 border-slate-200 focus:border-amber-400 outline-none text-sm bg-white`}
      >
        <option value="">— optional —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.icon ? `${o.icon}  ` : ''}{o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

// Used to detect the GoalDiscoveryForm is unused-import safe.
export type { GoalDiscoveryState } from '../../types/psychometric'
