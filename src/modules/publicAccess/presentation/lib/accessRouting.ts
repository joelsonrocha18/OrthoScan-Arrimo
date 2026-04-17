import type { SessionUser } from '../../../../auth/session'

const dentistPortalRoles = new Set(['dentist_admin', 'dentist_client', 'clinic_client'])

export function resolvePostLoginRoute(audience: 'internal' | 'dentists', session: SessionUser | null) {
  if (!session) {
    return audience === 'dentists' ? '/acesso/dentistas' : '/login'
  }

  if (audience === 'dentists' && dentistPortalRoles.has(session.role)) {
    return '/app/portal-dentista'
  }

  return '/app/dashboard'
}
