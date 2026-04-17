import type { Result } from '../../../../shared/errors'
import type { RepositoryPort } from '../../../../shared/infra'
import type { MaybePromise } from '../../../../shared/types'
import type { Case } from '../../../../types/Case'
import type { LabFinancialImpact, LabProductionChecklist } from '../../../../types/Domain'
import type { LabOrder, LabOrderArch, LabOrderPriority, LabOrderStage } from '../../domain/entities/LabOrder'

export type LabPatientOption = {
  id: string
  shortId?: string
  name: string
  birthDate?: string
  dentistId?: string
  clinicId?: string
  dentistName?: string
  clinicName?: string
}

export type LabCasePrintFallback = {
  clinicName?: string
  dentistName?: string
  requesterName?: string
  patientBirthDate?: string
}

export type LabOverview = {
  items: LabOrder[]
  cases: Case[]
  patientOptions: LabPatientOption[]
  dentists: Array<{ id: string; name: string; gender?: 'masculino' | 'feminino' }>
  clinics: Array<{ id: string; tradeName: string }>
  casePrintFallbackByCaseId: Record<string, LabCasePrintFallback>
}

export type RegisterLabOrderInput = {
  caseId?: string
  productType?: LabOrder['productType']
  productId?: LabOrder['productId']
  patientId?: string
  dentistId?: string
  clinicId?: string
  requestedProductId?: string
  requestedProductLabel?: string
  requestCode?: string
  requestKind?: LabOrder['requestKind']
  expectedReplacementDate?: string
  arch: LabOrderArch
  reworkOfCaseId?: string
  reworkOfLabOrderId?: string
  reworkOfTrayNumber?: number
  financialImpact?: LabFinancialImpact
  plannedUpperQty?: number
  plannedLowerQty?: number
  patientName: string
  trayNumber: number
  plannedDate?: string
  dueDate: string
  status: LabOrderStage
  priority: LabOrderPriority
  notes?: string
}

export type UpdateLabOrderInput = Partial<{
  caseId: string
  productType: LabOrder['productType']
  productId: LabOrder['productId']
  patientId: string
  dentistId: string
  clinicId: string
  arch: LabOrderArch
  plannedUpperQty: number
  plannedLowerQty: number
  patientName: string
  trayNumber: number
  plannedDate: string
  dueDate: string
  priority: LabOrderPriority
  notes: string
  status: LabOrderStage
  deliveredToProfessionalAt: string
  productionChecklist: LabProductionChecklist
}>

export type CreateAdvanceLabOrderInput = {
  sourceLabItemId: string
  plannedUpperQty: number
  plannedLowerQty: number
  dueDate?: string
}

export type RegisterShipmentInput = {
  labOrderId: string
  deliveredToDoctorAt: string
  note?: string
  upperQty: number
  lowerQty: number
}

export type RegisterShipmentOutput = {
  order: LabOrder
  deliveredUpperQty: number
  deliveredLowerQty: number
}

export type RegisterReworkInput = {
  caseId: string
  trayNumber: number
  arch: LabOrderArch
  reason: string
}

export type RegisterReworkOutput = {
  caseId: string
  trayNumber: number
  createdReworkOrder?: LabOrder
  createdProductionOrder?: LabOrder
  financialImpact?: LabFinancialImpact
}

export type UpdateLabStageInput = {
  id: string
  nextStage: LabOrderStage
}

export interface LabRepository extends RepositoryPort<LabOrder, string> {
  loadOverview(): MaybePromise<Result<LabOverview, string>>
  listOrders(): MaybePromise<Result<LabOrder[], string>>
  createOrder(input: RegisterLabOrderInput): MaybePromise<Result<{ order: LabOrder; syncMessage?: string }, string>>
  updateOrder(id: string, input: UpdateLabOrderInput): MaybePromise<Result<{ order: LabOrder; syncMessage?: string }, string>>
  moveOrderToStage(input: UpdateLabStageInput): MaybePromise<Result<{ order: LabOrder; syncMessage?: string }, string>>
  deleteOrder(id: string): MaybePromise<Result<null, string>>
  createAdvanceOrder(input: CreateAdvanceLabOrderInput): MaybePromise<Result<{ order: LabOrder; syncMessage?: string }, string>>
  registerShipment(input: RegisterShipmentInput): MaybePromise<Result<RegisterShipmentOutput, string>>
  registerRework(input: RegisterReworkInput): MaybePromise<Result<RegisterReworkOutput, string>>
}
