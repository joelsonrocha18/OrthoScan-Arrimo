import type { AuthProvider, SessionUser } from './session'
import { supabase } from '../lib/supabaseClient'
import { setSessionProfile, clearSession, setSupabaseAccessToken } from '../lib/auth'
import { getProfileByUserId } from '../repo/profileRepo'

export const authSupabase: AuthProvider = {
  async getCurrentUser(): Promise<SessionUser | null> {
    if (!supabase) return null
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData.session?.access_token) {
      setSupabaseAccessToken(sessionData.session.access_token)
    }
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) return null
    const profile = await getProfileByUserId(data.user.id)
    const session = {
      id: data.user.id,
      email: data.user.email ?? undefined,
      role: profile?.role ?? 'dentist_client',
      clinicId: profile?.clinic_id ?? undefined,
      dentistId: profile?.dentist_id ?? undefined,
    }
    setSessionProfile(session)
    return session
  },
  async signIn(email: string, password: string) {
    if (!supabase) throw new Error('Supabase nao configurado.')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.session?.access_token) {
      setSupabaseAccessToken(data.session.access_token)
    }
  },
  async signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    clearSession()
  },
}
