import { supabase } from '../lib/supabaseClient'

export type ProfileRecord = {
  user_id: string
  login_email?: string | null
  role: string
  clinic_id: string | null
  dentist_id: string | null
  full_name: string | null
  cpf: string | null
  phone: string | null
  onboarding_completed_at: string | null
  is_active: boolean
  deleted_at: string | null
  created_at?: string
  updated_at?: string
}

export async function getProfileByUserId(userId: string) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, login_email, role, clinic_id, dentist_id, full_name, cpf, phone, onboarding_completed_at, is_active, deleted_at, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return null
  return data as ProfileRecord | null
}

export async function listProfiles(options?: { includeDeleted?: boolean }) {
  if (!supabase) return []
  let query = supabase
    .from('profiles')
    .select('user_id, login_email, role, clinic_id, dentist_id, full_name, cpf, phone, onboarding_completed_at, is_active, deleted_at, created_at, updated_at')
  if (!options?.includeDeleted) {
    query = query.is('deleted_at', null)
  }
  const { data, error } = await query
  if (error) return []
  return (data ?? []) as ProfileRecord[]
}

export async function setProfileActive(userId: string, isActive: boolean) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

export async function softDeleteProfile(userId: string) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString(), is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

export async function restoreProfile(userId: string) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: null, is_active: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

export async function inviteUser(payload: {
  email: string
  role: string
  clinicId: string
  dentistId?: string
  fullName?: string
}) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: payload,
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, data }
}
