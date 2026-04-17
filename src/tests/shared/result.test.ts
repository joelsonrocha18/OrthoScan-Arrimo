import { describe, expect, it } from 'vitest'
import { err, isErr, isOk, mapErrorResult, mapResult, ok } from '../../shared/errors'

describe('shared result helpers', () => {
  it('maps success and error results', () => {
    const success = mapResult(ok(2), (value) => value * 3)
    const failure = mapErrorResult(err('falha'), (error) => error.toUpperCase())

    expect(isOk(success)).toBe(true)
    expect(success).toEqual({ ok: true, data: 6 })
    expect(isErr(failure)).toBe(true)
    expect(failure).toEqual({ ok: false, error: 'FALHA' })
  })
})
