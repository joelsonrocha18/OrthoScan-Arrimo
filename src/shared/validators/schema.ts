import { createValidationError } from '../errors'
import { isIsoDateString, toIsoDate, toIsoDateTime } from '../utils/date'
import { assertNonEmptyString, isRecord } from './common'

type SchemaOptions = {
  min?: number
  max?: number
}

export function parseObject(value: unknown, message = 'Payload inválido.') {
  if (!isRecord(value)) {
    throw createValidationError(message)
  }
  return value
}

export function parseTrimmedString(value: unknown, label: string, options: SchemaOptions = {}) {
  const normalized = assertNonEmptyString(value, `${label} obrigatório.`)
  if (options.min && normalized.length < options.min) {
    throw createValidationError(`${label} deve ter ao menos ${options.min} caracteres.`)
  }
  if (options.max && normalized.length > options.max) {
    throw createValidationError(`${label} deve ter no maximo ${options.max} caracteres.`)
  }
  return normalized
}

export function parseOptionalTrimmedString(value: unknown, label: string, options: SchemaOptions = {}) {
  if (value === undefined || value === null || value === '') return undefined
  return parseTrimmedString(value, label, options)
}

export function parseBoolean(value: unknown, label: string) {
  if (typeof value !== 'boolean') {
    throw createValidationError(`${label} inválido.`)
  }
  return value
}

export function parseInteger(value: unknown, label: string, options: { min?: number; max?: number } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createValidationError(`${label} inválido.`)
  }
  const normalized = Math.trunc(value)
  if (options.min !== undefined && normalized < options.min) {
    throw createValidationError(`${label} deve ser maior ou igual a ${options.min}.`)
  }
  if (options.max !== undefined && normalized > options.max) {
    throw createValidationError(`${label} deve ser menor ou igual a ${options.max}.`)
  }
  return normalized
}

export function parseEnum<const TValues extends readonly string[]>(
  value: unknown,
  values: TValues,
  label: string,
): TValues[number] {
  if (typeof value !== 'string' || !values.includes(value)) {
    throw createValidationError(`${label} inválido.`, { allowedValues: values })
  }
  return value
}

export function parseIsoDate(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createValidationError(`${label} obrigatória.`)
  }
  const normalized = toIsoDate(value)
  if (!isIsoDateString(normalized)) {
    throw createValidationError(`${label} inválida.`)
  }
  return normalized
}

export function parseOptionalIsoDate(value: unknown, label: string) {
  if (value === undefined || value === null || value === '') return undefined
  return parseIsoDate(value, label)
}

export function parseIsoDateTime(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createValidationError(`${label} obrigatória.`)
  }
  return toIsoDateTime(value)
}

export function parseArray<T>(value: unknown, label: string, mapper?: (item: unknown, index: number) => T) {
  if (!Array.isArray(value)) {
    throw createValidationError(`${label} inválido.`)
  }
  if (!mapper) return value as T[]
  return value.map((item, index) => mapper(item, index))
}
