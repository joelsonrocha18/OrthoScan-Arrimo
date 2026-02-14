import { useCallback, useEffect, useState } from 'react'
import { DB_KEY, loadDb } from '../data/db'
import { onDbChanged } from './events'

export function useDb() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const off = onDbChanged(() => {
      setTick((current) => current + 1)
    })
    const onStorage = (event: StorageEvent) => {
      if (event.key === DB_KEY) {
        setTick((current) => current + 1)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      off()
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const db = loadDb()

  const refresh = useCallback(() => {
    setTick((current) => current + 1)
  }, [])

  return { db, refresh }
}
