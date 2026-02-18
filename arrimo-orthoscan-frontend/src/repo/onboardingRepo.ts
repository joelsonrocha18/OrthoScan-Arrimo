import { supabase } from '../lib/supabaseClient'
import type { Role } from '../types/User'

function normalizeInviteErrorMessage(raw: string) {
  const text = (raw || '').toLowerCase()
  if (text.includes('duplicate') || text.includes('already exists') || text.includes('já existe')) {
    return 'Já existe cadastro com os dados informados.'
  }
  if (text.includes('permission') || text.includes('unauthorized') || text.includes('forbidden')) {
    return 'Sem permissão para gerar convite. Faça login novamente como admin master.'
  }
  if (text.includes('invalid jwt') || text.includes('sessao') || text.includes('session')) {
    return 'Sessão expirada. Saia e entre novamente.'
  }
  return raw || 'Falha ao gerar convite.'
}

async function extractFunctionErrorMessage(error: unknown) {
  const defaultMessage = (error as { message?: string } | null)?.message ?? 'Falha ao processar solicitação.'
  const response = (error as { context?: { text?: () => Promise<string> } } | null)?.context
  if (!response?.text) return normalizeInviteErrorMessage(defaultMessage)
  try {
    const body = await response.text()
    if (!body) return normalizeInviteErrorMessage(defaultMessage)
    try {
      const parsed = JSON.parse(body) as { error?: string; message?: string }
      return normalizeInviteErrorMessage(parsed.error ?? parsed.message ?? body)
    } catch {
      return normalizeInviteErrorMessage(body)
    }
  } catch {
    return normalizeInviteErrorMessage(defaultMessage)
  }
}

export async function createOnboardingInvite(payload: {
  fullName: string
  cpf?: string
  phone?: string
  role: Role
  clinicId: string
  dentistId?: string
}) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }

  // In production, Edge Functions that change data require the user's JWT (not the anon key).
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) return { ok: false as const, error: sessionError.message }
  const accessToken = sessionData.session?.access_token
  if (!accessToken) return { ok: false as const, error: 'Sessao expirada. Saia e entre novamente.' }
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!anonKey) return { ok: false as const, error: 'Supabase anon key ausente no build.' }

  const { data, error } = await supabase.functions.invoke('create-onboarding-invite', {
    body: payload,
    // Functions gateway rejects ES256 auth JWT as "Invalid JWT" when used as Authorization.
    // Send anon in Authorization and pass the real user JWT via `x-user-jwt`.
    headers: { Authorization: `Bearer ${anonKey}`, 'x-user-jwt': accessToken },
  })
  if (error) {
    const message = await extractFunctionErrorMessage(error)
    return { ok: false as const, error: message }
  }
  return {
    ok: true as const,
    inviteId: data?.inviteId as string | undefined,
    inviteLink: data?.inviteLink as string | undefined,
  }
}

export async function validateOnboardingInvite(token: string) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!anonKey) return { ok: false as const, error: 'Supabase anon key ausente no build.' }
  const { data, error } = await supabase.functions.invoke('validate-onboarding-invite', {
    body: { token },
    // Force anon auth so this works even if a user is currently logged in (ES256 session JWT breaks gateway auth).
    headers: { Authorization: `Bearer ${anonKey}` },
  })
  if (error) return { ok: false as const, error: error.message, expired: false, used: false }
  if (!data?.ok) {
    return {
      ok: false as const,
      error: (data?.error as string | undefined) ?? 'Convite invalido.',
      expired: Boolean(data?.expired),
      used: Boolean(data?.used),
    }
  }
  return {
    ok: true as const,
    preview: data.preview as { fullName: string; roleLabel: string; clinicName: string },
  }
}

export async function completeOnboardingInvite(payload: { token: string; email: string; password: string }) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!anonKey) return { ok: false as const, error: 'Supabase anon key ausente no build.' }
  const { data, error } = await supabase.functions.invoke('complete-onboarding-invite', {
    body: payload,
    headers: { Authorization: `Bearer ${anonKey}` },
  })
  if (error) return { ok: false as const, error: error.message }
  if (!data?.ok) {
    return { ok: false as const, error: (data?.error as string | undefined) ?? 'Falha ao concluir cadastro.' }
  }
  return { ok: true as const }
}
