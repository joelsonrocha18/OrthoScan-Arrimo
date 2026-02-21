import { authSupabase } from './authSupabase'
import type { AuthProvider } from './session'

export function getAuthProvider(): AuthProvider {
  return authSupabase
}
