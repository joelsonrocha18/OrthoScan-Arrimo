import type { AppError } from './AppError'

export type Ok<T> = {
  ok: true
  data: T
}

export type Err<E> = {
  ok: false
  error: E
}

export type Result<T, E = AppError> = Ok<T> | Err<E>

export type AsyncResult<T, E = AppError> = Promise<Result<T, E>>

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data }
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error }
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok
}

export function mapResult<T, U, E>(result: Result<T, E>, mapper: (data: T) => U): Result<U, E> {
  if (!result.ok) {
    return result
  }
  return ok(mapper(result.data))
}

export function mapErrorResult<T, E, U>(result: Result<T, E>, mapper: (error: E) => U): Result<T, U> {
  if (result.ok) {
    return result
  }
  return err(mapper(result.error))
}
