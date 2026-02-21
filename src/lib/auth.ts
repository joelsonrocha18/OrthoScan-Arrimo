import { loadDb } from '../data/db'
import type { User, Role } from '../types/User'
import { DATA_MODE } from '../data/dataMode'
import type { SessionUser } from '../auth/session'

export const SESSION_USER_KEY = 'arrimo_session_user_id'
export const SESSION_PROFILE_KEY = 'arrimo_session_profile'
export const SESSION_SUPABASE_ACCESS_TOKEN_KEY = 'arrimo_supabase_access_token'

function readSession(key: string) {
  const sessionValue = sessionStorage.getItem(key)
  if (sessionValue !== null) return sessionValue
  const legacyValue = localStorage.getItem(key)
  if (legacyValue !== null) {
    sessionStorage.setItem(key, legacyValue)
    localStorage.removeItem(key)
  }
  return legacyValue
}

export function getSessionUserId() {
  return readSession(SESSION_USER_KEY)
}

export function setSessionUserId(userId: string) {
  sessionStorage.setItem(SESSION_USER_KEY, userId)
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_USER_KEY)
  sessionStorage.removeItem(SESSION_PROFILE_KEY)
  sessionStorage.removeItem(SESSION_SUPABASE_ACCESS_TOKEN_KEY)
  localStorage.removeItem(SESSION_USER_KEY)
  localStorage.removeItem(SESSION_PROFILE_KEY)
  localStorage.removeItem(SESSION_SUPABASE_ACCESS_TOKEN_KEY)
}

export function setSessionProfile(profile: SessionUser) {
  sessionStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(profile))
}

export function setSupabaseAccessToken(token: string) {
  if (!token) return
  sessionStorage.setItem(SESSION_SUPABASE_ACCESS_TOKEN_KEY, token)
}

export function getSupabaseAccessToken() {
  return readSession(SESSION_SUPABASE_ACCESS_TOKEN_KEY)
}

export function getSessionProfile(): SessionUser | null {
  const raw = readSession(SESSION_PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function getCurrentUser(dbOverride?: { users: User[] }) {
  if (DATA_MODE === 'supabase') {
    const profile = getSessionProfile()
    if (!profile) return null
    return {
      id: profile.id,
      name: profile.email ?? '',
      email: profile.email ?? '',
      role: profile.role as Role,
      linkedClinicId: profile.clinicId,
      linkedDentistId: profile.dentistId,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    }
  }
  const userId = getSessionUserId()
  if (!userId) return null
  const db = dbOverride ?? loadDb()
  const user = db.users.find((item) => item.id === userId) ?? null
  if (!user || user.deletedAt || !user.isActive) return null
  return user
}

export function isAuthenticated() {
  return Boolean(getCurrentUser())
}
