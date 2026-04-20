import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

const INTERNAL_ENTRY_PATH = '/app'
const DEFAULT_INTERNAL_ROUTE = '/app/dashboard'
const LAST_INTERNAL_ROUTE_KEY = 'orthoscan:last-internal-route'

function isValidInternalTarget(value: string | null): value is string {
  return Boolean(value && value !== INTERNAL_ENTRY_PATH && value.startsWith(`${INTERNAL_ENTRY_PATH}/`))
}

function readStoredInternalRoute() {
  try {
    const stored = window.sessionStorage.getItem(LAST_INTERNAL_ROUTE_KEY)
    return isValidInternalTarget(stored) ? stored : DEFAULT_INTERNAL_ROUTE
  } catch {
    return DEFAULT_INTERNAL_ROUTE
  }
}

export function InternalAppEntryRedirect() {
  return <Navigate to={readStoredInternalRoute()} replace />
}

export default function InternalRouteUrlMask() {
  const location = useLocation()

  useEffect(() => {
    if (window.location.protocol === 'file:') return
    if (!isValidInternalTarget(location.pathname)) return

    const internalTarget = `${location.pathname}${location.search}${location.hash}`
    try {
      window.sessionStorage.setItem(LAST_INTERNAL_ROUTE_KEY, internalTarget)
    } catch {
      // Sem sessionStorage, a URL unica ainda funciona; apenas nao retomamos a ultima tela no refresh.
    }

    if (window.location.pathname !== INTERNAL_ENTRY_PATH || window.location.search || window.location.hash) {
      window.history.replaceState(window.history.state, '', INTERNAL_ENTRY_PATH)
    }
  }, [location.hash, location.pathname, location.search])

  return null
}
