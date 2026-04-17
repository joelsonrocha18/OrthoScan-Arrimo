import { createValidationError } from '../errors'
import type { ISODateString, ISODateTimeString } from '../types'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DAY_IN_MS = 1000 * 60 * 60 * 24

function assertValidDate(date: Date, message = 'Data inválida.') {
  if (Number.isNaN(date.getTime())) {
    throw createValidationError(message)
  }
  return date
}

function normalizeDateInput(value: string | Date | number) {
  if (value instanceof Date) {
    return assertValidDate(new Date(value.getTime()))
  }
  if (typeof value === 'number') {
    return assertValidDate(new Date(value))
  }
  const normalized = value.trim()
  if (!normalized) {
    throw createValidationError('Data inválida.')
  }
  return normalized
}

export function nowIsoDateTime(date = new Date()): ISODateTimeString {
  return assertValidDate(date).toISOString() as ISODateTimeString
}

export function nowIsoDate(date = new Date()): ISODateString {
  return nowIsoDateTime(date).slice(0, 10) as ISODateString
}

export function toDateOnly(value: string | Date | number) {
  const normalized = normalizeDateInput(value)
  if (normalized instanceof Date) {
    return normalized
  }
  const isoDate = normalized.length >= 10 ? normalized.slice(0, 10) : normalized
  return assertValidDate(new Date(`${isoDate}T00:00:00`))
}

export function toDateTime(value: string | Date | number) {
  const normalized = normalizeDateInput(value)
  if (normalized instanceof Date) {
    return normalized
  }
  return assertValidDate(new Date(normalized))
}

export function toIsoDate(value: string | Date | number = new Date()): ISODateString {
  return nowIsoDate(toDateTime(value))
}

export function toIsoDateTime(value: string | Date | number = new Date()): ISODateTimeString {
  return nowIsoDateTime(toDateTime(value))
}

export function addDaysToIsoDate(baseIsoDate: string, days: number): ISODateString {
  const base = toDateOnly(baseIsoDate)
  base.setDate(base.getDate() + Math.trunc(days))
  return toIsoDate(base)
}

export function diffIsoDays(targetIsoDate: string, baseIsoDate: string) {
  const target = toDateOnly(targetIsoDate)
  const base = toDateOnly(baseIsoDate)
  const ms = target.getTime() - base.getTime()
  return Math.ceil(ms / DAY_IN_MS)
}

export function pickMinIsoDate(values: Array<string | undefined | null>) {
  const validValues = values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => toIsoDate(value))
  if (validValues.length === 0) return undefined
  return [...validValues].sort()[0]
}

export function pickMaxIsoDate(values: Array<string | undefined | null>) {
  const validValues = values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => toIsoDate(value))
  if (validValues.length === 0) return undefined
  return [...validValues].sort().at(-1)
}

export function formatPtBrDate(value?: string | Date | null, fallback = '-') {
  if (!value) return fallback
  return toDateOnly(value).toLocaleDateString('pt-BR')
}

export function formatPtBrDateTime(value?: string | Date | null, fallback = '-') {
  if (!value) return fallback
  return toDateTime(value).toLocaleString('pt-BR')
}

export function isIsoDateString(value: unknown): value is ISODateString {
  return typeof value === 'string' && ISO_DATE_PATTERN.test(value.slice(0, 10))
}
