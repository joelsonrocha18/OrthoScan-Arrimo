import { buildAuditLog, type AuditActor } from '../shared/observability'
import type { AuditLog } from '../types/Audit'
import type { AppDb } from './db'

export function pushAudit(
  db: AppDb,
  payload: Omit<AuditLog, 'id' | 'at' | 'userId' | 'userName' | 'userEmail' | 'userRole'> & { actor?: AuditActor },
) {
  const entry = buildAuditLog(payload)
  db.auditLogs = [entry, ...(db.auditLogs ?? [])].slice(0, 2000)
}
