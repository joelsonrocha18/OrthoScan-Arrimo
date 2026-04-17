export type PushPermissionState = NotificationPermission | 'unsupported'

export type PushNotificationPayload = {
  title?: string
  body?: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  renotify?: boolean
  requireInteraction?: boolean
  data?: Record<string, unknown>
}

export type BrowserPushSubscriptionJSON = {
  endpoint: string
  expirationTime: number | null
  keys: {
    p256dh?: string
    auth?: string
  }
}

export type UserPushSubscriptionRecord = {
  user_id: string
  endpoint: string
  subscription: BrowserPushSubscriptionJSON
  p256dh_key?: string | null
  auth_key?: string | null
  user_agent?: string | null
  last_seen_at: string
  disabled_at?: string | null
}

export type NotificationBridgeMessage =
  | {
      type: 'arrimo.push.received'
      payload: PushNotificationPayload
    }
  | {
      type: 'arrimo.push.subscriptionchange'
    }

export type SubscribeUserResult =
  | { ok: true }
  | {
      ok: false
      error: string
    }
