import { describe, expect, it } from 'vitest'
import { resolvePostLoginRoute } from '../../../modules/publicAccess/presentation/lib/accessRouting'
import {
  clearPatientPortalRouteSession,
  extractPatientPortalRouteSessionFromUrl,
  persistPatientPortalRouteSession,
  readPatientPortalRouteSession,
  resolvePatientPortalNavigationTarget,
} from '../../../modules/publicAccess/presentation/lib/patientPortalRouting'

describe('public access routing', () => {
  it('stores the patient portal route session separately from the url', () => {
    clearPatientPortalRouteSession()

    const routeSession = extractPatientPortalRouteSessionFromUrl(
      'https://ortho-scan.vercel.app/acesso/pacientes/portal?token=abc&accessCode=ORTH-00028',
      'https://ortho-scan.vercel.app',
    )

    expect(routeSession).toEqual({ token: 'abc', accessCode: 'ORTH-00028' })
    if (!routeSession) return

    persistPatientPortalRouteSession(routeSession)
    expect(readPatientPortalRouteSession()).toEqual({ token: 'abc', accessCode: 'ORTH-00028' })
  })

  it('sends dentist profiles to the dentist portal', () => {
    expect(resolvePostLoginRoute('dentists', { id: '1', role: 'dentist_admin' })).toBe('/app/portal-dentista')
    expect(resolvePostLoginRoute('dentists', { id: '2', role: 'dentist_client' })).toBe('/app/portal-dentista')
    expect(resolvePostLoginRoute('dentists', { id: '3', role: 'clinic_client' })).toBe('/app/portal-dentista')
  })

  it('falls back to dashboard for internal profiles', () => {
    expect(resolvePostLoginRoute('dentists', { id: '4', role: 'master_admin' })).toBe('/app/dashboard')
    expect(resolvePostLoginRoute('internal', { id: '5', role: 'lab_tech' })).toBe('/app/dashboard')
  })

  it('returns the correct public login when there is no session', () => {
    expect(resolvePostLoginRoute('dentists', null)).toBe('/acesso/dentistas')
    expect(resolvePostLoginRoute('internal', null)).toBe('/login')
  })

  it('normalizes same-origin patient portal urls to internal app routes', () => {
    expect(
      resolvePatientPortalNavigationTarget(
        'https://ortho-scan.vercel.app/acesso/pacientes/portal?token=abc&accessCode=ORTH-00028',
        'https://ortho-scan.vercel.app',
      ),
    ).toBe('/acesso/pacientes/portal')
  })
})
