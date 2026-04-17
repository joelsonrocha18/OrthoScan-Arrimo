import type { AuditLog } from '../../../../types/Audit'
import type { Case, CaseTimelineEntry } from '../../../../types/Case'
import type { LabStageValue, OrthoDomainEvent } from '../../../../types/Domain'
import { createCaseTimelineEntry } from '../entities/Case'

function eventKey(entry: Pick<CaseTimelineEntry, 'at' | 'type' | 'title' | 'description'>) {
  return `${entry.type}::${entry.at}::${entry.title}::${entry.description ?? ''}`
}

function createAuditTimelineEntry(entry: AuditLog) {
  return createCaseTimelineEntry({
    id: `audit_${entry.id}`,
    at: entry.at,
    type: 'audit',
    source: 'audit',
    title: entry.action,
    description: entry.message,
    actorName: entry.userName,
    actorEmail: entry.userEmail,
    metadata: {
      caseId: entry.entityId,
    },
  })
}

function toTimelineEventType(name: OrthoDomainEvent['name']): CaseTimelineEntry['type'] {
  if (name === 'CaseCreated') return 'case_created'
  if (name === 'CaseDelivered') return 'delivery_registered'
  return 'lab_event'
}

function toTimelineTitle(name: OrthoDomainEvent['name']) {
  if (name === 'CaseCreated') return 'Caso criado'
  if (name === 'CaseApproved') return 'Exame aprovado'
  if (name === 'LabStarted') return 'Produção iniciada'
  if (name === 'LabShipped') return 'LAB despachado'
  return 'Caso entregue'
}

function createDomainEventTimelineEntry(caseId: string, event: OrthoDomainEvent) {
  return createCaseTimelineEntry({
    id: `domain_${event.id}`,
    at: event.occurredAt,
    type: toTimelineEventType(event.name),
    source: 'domain',
    title: toTimelineTitle(event.name),
    description: typeof event.context.note === 'string' ? event.context.note : undefined,
    metadata: {
      caseId,
      labOrderId: typeof event.context.labOrderId === 'string' ? event.context.labOrderId : undefined,
      trayNumber: typeof event.context.trayNumber === 'number' ? event.context.trayNumber : undefined,
      domainEvent: event.name,
      caseLifecycleStatus: typeof event.context.lifecycleStatus === 'string'
        ? (event.context.lifecycleStatus as Case['lifecycleStatus'])
        : undefined,
      labStage: typeof event.context.labStage === 'string'
        ? (event.context.labStage as LabStageValue)
        : undefined,
    },
  })
}

function createSlaTimelineEntry(caseItem: Case) {
  if (!caseItem.sla || caseItem.sla.overallStatus === 'on_track' || caseItem.sla.alerts.length === 0) return []
  return [createCaseTimelineEntry({
    id: `sla_${caseItem.id}_${caseItem.updatedAt}`,
    at: caseItem.updatedAt,
    type: 'sla_alert',
    source: 'domain',
    title: 'Alerta de SLA',
    description: caseItem.sla.alerts.join(' '),
    metadata: {
      caseId: caseItem.id,
      slaStatus: caseItem.sla.overallStatus,
      caseLifecycleStatus: caseItem.lifecycleStatus,
      labStage: caseItem.sla.currentStage?.stage,
    },
  })]
}

export function listCaseTimelineEntries(
  caseItem: Case,
  auditLogs: AuditLog[] = [],
) {
  const entries: CaseTimelineEntry[] = [...(caseItem.timelineEntries ?? [])]

  entries.push(
    createCaseTimelineEntry({
      id: `case_created_${caseItem.id}`,
      at: caseItem.createdAt,
      type: 'case_created',
      title: 'Caso criado',
      description: `Caso ${caseItem.treatmentCode ?? caseItem.id} criado.`,
      metadata: {
        caseId: caseItem.id,
        caseLifecycleStatus: caseItem.lifecycleStatus,
      },
    }),
  )

  if (caseItem.contract?.approvedAt) {
    entries.push(
      createCaseTimelineEntry({
        id: `contract_${caseItem.id}_${caseItem.contract.approvedAt}`,
        at: caseItem.contract.approvedAt,
        type: 'contract_updated',
        title: 'Contrato aprovado',
        description: caseItem.contract.notes,
        metadata: {
          status: caseItem.status,
          phase: caseItem.phase,
          caseId: caseItem.id,
          caseLifecycleStatus: caseItem.lifecycleStatus,
        },
      }),
    )
  }

  ;(caseItem.deliveryLots ?? []).forEach((lot) => {
    entries.push(
      createCaseTimelineEntry({
        id: `delivery_${lot.id}`,
        at: lot.createdAt,
        type: 'delivery_registered',
        title: 'Entrega ao profissional registrada',
        description: `Arcada ${lot.arch}, placas #${lot.fromTray} a #${lot.toTray}.`,
        metadata: {
          caseId: caseItem.id,
          caseLifecycleStatus: caseItem.lifecycleStatus,
        },
      }),
    )
  })

  if (caseItem.installation?.installedAt) {
    entries.push(
      createCaseTimelineEntry({
        id: `installation_${caseItem.id}_${caseItem.installation.installedAt}`,
        at: caseItem.installation.installedAt,
        type: 'installation_registered',
        title: 'Instalação inicial registrada',
        description: caseItem.installation.note,
        metadata: {
          caseId: caseItem.id,
          caseLifecycleStatus: caseItem.lifecycleStatus,
        },
      }),
    )
  }

  ;(caseItem.installation?.patientDeliveryLots ?? []).forEach((lot) => {
    entries.push(
      createCaseTimelineEntry({
        id: `patient_delivery_${lot.id}`,
        at: lot.createdAt,
        type: 'installation_registered',
        title: 'Reposição entregue ao paciente',
        description: `Placas #${lot.fromTray} a #${lot.toTray}.`,
        metadata: {
          caseId: caseItem.id,
          caseLifecycleStatus: caseItem.lifecycleStatus,
        },
      }),
    )
  })

  const domainEntries = (caseItem.domainEvents ?? []).map((event) => createDomainEventTimelineEntry(caseItem.id, event))
  const auditEntries = auditLogs
    .filter((entry) => entry.entity === 'case' && entry.entityId === caseItem.id)
    .map(createAuditTimelineEntry)

  const deduped = new Map<string, CaseTimelineEntry>()
  ;[...entries, ...domainEntries, ...createSlaTimelineEntry(caseItem), ...auditEntries]
    .sort((left, right) => {
      if (left.at !== right.at) return right.at.localeCompare(left.at)
      return right.id.localeCompare(left.id)
    })
    .forEach((entry) => {
      deduped.set(eventKey(entry), entry)
    })

  return [...deduped.values()].sort((left, right) => {
    if (left.at !== right.at) return right.at.localeCompare(left.at)
    return right.id.localeCompare(left.id)
  })
}

export class CaseTimelineService {
  static list = listCaseTimelineEntries
}
