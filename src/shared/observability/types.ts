export type ObservabilityCategory = 'technical' | 'business'

export type ObservabilityLevel = 'info' | 'warn' | 'error'

export type ObservabilityContext = Record<string, unknown>

export type ObservabilityActor = {
  id?: string
  role?: string
  clinicId?: string
  dentistId?: string
}

export type AuditActor = {
  userId?: string
  userName?: string
  userEmail?: string
  userRole?: string
}

export type StructuredLogError = {
  name?: string
  code?: string
  message: string
  details?: Record<string, unknown>
  stack?: string
}

export type StructuredLogRecord = {
  ts: string
  level: ObservabilityLevel
  category: ObservabilityCategory
  event: string
  message: string
  env?: string
  release?: string
  actor?: ObservabilityActor
  context: ObservabilityContext
  error?: StructuredLogError
}
