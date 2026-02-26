import { useEffect, useState } from 'react'

export function useSupabaseSyncTick(intervalMs = 15000) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const bump = () => setTick((current) => current + 1)
    const onFocus = () => bump()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') bump()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') bump()
    }, Math.max(5000, intervalMs))

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(interval)
    }
  }, [intervalMs])

  return tick
}

