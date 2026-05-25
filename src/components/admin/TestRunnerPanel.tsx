// Test runner shortcut for the Admin panel.
// Browsers cannot shell out, so this surface is informational +
// copy-to-clipboard: one-click copies for the npm test commands, the
// suite breakdown by file, and instructions for the vitest UI.

import { useState } from 'react'

interface TestFile { name: string; count: number; what: string }

// Snapshot of the suite from the last verified run (2026-05-24). Update
// this table when test files are added / removed.
const SUITE: TestFile[] = [
  { name: 'personaWeights.test.ts', count: 10, what: 'P1-P9 table integrity, override merge, re-normalisation' },
  { name: 'scorers.test.ts',        count: 23, what: 'Each of the 4 scorers — bumps, clamps, defaults, edge cases' },
  { name: 'preempt.test.ts',        count:  7, what: '3 pre-emption rules + age cutoff + zero burn + age uplift' },
  { name: 'tiebreaker.test.ts',     count:  4, what: 'Stable sort: composite desc → must-have → id asc' },
  { name: 'hash.test.ts',           count: 10, what: 'djb2 stability + stableStringify key-order invariance' },
  { name: 'rankGoals.test.ts',      count: 16, what: 'Integration + 5 golden-master snapshots (persona × plan)' },
  { name: 'fitStrategy.test.ts',    count: 15, what: 'Bucket-split table + totals invariants + status thresholds' },
  { name: 'determinism.test.ts',    count:  7, what: '100× identical hash + JSON for 5 input scenarios' },
  { name: 'latency.test.ts',        count:  2, what: '50 goals × 100 runs — engine p95 < 50ms, +fitter < 75ms' },
  { name: 'goalsFromGd.test.ts',    count: 43, what: 'Parsers (amount / horizon / kind / category / priority) + projector' },
  { name: 'persistence.test.tsx',   count:  6, what: 'Quiz auto-save + ProfilesPanel re-hydration on modal close (RTL + jsdom)' },
]

const TOTAL = SUITE.reduce((s, f) => s + f.count, 0)
const LAST_VERIFIED = '2026-05-25'

export function TestRunnerPanel() {
  return (
    <article className="space-y-4">
      <header>
        <div className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700">Tools · Test runner</div>
        <h2 className="font-serif text-2xl font-extrabold text-slate-900 leading-tight mt-1">vitest commands</h2>
        <p className="text-[12px] text-slate-600 mt-1.5 leading-snug max-w-2xl">
          Browsers cannot shell out, so this panel is a copy-to-clipboard shortcut. Click a command, paste into a terminal at the project root, run.
        </p>
      </header>

      {/* Copy buttons */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CopyCommand label="One-shot run (CI mode)"   cmd="npm test"           desc="Runs every test once, exits with the test process's status code. The default in CI / pre-commit." />
        <CopyCommand label="Watch mode (dev loop)"    cmd="npm run test:watch" desc="Re-runs affected tests on file change. Esc to quit. Useful while editing engine code or fixtures." />
      </section>

      {/* Suite stats */}
      <section className="rounded-md border-2 border-slate-200 bg-slate-50/40 p-4">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
          <h3 className="text-[10px] font-bold tracking-[3px] uppercase text-slate-700">Suite breakdown</h3>
          <span className="text-[10px] text-slate-500 italic">{TOTAL} tests · {SUITE.length} files · last verified {LAST_VERIFIED}</span>
        </div>
        <table className="w-full text-[12px] tabular-nums">
          <thead>
            <tr className="text-slate-500">
              <th className="text-left font-semibold py-1">File</th>
              <th className="text-right font-semibold py-1 w-12">Tests</th>
              <th className="text-left font-semibold py-1 pl-3">Covers</th>
            </tr>
          </thead>
          <tbody>
            {SUITE.map((f) => (
              <tr key={f.name} className="border-t border-slate-200/60">
                <td className="py-1 pr-3 font-mono text-[11px] text-slate-700">{f.name}</td>
                <td className="text-right py-1 font-bold text-slate-900">{f.count}</td>
                <td className="text-slate-600 py-1 pl-3 leading-snug">{f.what}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-300 font-bold">
              <td className="py-1 text-right">Total</td>
              <td className="text-right py-1 text-slate-900">{TOTAL}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </section>

      {/* Companion commands */}
      <section className="rounded-md border-2 border-indigo-200 bg-indigo-50/30 p-4">
        <h3 className="text-[10px] font-bold tracking-[3px] uppercase text-indigo-800 mb-2">Companion commands</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <CopyMini cmd="npx vitest run -u"                          hint="Update golden-master snapshots after deliberate engine changes" />
          <CopyMini cmd="npx vitest run --coverage"                  hint="Generate v8 coverage report under coverage/" />
          <CopyMini cmd="npx vitest run src/lib/orchestration/__tests__/rankGoals.test.ts" hint="Run a single test file" />
          <CopyMini cmd="npx vitest run -t 'determinism'"            hint="Run tests matching a name pattern" />
        </div>
      </section>

      {/* Contract reminders */}
      <section className="rounded-md border-2 border-emerald-200 bg-emerald-50/30 p-4">
        <h3 className="text-[10px] font-bold tracking-[3px] uppercase text-emerald-800 mb-2">Engine contracts under test</h3>
        <ul className="text-[12px] text-slate-700 space-y-1.5 leading-snug">
          <li>● <strong>Determinism</strong> — `rankGoals(input, now)` is pure. 100× same input → identical JSON + hash.</li>
          <li>● <strong>Latency</strong> — 50 goals × 100 runs, engine p95 &lt; 50ms, engine+fitter p95 &lt; 75ms (memo §2.5).</li>
          <li>● <strong>Weight integrity</strong> — every persona vector sums to 1.0; overrides re-normalised on merge.</li>
          <li>● <strong>Pre-emption</strong> — term / health / emergency rules emit correct gaps; age cutoffs respected.</li>
          <li>● <strong>Golden masters</strong> — 5 persona × plan snapshots locked in <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">__snapshots__/</code>.</li>
        </ul>
      </section>

      <div className="text-[10px] text-slate-500 italic pt-2 border-t border-slate-200">
        Config: <code className="font-mono text-slate-700">vitest.config.ts</code> · Fixtures: <code className="font-mono text-slate-700">src/lib/orchestration/__tests__/__fixtures__.ts</code>
      </div>
    </article>
  )
}

// ─── Copy widgets ─────────────────────────────────────────────────────

function CopyCommand({ label, cmd, desc }: { label: string; cmd: string; desc: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(cmd)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — user can manually select the visible text */
    }
  }
  return (
    <div className="rounded-md border-2 border-slate-200 bg-white p-3">
      <div className="text-[10px] font-bold tracking-[2px] uppercase text-slate-600 mb-1">{label}</div>
      <button
        type="button"
        onClick={handleCopy}
        className="w-full font-mono text-[13px] bg-slate-900 text-slate-100 rounded px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-800 transition-colors active:translate-y-[1px]"
        title="Click to copy"
      >
        <span><span className="text-amber-400">$</span> {cmd}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
          {copied ? 'copied ✓' : 'copy'}
        </span>
      </button>
      <div className="text-[10.5px] text-slate-500 italic mt-1.5 leading-snug">{desc}</div>
    </div>
  )
}

function CopyMini({ cmd, hint }: { cmd: string; hint: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(cmd)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-left rounded border border-indigo-200 bg-white hover:bg-indigo-50 transition-colors px-2.5 py-2 group"
      title="Click to copy"
    >
      <div className="flex items-center justify-between gap-2">
        <code className="font-mono text-[11px] text-slate-800 truncate">{cmd}</code>
        <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 ${copied ? 'text-emerald-700' : 'text-slate-400 group-hover:text-indigo-600'}`}>
          {copied ? '✓ copied' : 'copy'}
        </span>
      </div>
      <div className="text-[10px] text-slate-500 italic mt-0.5 leading-snug">{hint}</div>
    </button>
  )
}
