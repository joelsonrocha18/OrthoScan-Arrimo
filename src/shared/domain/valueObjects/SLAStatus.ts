import type { SLAStatusValue } from '../../../types/Domain'

export const SLA_STATUS_VALUES: SLAStatusValue[] = ['on_track', 'warning', 'overdue']

export class SLAStatus {
  readonly value: SLAStatusValue

  private constructor(value: SLAStatusValue) {
    this.value = value
  }

  static create(value: SLAStatusValue) {
    return new SLAStatus(value)
  }

  static fromMetrics(remainingHours: number, thresholdHours = 8) {
    if (remainingHours < 0) return new SLAStatus('overdue')
    if (remainingHours <= thresholdHours) return new SLAStatus('warning')
    return new SLAStatus('on_track')
  }

  equals(other: SLAStatus | SLAStatusValue) {
    return this.value === (other instanceof SLAStatus ? other.value : other)
  }

  isWarning() {
    return this.value === 'warning'
  }

  isOverdue() {
    return this.value === 'overdue'
  }
}
