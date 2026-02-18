import { supabase } from '../lib/supabaseClient'

export type InternalChatMessage = {
  id: string
  sender_user_id: string
  sender_name: string
  body: string
  created_at: string
}

export async function listInternalChatMessages(limit = 80) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.', data: [] as InternalChatMessage[] }
  const { data, error } = await supabase
    .from('internal_chat_messages')
    .select('id, sender_user_id, sender_name, body, created_at')
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) return { ok: false as const, error: error.message, data: [] as InternalChatMessage[] }
  return { ok: true as const, data: (data ?? []) as InternalChatMessage[] }
}

export async function sendInternalChatMessage(payload: { senderUserId: string; senderName: string; body: string }) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { error } = await supabase.from('internal_chat_messages').insert({
    sender_user_id: payload.senderUserId,
    sender_name: payload.senderName,
    body: payload.body,
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}
