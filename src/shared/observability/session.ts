import type { AuditActor, ObservabilityActor } from './types'
import { SESSION_PROFILE_KEY, SESSION_USER_KEY, readSessionStorageValue } from '../../lib/authStorage'

type SessionProfile = {
  id?: string
  email?: string
  role?: string
  clinicId?: string
  dentistId?: string
  name?: string
  fullName?: string
}

function readStorageValue(key: string) {
  if (typeof window === 'undefined') return null
  return readSessionStorageValue(key)
}

function readSessionProfile(): SessionProfile | null {
  const raw = readStorageValue(SESSION_PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionProfile
  } catch {
    return null
  }
}

export function readObservabilityActor(): ObservabilityActor | undefined {
  const userId = readStorageValue(SESSION_USER_KEY) ?? undefined
  const profile = readSessionProfile()
  const actor: ObservabilityActor = {
    id: profile?.id ?? userId,
    role: profile?.role,
    clinicId: profile?.clinicId,
    dentistId: profile?.dentistId,
  }
  return Object.values(actor).some(Boolean) ? actor : undefined
}

export function readAuditActor(): AuditActor {
  const userId = readStorageValue(SESSION_USER_KEY) ?? undefined
  const profile = readSessionProfile()
  return {
    userId: profile?.id ?? userId,
    userName: profile?.fullName ?? profile?.name ?? profile?.email,
    userEmail: profile?.email,
    userRole: profile?.role,
  }
}
