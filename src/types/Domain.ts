export type CaseLifecycleStatusValue =
  | 'scan_received'
  | 'scan_approved'
  | 'case_created'
  | 'in_production'
  | 'qc'
  | 'shipped'
  | 'delivered'
  | 'in_use'
  | 'rework'

export type LabStageValue =
  | 'queued'
  | 'in_production'
  | 'qc'
  | 'shipped'
  | 'delivered'
  | 'rework'

export type SLAStatusValue = 'on_track' | 'warning' | 'overdue'

export type OrthoDomainEventName =
  | 'CaseCreated'
  | 'CaseApproved'
  | 'LabStarted'
  | 'LabShipped'
  | 'CaseDelivered'

export type CasePlanningVersionStatusValue = 'draft' | 'submitted' | 'approved'

export type CasePlanningVersionSnapshot = {
  totalTrays: number
  totalTraysUpper?: number
  totalTraysLower?: number
  changeEveryDays: number
  attachmentBondingTray?: boolean
  planningNote?: string
  arch?: 'superior' | 'inferior' | 'ambos'
}

export type CasePlanningVersion = {
  id: string
  versionNumber: number
  label: string
  status: CasePlanningVersionStatusValue
  createdAt: string
  createdById?: string
  createdByName?: string
  note?: string
  snapshot: CasePlanningVersionSnapshot
  approvedAt?: string
  approvedById?: string
  approvedByName?: string
}

export type CaseStageApprovalStatusValue = 'pending' | 'approved'

export type CaseStageApproval = {
  id: string
  stage: CaseLifecycleStatusValue
  status: CaseStageApprovalStatusValue
  requestedAt: string
  requestedById?: string
  requestedByName?: string
  approvedAt?: string
  approvedById?: string
  approvedByName?: string
  planningVersionId?: string
}

export type CaseFinancialSnapshot = {
  currency: 'BRL'
  revenue: number
  baseCost: number
  reworkCost: number
  totalCost: number
  margin: number
  marginPercent: number
  updatedAt: string
}

export type OrthoDomainEvent = {
  id: string
  name: OrthoDomainEventName
  aggregateId: string
  aggregateType: 'case' | 'lab'
  occurredAt: string
  context: Record<string, unknown>
}

export type LabStageTimelineRecord = {
  stage: LabStageValue
  at: string
  note?: string
}

export type LabStageSLASnapshot = {
  stage: LabStageValue
  status: SLAStatusValue
  targetHours: number
  elapsedHours: number
  remainingHours: number
  dueAt: string
  alerts: string[]
}

export type LabFinancialImpact = {
  type: 'rework'
  currency: 'BRL'
  laborCost: number
  materialCost: number
  estimatedAmount: number
  reason: string
}

export type CaseReworkSummary = {
  originalCaseId: string
  reworkCount: number
  affectedTrayNumbers: number[]
  estimatedFinancialImpact: number
  currency: 'BRL'
  latestReason?: string
  latestAt?: string
}

export type CaseSLASnapshot = {
  overallStatus: SLAStatusValue
  currentStage?: LabStageSLASnapshot
  alerts: string[]
}

export type LabChecklistItemCode =
  | 'planning_confirmed'
  | 'scan_files_verified'
  | 'production_completed'
  | 'finishing_completed'
  | 'qc_reviewed'
  | 'packaging_confirmed'

export type LabChecklistItem = {
  id: string
  code: LabChecklistItemCode
  label: string
  stageGate: LabStageValue
  completed: boolean
  required: boolean
  completedAt?: string
  completedById?: string
  completedByName?: string
}

export type LabProductionChecklist = {
  updatedAt: string
  items: LabChecklistItem[]
}
