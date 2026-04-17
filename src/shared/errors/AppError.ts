export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_STATE'
  | 'INFRA_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'UNKNOWN_ERROR'

export type AppErrorDetails = Record<string, unknown>

export type AppErrorInput = {
  message: string
  code?: AppErrorCode
  details?: AppErrorDetails
  cause?: unknown
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly details?: AppErrorDetails
  override readonly cause?: unknown

  constructor(input: AppErrorInput) {
    super(input.message)
    this.name = 'AppError'
    this.code = input.code ?? 'UNKNOWN_ERROR'
    this.details = input.details
    this.cause = input.cause
  }
}

export function createAppError(input: AppErrorInput) {
  return new AppError(input)
}

export function createValidationError(message: string, details?: AppErrorDetails) {
  return createAppError({ code: 'VALIDATION_ERROR', message, details })
}

export function createNotFoundError(message: string, details?: AppErrorDetails) {
  return createAppError({ code: 'NOT_FOUND', message, details })
}

export function createConflictError(message: string, details?: AppErrorDetails) {
  return createAppError({ code: 'CONFLICT', message, details })
}

export function createUnauthorizedError(message: string, details?: AppErrorDetails) {
  return createAppError({ code: 'UNAUTHORIZED', message, details })
}

export function createForbiddenError(message: string, details?: AppErrorDetails) {
  return createAppError({ code: 'FORBIDDEN', message, details })
}

export function createInvalidStateError(message: string, details?: AppErrorDetails) {
  return createAppError({ code: 'INVALID_STATE', message, details })
}

export function createInfraError(message: string, cause?: unknown, details?: AppErrorDetails) {
  return createAppError({ code: 'INFRA_ERROR', message, cause, details })
}

export function createExternalServiceError(message: string, cause?: unknown, details?: AppErrorDetails) {
  return createAppError({ code: 'EXTERNAL_SERVICE_ERROR', message, cause, details })
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function toAppError(
  error: unknown,
  fallbackMessage = 'Erro inesperado.',
  fallbackCode: AppErrorCode = 'UNKNOWN_ERROR',
) {
  if (isAppError(error)) {
    return error
  }
  if (error instanceof Error) {
    return createAppError({
      code: fallbackCode,
      message: error.message || fallbackMessage,
      cause: error,
    })
  }
  if (typeof error === 'string' && error.trim()) {
    return createAppError({
      code: fallbackCode,
      message: error.trim(),
    })
  }
  return createAppError({
    code: fallbackCode,
    message: fallbackMessage,
    details: error && typeof error === 'object' ? (error as AppErrorDetails) : undefined,
  })
}

export function getErrorMessage(error: unknown, fallbackMessage = 'Erro inesperado.') {
  return toAppError(error, fallbackMessage).message
}
