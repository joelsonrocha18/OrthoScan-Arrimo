import { createForbiddenError, createUnauthorizedError } from '../shared/errors'
import type { User } from '../types/User'
import { can, type Permission } from './permissions'

type PolicyUser = Pick<User, 'id' | 'role'> | null | undefined

export function assertAuthenticated(user: PolicyUser, context = 'esta ação') {
  if (!user?.id) {
    throw createUnauthorizedError(`Sessão inválida para ${context}.`)
  }
  return user
}

export function assertPermission(user: PolicyUser, permission: Permission, context = 'esta ação') {
  const actor = assertAuthenticated(user, context)
  if (!can(actor as User, permission)) {
    throw createForbiddenError(`Sem permissao para ${context}.`, {
      permission,
      actorRole: actor.role,
    })
  }
  return actor
}
