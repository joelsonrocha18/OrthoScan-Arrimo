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

function isDiscordWebhook(url: string) {
  return /discord\.com\/api\/webhooks\//i.test(url)
}

function buildDiscordPayload(event: MonitoringEvent) {
  const title = event.type === 'error' ? 'Erro capturado' : 'Promise rejeitada'
  const lines = [
    `OrthoScan Monitor - ${title}`,
    `Mensagem: ${event.message}`,
    `URL: ${event.url}`,
    `Release: ${event.release ?? 'n/a'}`,
    `Timestamp: ${event.ts}`,
  ]
  return {
    content: lines.join('\n'),
  }
}

function sendMonitoringEvent(event: MonitoringEvent) {
  if (!webhookUrl) return
  const payload = isDiscordWebhook(webhookUrl) ? buildDiscordPayload(event) : event
  void fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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
