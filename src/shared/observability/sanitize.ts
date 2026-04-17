const REDACTED = '[REDACTED]'

const SENSITIVE_KEYS = [
  'password',
  'senha',
  'token',
  'secret',
  'authorization',
  'apiKey',
  'apikey',
  'cpf',
  'phone',
  'whatsapp',
  'email',
  'cookie',
  'session',
]

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/
const JWT_PATTERN = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/

function shouldRedactKey(key?: string) {
  if (!key) return false
  const normalized = key.trim().toLowerCase()
  return SENSITIVE_KEYS.some((candidate) => normalized.includes(candidate.toLowerCase()))
}

function sanitizeString(value: string, key?: string) {
  if (shouldRedactKey(key)) {
    return REDACTED
  }

  const trimmed = value.trim()
  if (!trimmed) return value
  if (EMAIL_PATTERN.test(trimmed)) return REDACTED
  if (CPF_PATTERN.test(trimmed)) return REDACTED
  if (/^Bearer\s+/i.test(trimmed)) return REDACTED
  if (JWT_PATTERN.test(trimmed)) return REDACTED
  if (/^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) return REDACTED
  return value
}

function sanitizeObject(value: Record<string, unknown>, seen: WeakSet<object>) {
  if (seen.has(value)) {
    return '[Circular]'
  }
  seen.add(value)

  const sanitizedEntries = Object.entries(value).map(([key, entryValue]) => [
    key,
    shouldRedactKey(key) ? REDACTED : sanitizeInternal(entryValue, key, seen),
  ])
  return Object.fromEntries(sanitizedEntries)
}

function sanitizeInternal(value: unknown, key: string | undefined, seen: WeakSet<object>): unknown {
  if (value == null) return value
  if (typeof value === 'string') return sanitizeString(value, key)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map((entry) => sanitizeInternal(entry, key, seen))
  if (typeof value === 'object') return sanitizeObject(value as Record<string, unknown>, seen)
  return String(value)
}

export function sanitizeForLog<T>(value: T): T {
  return sanitizeInternal(value, undefined, new WeakSet<object>()) as T
}
