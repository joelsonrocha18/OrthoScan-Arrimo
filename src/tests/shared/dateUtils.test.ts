import { describe, expect, it } from 'vitest'
import {
  addDaysToIsoDate,
  diffIsoDays,
  formatPtBrDate,
  formatPtBrDateTime,
  isIsoDateString,
  nowIsoDate,
  nowIsoDateTime,
  pickMaxIsoDate,
  pickMinIsoDate,
  toIsoDate,
} from '../../shared/utils/date'

describe('shared date utils', () => {
  it('normalizes dates to ISO formats', () => {
    const input = new Date('2026-03-31T12:34:56.000Z')
    expect(nowIsoDate(input)).toBe('2026-03-31')
    expect(nowIsoDateTime(input)).toBe('2026-03-31T12:34:56.000Z')
    expect(toIsoDate('2026-03-31T23:59:59.000Z')).toBe('2026-03-31')
  })

  it('adds days and compares ISO dates', () => {
    expect(addDaysToIsoDate('2026-03-31', 7)).toBe('2026-04-07')
    expect(diffIsoDays('2026-04-07', '2026-03-31')).toBe(7)
  })

  it('picks min and max ISO dates', () => {
    expect(pickMinIsoDate([undefined, '2026-04-05', '2026-04-01'])).toBe('2026-04-01')
    expect(pickMaxIsoDate([undefined, '2026-04-05', '2026-04-01'])).toBe('2026-04-05')
  })

  it('formats PT-BR labels and validates ISO date strings', () => {
    expect(formatPtBrDate('2026-03-31')).toBe('31/03/2026')
    expect(formatPtBrDateTime('2026-03-31T12:34:56.000Z')).toContain('31/03/2026')
    expect(isIsoDateString('2026-03-31')).toBe(true)
    expect(isIsoDateString('31/03/2026')).toBe(false)
  })
})
