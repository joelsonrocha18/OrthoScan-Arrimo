import { useEffect, useState } from 'react'
import { loadSystemSettings, SYSTEM_SETTINGS_CHANGED_EVENT, type SystemSettings } from './systemSettings'

type AiModule = keyof SystemSettings['aiGateway']['modules']

function readModuleEnabled(module: AiModule) {
  const ai = loadSystemSettings().aiGateway
  return ai.enabled && ai.modules[module] !== false
}

export function useAiModuleEnabled(module: AiModule) {
  const [enabled, setEnabled] = useState(() => readModuleEnabled(module))

  useEffect(() => {
    const refresh = () => setEnabled(readModuleEnabled(module))
    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener(SYSTEM_SETTINGS_CHANGED_EVENT, refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener(SYSTEM_SETTINGS_CHANGED_EVENT, refresh)
    }
  }, [module])

  return enabled
}
