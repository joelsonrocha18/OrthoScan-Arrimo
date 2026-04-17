import { describe, expect, it } from 'vitest'
import { AppError } from '../../shared/errors'
import {
  parseIsoDate,
  parseTrimmedString,
  validateCreateCaseFromScanInput,
  validateCreateScanInput,
} from '../../shared/validators'

describe('shared schema validators', () => {
  it('normalizes and validates scan payloads', () => {
    const result = validateCreateScanInput({
      patientName: '  Maria  ',
      clinicId: 'clinic_1',
      scanDate: '2026-03-20',
      arch: 'ambos',
      attachments: [],
      status: 'pendente',
    })

    expect(result.patientName).toBe('Maria')
    expect(result.scanDate).toBe('2026-03-20')
  })

  it('validates create case payloads', () => {
    const result = validateCreateCaseFromScanInput({
      scanId: 'scan_1',
      totalTraysUpper: 10,
      totalTraysLower: 8,
      changeEveryDays: 7,
      attachmentBondingTray: true,
      planningNote: 'Plano inicial',
    })

    expect(result.scanId).toBe('scan_1')
    expect(result.changeEveryDays).toBe(7)
  })

  it('throws app errors for invalid schemas', () => {
    expect(() => parseTrimmedString('   ', 'Campo')).toThrow(AppError)
    expect(() => parseIsoDate('nao-e-data', 'Data')).toThrow(AppError)
    expect(() =>
      validateCreateCaseFromScanInput({
        scanId: 'scan_1',
        changeEveryDays: 0,
        attachmentBondingTray: true,
      }),
    ).toThrow(AppError)
  })
})
