import { createCaseFromScanSupabase, patchCaseDataSupabase } from '../../../../repo/profileRepo'
import { supabase } from '../../../../lib/supabaseClient'
import { err, ok, type Result } from '../../../../shared/errors'
import { BUSINESS_EVENTS, logger } from '../../../../shared/observability'
import { nowIsoDateTime } from '../../../../shared/utils/date'
import type { User } from '../../../../types/User'
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
  createCaseTimelineEntry,
  type Case,
} from '../../domain/entities/Case'
import { CasePlanningVersioningService } from '../../domain/services/CasePlanningVersioningService'
import { CaseLifecycleService } from '../../domain/services/CaseLifecycleService'
import { CaseTimelineService } from '../../domain/services/CaseTimelineService'
import { mapSupabaseCaseRow, mapSupabaseScanRow } from './supabaseCaseMappers'

export class SupabaseCaseRepository implements CaseRepository {
  private readonly currentUser: User | null

  constructor(currentUser: User | null) {
    this.currentUser = currentUser
  }

  async findById(id: string) {
    if (!supabase) return null
    const { data } = await supabase
      .from('cases')
      .select('id, product_type, product_id, scan_id, clinic_id, patient_id, dentist_id, requested_by_dentist_id, data, deleted_at')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (!data) return null
    return mapSupabaseCaseRow(data as {
      id: string
      product_type?: string
      product_id?: string
      scan_id?: string | null
      clinic_id?: string | null
      patient_id?: string | null
      dentist_id?: string | null
      requested_by_dentist_id?: string | null
      data?: Record<string, unknown>
    })
  }

  async createFromScan(input: CreateCaseFromScanInput): Promise<Result<{ caseItem: Case; caseId: string }, string>> {
    if (!supabase) return err('Supabase não configurado.')
    const { data, error } = await supabase
      .from('scans')
      .select('id, clinic_id, patient_id, dentist_id, requested_by_dentist_id, created_at, data')
      .eq('id', input.scanId)
      .maybeSingle()
    if (error || !data) return err(error?.message ?? 'Exame não encontrado.')

    const scan = mapSupabaseScanRow(data as {
      id: string
      clinic_id?: string | null
      patient_id?: string | null
      dentist_id?: string | null
      requested_by_dentist_id?: string | null
      created_at?: string
      data?: Record<string, unknown>
    })
    const created = await createCaseFromScanSupabase(scan, input)
    if (!created.ok) return err(created.error)

    const caseItem = await this.findById(created.caseId)
    if (!caseItem) return err('Caso criado, mas não foi possível recarregar o registro.')

    if ((caseItem.timelineEntries?.length ?? 0) === 0) {
      const entry = createCaseTimelineEntry({
        at: caseItem.createdAt,
        type: 'case_created',
        title: 'Caso criado a partir do exame',
        description: `Caso ${caseItem.treatmentCode ?? caseItem.id} criado a partir do exame ${scan.id}.`,
      })
      await patchCaseDataSupabase(caseItem.id, {
        timelineEntries: appendCaseTimelineEntry(caseItem, entry),
      })
      const refreshed = await this.findById(caseItem.id)
      logger.business(BUSINESS_EVENTS.CASE_CREATED, 'Caso criado a partir do exame.', {
        caseId: caseItem.id,
        scanId: scan.id,
        treatmentCode: caseItem.treatmentCode ?? caseItem.id,
        clinicId: caseItem.clinicId,
        patientId: caseItem.patientId,
      }, this.currentUser ? {
        id: this.currentUser.id,
        role: this.currentUser.role,
      } : undefined)
      return ok({ caseItem: refreshed ?? { ...caseItem, timelineEntries: [entry] }, caseId: caseItem.id })
    }

    logger.business(BUSINESS_EVENTS.CASE_CREATED, 'Caso criado a partir do exame.', {
      caseId: caseItem.id,
      scanId: scan.id,
      treatmentCode: caseItem.treatmentCode ?? caseItem.id,
      clinicId: caseItem.clinicId,
      patientId: caseItem.patientId,
    }, this.currentUser ? {
      id: this.currentUser.id,
      role: this.currentUser.role,
    } : undefined)
    return ok({ caseItem, caseId: created.caseId })
  }

  async updateStatus(input: UpdateCaseStatusInput): Promise<Result<Case, string>> {
    const current = await this.findById(input.caseId)
    if (!current) return err('Caso não encontrado.')
    if (!CaseLifecycleService.canTransitionStatus(current.status, input.nextStatus)) {
      return err('Transição de status inválida para este caso.')
    }
    const nextPhase = CaseLifecycleService.resolvePhaseForStatus(input.nextStatus, current.phase, input.nextPhase)
    const entry = createCaseTimelineEntry({
      at: nowIsoDateTime(),
      type: 'status_changed',
      title: 'Status do caso atualizado',
      description: input.reason ?? `Novo status: ${input.nextStatus}.`,
      actorName: this.currentUser?.name,
      actorEmail: this.currentUser?.email,
      metadata: {
        status: input.nextStatus,
        phase: nextPhase,
      },
    })
    const result = await patchCaseDataSupabase(
      input.caseId,
      {
        status: input.nextStatus,
        phase: nextPhase,
        timelineEntries: appendCaseTimelineEntry(current, entry),
      },
      {
        status: input.nextStatus,
        phase: nextPhase,
      },
    )
    if (!result.ok) return err(result.error)
    const updated = await this.findById(input.caseId)
    if (updated) {
      logger.business(BUSINESS_EVENTS.CASE_STATUS_CHANGED, 'Status do caso atualizado.', {
        caseId: updated.id,
        treatmentCode: updated.treatmentCode ?? updated.id,
        previousStatus: current.status,
        previousPhase: current.phase,
        nextStatus: updated.status,
        nextPhase: updated.phase,
      }, this.currentUser ? {
        id: this.currentUser.id,
        role: this.currentUser.role,
      } : undefined)
    }
    return updated ? ok(updated) : err('Caso atualizado, mas não foi possível recarregar o registro.')
  }

  async addNote(input: AddCaseNoteInput): Promise<Result<Case, string>> {
    const current = await this.findById(input.caseId)
    if (!current) return err('Caso não encontrado.')
    const trimmed = input.note.trim()
    if (!trimmed) return err('Observação obrigatória.')

    const patch: Record<string, unknown> = {}
    if (input.scope === 'budget') {
      patch.budget = { ...current.budget, notes: trimmed }
    } else if (input.scope === 'contract') {
      patch.contract = { ...(current.contract ?? { status: 'pendente' }), notes: trimmed }
    } else if (input.scope === 'installation') {
      if (!current.installation) return err('Registro de instalação ainda não existe.')
      patch.installation = { ...current.installation, note: trimmed }
    } else if (input.scope === 'tray') {
      if (!(input.trayNumber && input.trayNumber > 0)) return err('Placa não encontrada.')
      patch.trays = current.trays.map((tray) =>
        tray.trayNumber === input.trayNumber ? { ...tray, notes: trimmed } : tray,
      )
    } else {
      patch.planningNote = trimmed
    }

    patch.timelineEntries = appendCaseTimelineEntry(current, createCaseTimelineEntry({
      at: nowIsoDateTime(),
      type: 'note_added',
      title: 'Observação atualizada',
      description: trimmed,
      actorName: this.currentUser?.name,
      actorEmail: this.currentUser?.email,
      metadata: {
        noteScope: input.scope,
        trayNumber: input.trayNumber,
      },
    }))

    const result = await patchCaseDataSupabase(input.caseId, patch)
    if (!result.ok) return err(result.error)
    const updated = await this.findById(input.caseId)
    return updated ? ok(updated) : err('Caso atualizado, mas não foi possível recarregar o registro.')
  }

  async publishPlanningVersion(input: PublishPlanningVersionInput): Promise<Result<Case, string>> {
    const current = await this.findById(input.caseId)
    if (!current) return err('Caso não encontrado.')
    const nowIso = nowIsoDateTime()
    const planning = CasePlanningVersioningService.createVersion(current, {
      note: input.note,
      actor: this.currentUser ? { id: this.currentUser.id, name: this.currentUser.name } : undefined,
      status: 'submitted',
      stage: 'case_created',
      at: nowIso,
    })
    const entry = createCaseTimelineEntry({
      at: nowIso,
      type: 'planning_version_published',
      title: `Planejamento ${planning.latestVersion.label} publicado`,
      description: input.note?.trim() || 'Versão enviada para aprovação do dentista.',
      actorName: this.currentUser?.name,
      actorEmail: this.currentUser?.email,
      metadata: {
        caseId: current.id,
        caseLifecycleStatus: current.lifecycleStatus,
      },
    })
    const result = await patchCaseDataSupabase(input.caseId, {
      planningVersions: planning.versions,
      stageApprovals: planning.approvals,
      timelineEntries: appendCaseTimelineEntry(current, entry),
    })
    if (!result.ok) return err(result.error)
    const updated = await this.findById(input.caseId)
    return updated ? ok(updated) : err('Caso atualizado, mas não foi possível recarregar a versão publicada.')
  }

  async approvePlanningVersion(input: ApprovePlanningVersionInput): Promise<Result<Case, string>> {
    const current = await this.findById(input.caseId)
    if (!current) return err('Caso não encontrado.')
    const version = current.planningVersions?.find((item) => item.id === input.versionId)
    if (!version) return err('Versão de planejamento não encontrada.')
    const nowIso = nowIsoDateTime()
    const planning = CasePlanningVersioningService.approveVersion(current, {
      versionId: input.versionId,
      actor: this.currentUser ? { id: this.currentUser.id, name: this.currentUser.name } : undefined,
      at: nowIso,
    })
    const entry = createCaseTimelineEntry({
      at: nowIso,
      type: 'planning_version_approved',
      title: `Planejamento ${version.label} aprovado`,
      description: 'Aprovação registrada no portal do dentista.',
      actorName: this.currentUser?.name,
      actorEmail: this.currentUser?.email,
      metadata: {
        caseId: current.id,
        caseLifecycleStatus: current.lifecycleStatus,
      },
    })
    const result = await patchCaseDataSupabase(input.caseId, {
      planningVersions: planning.versions,
      stageApprovals: planning.approvals,
      timelineEntries: appendCaseTimelineEntry(current, entry),
    })
    if (!result.ok) return err(result.error)
    const updated = await this.findById(input.caseId)
    return updated ? ok(updated) : err('Caso atualizado, mas não foi possível recarregar a aprovação.')
  }

  async listTimeline(caseId: string): Promise<Result<Case['timelineEntries'], string>> {
    const caseItem = await this.findById(caseId)
    if (!caseItem) return err('Caso não encontrado.')
    return ok(CaseTimelineService.list(caseItem, []))
  }
}

export function createSupabaseCaseRepository(currentUser: User | null) {
  return new SupabaseCaseRepository(currentUser)
}
