import type { AppDb } from './db'
import type { AuditLog } from '../types/Audit'

const SESSION_USER_KEY = 'arrimo_session_user_id'
const SESSION_PROFILE_KEY = 'arrimo_session_profile'

type SessionProfile = {
  id?: string
  email?: string
}

function readActor() {
  const userId = sessionStorage.getItem(SESSION_USER_KEY) ?? localStorage.getItem(SESSION_USER_KEY) ?? undefined
  const rawProfile = sessionStorage.getItem(SESSION_PROFILE_KEY) ?? localStorage.getItem(SESSION_PROFILE_KEY)
  if (!rawProfile) return { userId }
  try {
    const profile = JSON.parse(rawProfile) as SessionProfile
    return {
      userId: profile.id ?? userId,
      userEmail: profile.email,
      userName: profile.email,
    }
  } catch {
    return { userId }
  }
}

export function pushAudit(
  db: AppDb,
  payload: Omit<AuditLog, 'id' | 'at' | 'userId' | 'userName' | 'userEmail'>,
) {
  const actor = readActor()
  const entry: AuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    entity: payload.entity,
    entityId: payload.entityId,
    action: payload.action,
    message: payload.message,
    userId: actor.userId,
    userName: actor.userName,
    userEmail: actor.userEmail,
  }
  db.auditLogs = [entry, ...(db.auditLogs ?? [])].slice(0, 2000)
}
