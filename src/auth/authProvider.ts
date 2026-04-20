import { DATA_MODE } from '../data/dataMode'
import type { AuthProvider } from './session'

let providerPromise: Promise<AuthProvider> | null = null

async function loadAuthProvider(): Promise<AuthProvider> {
  if (!providerPromise) {
    providerPromise = DATA_MODE === 'supabase'
      ? import('./authSupabase').then((module) => module.authSupabase)
      : import('./authLocal').then((module) => module.authLocal)
  }
  return providerPromise
}

export function getAuthProvider(): AuthProvider {
  return {
    async getCurrentUser() {
      return (await loadAuthProvider()).getCurrentUser()
    },
    async signIn(email, password) {
      return (await loadAuthProvider()).signIn(email, password)
    },
    async signOut() {
      return (await loadAuthProvider()).signOut()
    },
  }
}
