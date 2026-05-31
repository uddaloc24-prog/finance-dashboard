// RulesManager — collapsible CRUD over the user's deterministic
// categorisation rules. Persisted via expenseStorage. Phase 3 polish:
// no UI for SENDER_EQUALS or RECURRENCE_PATTERN match types yet (the
// engine accepts them; users add via storage for now).

import { useEffect, useState } from 'react'
import type { Category, Rule, RuleMatchType } from '../../types/expense'
import { expenseStorage } from '../../lib/expense/expenseStorage'

const SUPPORTED_MATCHES: RuleMatchType[] = ['MERCHANT_CONTAINS', 'TEXT_REGEX', 'AMOUNT_EQUALS']
const MATCH_LABELS: Record<RuleMatchType, string> = {
  MERCHANT_CONTAINS:   'Merchant contains',
  SENDER_EQUALS:       'Sender equals',
  TEXT_REGEX:          'Text matches regex',
  AMOUNT_EQUALS:       'Amount equals',
  RECURRENCE_PATTERN:  'Recurrence (monthly:DD)',
}

interface Props {
  categories: Category[]
}

export function RulesManager({ categories }: Props) {
  const [rules, setRules] = useState<Rule[]>(() => expenseStorage.getRules())

  // Draft form for adding a rule
  const [matchType, setMatchType] = useState<RuleMatchType>('MERCHANT_CONTAINS')
  const [pattern,   setPattern]   = useState('')
  const [catId,     setCatId]     = useState<string>('')
  const [priority,  setPriority]  = useState<number>(50)

  useEffect(() => {
    if (catId === '' && categories.length > 0) {
      const firstLeaf = categories.find((c) => c.parentId !== null && c.isActive)
      if (firstLeaf) setCatId(firstLeaf.id)
    }
  }, [categories, catId])

  function addRule() {
    if (!pattern.trim() || !catId) return
    const list = expenseStorage.getRules()
    const next: Rule = {
      id: `rule_${Date.now().toString(36)}`,
      matchType, pattern: pattern.trim(),
      suggestedCategoryId: catId, suggestedTags: [],
      priority, isActive: true,
    }
    const out = [...list, next]
    expenseStorage.setRules(out)
    setRules(out)
    setPattern('')
  }

  function deleteRule(id: string) {
    const out = rules.filter((r) => r.id !== id)
    expenseStorage.setRules(out)
    setRules(out)
  }

  function toggleRule(id: string) {
    const out = rules.map((r) => r.id === id ? { ...r, isActive: !r.isActive } : r)
    expenseStorage.setRules(out)
    setRules(out)
  }

  // Helper: leaf categories only, grouped by parent for the picker.
  const leaves = categories.filter((c) => c.parentId !== null && c.isActive)
  const parents = categories.filter((c) => c.parentId === null && c.isActive)
                            .sort((a, b) => a.sortOrder - b.sortOrder)
  const catNameById = Object.fromEntries(categories.map((c) => [c.id, c.name])) as Record<string, string>

  return (
    <details className="rounded-2xl border-2 border-amber-300 ring-1 ring-inset ring-amber-100 bg-gradient-to-br from-amber-50/40 via-white to-teal-50/20 shadow-sm h-full">
      <summary className="cursor-pointer px-4 py-3 text-[11px] font-bold tracking-[2px] uppercase text-amber-800 hover:bg-amber-50/60 transition-colors flex items-baseline justify-between rounded-2xl">
        <span>Rules — categorise without thinking</span>
        <span className="text-[10px] font-normal normal-case tracking-normal text-slate-600 italic">
          {rules.length} {rules.length === 1 ? 'rule' : 'rules'}
        </span>
      </summary>

      <div className="px-4 pb-4 pt-1 space-y-3">
        <p className="text-[11px] text-slate-600 leading-snug max-w-2xl">
          Every imported transaction runs through your rules in priority order — first match wins. Lower priority numbers run first.
          For text-regex use standard JS regex (case-insensitive). Amount uses ±1 ₹ tolerance.
        </p>

        {/* New rule form */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_2fr_80px_auto] gap-2 items-end">
          <Field label="Match type">
            <select value={matchType} onChange={(e) => setMatchType(e.target.value as RuleMatchType)} className={inputCls}>
              {SUPPORTED_MATCHES.map((m) => <option key={m} value={m}>{MATCH_LABELS[m]}</option>)}
            </select>
          </Field>
          <Field label="Pattern">
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder={matchType === 'MERCHANT_CONTAINS' ? 'e.g. Fabindia'
                : matchType === 'AMOUNT_EQUALS' ? 'e.g. 499' : 'e.g. salary credit'}
              className={inputCls}
            />
          </Field>
          <Field label="Set category to">
            <select value={catId} onChange={(e) => setCatId(e.target.value)} className={inputCls}>
              {parents.map((p) => {
                const children = leaves.filter((c) => c.parentId === p.id)
                if (children.length === 0) return <option key={p.id} value={p.id}>{p.name}</option>
                return (
                  <optgroup key={p.id} label={p.name}>
                    {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                )
              })}
            </select>
          </Field>
          <Field label="Priority">
            <input type="number" min={1} max={999} value={priority} onChange={(e) => setPriority(parseInt(e.target.value, 10) || 50)} className={inputCls} />
          </Field>
          <button
            type="button"
            onClick={addRule}
            disabled={!pattern.trim() || !catId}
            className="text-[10px] font-bold uppercase tracking-[1.5px] rounded px-2.5 py-2 text-white bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            + Add rule
          </button>
        </div>

        {/* Rules list */}
        {rules.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic text-center py-3">
            No rules yet — every import lands as <strong>needs review</strong>. Add one above.
          </p>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="text-slate-500 text-left">
              <tr className="border-b border-slate-200">
                <th className="font-normal py-1">Match</th>
                <th className="font-normal py-1">Pattern</th>
                <th className="font-normal py-1">Category</th>
                <th className="font-normal py-1 text-right">Priority</th>
                <th className="font-normal py-1 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...rules].sort((a, b) => a.priority - b.priority).map((r) => (
                <tr key={r.id} className={`border-b border-slate-100 ${r.isActive ? '' : 'opacity-50'}`}>
                  <td className="py-1 text-slate-700">{MATCH_LABELS[r.matchType]}</td>
                  <td className="py-1 font-mono text-[10.5px] text-slate-900">{r.pattern}</td>
                  <td className="py-1 text-slate-700">{catNameById[r.suggestedCategoryId] ?? '?'}</td>
                  <td className="py-1 text-right tabular-nums">{r.priority}</td>
                  <td className="py-1 text-right">
                    <button type="button" onClick={() => toggleRule(r.id)} title={r.isActive ? 'Disable' : 'Enable'}
                            className="text-[10px] text-slate-600 hover:text-slate-900 mr-2">
                      {r.isActive ? 'off' : 'on'}
                    </button>
                    <button type="button" onClick={() => deleteRule(r.id)} title="Delete rule"
                            className="text-[10px] text-rose-600 hover:text-rose-800">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  )
}

const inputCls = 'w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-[12px] focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[9.5px] font-bold uppercase tracking-[1.5px] text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  )
}
