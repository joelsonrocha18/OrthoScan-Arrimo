export const SESSION_USER_KEY = 'arrimo_session_user_id'
export const SESSION_PROFILE_KEY = 'arrimo_session_profile'
export const SESSION_SUPABASE_ACCESS_TOKEN_KEY = 'arrimo_supabase_access_token'
export const SUPABASE_SESSION_STORAGE_KEY = 'orthoscan.supabase.auth.session'

const LEGACY_SUPABASE_AUTH_TOKEN_PATTERN = /^sb-[\w-]+-auth-token$/

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function readSessionStorageValue(key: string) {
  return getSessionStorage()?.getItem(key) ?? null
}

export function createSessionStorageAdapter(): StorageLike | undefined {
  const storage = getSessionStorage()
  if (!storage) return undefined
  return {
    getItem: (key: string) => storage.getItem(key),
    setItem: (key: string, value: string) => storage.setItem(key, value),
    removeItem: (key: string) => storage.removeItem(key),
  }
}

export function clearLegacyPersistentAuthStorage() {
  const storage = getLocalStorage()
  if (!storage) return

  storage.removeItem(SESSION_USER_KEY)
  storage.removeItem(SESSION_PROFILE_KEY)
  storage.removeItem(SESSION_SUPABASE_ACCESS_TOKEN_KEY)

  const legacySupabaseKeys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key && LEGACY_SUPABASE_AUTH_TOKEN_PATTERN.test(key)) {
      legacySupabaseKeys.push(key)
    }
  }

  legacySupabaseKeys.forEach((key) => storage.removeItem(key))
}
