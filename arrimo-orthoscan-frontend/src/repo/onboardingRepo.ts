import { supabase } from '../lib/supabaseClient'
import type { Role } from '../types/User'

export async function createOnboardingInvite(payload: {
  fullName: string
  cpf?: string
  phone?: string
  role: Role
  clinicId: string
  dentistId?: string
}) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { data, error } = await supabase.functions.invoke('create-onboarding-invite', {
    body: payload,
  })
  if (error) return { ok: false as const, error: error.message }
  return {
    ok: true as const,
    inviteId: data?.inviteId as string | undefined,
    inviteLink: data?.inviteLink as string | undefined,
  }
}

export async function validateOnboardingInvite(token: string) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { data, error } = await supabase.functions.invoke('validate-onboarding-invite', {
    body: { token },
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
  const { data, error } = await supabase.functions.invoke('complete-onboarding-invite', {
    body: payload,
  })
  if (error) return { ok: false as const, error: error.message }
  if (!data?.ok) {
    return { ok: false as const, error: (data?.error as string | undefined) ?? 'Falha ao concluir cadastro.' }
  }
  return { ok: true as const }
}

