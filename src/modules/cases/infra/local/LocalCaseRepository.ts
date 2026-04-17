import { listCasesForUser, listScansForUser } from '../../../../auth/scope'
import { pushAudit } from '../../../../data/audit'
import { loadDb, saveDb, type AppDb } from '../../../../data/db'
import { nextOrthTreatmentCode, normalizeOrthTreatmentCode } from '../../../../lib/treatmentCode'
import { err, ok, type Result } from '../../../../shared/errors'
import { BUSINESS_EVENTS, logger } from '../../../../shared/observability'
import { nowIsoDateTime } from '../../../../shared/utils/date'
import type { User } from '../../../../types/User'
import { toLabOrder } from '../../../lab/domain/entities/LabOrder'
import type {
  AddCaseNoteInput,
  ApprovePlanningVersionInput,
  CaseRepository,
  CreateCaseFromScanInput,
  PublishPlanningVersionInput,
  UpdateCaseStatusInput,
} from '../../application/ports/CaseRepository'
import {
  appendCaseTimelineEntry,
  buildCaseFromScanDraft,
  createCaseTimelineEntry,
  resolveTreatmentOriginFromClinic,
  type Case,
} from '../../domain/entities/Case'
import { CasePlanningVersioningService } from '../../domain/services/CasePlanningVersioningService'
import { CaseLifecycleService } from '../../domain/services/CaseLifecycleService'
import { CaseTimelineService } from '../../domain/services/CaseTimelineService'

function visibleCases(db: AppDb, currentUser: User | null) {
  return currentUser ? listCasesForUser(db, currentUser) : db.cases
}

function visibleScans(db: AppDb, currentUser: User | null) {
  return currentUser ? listScansForUser(db, currentUser) : db.scans
}

function nextTreatmentCode(db: AppDb) {
  const existingCodes = [
    ...db.cases.map((item) => item.treatmentCode ?? item.id),
    ...db.scans.map((item) => item.serviceOrderCode ?? ''),
  ]
  return nextOrthTreatmentCode(existingCodes)
}

function relatedLabOrders(db: AppDb, caseId: string) {
  return db.labItems
    .filter((item) => item.caseId === caseId)
    .map(toLabOrder)
}

export class LocalCaseRepository implements CaseRepository {
  private readonly currentUser: User | null

  constructor(currentUser: User | null) {
    this.currentUser = currentUser
  }

  findById(id: string) {
    const db = loadDb()
    const caseItem = visibleCases(db, this.currentUser).find((item) => item.id === id) ?? null
    return caseItem ? CaseLifecycleService.refreshCase(caseItem, relatedLabOrders(db, caseItem.id)) : null
  }

  createFromScan(input: CreateCaseFromScanInput): Result<{ caseItem: Case; caseId: string }, string> {
    const db = loadDb()
    const scan = visibleScans(db, this.currentUser).find((item) => item.id === input.scanId)
    if (!scan) return err('Exame não encontrado.')

    const treatmentCode = normalizeOrthTreatmentCode(scan.serviceOrderCode) || nextTreatmentCode(db)
    if (db.cases.some((item) => item.id === treatmentCode)) {
      return err(`Já existe um caso com o código ${treatmentCode}.`)
    }

    const clinicsById = new Map(db.clinics.map((item) => [item.id, { tradeName: item.tradeName }]))
    const caseItem = buildCaseFromScanDraft({
      ...input,
      scanId: scan.id,
      scan,
      treatmentCode,
      treatmentOrigin: resolveTreatmentOriginFromClinic(scan.clinicId, clinicsById),
    })
    const enrichedCase = CaseLifecycleService.refreshCase(caseItem, relatedLabOrders(db, caseItem.id))

    db.cases = [enrichedCase, ...db.cases]
    db.scans = db.scans.map((item) =>
      item.id === scan.id
        ? {
            ...item,
            status: 'convertido',
            linkedCaseId: treatmentCode,
            serviceOrderCode: treatmentCode,
            updatedAt: nowIsoDateTime(),
          }
        : item,
    )
    pushAudit(db, {
      entity: 'case',
      entityId: enrichedCase.id,
      action: 'case.create_from_scan',
      message: 'Caso criado a partir do exame.',
      context: {
        caseId: enrichedCase.id,
        scanId: scan.id,
        treatmentCode: enrichedCase.treatmentCode ?? enrichedCase.id,
        clinicId: enrichedCase.clinicId,
        patientId: enrichedCase.patientId,
        lifecycleStatus: enrichedCase.lifecycleStatus,
      },
    })
    saveDb(db)
    logger.business(BUSINESS_EVENTS.CASE_CREATED, 'Caso criado a partir do exame.', {
      caseId: enrichedCase.id,
      scanId: scan.id,
      treatmentCode: enrichedCase.treatmentCode ?? enrichedCase.id,
      clinicId: enrichedCase.clinicId,
      patientId: enrichedCase.patientId,
      lifecycleStatus: enrichedCase.lifecycleStatus,
    }, this.currentUser ? {
      id: this.currentUser.id,
      role: this.currentUser.role,
    } : undefined)
    return ok({ caseItem: enrichedCase, caseId: enrichedCase.id })
  }

  updateStatus(input: UpdateCaseStatusInput): Result<Case, string> {
    const db = loadDb()
    let changed = false
    let previousStatus: Case['status'] | undefined
    let previousPhase: Case['phase'] | undefined

    db.cases = db.cases.map((item) => {
      if (item.id !== input.caseId) return item
      if (!CaseLifecycleService.canTransitionStatus(item.status, input.nextStatus)) {
        return item
      }
      previousStatus = item.status
      previousPhase = item.phase
      const nowIso = nowIsoDateTime()
      const nextPhase = CaseLifecycleService.resolvePhaseForStatus(
        item.status === 'finalizado' ? item.status : input.nextStatus,
        item.phase,
        input.nextPhase,
      )
      const entry = createCaseTimelineEntry({
        at: nowIso,
        type: 'status_changed',
        title: 'Status do caso atualizado',
        description: input.reason ?? `Novo status: ${input.nextStatus}.`,
        metadata: {
          status: input.nextStatus,
          phase: nextPhase,
        },
      })
      changed = true
      return {
        ...item,
        status: input.nextStatus,
        phase: nextPhase,
        timelineEntries: appendCaseTimelineEntry(item, entry),
        updatedAt: nowIso,
      }
    })

    const updated = db.cases.find((item) => item.id === input.caseId) ?? null
    if (!changed || !updated) {
      const existing = db.cases.find((item) => item.id === input.caseId)
      if (existing && !CaseLifecycleService.canTransitionStatus(existing.status, input.nextStatus)) {
        return err('Transição de status inválida para este caso.')
      }
      return err('Caso não encontrado.')
    }

    const enrichedCase = CaseLifecycleService.refreshCase(updated, relatedLabOrders(db, updated.id))
    db.cases = db.cases.map((item) => (item.id === enrichedCase.id ? enrichedCase : item))

    pushAudit(db, {
      entity: 'case',
      entityId: enrichedCase.id,
      action: 'case.status_changed',
      message: input.reason ?? 'Status do caso atualizado.',
      context: {
        caseId: enrichedCase.id,
        treatmentCode: enrichedCase.treatmentCode ?? enrichedCase.id,
        previousStatus,
        previousPhase,
        nextStatus: enrichedCase.status,
        nextPhase: enrichedCase.phase,
        lifecycleStatus: enrichedCase.lifecycleStatus,
      },
    })
    saveDb(db)
    logger.business(BUSINESS_EVENTS.CASE_STATUS_CHANGED, 'Status do caso atualizado.', {
      caseId: enrichedCase.id,
      treatmentCode: enrichedCase.treatmentCode ?? enrichedCase.id,
      previousStatus,
      previousPhase,
      nextStatus: enrichedCase.status,
      nextPhase: enrichedCase.phase,
      lifecycleStatus: enrichedCase.lifecycleStatus,
    }, this.currentUser ? {
      id: this.currentUser.id,
      role: this.currentUser.role,
    } : undefined)
    return ok(enrichedCase)
  }

  addNote(input: AddCaseNoteInput): Result<Case, string> {
    const trimmed = input.note.trim()
    if (!trimmed) return err('Observação obrigatória.')

    const db = loadDb()
    let changed = false

    db.cases = db.cases.map((item) => {
      if (item.id !== input.caseId) return item

      let nextItem: Case = item
      if (input.scope === 'budget') {
        nextItem = { ...nextItem, budget: { ...nextItem.budget, notes: trimmed } }
      } else if (input.scope === 'contract') {
        nextItem = { ...nextItem, contract: { ...(nextItem.contract ?? { status: 'pendente' }), notes: trimmed } }
      } else if (input.scope === 'installation') {
        if (!nextItem.installation) return item
        nextItem = { ...nextItem, installation: { ...nextItem.installation, note: trimmed } }
      } else if (input.scope === 'tray') {
        if (!(input.trayNumber && input.trayNumber > 0)) return item
        nextItem = {
          ...nextItem,
          trays: nextItem.trays.map((tray) =>
            tray.trayNumber === input.trayNumber ? { ...tray, notes: trimmed } : tray,
          ),
        }
      } else {
        nextItem = { ...nextItem, planningNote: trimmed }
      }

      const nowIso = nowIsoDateTime()
      changed = true
      return {
        ...nextItem,
        timelineEntries: appendCaseTimelineEntry(nextItem, createCaseTimelineEntry({
          at: nowIso,
          type: 'note_added',
          title: 'Observação atualizada',
          description: trimmed,
          metadata: {
            noteScope: input.scope,
            trayNumber: input.trayNumber,
          },
        })),
        updatedAt: nowIso,
      }
    })

    const updated = db.cases.find((item) => item.id === input.caseId) ?? null
    if (!changed || !updated) {
      return err(input.scope === 'installation' ? 'Registro de instalação ainda não existe.' : 'Caso não encontrado.')
    }

    const enrichedCase = CaseLifecycleService.refreshCase(updated, relatedLabOrders(db, updated.id))
    db.cases = db.cases.map((item) => (item.id === enrichedCase.id ? enrichedCase : item))

    pushAudit(db, {
      entity: 'case',
      entityId: enrichedCase.id,
      action: 'case.note_added',
      message: `Observação de ${input.scope} atualizada${input.trayNumber ? ` na placa #${input.trayNumber}` : ''}.`,
      context: {
        caseId: enrichedCase.id,
        noteScope: input.scope,
        trayNumber: input.trayNumber,
        lifecycleStatus: enrichedCase.lifecycleStatus,
      },
    })
    saveDb(db)
    return ok(enrichedCase)
  }

  publishPlanningVersion(input: PublishPlanningVersionInput): Result<Case, string> {
    const db = loadDb()
    let changed = false

    db.cases = db.cases.map((item) => {
      if (item.id !== input.caseId) return item
      const nowIso = nowIsoDateTime()
      const planning = CasePlanningVersioningService.createVersion(item, {
        note: input.note,
        actor: this.currentUser ? { id: this.currentUser.id, name: this.currentUser.name } : undefined,
        status: 'submitted',
        stage: 'case_created',
        at: nowIso,
      })
      changed = true
      return {
        ...item,
        planningVersions: planning.versions,
        stageApprovals: planning.approvals,
        timelineEntries: appendCaseTimelineEntry(item, createCaseTimelineEntry({
          at: nowIso,
          type: 'planning_version_published',
          title: `Planejamento ${planning.latestVersion.label} publicado`,
          description: input.note?.trim() || 'Versão enviada para aprovação do dentista.',
          actorName: this.currentUser?.name,
          actorEmail: this.currentUser?.email,
          metadata: {
            caseId: item.id,
            caseLifecycleStatus: item.lifecycleStatus,
          },
        })),
        updatedAt: nowIso,
      }
    })

    const updated = db.cases.find((item) => item.id === input.caseId) ?? null
    if (!changed || !updated) return err('Caso não encontrado.')

    const enrichedCase = CaseLifecycleService.refreshCase(updated, relatedLabOrders(db, updated.id))
    db.cases = db.cases.map((item) => (item.id === enrichedCase.id ? enrichedCase : item))
    pushAudit(db, {
      entity: 'case',
      entityId: enrichedCase.id,
      action: 'case.planning_version_published',
      message: 'Nova versão de planejamento publicada.',
      context: {
        caseId: enrichedCase.id,
        treatmentCode: enrichedCase.treatmentCode ?? enrichedCase.id,
        versionId: enrichedCase.planningVersions?.[0]?.id,
        versionLabel: enrichedCase.planningVersions?.[0]?.label,
      },
    })
    saveDb(db)
    return ok(enrichedCase)
  }

  approvePlanningVersion(input: ApprovePlanningVersionInput): Result<Case, string> {
    const db = loadDb()
    let changed = false

    db.cases = db.cases.map((item) => {
      if (item.id !== input.caseId) return item
      const version = item.planningVersions?.find((current) => current.id === input.versionId)
      if (!version) return item
      const nowIso = nowIsoDateTime()
      const planning = CasePlanningVersioningService.approveVersion(item, {
        versionId: input.versionId,
        actor: this.currentUser ? { id: this.currentUser.id, name: this.currentUser.name } : undefined,
        at: nowIso,
      })
      changed = true
      return {
        ...item,
        planningVersions: planning.versions,
        stageApprovals: planning.approvals,
        timelineEntries: appendCaseTimelineEntry(item, createCaseTimelineEntry({
          at: nowIso,
          type: 'planning_version_approved',
          title: `Planejamento ${version.label} aprovado`,
          description: 'Aprovação registrada no portal do dentista.',
          actorName: this.currentUser?.name,
          actorEmail: this.currentUser?.email,
          metadata: {
            caseId: item.id,
            caseLifecycleStatus: item.lifecycleStatus,
          },
        })),
        updatedAt: nowIso,
      }
    })

    const updated = db.cases.find((item) => item.id === input.caseId) ?? null
    if (!changed || !updated) return err('Versão de planejamento não encontrada.')

    const enrichedCase = CaseLifecycleService.refreshCase(updated, relatedLabOrders(db, updated.id))
    db.cases = db.cases.map((item) => (item.id === enrichedCase.id ? enrichedCase : item))
    pushAudit(db, {
      entity: 'case',
      entityId: enrichedCase.id,
      action: 'case.planning_version_approved',
      message: 'Versao de planejamento aprovada.',
      context: {
        caseId: enrichedCase.id,
        treatmentCode: enrichedCase.treatmentCode ?? enrichedCase.id,
        versionId: input.versionId,
      },
    })
    saveDb(db)
    return ok(enrichedCase)
  }

  listTimeline(caseId: string): Result<Case['timelineEntries'], string> {
    const db = loadDb()
    const caseItem = visibleCases(db, this.currentUser).find((item) => item.id === caseId)
    if (!caseItem) return err('Caso não encontrado.')
    const enrichedCase = CaseLifecycleService.refreshCase(caseItem, relatedLabOrders(db, caseId))
    return ok(CaseTimelineService.list(enrichedCase, db.auditLogs ?? []))
  }
}

export function createLocalCaseRepository(currentUser: User | null) {
  return new LocalCaseRepository(currentUser)
}
