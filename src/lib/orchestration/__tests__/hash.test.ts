import { describe, expect, it } from 'vitest'
import { djb2, stableStringify, hashInput } from '../hash'

describe('djb2', () => {
  it('produces deterministic output for same input', () => {
    expect(djb2('hello')).toBe(djb2('hello'))
  })

  it('produces different output for different inputs', () => {
    expect(djb2('hello')).not.toBe(djb2('world'))
  })

  it('returns base-36 string', () => {
    const h = djb2('test-string-123')
    expect(h).toMatch(/^[0-9a-z]+$/)
  })

  it('empty string still hashes (no crash)', () => {
    expect(typeof djb2('')).toBe('string')
  })
})

describe('stableStringify', () => {
  it('produces identical output regardless of key insertion order', () => {
    const a = { foo: 1, bar: 2, baz: 3 }
    const b = { bar: 2, baz: 3, foo: 1 }
    expect(stableStringify(a)).toBe(stableStringify(b))
  })

  it('preserves array order', () => {
    expect(stableStringify([1, 2, 3])).toBe('[1,2,3]')
    expect(stableStringify([3, 2, 1])).toBe('[3,2,1]')
  })

  it('handles nested objects', () => {
    const a = { x: { b: 2, a: 1 } }
    const b = { x: { a: 1, b: 2 } }
    expect(stableStringify(a)).toBe(stableStringify(b))
  })

  it('handles null and primitives', () => {
    expect(stableStringify(null)).toBe('null')
    expect(stableStringify(42)).toBe('42')
    expect(stableStringify('abc')).toBe('"abc"')
    expect(stableStringify(true)).toBe('true')
  })
})

describe('hashInput', () => {
  it('hash is stable across key-reordered input', () => {
    const a = { foo: 1, bar: 2, nested: { x: 1, y: 2 } }
    const b = { bar: 2, nested: { y: 2, x: 1 }, foo: 1 }
    expect(hashInput(a)).toBe(hashInput(b))
  })

  it('hash differs when content actually changes', () => {
    expect(hashInput({ x: 1 })).not.toBe(hashInput({ x: 2 }))
  })
})
