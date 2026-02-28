import { DATA_MODE } from '../data/dataMode'
import { authLocal } from './authLocal'
import { authSupabase } from './authSupabase'
import type { AuthProvider } from './session'

export function getAuthProvider(): AuthProvider {
  if (DATA_MODE !== 'supabase') return authLocal
  return authSupabase
}
