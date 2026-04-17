import type { BrowserPushSubscriptionJSON, PushPermissionState } from './types'

export const WEB_PUSH_TARGET_PATH = '/dashboard/agendamentos'

export function isWebPushSupported() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export function getBrowserPushPermission(): PushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

export function urlBase64ToUint8Array(base64Value: string) {
  const padding = '='.repeat((4 - (base64Value.length % 4)) % 4)
  const normalized = (base64Value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(normalized)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

export function serializePushSubscription(subscription: PushSubscription): BrowserPushSubscriptionJSON {
  const json = subscription.toJSON() as PushSubscriptionJSON

  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? json.expirationTime ?? null,
    keys: {
      auth: json.keys?.auth,
      p256dh: json.keys?.p256dh,
    },
  }
}
