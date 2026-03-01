export function isRateLimited(params: {
  userRequestsLastMinute: number
  clinicRequestsLastMinute: number
  userLimit: number
  clinicLimit: number
}) {
  return params.userRequestsLastMinute >= params.userLimit || params.clinicRequestsLastMinute >= params.clinicLimit
}

export function isDailyQuotaExceeded(params: {
  dailyCostUsed: number
  dailyCostLimit: number
}) {
  return params.dailyCostUsed >= params.dailyCostLimit
}
