import { describe, expect, it } from 'vitest'
import {
  goalsFromGd, goalsFromManual, mergeGoals,
  parseAmount, parseHorizon, parseKind, parseCategory, parsePriority,
} from '../goalsFromGd'
import type { GoalDiscoveryState } from '../../../types/psychometric'
import type { Goal } from '../../../types/v2'

const NOW = new Date('2026-05-24T00:00:00Z')

describe('parseAmount', () => {
  it('plain numbers', () => {
    expect(parseAmount('100000')).toBe(100000)
    expect(parseAmount('75,000')).toBe(75000)
  })

  it('lakh suffix variants', () => {
    expect(parseAmount('50L')).toBe(50_00_000)
    expect(parseAmount('50 Lakh')).toBe(50_00_000)
    expect(parseAmount('50 lac')).toBe(50_00_000)
  })

  it('crore suffix variants', () => {
    expect(parseAmount('1.5 Cr')).toBe(1_50_00_000)
    expect(parseAmount('1Cr')).toBe(1_00_00_000)
  })

  it('k suffix', () => {
    expect(parseAmount('75k')).toBe(75000)
  })

  it('₹ prefix stripped', () => {
    expect(parseAmount('₹50,00,000')).toBe(50_00_000)
  })

  it('invalid / empty → 0', () => {
    expect(parseAmount('')).toBe(0)
    expect(parseAmount(undefined)).toBe(0)
    expect(parseAmount('abc')).toBe(0)
    expect(parseAmount('-50')).toBe(0)
  })
})

describe('parseHorizon', () => {
  it('"5 years" → 5', () => expect(parseHorizon('5 years', 2026)).toBe(5))
  it('"5y" → 5', () => expect(parseHorizon('5y', 2026)).toBe(5))
  it('absolute year "2030" → 4 from 2026', () => expect(parseHorizon('2030', 2026)).toBe(4))
  it('"by 2031" → 5 from 2026', () => expect(parseHorizon('by 2031', 2026)).toBe(5))
  it('past year clamps to 0', () => expect(parseHorizon('2020', 2026)).toBe(0))
  it('empty/null → default 5', () => {
    expect(parseHorizon('', 2026)).toBe(5)
    expect(parseHorizon(null, 2026)).toBe(5)
  })
  it('bare number → years', () => expect(parseHorizon('7', 2026)).toBe(7))
})

describe('parseKind', () => {
  it.each([
    ['retirement income', 'income'],
    ['pension', 'income'],
    ['SWP', 'income'],
    ['legacy gift', 'legacy'],
    ['inheritance', 'legacy'],
    ['corpus building', 'corpus-build'],
    ['wealth growth', 'corpus-build'],
    ['vacation', 'event'],
    ['', 'event'],
  ])('"%s" → %s', (input, expected) => {
    expect(parseKind(input)).toBe(expected)
  })
})

describe('parseCategory', () => {
  it.each([
    [['health insurance', 'family'],     'healthcare'],
    [['surgery', 'planned'],              'healthcare'],
    [['education', 'child'],              'education'],
    [['college tuition', 'kid'],          'education'],
    [['vacation', 'europe'],              'general'],
    [['', ''],                            'general'],
  ])('type=%j → %s', (input, expected) => {
    const [type, name] = input as [string, string]
    expect(parseCategory(type, name)).toBe(expected)
  })
})

describe('parsePriority', () => {
  it.each([
    ['must have', 'must-have'],
    ['essential', 'must-have'],
    ['critical', 'must-have'],
    ['nice to have', 'nice-to-have'],
    ['flexible', 'nice-to-have'],
    ['', 'nice-to-have'],
  ])('"%s" → %s', (input, expected) => {
    expect(parsePriority(input)).toBe(expected)
  })
})

describe('goalsFromGd', () => {
  it('null/undefined → []', () => {
    expect(goalsFromGd(null, NOW)).toEqual([])
    expect(goalsFromGd(undefined, NOW)).toEqual([])
  })

  it('missing block-1 → []', () => {
    const gd = { sessionId: 's', startedAt: '', updatedAt: '', currentBlock: 'block-0', visited: [], answers: {}, completed: false } as unknown as GoalDiscoveryState
    expect(goalsFromGd(gd, NOW)).toEqual([])
  })

  it('projects valid goal entries into RawGoal', () => {
    const gd = {
      answers: {
        'block-1': {
          goals: [
            { name: 'College fund', type: 'education', amount: '30L', horizon: '5 years', priority: 'must-have' },
            { name: 'House',         type: 'event',     amount: '1Cr',  horizon: '10 years', priority: 'nice' },
          ],
        },
      },
    } as unknown as GoalDiscoveryState
    const out = goalsFromGd(gd, NOW)
    expect(out).toHaveLength(2)
    expect(out[0].label).toBe('College fund')
    expect(out[0].amount).toBe(30_00_000)
    expect(out[0].inflationCategory).toBe('education')
    expect(out[0].priority).toBe('must-have')
    expect(out[0].source).toBe('gd-projection')
    expect(out[0].startYear).toBe(2031)
  })

  it('skips entries with empty name or zero amount', () => {
    const gd = {
      answers: {
        'block-1': {
          goals: [
            { name: '', amount: '50L' },
            { name: 'Valid', amount: '0' },
            { name: 'Good', amount: '5L', horizon: '3 years' },
          ],
        },
      },
    } as unknown as GoalDiscoveryState
    const out = goalsFromGd(gd, NOW)
    expect(out).toHaveLength(1)
    expect(out[0].label).toBe('Good')
  })

  it('ids are stable and slugged', () => {
    const gd = {
      answers: {
        'block-1': {
          goals: [{ name: 'Kids Education Fund!', amount: '5L', horizon: '5y' }],
        },
      },
    } as unknown as GoalDiscoveryState
    const out = goalsFromGd(gd, NOW)
    expect(out[0].id).toMatch(/^gd-kids-education-fund/)
  })
})

describe('goalsFromManual', () => {
  it('converts v2 Goal[] to RawGoal[] with source manual', () => {
    const manual: Goal[] = [{
      id: 'g1', label: 'Test', kind: 'event', amount: 10_00_000,
      startYear: 2030, priority: 'must-have', inflationCategory: 'general',
    }]
    const out = goalsFromManual(manual)
    expect(out[0].source).toBe('manual')
    expect(out[0].id).toBe('g1')
  })

  it('defaults missing inflationCategory to general', () => {
    const manual: Goal[] = [{
      id: 'g', label: 'g', kind: 'event', amount: 1, priority: 'nice-to-have',
    }]
    expect(goalsFromManual(manual)[0].inflationCategory).toBe('general')
  })
})

describe('mergeGoals', () => {
  it('dedupes by label, manual wins', () => {
    const manual = goalsFromManual([{ id: 'm', label: 'Same', kind: 'event', amount: 1, priority: 'must-have' }])
    const gd = goalsFromGd({ answers: { 'block-1': { goals: [{ name: 'Same', amount: '5L' }, { name: 'Unique', amount: '5L' }] } } } as unknown as GoalDiscoveryState, NOW)
    const merged = mergeGoals(manual, gd)
    expect(merged).toHaveLength(2)
    expect(merged.find((g) => g.label === 'Same')!.source).toBe('manual')
    expect(merged.find((g) => g.label === 'Unique')!.source).toBe('gd-projection')
  })

  it('label match is case-insensitive', () => {
    const manual = goalsFromManual([{ id: 'm', label: 'house', kind: 'event', amount: 1, priority: 'nice-to-have' }])
    const gd = goalsFromGd({ answers: { 'block-1': { goals: [{ name: 'HOUSE', amount: '5L' }] } } } as unknown as GoalDiscoveryState, NOW)
    expect(mergeGoals(manual, gd)).toHaveLength(1)
  })
})
