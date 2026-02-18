import { supabase } from '../lib/supabaseClient'

export type InternalChatMessage = {
  id: string
  sender_user_id: string
  sender_name: string
  body: string
  room_key: string
  room_label: string
  created_at: string
}

export async function listInternalChatMessages(roomKey: string, limit = 80) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.', data: [] as InternalChatMessage[] }
  const { data, error } = await supabase
    .from('internal_chat_messages')
    .select('id, sender_user_id, sender_name, body, room_key, room_label, created_at')
    .eq('room_key', roomKey)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) return { ok: false as const, error: error.message, data: [] as InternalChatMessage[] }
  return { ok: true as const, data: (data ?? []) as InternalChatMessage[] }
}

export async function sendInternalChatMessage(payload: { senderUserId: string; senderName: string; body: string; roomKey: string; roomLabel: string }) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { error } = await supabase.from('internal_chat_messages').insert({
    sender_user_id: payload.senderUserId,
    sender_name: payload.senderName,
    body: payload.body,
    room_key: payload.roomKey,
    room_label: payload.roomLabel,
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

export async function markInternalChatRoomRead(payload: { userId: string; roomKey: string; readAt?: string }) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const timestamp = payload.readAt ?? new Date().toISOString()
  const { error } = await supabase.from('internal_chat_reads').upsert({
    user_id: payload.userId,
    room_key: payload.roomKey,
    last_read_at: timestamp,
    updated_at: timestamp,
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

export async function listInternalChatUnreadCounts(payload: { userId: string; roomKeys: string[] }) {
  const sb = supabase
  if (!sb) return { ok: false as const, error: 'Supabase nao configurado.', data: {} as Record<string, number> }
  const uniqueKeys = Array.from(new Set(payload.roomKeys.filter(Boolean)))
  if (uniqueKeys.length === 0) return { ok: true as const, data: {} as Record<string, number> }

  const { data: reads, error: readsError } = await sb
    .from('internal_chat_reads')
    .select('room_key, last_read_at')
    .eq('user_id', payload.userId)
    .in('room_key', uniqueKeys)
  if (readsError) return { ok: false as const, error: readsError.message, data: {} as Record<string, number> }

  const readMap = new Map((reads ?? []).map((item) => [item.room_key as string, (item.last_read_at as string) ?? '1970-01-01T00:00:00.000Z']))
  const counts: Record<string, number> = {}

  await Promise.all(
    uniqueKeys.map(async (roomKey) => {
      const lastReadAt = readMap.get(roomKey) ?? '1970-01-01T00:00:00.000Z'
      const { count } = await sb
        .from('internal_chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('room_key', roomKey)
        .gt('created_at', lastReadAt)
        .neq('sender_user_id', payload.userId)
      counts[roomKey] = count ?? 0
    }),
  )

  return { ok: true as const, data: counts }
}
