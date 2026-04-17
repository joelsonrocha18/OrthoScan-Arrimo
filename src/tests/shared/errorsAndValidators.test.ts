import { describe, expect, it } from 'vitest'
import {
  AppError,
  createExternalServiceError,
  createValidationError,
  getErrorMessage,
  isAppError,
  toAppError,
} from '../../shared/errors'
import { assertMinLength, assertNonEmptyString, normalizeText, onlyDigits } from '../../shared/validators'

describe('shared errors and validators', () => {
  it('creates typed app errors', () => {
    const error = createValidationError('Campo obrigatorio.')
    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(isAppError(error)).toBe(true)
  })

  it('normalizes unknown errors into app errors', () => {
    const normalized = toAppError('Falha externa.', 'Erro inesperado.', 'EXTERNAL_SERVICE_ERROR')
    expect(normalized.code).toBe('EXTERNAL_SERVICE_ERROR')
    expect(getErrorMessage(createExternalServiceError('Gateway indisponivel.'))).toBe('Gateway indisponivel.')
  })

  it('validates text rules consistently', () => {
    expect(assertNonEmptyString('  valor  ', 'Obrigatorio.')).toBe('valor')
    expect(assertMinLength('  abcdef  ', 6)).toBe('abcdef')
    expect(normalizeText('  Maria  ')).toBe('Maria')
    expect(onlyDigits('(85) 99999-0000')).toBe('85999990000')
  })

  it('throws app errors for invalid validation input', () => {
    expect(() => assertNonEmptyString('   ', 'Obrigatorio.')).toThrow(AppError)
    expect(() => assertMinLength('abc', 4)).toThrow(AppError)
  })
})
