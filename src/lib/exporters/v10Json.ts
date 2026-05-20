// Structured JSON export of the v10 Adaptive Psychometric session.
// Bundles Goal Discovery + quiz state + inference + composites + identity
// into a single envelope suitable for handoff to a SEBI-registered
// advisor or for archiving.

import type { GoalDiscoveryState, V10QuizState } from '../../types/psychometric'
import type { UserIdentity } from '../../types/identity'
import { storage } from '../storage'

export const V10_EXPORT_VERSION = 'retirewise-v10-export-1'

export interface V10ExportPayload {
  version: string
  exportedAt: string                 // ISO
  identity: UserIdentity | null
  goalDiscovery: GoalDiscoveryState | null
  v10Quiz: V10QuizState | null
}

export function buildV10ExportPayload(
  gd: GoalDiscoveryState | null,
  v10: V10QuizState | null,
  identity: UserIdentity | null = storage.getIdentity(),
): V10ExportPayload {
  return {
    version: V10_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    identity,
    goalDiscovery: gd,
    v10Quiz: v10,
  }
}

/**
 * Triggers a browser download of the v10 export JSON. Safe to call when
 * either gd or v10 (or both) are null; downstream consumers can detect
 * partial payloads via the missing fields.
 */
export function downloadV10Json(
  gd: GoalDiscoveryState | null,
  v10: V10QuizState | null,
  filename?: string,
): void {
  const payload = buildV10ExportPayload(gd, v10)
  const text = JSON.stringify(payload, null, 2)
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const name = filename ?? `retirewise-v10-${new Date().toISOString().slice(0, 10)}.json`
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
