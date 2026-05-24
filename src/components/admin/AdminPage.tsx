// Admin overlay — full-screen panel with a left sidebar listing every
// registered admin document and a right pane that renders the selected
// one. Markdown files are imported with Vite's `?raw` query so they're
// bundled and available offline (PWA). To add a new doc, register it
// in DOCS below.

import { useEffect, useState } from 'react'
import { MarkdownView } from './MarkdownView'
import { TestRunnerPanel } from './TestRunnerPanel'

import planAudit  from '../../../tasks/plan-audit-2026-05-24.md?raw'
import engineMemo from '../../../tasks/engine-design-memo-2026-05-24.md?raw'
import todoMd     from '../../../tasks/todo.md?raw'
import lessonsMd  from '../../../tasks/lessons.md?raw'

type DocCategory = 'Audits' | 'Design memos' | 'Project' | 'Tools'

interface Doc {
  id: string
  title: string
  subtitle: string
  category: DocCategory
  /** Custom React panel (e.g. test runner) — when set, `source` and
   *  `filePath` are optional. Otherwise the doc renders as Markdown. */
  kind?: 'markdown' | 'panel'
  source?: string
  filePath?: string
}

const DOCS: Doc[] = [
  { id: 'plan-audit-2026-05-24',          title: 'Plan Slim-and-Trim Audit',      subtitle: '2026-05-24 · cross-dashboard redundancy review',                category: 'Audits',       source: planAudit,  filePath: 'tasks/plan-audit-2026-05-24.md' },
  { id: 'engine-design-memo-2026-05-24',  title: 'Phase 5 — Engine Design Memo',  subtitle: '2026-05-24 · Goal Ranking Engine contract + 5 lock decisions',  category: 'Design memos', source: engineMemo, filePath: 'tasks/engine-design-memo-2026-05-24.md' },
  { id: 'todo',                           title: 'TODO',                          subtitle: 'in-flight task tracker',                                        category: 'Project',      source: todoMd,     filePath: 'tasks/todo.md' },
  { id: 'lessons',                        title: 'Lessons',                       subtitle: 'durable learnings from past work',                              category: 'Project',      source: lessonsMd,  filePath: 'tasks/lessons.md' },
  { id: 'test-runner',                    title: 'Test runner',                   subtitle: 'vitest commands · copy-to-clipboard · suite stats',             category: 'Tools',        kind: 'panel' },
]

interface Props {
  onClose: () => void
  onDisable: () => void
}

export function AdminPage({ onClose, onDisable }: Props) {
  const [activeId, setActiveId] = useState<string>(DOCS[0].id)
  const active = DOCS.find((d) => d.id === activeId) ?? DOCS[0]

  // Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const grouped: Record<DocCategory, Doc[]> = { Audits: [], 'Design memos': [], Project: [], Tools: [] }
  DOCS.forEach((d) => grouped[d.category].push(d))

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-stretch justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-7xl my-2 sm:my-4 bg-white rounded-xl border-2 border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-slate-200 bg-gradient-to-b from-slate-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[2.5px] uppercase bg-amber-100 text-amber-800 border border-amber-300 rounded-md px-2 py-1">
              <span aria-hidden="true">🔧</span> Admin
            </span>
            <h2 className="font-serif text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {active.title}
            </h2>
            <span className="hidden sm:inline text-[11px] text-slate-500 italic truncate">{active.subtitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDisable}
              className="text-[10px] font-bold uppercase tracking-[2px] text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded px-2 py-1 transition-colors"
              title="Turn off admin mode (URL ?admin=0 also works)"
            >
              Disable admin
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close admin"
              className="w-9 h-9 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center"
            >
              <span aria-hidden="true" className="text-xl leading-none font-bold">×</span>
            </button>
          </div>
        </header>

        {/* Body — sidebar + content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <aside className="w-56 sm:w-64 shrink-0 border-r-2 border-slate-200 bg-slate-50/60 overflow-y-auto">
            {(Object.keys(grouped) as Array<DocCategory>).map((cat) => (
              grouped[cat].length > 0 && (
                <div key={cat} className="py-2">
                  <div className="text-[9px] font-bold tracking-[3px] uppercase text-slate-400 px-3 pb-1">{cat}</div>
                  <ul>
                    {grouped[cat].map((d) => {
                      const isActive = d.id === activeId
                      return (
                        <li key={d.id}>
                          <button
                            type="button"
                            onClick={() => setActiveId(d.id)}
                            aria-current={isActive ? 'true' : undefined}
                            className={[
                              'w-full text-left px-3 py-2 border-l-[3px] transition-colors',
                              isActive ? 'bg-white border-amber-500' : 'border-transparent hover:bg-white/70 hover:border-slate-300',
                            ].join(' ')}
                          >
                            <div className={`text-[12.5px] font-extrabold leading-tight ${isActive ? 'text-amber-800' : 'text-slate-800'}`}>{d.title}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{d.subtitle}</div>
                            {d.filePath && <div className="text-[9px] font-mono text-slate-400 mt-0.5 truncate">{d.filePath}</div>}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            ))}
            <div className="px-3 py-3 mt-2 border-t border-slate-200 text-[10px] text-slate-500 italic leading-snug">
              To add a new doc, drop a .md file under <code className="font-mono text-slate-700">tasks/</code> and register it in <code className="font-mono text-slate-700">AdminPage.tsx</code>.
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 overflow-y-auto bg-white">
            <div className="max-w-4xl mx-auto px-5 sm:px-7 py-5 sm:py-7">
              {active.kind === 'panel' && active.id === 'test-runner' ? (
                <TestRunnerPanel />
              ) : active.source ? (
                <>
                  <MarkdownView source={active.source} />
                  {active.filePath && (
                    <div className="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-500">
                      Source: <code className="font-mono text-slate-700">{active.filePath}</code>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
