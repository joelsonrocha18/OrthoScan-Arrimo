import { SLAStatus } from '../../../../shared/domain'
import { nowIsoDateTime, toDateTime } from '../../../../shared/utils/date'
import type { LabStageSLASnapshot } from '../../../../types/Domain'
import type { LabOrder } from '../entities/LabOrder'
import { LabStage } from '../valueObjects/LabStage'

export type LabStageSLAPolicy = Record<LabStage['value'], number>

export const DEFAULT_LAB_STAGE_SLA_HOURS: LabStageSLAPolicy = {
  queued: 8,
  in_production: 72,
  qc: 24,
  shipped: 24,
  delivered: 48,
  rework: 48,
}

function diffHours(startedAtIso: string, finishedAtIso: string) {
  const startedAt = toDateTime(startedAtIso).getTime()
  const finishedAt = toDateTime(finishedAtIso).getTime()
  return Math.max(0, Math.round(((finishedAt - startedAt) / (1000 * 60 * 60)) * 100) / 100)
}

function addHours(baseIso: string, hours: number) {
  const next = toDateTime(baseIso)
  next.setHours(next.getHours() + hours)
  return next.toISOString()
}

function resolveStartedAt(order: Pick<LabOrder, 'createdAt' | 'updatedAt' | 'planningDefinedAt' | 'deliveredToProfessionalAt' | 'stageTimeline'>, stage: LabStage['value']) {
  const stageEntry = order.stageTimeline?.find((entry) => entry.stage === stage)
  if (stageEntry?.at) return stageEntry.at
  if (stage === 'delivered' && order.deliveredToProfessionalAt) return order.deliveredToProfessionalAt
  if (stage === 'in_production' && order.planningDefinedAt) return order.planningDefinedAt
  return order.updatedAt || order.createdAt
}

export function evaluateLabOrderSLA(
  order: LabOrder,
  nowIso = nowIsoDateTime(),
  policy: LabStageSLAPolicy = DEFAULT_LAB_STAGE_SLA_HOURS,
): LabStageSLASnapshot {
  const stage = LabStage.fromOrder(order).value
  const startedAt = resolveStartedAt(order, stage)
  const targetHours = policy[stage]
  const elapsedHours = diffHours(startedAt, nowIso)
  const remainingHours = Math.round((targetHours - elapsedHours) * 100) / 100
  const status = SLAStatus.fromMetrics(remainingHours, Math.max(2, Math.round(targetHours * 0.15)))
  const alerts: string[] = []
  if (status.isOverdue()) {
    alerts.push(`Etapa ${stage} em atraso.`)
  } else if (status.isWarning()) {
    alerts.push(`Etapa ${stage} perto do limite de SLA.`)
  }

  return {
    stage,
    status: status.value,
    targetHours,
    elapsedHours,
    remainingHours,
    dueAt: addHours(startedAt, targetHours),
    alerts,
  }
}

export class LabSLAService {
  static evaluate = evaluateLabOrderSLA
}
