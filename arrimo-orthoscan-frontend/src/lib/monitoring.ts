type MonitoringEvent = {
  type: 'error' | 'unhandledrejection'
  message: string
  stack?: string
  url: string
  userAgent: string
  release?: string
  ts: string
}

const webhookUrl = (import.meta.env.VITE_MONITORING_WEBHOOK_URL as string | undefined)?.trim()
const release = (import.meta.env.VITE_RELEASE as string | undefined)?.trim()

function sendMonitoringEvent(event: MonitoringEvent) {
  if (!webhookUrl) return
  void fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {
    // Avoid throwing from the monitoring path.
  })
}

export function initMonitoring() {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    const payload: MonitoringEvent = {
      type: 'error',
      message: event.message || 'Unknown error',
      stack: event.error?.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      release,
      ts: new Date().toISOString(),
    }
    sendMonitoringEvent(payload)
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const payload: MonitoringEvent = {
      type: 'unhandledrejection',
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
      release,
      ts: new Date().toISOString(),
    }
    sendMonitoringEvent(payload)
  })
}

