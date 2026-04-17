import type { Result } from '../../../../shared/errors'
import type { MaybePromise } from '../../../../shared/types'
import type { Case } from '../../../../types/Case'
import type { PatientDocument } from '../../../../types/PatientDocument'
import type { LabOrder } from '../../../lab/domain/entities/LabOrder'

export type DentistPortalSnapshot = {
  cases: Case[]
  labOrders: LabOrder[]
  documents: PatientDocument[]
}

export interface DentistPortalRepository {
  loadSnapshot(): MaybePromise<Result<DentistPortalSnapshot, string>>
}
