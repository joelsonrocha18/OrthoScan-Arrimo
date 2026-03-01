import { describe, expect, it } from 'vitest'
import { isDailyQuotaExceeded, isRateLimited } from '../../ai/usage'

describe('ai limits', () => {
  it('applies user/clinic rate limit', () => {
    expect(
      isRateLimited({
        userRequestsLastMinute: 5,
        clinicRequestsLastMinute: 3,
        userLimit: 5,
        clinicLimit: 10,
      }),
    ).toBe(true)
    expect(
      isRateLimited({
        userRequestsLastMinute: 2,
        clinicRequestsLastMinute: 3,
        userLimit: 5,
        clinicLimit: 10,
      }),
    ).toBe(false)
  })

  it('checks daily quota by cost', () => {
    expect(isDailyQuotaExceeded({ dailyCostUsed: 10, dailyCostLimit: 10 })).toBe(true)
    expect(isDailyQuotaExceeded({ dailyCostUsed: 6, dailyCostLimit: 10 })).toBe(false)
  })
})
