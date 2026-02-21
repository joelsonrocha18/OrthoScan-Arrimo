type LogLevel = 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

type LoggerPayload = {
  message: string
  context?: LogContext
  error?: unknown
}

type SessionProfile = {
  id?: string
  email?: string
  role?: string
  clinicId?: string
  dentistId?: string
}

const SESSION_PROFILE_KEY = 'arrimo_session_profile'

function readSessionProfile(): SessionProfile | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(SESSION_PROFILE_KEY) ?? localStorage.getItem(SESSION_PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionProfile
  } catch {
    return null
  }
}

function normalizeError(error?: unknown) {
  if (!error) return null
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack }
  }
  return { message: String(error) }
}

function toRecord(level: LogLevel, payload: LoggerPayload) {
  const normalizedError = normalizeError(payload.error)
  const fallbackStack = normalizedError?.stack ?? new Error().stack
  return {
    level,
    message: payload.message,
    ts: new Date().toISOString(),
    release: (import.meta.env.VITE_RELEASE as string | undefined) ?? undefined,
    env: import.meta.env.MODE,
    user: readSessionProfile(),
    context: payload.context ?? {},
    error: normalizedError,
    stack: fallbackStack,
  }
}

function emit(level: LogLevel, payload: LoggerPayload) {
  const record = toRecord(level, payload)
  if (level === 'error') {
    console.error('[logger]', record)
    return
  }
  if (level === 'warn') {
    console.warn('[logger]', record)
    return
  }
  if (import.meta.env.DEV) {
    console.info('[logger]', record)
  }
}

export const logger = {
  info(message: string, context?: LogContext) {
    emit('info', { message, context })
  },
  warn(message: string, context?: LogContext) {
    emit('warn', { message, context })
  },
  error(message: string, context?: LogContext, error?: unknown) {
    emit('error', { message, context, error })
  },
}

