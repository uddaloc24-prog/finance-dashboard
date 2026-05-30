// csvConnector.test.ts

import { describe, it, expect } from 'vitest'
import { parseCsv, mapRowsToTransactions } from '../csvConnector'

describe('parseCsv — RFC-4180 basics', () => {
  it('parses a simple header + rows', () => {
    const rows = parseCsv('Date,Amount\n2024-10-23,350\n2024-10-24,500')
    expect(rows).toHaveLength(2)
    expect(rows[0].Date).toBe('2024-10-23')
    expect(rows[0].Amount).toBe('350')
  })

  it('handles quoted fields with commas inside', () => {
    const rows = parseCsv('Date,Desc\n2024-10-23,"Paid 350 at Fabindia, Mumbai"')
    expect(rows[0].Desc).toBe('Paid 350 at Fabindia, Mumbai')
  })

  it('handles CRLF newlines', () => {
    const rows = parseCsv('A,B\r\n1,2\r\n3,4')
    expect(rows).toHaveLength(2)
  })

  it('skips blank rows', () => {
    const rows = parseCsv('A,B\n,\n1,2\n')
    expect(rows).toHaveLength(1)
  })
})

describe('mapRowsToTransactions — HDFC-style debit/credit columns', () => {
  const csv = `Date,Narration,Debit,Credit
23/10/2024,UPI/FABINDIA/REF12345,350.00,
24/10/2024,SALARY CREDIT,,50000.00
25/10/2024,NEFT IN AMAZON,1200.50,`
  const rows = parseCsv(csv)
  const out = mapRowsToTransactions(rows)

  it('emits 3 transactions', () => {
    expect(out).toHaveLength(3)
  })

  it('parses DD/MM/YYYY → ISO', () => {
    expect(out[0].date).toBe('2024-10-23')
  })

  it('separates debit / credit columns into direction', () => {
    expect(out[0].direction).toBe('DEBIT')
    expect(out[1].direction).toBe('CREDIT')
    expect(out[2].direction).toBe('DEBIT')
  })

  it('extracts UPI payment mode from narration', () => {
    expect(out[0].paymentMode).toBe('UPI')
  })

  it('extracts NEFT → NET_BANKING', () => {
    expect(out[2].paymentMode).toBe('NET_BANKING')
  })

  it('amount is always positive', () => {
    for (const t of out) expect(t.amount).toBeGreaterThan(0)
  })
})

describe('mapRowsToTransactions — single Amount column + Type', () => {
  const csv = `Date,Description,Amount,Type
30-Nov-24,Salary credit,50000,CR
30-Nov-24,Card purchase at FABINDIA,350,DR`
  const rows = parseCsv(csv)
  const out = mapRowsToTransactions(rows)

  it('parses DD-MMM-YY → ISO', () => {
    expect(out[0].date).toBe('2024-11-30')
  })

  it('reads Type column for direction', () => {
    expect(out[0].direction).toBe('CREDIT')
    expect(out[1].direction).toBe('DEBIT')
  })

  it('extracts CARD payment mode from description', () => {
    expect(out[1].paymentMode).toBe('CARD')
  })
})

describe('mapRowsToTransactions — skips bad rows', () => {
  const csv = `Date,Narration,Debit,Credit
not-a-date,nonsense,350,
2024-10-23,Valid,100,`
  const rows = parseCsv(csv)
  const out = mapRowsToTransactions(rows)

  it('ignores rows with unparseable date', () => {
    expect(out).toHaveLength(1)
    expect(out[0].date).toBe('2024-10-23')
  })
})

describe('mapRowsToTransactions — empty input', () => {
  it('returns [] for empty CSV', () => {
    expect(mapRowsToTransactions(parseCsv(''))).toEqual([])
  })
})
