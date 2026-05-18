// Goal Discovery preflight (phase 3) — 5-block intake form.
// Persists every keystroke to localStorage via storage.setGoalDiscovery.
// Phase 3 ships blocks 0, 1, 2, 4, 5 ("block-3" goal interrogation is
// deferred). No audio upload (Groq path). No inference yet — phase 4 will
// mine the saved answers for persona + behavioural signals.

import { useState } from 'react'
import type {
  GdBlockAnswers,
  GdFieldValue,
  GoalDiscoveryBlockId,
  GoalDiscoveryState,
} from '../../types/psychometric'
import { storage } from '../../lib/storage'
import { runInference } from '../../lib/psychometric/inference'
import { Button } from '../ui/Button'
import {
  GD_BLOCKS,
  GD_GOAL_AMOUNTS,
  GD_GOAL_HORIZONS,
  GD_GOAL_PRIORITIES,
  GD_GOAL_TYPES,
  GD_MAX_GOALS,
  GD_SCENE_TAGS,
  KINDER_Q1,
  KINDER_Q2,
  KINDER_Q2_START,
  KINDER_Q2_STOP,
  KINDER_Q3,
  KINDER_Q3_THEMES,
  PARTNER_INVOLVEMENT,
  TRADEOFF_FUND_OPTIONS,
  type OptionLite,
} from '../../lib/data/goalDiscovery'

interface Props {
  initialState: GoalDiscoveryState | null
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

export function GoalDiscoveryForm({ initialState, onComplete, onExit }: Props) {
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

        {/* Tab strip */}
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
          {GD_BLOCKS.map((b, i) => {
            const id = b.id as GoalDiscoveryBlockId
            const isActive = id === state.currentBlock
            const isVisited = state.visited.includes(id)
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => goTo(id)}
                className={`flex-1 min-w-[110px] text-left px-3 py-2 rounded-md border-2 transition-colors text-[11px] font-medium ${
                  isActive
                    ? 'border-amber-500 bg-amber-50 text-amber-900'
                    : isVisited
                      ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      : 'border-dashed border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                }`}
                title={b.title}
              >
                <span className="text-base mr-1">{b.tab}</span>
                <span className="hidden sm:inline">{b.title}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            )
          })}
        </div>
      </header>

      {/* ─── Block body ────────────────────────────────────────────── */}
      <div className="pt-1">
        {state.currentBlock === 'block-0' && <BlockZero get={(k) => getField('block-0', k)} set={(k, v) => setBlockField('block-0', k, v)} />}
        {state.currentBlock === 'block-1' && <BlockOne get={(k) => getField('block-1', k)} set={(k, v) => setBlockField('block-1', k, v)} />}
        {state.currentBlock === 'block-2' && <BlockTwo get={(k) => getField('block-2', k)} set={(k, v) => setBlockField('block-2', k, v)} />}
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

function BlockZero({ get, set }: BlockProps) {
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

  function update(i: number, patch: Partial<GoalEntry>) {
    const next = goals.map((g, idx) => (idx === i ? { ...g, ...patch } : g))
    set('goals', next as unknown as GdFieldValue)
  }

  function add() {
    if (goals.length >= GD_MAX_GOALS) return
    const next: GoalEntry[] = [...goals, { name: '', type: '', amount: '', horizon: '', priority: '' }]
    set('goals', next as unknown as GdFieldValue)
  }

  function remove(i: number) {
    const next = goals.filter((_, idx) => idx !== i)
    set('goals', next as unknown as GdFieldValue)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600 leading-snug">
        Add 3–7 financial goals (up to {GD_MAX_GOALS}). Don't worry about exact numbers — ranges are fine.
      </p>

      {goals.length === 0 && (
        <div className="rounded-md border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
          <div className="text-xs text-slate-500 mb-2">No goals yet</div>
          <Button size="sm" onClick={add}>+ Add your first goal</Button>
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
        <Button size="sm" variant="ghost" onClick={add}>+ Add another goal</Button>
      )}
    </div>
  )
}

// ─── Block 2 ─────────────────────────────────────────────────────────────

function BlockTwo({ get, set }: BlockProps) {
  return (
    <div className="space-y-5">
      <KinderItem
        meta={KINDER_Q1}
        textValue={(get<string>('q1Text') as string) ?? ''}
        onTextChange={(v) => set('q1Text', v)}
        extra={null}
      />
      <KinderItem
        meta={KINDER_Q2}
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
  meta, textValue, onTextChange, extra,
}: {
  meta: { badge: string; tagline: string; prompt: string; placeholder: string }
  textValue: string
  onTextChange: (v: string) => void
  extra: React.ReactNode
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
      {extra}
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
