import { describe, expect, it } from 'vitest'
import { can } from '../../auth/permissions'
import type { User } from '../../types/User'

function makeUser(role: User['role']): User {
  return {
    id: 'u1',
    name: 'Teste',
    email: 'teste@local',
    role,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('ai permissions', () => {
  it('allows lab_tech only for ai.lab', () => {
    const user = makeUser('lab_tech')
    expect(can(user, 'ai.lab')).toBe(true)
    expect(can(user, 'ai.gestao')).toBe(false)
  })

  it('allows clinic_client for ai.clinica and ai.comercial', () => {
    const user = makeUser('clinic_client')
    expect(can(user, 'ai.clinica')).toBe(true)
    expect(can(user, 'ai.comercial')).toBe(true)
  })
})
