import type { EntityId } from '../types'

type MatchableCode = string | undefined | null

type SanitizeSegmentOptions = {
  lowerCase?: boolean
  trimUnderscores?: boolean
  fallback?: string
}

const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function cryptoBytes(size: number) {
  const normalizedSize = Math.max(1, Math.trunc(size))
  const bytes = new Uint8Array(normalizedSize)
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes)
    return bytes
  }
  for (let index = 0; index < normalizedSize; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256)
  }
  return bytes
}

function randomHex(length = 8) {
  const size = Math.max(2, Math.trunc(length))
  return Array.from(cryptoBytes(Math.ceil(size / 2)), (value) => value.toString(16).padStart(2, '0')).join('').slice(0, size)
}

function randomBase36(length = 2) {
  const size = Math.max(1, Math.trunc(length))
  let token = ''
  const bytes = cryptoBytes(size)
  for (const value of bytes) {
    token += CROCKFORD_BASE32[value % 36]
  }
  return token.slice(0, size).toUpperCase()
}

function encodeBase32(value: number, length: number) {
  let remaining = value
  let output = ''
  for (let index = 0; index < length; index += 1) {
    output = CROCKFORD_BASE32[remaining % 32] + output
    remaining = Math.floor(remaining / 32)
  }
  return output
}

function randomBase32(length: number) {
  return Array.from(cryptoBytes(length), (value) => CROCKFORD_BASE32[value % 32]).join('')
}

export function createUuid() {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID()
  }
  const bytes = cryptoBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function createUlid(date = new Date()) {
  const time = Math.max(0, date.getTime())
  return `${encodeBase32(time, 10)}${randomBase32(16)}`
}

export function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase()
}

export function sanitizeTokenSegment(value: string, options: SanitizeSegmentOptions = {}) {
  const sanitized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')

  const trimmed = options.trimUnderscores === false ? sanitized : sanitized.replace(/^_+|_+$/g, '')
  const cased = options.lowerCase === false ? trimmed : trimmed.toLowerCase()
  return cased || (options.fallback ?? '')
}

export function createTimestampedToken(randomLength = 8) {
  return `${buildUtcTimestampToken()}_${randomHex(randomLength)}`
}

export function createEntityId(prefix: string, randomLength = 8): EntityId {
  const normalizedPrefix = sanitizeTokenSegment(prefix, { lowerCase: true, fallback: 'entity' })
  return `${normalizedPrefix}_${createUlid()}${randomLength > 0 ? `_${randomHex(randomLength)}` : ''}`
}

export function buildUtcTimestampToken(date = new Date()) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mm = String(date.getUTCMinutes()).padStart(2, '0')
  const ss = String(date.getUTCSeconds()).padStart(2, '0')
  return `${y}${m}${d}_${hh}${mm}${ss}`
}

export function createExamCode(date = new Date()) {
  const stamp = String(date.getTime()).slice(-6)
  return `EXM-${stamp}${randomBase36(2)}`
}

export function matchesFriendlyCode(query: string, ...codes: MatchableCode[]) {
  const normalized = normalizeSearchTerm(query)
  if (!normalized) return true
  return codes.some((code) => (code ?? '').toLowerCase().includes(normalized))
}

export function clinicCodePrefix(shortId?: string) {
  return sanitizeTokenSegment(shortId ?? '', {
    lowerCase: false,
    trimUnderscores: false,
  }).replace(/[^a-z0-9]/gi, '').toUpperCase()
}

export function numericFromId(id: string) {
  const input = (id || '').trim()
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 1000000
  }
  return String(hash).padStart(6, '0')
}

export function buildEntityCode(prefix: string, id: string, shortId?: string) {
  const normalizedShortId = shortId?.trim()
  if (normalizedShortId) return normalizedShortId
  return `${prefix}${numericFromId(id)}`
}
