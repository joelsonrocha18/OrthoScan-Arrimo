import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initMonitoring } from './lib/monitoring'

const MONITORING_ENABLED = Boolean((import.meta.env.VITE_MONITORING_WEBHOOK_URL as string | undefined)?.trim())

if (MONITORING_ENABLED) {
  initMonitoring()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
