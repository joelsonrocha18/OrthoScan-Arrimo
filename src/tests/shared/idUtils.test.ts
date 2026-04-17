import { describe, expect, it } from 'vitest'
import {
  buildEntityCode,
  buildUtcTimestampToken,
  clinicCodePrefix,
  createEntityId,
  createExamCode,
  createUlid,
  createUuid,
  createTimestampedToken,
  matchesFriendlyCode,
  normalizeSearchTerm,
  sanitizeTokenSegment,
} from '../../shared/utils/id'

describe('shared id utils', () => {
  it('normalizes search terms and matches friendly codes', () => {
    expect(normalizeSearchTerm('  ABC  ')).toBe('abc')
    expect(matchesFriendlyCode('abc', 'XYZ-ABC-01')).toBe(true)
    expect(matchesFriendlyCode('abc', 'XYZ-001')).toBe(false)
  })

  it('sanitizes tokens and clinic prefixes', () => {
    expect(sanitizeTokenSegment(' Clínica São João ')).toBe('clinica_sao_joao')
    expect(clinicCodePrefix('cli-0001')).toBe('CLI0001')
  })

  it('creates timestamped and prefixed IDs', () => {
    expect(createTimestampedToken()).toMatch(/^\d{8}_\d{6}_[a-f0-9]+$/)
    expect(createEntityId('patient')).toMatch(/^patient_[0-9A-HJKMNP-TV-Z]{26}(_[a-f0-9]+)?$/)
    expect(createUlid()).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
    expect(createUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(buildEntityCode('P', 'patient_1')).toMatch(/^P\d{6}$/)
  })

  it('creates reusable code tokens', () => {
    expect(buildUtcTimestampToken(new Date('2026-03-31T12:34:56.000Z'))).toBe('20260331_123456')
    expect(createExamCode(new Date('2026-03-31T12:34:56.000Z'))).toMatch(/^EXM-\d{6}[A-Z0-9]{2}$/)
  })
})
