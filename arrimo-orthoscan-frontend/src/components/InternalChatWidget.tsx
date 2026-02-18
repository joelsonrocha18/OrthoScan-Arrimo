import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Send, Users } from 'lucide-react'
import { profileLabel } from '../auth/permissions'
import { listCasesForUser } from '../auth/scope'
import { useDb } from '../lib/useDb'
import { getCurrentUser } from '../lib/auth'
import { DATA_MODE } from '../data/dataMode'
import { supabase } from '../lib/supabaseClient'
import {
  listInternalChatMessages,
  listInternalChatUnreadCounts,
  markInternalChatRoomRead,
  sendInternalChatMessage,
  type InternalChatMessage,
} from '../repo/internalChatRepo'
import type { Role } from '../types/User'

type PresenceEntry = {
  userId: string
  name: string
  role: string
  onlineAt: string
}

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(new Date(value))
  } catch {
    return value
  }
}

export default function InternalChatWidget() {
  const { db } = useDb()
  const currentUser = getCurrentUser(db)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<InternalChatMessage[]>([])
  const [selectedRoom, setSelectedRoom] = useState('global')
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [presence, setPresence] = useState<Record<string, PresenceEntry>>({})
  const listRef = useRef<HTMLDivElement | null>(null)

  const isSupabaseMode = DATA_MODE === 'supabase' && Boolean(supabase)
  const displayName = (currentUser?.name ?? currentUser?.email ?? '').trim() || 'Usuario'
  const myUserId = currentUser?.id ?? ''
  const cases = useMemo(() => listCasesForUser(db, currentUser), [db, currentUser])
  const rooms = useMemo(() => {
    const caseRooms = cases
      .filter((item) => item.treatmentCode)
      .slice(0, 10)
      .map((item) => ({
        key: `case:${item.id}`,
        label: item.treatmentCode!,
      }))
    return [{ key: 'global', label: 'Geral' }, ...caseRooms]
  }, [cases])

  useEffect(() => {
    if (!open || !listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, open])

  useEffect(() => {
    if (!rooms.some((item) => item.key === selectedRoom)) {
      setSelectedRoom('global')
    }
  }, [rooms, selectedRoom])

  const selectedRoomMeta = useMemo(
    () => rooms.find((item) => item.key === selectedRoom) ?? { key: 'global', label: 'Geral' },
    [rooms, selectedRoom],
  )

  const beepNewMessage = () => {
    try {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.value = 0.03
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start()
      setTimeout(() => {
        oscillator.stop()
        void ctx.close()
      }, 90)
    } catch {
      // no-op
    }
  }

  useEffect(() => {
    const sb = supabase
    if (!isSupabaseMode || !currentUser || !sb) return

    let isMounted = true
    setLoading(true)
    setError(null)
    void listInternalChatMessages(selectedRoomMeta.key).then(async (result) => {
      if (!isMounted) return
      if (!result.ok) {
        setError(result.error)
      } else {
        setMessages(result.data)
        const lastMessageDate = result.data[result.data.length - 1]?.created_at
        if (open) {
          await markInternalChatRoomRead({ userId: currentUser.id, roomKey: selectedRoomMeta.key, readAt: lastMessageDate })
          setUnreadCounts((current) => ({ ...current, [selectedRoomMeta.key]: 0 }))
        }
      }
      setLoading(false)
    })
    return () => {
      isMounted = false
    }
  }, [currentUser, isSupabaseMode, open, selectedRoomMeta.key])

  useEffect(() => {
    const sb = supabase
    if (!isSupabaseMode || !currentUser || !sb) return

    let isMounted = true
    void listInternalChatUnreadCounts({ userId: currentUser.id, roomKeys: rooms.map((item) => item.key) }).then((result) => {
      if (!isMounted || !result.ok) return
      setUnreadCounts(result.data)
    })

    const messagesChannel = sb
      .channel('internal-chat-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'internal_chat_messages' },
        (payload) => {
          const row = payload.new as InternalChatMessage
          const roomKey = row.room_key || 'global'
          const isMine = row.sender_user_id === currentUser.id
          const isCurrentRoom = roomKey === selectedRoomMeta.key
          if (isCurrentRoom) {
            setMessages((current) => [...current, row].slice(-200))
          }
          if (!isMine && (!open || !isCurrentRoom || document.visibilityState !== 'visible')) {
            setUnreadCounts((current) => ({ ...current, [roomKey]: (current[roomKey] ?? 0) + 1 }))
            beepNewMessage()
          } else if (open && isCurrentRoom) {
            void markInternalChatRoomRead({ userId: currentUser.id, roomKey, readAt: row.created_at })
            setUnreadCounts((current) => ({ ...current, [roomKey]: 0 }))
          }
        },
      )
      .subscribe()

    const presenceChannel = sb.channel('internal-online-presence', { config: { presence: { key: currentUser.id } } })
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<PresenceEntry>()
        const next: Record<string, PresenceEntry> = {}
        Object.entries(state).forEach(([key, values]) => {
          const entry = values?.[0]
          if (entry) {
            next[key] = {
              userId: entry.userId || key,
              name: entry.name || 'Usuario',
              role: entry.role || 'receptionist',
              onlineAt: entry.onlineAt || new Date().toISOString(),
            }
          }
        })
        setPresence(next)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId: currentUser.id,
            name: displayName,
            role: currentUser.role,
            onlineAt: new Date().toISOString(),
          })
        }
      })

    return () => {
      isMounted = false
      void sb.removeChannel(messagesChannel)
      void sb.removeChannel(presenceChannel)
    }
  }, [currentUser, displayName, isSupabaseMode, open, rooms, selectedRoomMeta.key])

  const onlineUsers = useMemo(() => Object.values(presence).sort((a, b) => a.name.localeCompare(b.name)), [presence])
  const totalUnread = useMemo(() => Object.values(unreadCounts).reduce((sum, value) => sum + value, 0), [unreadCounts])

  const handleSend = async () => {
    const body = message.trim()
    if (!body || !currentUser) return
    setError(null)
    const result = await sendInternalChatMessage({
      senderUserId: currentUser.id,
      senderName: displayName,
      body,
      roomKey: selectedRoomMeta.key,
      roomLabel: selectedRoomMeta.label,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage('')
  }

  if (!isSupabaseMode || !currentUser) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-brand-600"
      >
        <MessageCircle className="h-4 w-4" />
        Chat interno
        {totalUnread > 0 ? <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] leading-none">{totalUnread}</span> : null}
      </button>
      {open ? (
        <div className="fixed bottom-20 right-5 z-40 w-[420px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Chat interno</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <Users className="h-3.5 w-3.5" />
              {onlineUsers.length} online
            </p>
          </div>
          <div className="max-h-20 overflow-x-auto border-b border-slate-200 px-3 py-2">
            <div className="flex min-w-max gap-2">
              {rooms.map((room) => {
                const active = room.key === selectedRoomMeta.key
                const unread = unreadCounts[room.key] ?? 0
                return (
                  <button
                    key={room.key}
                    type="button"
                    onClick={() => {
                      setSelectedRoom(room.key)
                      setUnreadCounts((current) => ({ ...current, [room.key]: 0 }))
                      if (currentUser) {
                        void markInternalChatRoomRead({ userId: currentUser.id, roomKey: room.key })
                      }
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    {room.label}
                    {unread > 0 ? <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-white text-brand-600' : 'bg-red-500 text-white'}`}>{unread}</span> : null}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="max-h-20 overflow-y-auto border-b border-slate-200 px-4 py-2">
            <div className="flex flex-wrap gap-2">
              {onlineUsers.map((user) => (
                <span key={user.userId} className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-700">
                  {user.name} ({profileLabel(user.role as Role)})
                </span>
              ))}
            </div>
          </div>
          <div ref={listRef} className="max-h-64 min-h-44 space-y-2 overflow-y-auto px-4 py-3">
            {loading ? <p className="text-xs text-slate-500">Carregando mensagens...</p> : null}
            {!loading && messages.length === 0 ? <p className="text-xs text-slate-500">Sem mensagens ainda.</p> : null}
            {messages.map((item) => {
              const mine = item.sender_user_id === myUserId
              return (
                <div key={item.id} className={`max-w-[85%] rounded-lg px-3 py-2 ${mine ? 'ml-auto bg-brand-500 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  <p className={`text-[11px] font-semibold ${mine ? 'text-white/90' : 'text-slate-600'}`}>{item.sender_name}</p>
                  <p className="mt-1 text-sm">{item.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? 'text-white/80' : 'text-slate-500'}`}>{formatDateTime(item.created_at)}</p>
                </div>
              )
            })}
          </div>
          <div className="border-t border-slate-200 px-3 py-3">
            <div className="flex items-center gap-2">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handleSend()
                  }
                }}
                placeholder={`Mensagem em ${selectedRoomMeta.label}...`}
                className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white hover:bg-brand-600"
                aria-label="Enviar mensagem"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
