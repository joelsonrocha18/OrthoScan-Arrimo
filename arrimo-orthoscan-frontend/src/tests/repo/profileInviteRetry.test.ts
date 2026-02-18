import { beforeEach, describe, expect, it, vi } from 'vitest'

const refreshSessionMock = vi.fn()

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      refreshSession: refreshSessionMock,
    },
  },
}))

describe('inviteUser refresh retry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon_key')
  })

  it('retries once after unauthorized and succeeds with refreshed token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ ok: false, code: 'unauthorized', error: 'Invalid JWT' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, invitedEmail: 'novo@exemplo.com' }),
      })
    vi.stubGlobal('fetch', fetchMock)

    refreshSessionMock.mockResolvedValue({
      data: { session: { access_token: 'new_token' } },
      error: null,
    })

    const { inviteUser } = await import('../../repo/profileRepo')

    const result = await inviteUser({
      email: 'novo@exemplo.com',
      role: 'receptionist',
      clinicId: 'clinic_1',
      accessToken: 'old_token',
    })

    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const firstCallHeaders = fetchMock.mock.calls[0][1]?.headers as Record<string, string>
    const secondCallHeaders = fetchMock.mock.calls[1][1]?.headers as Record<string, string>
    expect(firstCallHeaders.Authorization).toBe('Bearer anon_key')
    expect(secondCallHeaders.Authorization).toBe('Bearer anon_key')
    expect(firstCallHeaders['x-user-jwt']).toBe('old_token')
    expect(secondCallHeaders['x-user-jwt']).toBe('new_token')
  })
})
