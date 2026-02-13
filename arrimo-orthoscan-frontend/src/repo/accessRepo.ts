import { supabase } from '../lib/supabaseClient'

export async function sendAccessEmail(payload: { email: string; fullName?: string }) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { data, error } = await supabase.functions.invoke('send-access-email', { body: payload })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, data }
}

export async function requestPasswordReset(payload: { email: string }) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { data, error } = await supabase.functions.invoke('request-password-reset', { body: payload })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, data }
}

export async function completePasswordReset(payload: { token: string; newPassword: string }) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { data, error } = await supabase.functions.invoke('complete-password-reset', { body: payload })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, data }
}
