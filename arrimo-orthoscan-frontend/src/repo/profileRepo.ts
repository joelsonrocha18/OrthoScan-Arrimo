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

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<ProfileRecord, 'full_name' | 'cpf' | 'phone' | 'role' | 'clinic_id' | 'dentist_id' | 'is_active'>>,
) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
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
  password?: string
  cpf?: string
  phone?: string
  accessToken: string
}) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const accessToken = payload.accessToken?.trim()
  if (!accessToken) return { ok: false as const, error: 'Sessao expirada. Saia e entre novamente.' }
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!anonKey) return { ok: false as const, error: 'Supabase anon key ausente no build.' }
  if (!supabaseUrl) return { ok: false as const, error: 'Supabase URL ausente no build.' }

  const requestBody = {
    email: payload.email,
    role: payload.role,
    clinicId: payload.clinicId,
    dentistId: payload.dentistId,
    fullName: payload.fullName,
    password: payload.password,
    cpf: payload.cpf,
    phone: payload.phone,
  }
  const callInvite = async (token: string) => {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anonKey}`,
        'x-user-jwt': token,
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify(requestBody),
    })
    const raw = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; code?: string; message?: string } | null
    return { response, raw }
  }

  let first = await callInvite(accessToken)
  const firstMessage = (first.raw?.error ?? first.raw?.message ?? '').toLowerCase()
  const shouldRetry =
    first.response.status === 401 ||
    first.response.status === 403 ||
    firstMessage.includes('invalid jwt')

  if (shouldRetry) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
    const refreshedToken = refreshed.session?.access_token ?? ''
    if (!refreshError && refreshedToken) {
      first = await callInvite(refreshedToken)
    }
  }

  if (!first.response.ok || (first.raw && first.raw.ok === false)) {
    const code = first.raw?.code
      ?? (first.response.status === 401 ? 'unauthorized' : first.response.status === 403 ? 'forbidden' : 'invite_failed')
    const detailed = first.raw?.error ?? first.raw?.message ?? `Falha ao criar usuario (HTTP ${first.response.status}).`
    return { ok: false as const, error: detailed, code }
  }
  return { ok: true as const, data: first.raw }
}
