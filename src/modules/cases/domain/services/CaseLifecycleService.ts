import { createOrthoDomainEvent, mergeOrthoDomainEvents, SLAStatus } from '../../../../shared/domain'
import { nowIsoDate } from '../../../../shared/utils/date'
import type { Case, CasePhase, CaseStatus as LegacyCaseStatus, CaseTray, TrayState } from '../../../../types/Case'
import type {
  CaseLifecycleStatusValue,
  CaseReworkSummary,
  CaseSLASnapshot,
  LabStageSLASnapshot,
  OrthoDomainEvent,
} from '../../../../types/Domain'
import type { LabOrder } from '../../../lab/domain/entities/LabOrder'
import { LabSLAService } from '../../../lab/domain/services/LabSLAService'
import { ReworkFinancialImpactService } from '../../../lab/domain/services/ReworkFinancialImpactService'
import { LabStage } from '../../../lab/domain/valueObjects/LabStage'
import { CaseFinancialService } from './CaseFinancialService'
import { CasePlanningVersioningService } from './CasePlanningVersioningService'
import { CaseStatus } from '../valueObjects/CaseStatus'

function toNonNegativeInt(value?: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value ?? 0))
}

export type DerivedTreatmentStatusInput = {
  installedAt?: string
  changeEveryDays: number
  totalUpper: number
  totalLower: number
  deliveredUpper: number
  deliveredLower: number
  completedUpper?: number
  completedLower?: number
  todayIso: string
  nextDueDate?: string
}

export type CaseStatusUpdatePlan = {
  status: LegacyCaseStatus
  phase: CasePhase
  lifecycleStatus?: CaseLifecycleStatusValue
}

export type CaseLifecycleSnapshot = {
  lifecycleStatus: CaseLifecycleStatusValue
  status: LegacyCaseStatus
  phase: CasePhase
  currentLabStage?: LabOrder['stage']
  domainEvents: OrthoDomainEvent[]
  reworkSummary: CaseReworkSummary
  sla: CaseSLASnapshot
  planningVersions: NonNullable<Case['planningVersions']>
  stageApprovals: NonNullable<Case['stageApprovals']>
  financial: NonNullable<Case['financial']>
}

export function caseProgress(total: number, delivered: number) {
  const safeDelivered = Math.max(0, Math.min(delivered, total))
  const safeTotal = Math.max(0, total)
  return {
    delivered: safeDelivered,
    total: safeTotal,
    percent: safeTotal > 0 ? Math.round((safeDelivered / safeTotal) * 100) : 0,
  }
}

export function deliveredToDentistByArch(caseItem: Pick<Case, 'deliveryLots'> | null | undefined) {
  if (!caseItem) return { upper: 0, lower: 0 }
  return (caseItem.deliveryLots ?? []).reduce(
    (acc, lot) => {
      const qty = Math.max(0, Math.trunc(lot.quantity ?? 0))
      if (lot.arch === 'superior') acc.upper += qty
      if (lot.arch === 'inferior') acc.lower += qty
      if (lot.arch === 'ambos') {
        acc.upper += qty
        acc.lower += qty
      }
      return acc
    },
    { upper: 0, lower: 0 },
  )
}

export function timelineStateForTray(
  tray: Pick<CaseTray, 'trayNumber' | 'state'>,
  deliveredUpper: number,
  deliveredLower: number,
): TrayState {
  if (tray.state === 'rework') return 'rework'
  const deliveredCount =
    deliveredUpper > 0 && deliveredLower > 0
      ? Math.max(0, Math.min(deliveredUpper, deliveredLower))
      : Math.max(deliveredUpper, deliveredLower, 0)
  if (tray.trayNumber <= deliveredCount) return 'entregue'
  if (tray.state === 'entregue') return 'pendente'
  return tray.state
}

function pickHighestSeveritySla(snapshots: LabStageSLASnapshot[]) {
  if (snapshots.length === 0) return undefined
  const score = (value: LabStageSLASnapshot['status']) => {
    if (value === 'overdue') return 3
    if (value === 'warning') return 2
    return 1
  }
  return [...snapshots].sort((left, right) => score(right.status) - score(left.status) || left.dueAt.localeCompare(right.dueAt))[0]
}

function buildReworkSummary(caseItem: Case, labOrders: LabOrder[]): CaseReworkSummary {
  const trayNumbers = new Set<number>()
  caseItem.trays
    .filter((tray) => tray.state === 'rework')
    .forEach((tray) => trayNumbers.add(tray.trayNumber))
  labOrders
    .filter((order) => LabStage.fromOrder(order).equals('rework'))
    .forEach((order) => trayNumbers.add(order.trayNumber))

  const affectedTrayNumbers = [...trayNumbers].sort((left, right) => left - right)
  const impact = affectedTrayNumbers.length > 0
    ? ReworkFinancialImpactService.estimate({
      arch: caseItem.arch ?? 'ambos',
      trayCount: affectedTrayNumbers.length,
      productType: caseItem.productId ?? caseItem.productType,
    })
    : undefined

  const latestReworkOrder = [...labOrders]
    .filter((order) => LabStage.fromOrder(order).equals('rework'))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]

  return {
    originalCaseId: caseItem.id,
    reworkCount: affectedTrayNumbers.length,
    affectedTrayNumbers,
    estimatedFinancialImpact: impact?.estimatedAmount ?? 0,
    currency: impact?.currency ?? 'BRL',
    latestReason: latestReworkOrder?.notes,
    latestAt: latestReworkOrder?.updatedAt,
  }
}

function buildSlaSnapshot(labOrders: LabOrder[]): CaseSLASnapshot {
  const stageSnapshots = labOrders.map((order) => LabSLAService.evaluate(order))
  const currentStage = pickHighestSeveritySla(stageSnapshots)
  if (!currentStage) {
    return {
      overallStatus: 'on_track',
      alerts: [],
    }
  }

  return {
    overallStatus: currentStage.status,
    currentStage,
    alerts: [...new Set(stageSnapshots.flatMap((snapshot) => snapshot.alerts))],
  }
}

function buildMilestoneEvents(
  caseItem: Case,
  lifecycleStatus: CaseLifecycleStatusValue,
  labOrders: LabOrder[],
) {
  const events: OrthoDomainEvent[] = []

  if (caseItem.sourceScanId) {
    events.push(createOrthoDomainEvent('CaseApproved', caseItem.id, 'case', {
      caseId: caseItem.id,
      scanId: caseItem.sourceScanId,
      lifecycleStatus: 'scan_approved',
    }, caseItem.createdAt))
  }

  events.push(createOrthoDomainEvent('CaseCreated', caseItem.id, 'case', {
    caseId: caseItem.id,
    treatmentCode: caseItem.treatmentCode ?? caseItem.id,
    lifecycleStatus: 'case_created',
  }, caseItem.createdAt))

  const startedOrder = [...labOrders]
    .filter((order) => {
      const stage = LabStage.fromOrder(order).value
      return stage === 'in_production' || stage === 'qc' || stage === 'shipped' || stage === 'delivered' || stage === 'rework'
    })
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0]

  if (startedOrder) {
    events.push(createOrthoDomainEvent('LabStarted', caseItem.id, 'case', {
      caseId: caseItem.id,
      labOrderId: startedOrder.id,
      trayNumber: startedOrder.trayNumber,
      labStage: LabStage.fromOrder(startedOrder).value,
    }, startedOrder.planningDefinedAt ?? startedOrder.createdAt))
  }

  const shippedOrder = [...labOrders]
    .filter((order) => {
      const stage = LabStage.fromOrder(order).value
      return stage === 'shipped' || stage === 'delivered'
    })
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))[0]
  if (shippedOrder) {
    events.push(createOrthoDomainEvent('LabShipped', caseItem.id, 'case', {
      caseId: caseItem.id,
      labOrderId: shippedOrder.id,
      trayNumber: shippedOrder.trayNumber,
      labStage: LabStage.fromOrder(shippedOrder).value,
    }, shippedOrder.updatedAt))
  }

  const deliveredAt = [...(caseItem.deliveryLots ?? [])]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0]?.createdAt
  if (deliveredAt && (lifecycleStatus === 'delivered' || lifecycleStatus === 'in_use' || lifecycleStatus === 'rework')) {
    events.push(createOrthoDomainEvent('CaseDelivered', caseItem.id, 'case', {
      caseId: caseItem.id,
      deliveredLots: caseItem.deliveryLots?.length ?? 0,
      lifecycleStatus,
    }, deliveredAt))
  }

  return mergeOrthoDomainEvents(caseItem.domainEvents ?? [], events)
}

export function deriveLifecycleFromTrays(caseItem: Pick<Case, 'status' | 'phase' | 'installation' | 'trays' | 'deliveryLots' | 'sourceScanId'>, nextTrays: CaseTray[]): CaseStatusUpdatePlan {
  const lifecycleStatus = CaseStatus.fromCase({
    ...caseItem,
    trays: nextTrays,
  } as Case, []).value
  if (lifecycleStatus === 'delivered' || lifecycleStatus === 'in_use' || !!caseItem.installation?.installedAt) {
    return { status: 'em_entrega', phase: 'em_producao', lifecycleStatus }
  }
  if (lifecycleStatus === 'in_production' || lifecycleStatus === 'qc' || lifecycleStatus === 'rework' || lifecycleStatus === 'shipped') {
    return { status: 'em_producao', phase: 'em_producao', lifecycleStatus }
  }
  return { status: caseItem.status, phase: caseItem.phase, lifecycleStatus }
}

export function deriveTreatmentStatus(input: DerivedTreatmentStatusInput) {
  const totalUpper = toNonNegativeInt(input.totalUpper)
  const totalLower = toNonNegativeInt(input.totalLower)
  const deliveredUpper = toNonNegativeInt(input.deliveredUpper)
  const deliveredLower = toNonNegativeInt(input.deliveredLower)
  const completedUpper = toNonNegativeInt(input.completedUpper ?? deliveredUpper)
  const completedLower = toNonNegativeInt(input.completedLower ?? deliveredLower)
  const deliveredAny = deliveredUpper > 0 || deliveredLower > 0
  const finished = completedUpper >= totalUpper && completedLower >= totalLower
  if (finished) return 'em_tratamento' as const
  if (!input.installedAt || !deliveredAny) return 'em_entrega' as const

  const nextDueDates: string[] = input.nextDueDate ? [input.nextDueDate] : []
  if (nextDueDates.length === 0) {
    if (totalUpper > 0 && deliveredUpper < totalUpper) nextDueDates.push(input.installedAt)
    if (totalLower > 0 && deliveredLower < totalLower) nextDueDates.push(input.installedAt)
  }
  if (nextDueDates.length === 0) return 'em_tratamento' as const
  const nextDue = nextDueDates.sort()[0]
  return nextDue <= input.todayIso ? ('aguardando_reposicao' as const) : ('em_tratamento' as const)
}

export function canTransitionCaseStatus(current: LegacyCaseStatus, next: LegacyCaseStatus) {
  if (current === next) return true
  if (current === 'finalizado' && next !== 'finalizado') return false
  return true
}

export function resolveCasePhaseForStatus(
  status: LegacyCaseStatus,
  currentPhase: CasePhase,
  explicitPhase?: CasePhase,
) {
  if (explicitPhase) return explicitPhase
  if (status === 'finalizado') return 'finalizado'
  if (status === 'planejamento') {
    if (currentPhase === 'orçamento' || currentPhase === 'contrato_pendente' || currentPhase === 'contrato_aprovado') {
      return currentPhase
    }
    return 'planejamento'
  }
  return 'em_producao'
}

export function canManuallyConcludeTreatment(caseItem: Pick<Case, 'status' | 'installation'>, totalUpper: number, totalLower: number) {
  if (caseItem.status === 'finalizado') return false
  const deliveredUpper = toNonNegativeInt(caseItem.installation?.deliveredUpper)
  const deliveredLower = toNonNegativeInt(caseItem.installation?.deliveredLower)
  const upperDone = totalUpper <= 0 || deliveredUpper >= totalUpper
  const lowerDone = totalLower <= 0 || deliveredLower >= totalLower
  return upperDone && lowerDone && (deliveredUpper > 0 || deliveredLower > 0)
}

export function deriveCaseLifecycleSnapshot(caseItem: Case, labOrders: LabOrder[] = [], _todayIso = nowIsoDate()): CaseLifecycleSnapshot {
  const lifecycleStatus = CaseStatus.fromCase(caseItem, labOrders).value
  const lifecycle = CaseStatus.create(lifecycleStatus)
  const status = caseItem.status === 'finalizado' ? 'finalizado' : lifecycle.toLegacyStatus()
  const phase = caseItem.phase === 'finalizado' ? 'finalizado' : lifecycle.toLegacyPhase(caseItem.phase)
  const reworkSummary = buildReworkSummary(caseItem, labOrders)
  const sla = buildSlaSnapshot(labOrders)
  const domainEvents = buildMilestoneEvents(caseItem, lifecycleStatus, labOrders)
  const planning = CasePlanningVersioningService.ensure(caseItem)
  const financial = CaseFinancialService.evaluate(
    {
      ...caseItem,
      reworkSummary,
    },
    labOrders,
  )
  const currentLabStage = labOrders.length > 0
    ? [...labOrders]
      .map((order) => LabStage.fromOrder(order).value)
      .sort((left, right) => {
        const weight = (value: LabOrder['stage']) => {
          if (value === 'rework') return 6
          if (value === 'delivered') return 5
          if (value === 'shipped') return 4
          if (value === 'qc') return 3
          if (value === 'in_production') return 2
          return 1
        }
        return weight(right) - weight(left)
      })[0]
    : undefined

  const overall = SLAStatus.create(sla.overallStatus)
  return {
    lifecycleStatus,
    status,
    phase,
    currentLabStage,
    domainEvents,
    reworkSummary,
    planningVersions: planning.versions,
    stageApprovals: planning.approvals,
    financial,
    sla: {
      ...sla,
      overallStatus: overall.value,
    },
  }
}

export function refreshCaseDomainState(caseItem: Case, labOrders: LabOrder[] = [], todayIso = nowIsoDate()) {
  const snapshot = deriveCaseLifecycleSnapshot(caseItem, labOrders, todayIso)
  return {
    ...caseItem,
    status: snapshot.status,
    phase: snapshot.phase,
    lifecycleStatus: snapshot.lifecycleStatus,
    domainEvents: snapshot.domainEvents,
    reworkSummary: snapshot.reworkSummary,
    planningVersions: snapshot.planningVersions,
    stageApprovals: snapshot.stageApprovals,
    financial: snapshot.financial,
    sla: snapshot.sla,
  } satisfies Case
}

export class CaseLifecycleService {
  static caseProgress = caseProgress
  static deliveredToDentistByArch = deliveredToDentistByArch
  static timelineStateForTray = timelineStateForTray
  static deriveLifecycleFromTrays = deriveLifecycleFromTrays
  static deriveTreatmentStatus = deriveTreatmentStatus
  static canTransitionStatus = canTransitionCaseStatus
  static resolvePhaseForStatus = resolveCasePhaseForStatus
  static canManuallyConcludeTreatment = canManuallyConcludeTreatment
  static deriveLifecycleSnapshot = deriveCaseLifecycleSnapshot
  static refreshCase = refreshCaseDomainState
}
