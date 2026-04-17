import { registerSW } from 'virtual:pwa-register'
import { logger } from '../lib/logger'

let registrationStarted = false
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null

export function ensureServiceWorkerRegistered() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve<ServiceWorkerRegistration | null>(null)
  }

  if (!registrationStarted) {
    registrationStarted = true
    registerSW({
      immediate: true,
      onRegisterError(error) {
        logger.error('Falha ao registrar o service worker PWA.', { flow: 'pwa.register_sw' }, error)
      },
    })

    registrationPromise = navigator.serviceWorker.ready
      .then((registration) => registration)
      .catch((error) => {
        logger.error('Falha ao aguardar o service worker PWA.', { flow: 'pwa.await_sw' }, error)
        return null
      })
  }

  return registrationPromise ?? Promise.resolve<ServiceWorkerRegistration | null>(null)
}
