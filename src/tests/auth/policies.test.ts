import { describe, expect, it } from 'vitest'
import { AppError } from '../../shared/errors'
import { assertAuthenticated, assertPermission } from '../../auth/policies'

describe('authorization policies', () => {
  it('requires authenticated actors', () => {
    expect(() => assertAuthenticated(null, 'testar politica')).toThrow(AppError)
  })

  it('rejects forbidden actions with structured errors', () => {
    const receptionist = {
      id: 'user_1',
      role: 'receptionist',
    } as const
    expect(() => assertPermission(receptionist as never, 'lab.write', 'editar laboratorio')).toThrow(AppError)
  })
})
