// Orchestration snapshot — persists the engine + fitter output to
// localStorage on every hash change. Lets reports show "as-of" data
// even if the user navigates away or refreshes mid-export.
//
// Memo reference: audit gap F9.

import type { EngineOutput, StrategyFit } from '../../types/orchestration'

export interface OrchestrationSnapshot {
  ranked: EngineOutput
  fit: StrategyFit
  savedAt: string                  // ISO when persisted
  schemaVersion: 1
}

const KEY = 'rp_orchestration_snapshot'
const SCHEMA = 1

export function readSnapshot(): OrchestrationSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OrchestrationSnapshot
    if (parsed.schemaVersion !== SCHEMA) return null
    return parsed
  } catch {
    return null
  }
}

export function writeSnapshot(ranked: EngineOutput, fit: StrategyFit, now: Date = new Date()): void {
  if (typeof window === 'undefined') return
  try {
    const snap: OrchestrationSnapshot = { ranked, fit, savedAt: now.toISOString(), schemaVersion: SCHEMA }
    window.localStorage.setItem(KEY, JSON.stringify(snap))
  } catch {
    /* ignore quota / privacy errors */
  }
}

export function clearSnapshot(): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(KEY) } catch { /* ignore */ }
}
