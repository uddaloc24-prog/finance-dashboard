// smsParser.test.ts — exercises every common Indian bank/UPI/card
// format. Pinning these prevents regressions when the regexes change.

import { describe, it, expect } from 'vitest'
import { parseSms } from '../smsParser'

describe('parseSms — HDFC card debit', () => {
  const sms = 'Spent Rs.350.00 On HDFC Bank Card xx1234 At FABINDIA On 23-Oct-24 :Avl Lmt Rs.50000'
  const p = parseSms(sms)

  it('parses successfully', () => {
    expect(p.success).toBe(true)
    expect(p.parser).toBe('regex')
  })

  it('extracts amount', () => {
    expect(p.transaction?.amount).toBe(350)
  })

  it('detects DEBIT direction', () => {
    expect(p.transaction?.direction).toBe('DEBIT')
  })

  it('finds FABINDIA merchant', () => {
    expect(p.transaction?.merchantName).toBe('FABINDIA')
  })

  it('parses 23-Oct-24 → 2024-10-23', () => {
    expect(p.transaction?.date).toBe('2024-10-23')
  })

  it('detects CARD payment mode', () => {
    expect(p.transaction?.paymentMode).toBe('CARD')
  })

  it('extracts last-4 account hint', () => {
    expect(p.transaction?.accountHint).toBe('1234')
  })

  it('reaches high confidence (≥ 0.95)', () => {
    expect(p.confidence).toBeGreaterThanOrEqual(0.95)
  })
})

describe('parseSms — HDFC UPI debit', () => {
  const sms = 'Rs.250.00 has been debited from your a/c **1234 on 23-Oct-24 to user@upi via UPI Ref 1234567'
  const p = parseSms(sms)

  it('parses successfully with high confidence', () => {
    expect(p.success).toBe(true)
    expect(p.confidence).toBeGreaterThanOrEqual(0.85)
  })

  it('detects UPI payment mode', () => {
    expect(p.transaction?.paymentMode).toBe('UPI')
  })

  it('extracts amount + direction + account', () => {
    expect(p.transaction?.amount).toBe(250)
    expect(p.transaction?.direction).toBe('DEBIT')
    expect(p.transaction?.accountHint).toBe('1234')
  })
})

describe('parseSms — SBI debit', () => {
  const sms = 'Dear Customer, A/c xxxxxxx1234 is debited with INR 500.00 on 23/10/24 by TPT to FABINDIA. Avl bal Rs.10000'
  const p = parseSms(sms)

  it('parses successfully', () => {
    expect(p.success).toBe(true)
  })

  it('parses DD/MM/YY → 2024-10-23', () => {
    expect(p.transaction?.date).toBe('2024-10-23')
  })

  it('extracts merchant FABINDIA', () => {
    expect(p.transaction?.merchantName).toBe('FABINDIA')
  })
})

describe('parseSms — ICICI salary credit', () => {
  const sms = 'Dear customer, Acct XX1234 credited with Rs 50000.00 on 30-Oct-24; Salary credit. Avl Bal Rs 75000'
  const p = parseSms(sms)

  it('parses successfully', () => {
    expect(p.success).toBe(true)
  })

  it('detects CREDIT direction', () => {
    expect(p.transaction?.direction).toBe('CREDIT')
  })

  it('extracts amount 50000', () => {
    expect(p.transaction?.amount).toBe(50000)
  })
})

describe('parseSms — UPI generic with handle', () => {
  const sms = 'INR 75.50 debited via UPI to merchant@axisbank on 25-Oct-24. UPI Ref 1234567890. Bal Rs 1000'
  const p = parseSms(sms)

  it('parses successfully', () => {
    expect(p.success).toBe(true)
  })

  it('strips UPI handle from merchant', () => {
    expect(p.transaction?.merchantName).toBe('merchant')
  })

  it('extracts decimal amount 75.50', () => {
    expect(p.transaction?.amount).toBe(75.5)
  })
})

describe('parseSms — NEFT credit', () => {
  const sms = 'NEFT IN: Rs 25,000.00 credited to a/c **5678 from JOHN DOE on 15-Nov-24. Ref NETXXX. Bal Rs 100000'
  const p = parseSms(sms)

  it('parses successfully', () => {
    expect(p.success).toBe(true)
  })

  it('detects NET_BANKING payment mode', () => {
    expect(p.transaction?.paymentMode).toBe('NET_BANKING')
  })

  it('extracts amount 25000 (handles commas)', () => {
    expect(p.transaction?.amount).toBe(25000)
  })

  it('detects CREDIT and extracts JOHN DOE', () => {
    expect(p.transaction?.direction).toBe('CREDIT')
    expect(p.transaction?.merchantName).toBe('JOHN DOE')
  })
})

describe('parseSms — failure modes', () => {
  it('empty string → success=false, confidence=0', () => {
    const p = parseSms('')
    expect(p.success).toBe(false)
    expect(p.confidence).toBe(0)
  })

  it('non-SMS text → success=false', () => {
    const p = parseSms('Reminder: dentist appointment at 3pm tomorrow')
    expect(p.success).toBe(false)
  })

  it('amount without direction → success=false', () => {
    const p = parseSms('Your balance is Rs 5000')
    // Amount detected but no direction keyword.
    expect(p.success).toBe(false)
  })

  it('OTP-style alphanumeric not mistaken for transaction', () => {
    const p = parseSms('Your OTP is 123456. Do not share with anyone.')
    expect(p.success).toBe(false)
  })
})

describe('parseSms — confidence rubric', () => {
  it('amount + direction only ≈ 0.55', () => {
    const p = parseSms('You have been debited Rs 100.')
    expect(p.confidence).toBeGreaterThan(0.5)
    expect(p.confidence).toBeLessThan(0.7)
  })

  it('amount + direction + merchant ≥ 0.7', () => {
    const p = parseSms('Rs 100 debited at Starbucks')
    expect(p.confidence).toBeGreaterThanOrEqual(0.7)
  })
})

describe('parseSms — description generation', () => {
  it('describes a debit "Spent ₹X at <merchant> via Card"', () => {
    const p = parseSms('Spent Rs.500 on Card xx1234 at AMAZON on 12-Nov-24')
    expect(p.transaction?.description).toContain('Spent')
    expect(p.transaction?.description).toContain('AMAZON')
    expect(p.transaction?.description).toContain('Card')
  })

  it('describes a credit "Received ₹X from <sender>"', () => {
    const p = parseSms('NEFT IN: Rs 1000 credited from RAVI KUMAR on 12-Nov-24')
    expect(p.transaction?.description).toContain('Received')
    expect(p.transaction?.description).toContain('RAVI KUMAR')
  })
})
