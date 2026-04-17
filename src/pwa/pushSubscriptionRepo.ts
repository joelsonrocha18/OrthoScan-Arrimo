import { DATA_MODE } from '../data/dataMode'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabaseClient'
import { serializePushSubscription } from './pushUtils'
import type { SubscribeUserResult, UserPushSubscriptionRecord } from './types'

const USER_PUSH_SUBSCRIPTIONS_TABLE = 'user_push_subscriptions'

async function getAuthenticatedUserId() {
  if (DATA_MODE !== 'supabase' || !supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user?.id) return null
  return data.user.id
}

export async function upsertCurrentUserPushSubscription(subscription: PushSubscription): Promise<SubscribeUserResult> {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return { ok: false, error: 'Sessão Supabase não encontrada para registrar notificações.' }
  }
  if (!supabase) {
    return { ok: false, error: 'Supabase não configurado para notificações push.' }
  }

  const serialized = serializePushSubscription(subscription)
  const payload: UserPushSubscriptionRecord = {
    user_id: userId,
    endpoint: serialized.endpoint,
    subscription: serialized,
    auth_key: serialized.keys.auth ?? null,
    p256dh_key: serialized.keys.p256dh ?? null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    last_seen_at: new Date().toISOString(),
    disabled_at: null,
  }

  const { error } = await supabase
    .from(USER_PUSH_SUBSCRIPTIONS_TABLE)
    .upsert(payload, { onConflict: 'endpoint' })

  if (error) {
    logger.error('Falha ao persistir subscription de push.', { flow: 'pwa.push.upsert', userId }, error)
    return { ok: false, error: error.message }
  }

  logger.info('Inscrição de push vinculada ao usuário autenticado.', {
    flow: 'pwa.push.upsert',
    userId,
    endpoint: serialized.endpoint,
  })
  return { ok: true }
}

export async function removeCurrentUserPushSubscription(subscription: PushSubscription | null | undefined): Promise<SubscribeUserResult> {
  if (!subscription) return { ok: true }
  if (!supabase || DATA_MODE !== 'supabase') return { ok: true }

  const userId = await getAuthenticatedUserId()
  if (!userId) return { ok: true }

  const { error } = await supabase
    .from(USER_PUSH_SUBSCRIPTIONS_TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', subscription.endpoint)

  if (error) {
    logger.error('Falha ao remover subscription de push do usuário.', {
      flow: 'pwa.push.delete',
      userId,
      endpoint: subscription.endpoint,
    }, error)
    return { ok: false, error: error.message }
  }

  logger.info('Inscrição de push removida do usuário autenticado.', {
    flow: 'pwa.push.delete',
    userId,
    endpoint: subscription.endpoint,
  })
  return { ok: true }
}

export async function getCurrentBrowserPushSubscription() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.ready.catch(() => null)
  if (!registration) return null
  return registration.pushManager.getSubscription()
}

export async function clearCurrentPushSubscription(): Promise<SubscribeUserResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: true }
  }

  const subscription = await getCurrentBrowserPushSubscription()
  if (!subscription) return { ok: true }

  const removal = await removeCurrentUserPushSubscription(subscription)
  const unsubscribed = await subscription.unsubscribe().catch((error: unknown) => {
    logger.warn('Falha ao invalidar subscription local do navegador.', {
      flow: 'pwa.push.unsubscribe_browser',
      endpoint: subscription.endpoint,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  })

  if (!removal.ok) return removal

  logger.info('Inscrição de push invalidada no logout.', {
    flow: 'pwa.push.unsubscribe_browser',
    endpoint: subscription.endpoint,
    unsubscribed,
  })
  return { ok: true }
}
