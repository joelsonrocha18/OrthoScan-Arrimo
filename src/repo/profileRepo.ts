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
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('user_id')
  if (error) return { ok: false as const, error: error.message }
  if (!data || data.length === 0) {
    return { ok: false as const, error: 'Perfil nao atualizado. Verifique permissoes para editar este usuario.' }
  }
  return { ok: true as const }
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export async function updateScanStatusSupabase(scanId: string, status: 'aprovado' | 'reprovado') {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { data: current, error: readError } = await supabase
    .from('scans')
    .select('id, data')
    .eq('id', scanId)
    .maybeSingle()
  if (readError || !current) return { ok: false as const, error: readError?.message ?? 'Scan nao encontrado.' }
  const nextData = { ...asObject(current.data), status }
  const { data, error } = await supabase
    .from('scans')
    .update({ data: nextData, updated_at: new Date().toISOString() })
    .eq('id', scanId)
    .select('id')
  if (error) return { ok: false as const, error: error.message }
  if (!data || data.length === 0) return { ok: false as const, error: 'Scan nao atualizado. Verifique permissoes.' }
  return { ok: true as const }
}

export async function deleteScanSupabase(scanId: string) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('scans')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', scanId)
    .select('id')
  if (error) return { ok: false as const, error: error.message }
  if (!data || data.length === 0) return { ok: false as const, error: 'Scan nao excluido. Verifique permissoes.' }
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

  const requestBodyBase = {
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
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anonKey}`,
          'x-user-jwt': token,
          'Content-Type': 'application/json',
          apikey: anonKey,
        },
        body: JSON.stringify({ ...requestBodyBase, userJwt: token }),
      })
      const raw = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; code?: string; message?: string } | null
      return { response, raw, networkError: '' }
    } catch (error) {
      return {
        response: null,
        raw: null,
        networkError: error instanceof Error ? error.message : String(error),
      }
    }
  }

  let first = await callInvite(accessToken)
  if (!first.response) {
    return {
      ok: false as const,
      error: `Falha de rede/CORS ao chamar invite-user. Verifique ALLOWED_ORIGIN e tente novamente. Detalhe: ${first.networkError}`,
      code: 'network_error',
    }
  }
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
  if (!first.response) {
    return {
      ok: false as const,
      error: `Falha de rede/CORS ao chamar invite-user. Verifique ALLOWED_ORIGIN e tente novamente. Detalhe: ${first.networkError}`,
      code: 'network_error',
    }
  }

  if (!first.response.ok || (first.raw && first.raw.ok === false)) {
    const normalizedMessage = (first.raw?.error ?? first.raw?.message ?? '').toLowerCase()
    const code = first.raw?.code
      ?? (normalizedMessage.includes('invalid jwt') ? 'unauthorized' : undefined)
      ?? (first.response.status === 401 ? 'unauthorized' : first.response.status === 403 ? 'forbidden' : 'invite_failed')
    const detailed = first.raw?.error ?? first.raw?.message ?? `Falha ao criar usuario (HTTP ${first.response.status}).`
    return { ok: false as const, error: detailed, code }
  }
  return { ok: true as const, data: first.raw }
}
