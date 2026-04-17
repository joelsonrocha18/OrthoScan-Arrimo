import { createValidationError } from '../errors'
import type { AnyRecord, Maybe } from '../types'

export function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function normalizeText(value: Maybe<string>) {
  const normalized = value?.trim() ?? ''
  return normalized || undefined
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function assertNonEmptyString(value: unknown, message: string) {
  if (!isNonEmptyString(value)) {
    throw createValidationError(message)
  }
  return value.trim()
}

export function assertMinLength(value: string, minLength: number, message?: string) {
  const normalized = value.trim()
  if (normalized.length < minLength) {
    throw createValidationError(message ?? `Informe ao menos ${minLength} caracteres.`)
  }
  return normalized
}

export function coerceFiniteNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
