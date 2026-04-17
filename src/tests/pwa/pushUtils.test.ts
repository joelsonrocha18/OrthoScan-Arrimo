import { describe, expect, it } from 'vitest'
import { getBrowserPushPermission, serializePushSubscription, urlBase64ToUint8Array } from '../../pwa/pushUtils'

describe('pushUtils', () => {
  it('converts a VAPID public key into Uint8Array', () => {
    const bytes = urlBase64ToUint8Array('SGVsbG8')
    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111])
  })

  it('serializes push subscription payloads consistently', () => {
    const subscription = {
      endpoint: 'https://push.example/subscription-id',
      expirationTime: null,
      toJSON: () => ({
        endpoint: 'https://push.example/subscription-id',
        expirationTime: null,
        keys: {
          auth: 'auth-key',
          p256dh: 'p256dh-key',
        },
      }),
    } as unknown as PushSubscription

    expect(serializePushSubscription(subscription)).toEqual({
      endpoint: 'https://push.example/subscription-id',
      expirationTime: null,
      keys: {
        auth: 'auth-key',
        p256dh: 'p256dh-key',
      },
    })
  })

  it('falls back to unsupported permission when Notification is unavailable', () => {
    const originalNotification = globalThis.Notification

    Reflect.deleteProperty(globalThis, 'Notification')
    expect(getBrowserPushPermission()).toBe('unsupported')

    Object.defineProperty(globalThis, 'Notification', {
      value: originalNotification,
      configurable: true,
      writable: true,
    })
  })
})
