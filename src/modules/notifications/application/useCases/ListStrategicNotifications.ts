import type { Case } from '../../../../types/Case'
import type { Patient } from '../../../../types/Patient'
import type { Scan } from '../../../../types/Scan'
import type { LabOrder } from '../../../lab/domain/entities/LabOrder'
import type { StrategicNotification } from '../../domain/services/StrategicNotificationsService'
import { StrategicNotificationsService } from '../../domain/services/StrategicNotificationsService'

export type ListStrategicNotificationsInput = {
  cases: Case[]
  patients?: Patient[]
  scans: Scan[]
  labOrders: LabOrder[]
  todayIso?: string
}

export class ListStrategicNotificationsUseCase {
  execute(input: ListStrategicNotificationsInput): StrategicNotification[] {
    return StrategicNotificationsService.derive(input)
  }
}
