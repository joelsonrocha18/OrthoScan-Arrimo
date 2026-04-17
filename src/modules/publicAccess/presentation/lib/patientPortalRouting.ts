const PATIENT_PORTAL_ROUTE = '/acesso/pacientes/portal'
const PATIENT_PORTAL_SESSION_KEY = 'orthoscan.patient-portal-session'

export type PatientPortalRouteSession = {
  token: string
  accessCode?: string
}

function normalizeRouteSession(input: Partial<PatientPortalRouteSession> | null | undefined) {
  const token = String(input?.token ?? '').trim()
  const accessCode = String(input?.accessCode ?? '').trim()
  if (!token) return null
  return {
    token,
    accessCode: accessCode || undefined,
  } satisfies PatientPortalRouteSession
}

export function extractPatientPortalRouteSessionFromSearchParams(searchParams: URLSearchParams) {
  return normalizeRouteSession({
    token: searchParams.get('token') ?? '',
    accessCode: searchParams.get('accessCode') ?? searchParams.get('caseCode') ?? '',
  })
}

export function extractPatientPortalRouteSessionFromUrl(portalUrl: string, currentOrigin?: string) {
  const trimmed = portalUrl.trim()
  if (!trimmed) return null

  try {
    const origin = currentOrigin ?? (typeof window !== 'undefined' ? window.location.origin : undefined)
    const parsed = origin ? new URL(trimmed, origin) : new URL(trimmed)
    return extractPatientPortalRouteSessionFromSearchParams(parsed.searchParams)
  } catch {
    return null
  }
}

export function persistPatientPortalRouteSession(session: PatientPortalRouteSession) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(PATIENT_PORTAL_SESSION_KEY, JSON.stringify(session))
}

export function readPatientPortalRouteSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(PATIENT_PORTAL_SESSION_KEY)
    if (!raw) return null
    return normalizeRouteSession(JSON.parse(raw) as Partial<PatientPortalRouteSession>)
  } catch {
    return null
  }
}

export function clearPatientPortalRouteSession() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(PATIENT_PORTAL_SESSION_KEY)
}

export function resolvePatientPortalNavigationTarget(portalUrl: string, currentOrigin?: string) {
  const trimmed = portalUrl.trim()
  if (!trimmed) return PATIENT_PORTAL_ROUTE

  try {
    const origin = currentOrigin ?? (typeof window !== 'undefined' ? window.location.origin : undefined)
    const parsed = origin ? new URL(trimmed, origin) : new URL(trimmed)

    if (origin && parsed.origin === origin) {
      if (parsed.pathname === PATIENT_PORTAL_ROUTE) {
        return PATIENT_PORTAL_ROUTE
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }

    return parsed.toString()
  } catch {
    return trimmed
  }
}
