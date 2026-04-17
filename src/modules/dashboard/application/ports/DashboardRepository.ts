import type { Result } from '../../../../shared/errors'
import type { MaybePromise } from '../../../../shared/types'
import type { Case } from '../../../../types/Case'
import type { Patient } from '../../../../types/Patient'
import type { Scan } from '../../../../types/Scan'
import type { LabOrder } from '../../../lab/domain/entities/LabOrder'

export type ExecutiveDashboardSnapshot = {
  cases: Case[]
  patients: Patient[]
  scans: Scan[]
  labOrders: LabOrder[]
}

export interface DashboardRepository {
  loadSnapshot(): MaybePromise<Result<ExecutiveDashboardSnapshot, string>>
}
