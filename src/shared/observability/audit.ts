import { nowIsoDateTime } from '../utils/date'
import { createEntityId } from '../utils/id'
import type { AuditLog } from '../../types/Audit'
import { sanitizeForLog } from './sanitize'
import { readAuditActor } from './session'
import type { AuditActor } from './types'

export type CreateAuditLogInput = Omit<AuditLog, 'id' | 'at' | 'userId' | 'userName' | 'userEmail' | 'userRole'> & {
  actor?: AuditActor
}

export function buildAuditLog(input: CreateAuditLogInput): AuditLog {
  const actor = input.actor ?? readAuditActor()

  return {
    id: createEntityId('audit'),
    at: nowIsoDateTime(),
    entity: input.entity,
    entityId: input.entityId,
    action: input.action,
    message: input.message,
    context: sanitizeForLog(input.context ?? {}) as Record<string, unknown>,
    userId: actor.userId,
    userName: actor.userName,
    userEmail: actor.userEmail,
    userRole: actor.userRole,
  }
}
