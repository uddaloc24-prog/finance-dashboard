// Deterministic content hashing for EngineInput.
// Used to short-id snapshots and for audit logs.
// NOT a cryptographic hash — just stable, fast, and JSON-deterministic.

/** djb2 — classic, well-distributed, 32-bit. Returned in base-36. */
export function djb2(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i)
    h = h >>> 0
  }
  return h.toString(36)
}

/** Stable JSON stringify — sorts object keys at every depth so that
 *  `{a:1,b:2}` and `{b:2,a:1}` hash identically. Arrays preserve order. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
}

export function hashInput(input: unknown): string {
  return djb2(stableStringify(input))
}
