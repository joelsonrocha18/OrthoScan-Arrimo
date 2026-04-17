import type { ProductType } from './Product'
import type {
  LabFinancialImpact,
  LabProductionChecklist,
  LabStageSLASnapshot,
  LabStageTimelineRecord,
  LabStageValue,
  OrthoDomainEvent,
} from './Domain'

export type LabStatus = 'aguardando_iniciar' | 'em_producao' | 'controle_qualidade' | 'prontas'

export type LabPriority = 'Baixo' | 'Medio' | 'Urgente'

export type LabItem = {
  id: string
  productType?: ProductType
  productId?: ProductType
  requestedProductId?: string
  requestedProductLabel?: string
  patientId?: string
  dentistId?: string
  clinicId?: string
  requestCode?: string
  requestKind?: 'producao' | 'reconfeccao' | 'reposicao_programada'
  expectedReplacementDate?: string
  deliveredToProfessionalAt?: string
  caseId?: string
  arch: 'superior' | 'inferior' | 'ambos'
  plannedUpperQty?: number
  plannedLowerQty?: number
  planningDefinedAt?: string
  trayNumber: number
  patientName: string
  plannedDate: string
  dueDate: string
  status: LabStatus
  stage?: LabStageValue
  stageTimeline?: LabStageTimelineRecord[]
  sla?: LabStageSLASnapshot
  productionChecklist?: LabProductionChecklist
  reworkOfCaseId?: string
  reworkOfLabOrderId?: string
  reworkOfTrayNumber?: number
  financialImpact?: LabFinancialImpact
  domainEvents?: OrthoDomainEvent[]
  priority: LabPriority
  notes?: string
  createdAt: string
  updatedAt: string
}
