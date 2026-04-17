import { beforeEach, describe, expect, it } from 'vitest'
import { loadDb } from '../../../data/db'
import { getCase } from '../../../data/caseRepo'
import { getScan } from '../../../data/scanRepo'
import { clearQaSeed, seedQaData } from '../../seed'
import {
  AddCaseNoteUseCase,
  ApprovePlanningVersionUseCase,
  CaseFinancialService,
  CaseLifecycleService,
  CaseTimelineService,
  CreateCaseFromScanUseCase,
  ListCaseTimelineUseCase,
  PublishPlanningVersionUseCase,
  UpdateCaseStatusUseCase,
} from '../../../modules/cases'
import { createLocalCaseRepository } from '../../../modules/cases/infra/local/LocalCaseRepository'
import type { LabOrder } from '../../../modules/lab'

describe('Cases module', () => {
  beforeEach(() => {
    clearQaSeed()
    seedQaData()
  })

  it('creates case from approved scan with standardized code and initial timeline', () => {
    const repository = createLocalCaseRepository(null)
    const useCase = new CreateCaseFromScanUseCase(repository)

    return Promise.resolve(useCase.execute({
      scanId: 'qa_scan_1',
      totalTraysUpper: 12,
      totalTraysLower: 10,
      changeEveryDays: 7,
      attachmentBondingTray: true,
      planningNote: 'Planejamento inicial',
    })).then((result) => {
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.data.caseId).toMatch(/^ORTH-\d{5}$/)
      expect(result.data.caseItem.timelineEntries?.[0]?.type).toBe('case_created')
      expect(result.data.caseItem.planningNote).toBe('Planejamento inicial')
      expect(getScan('qa_scan_1')?.status).toBe('convertido')
      expect(getScan('qa_scan_1')?.linkedCaseId).toBe(result.data.caseId)
      const audit = loadDb().auditLogs.find((entry) => entry.entityId === result.data.caseId && entry.action === 'case.create_from_scan')
      expect(audit?.context?.scanId).toBe('qa_scan_1')
      expect(audit?.context?.treatmentCode).toBe(result.data.caseId)
    })
  })

  it('updates case status with phase normalization and traceability', async () => {
    const repository = createLocalCaseRepository(null)
    const useCase = new UpdateCaseStatusUseCase(repository)

    const result = await Promise.resolve(useCase.execute({
      caseId: 'qa_case_1',
      nextStatus: 'em_producao',
      reason: 'Produção iniciada.',
    }))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.status).toBe('em_producao')
    expect(result.data.phase).toBe('em_producao')
    expect(result.data.timelineEntries?.[0]?.type).toBe('status_changed')
    const audit = loadDb().auditLogs.find((entry) => entry.entityId === 'qa_case_1' && entry.action === 'case.status_changed')
    expect(audit?.context?.caseId).toBe('qa_case_1')
    expect(audit?.context?.nextStatus).toBe('em_producao')
    expect(result.data.timelineEntries?.[0]?.description).toContain('Produção iniciada')
  })

  it('preserves budget workflow phase after concluding planning', async () => {
    const repository = createLocalCaseRepository(null)
    const createCase = new CreateCaseFromScanUseCase(repository)
    const useCase = new UpdateCaseStatusUseCase(repository)

    const created = await Promise.resolve(createCase.execute({
      scanId: 'qa_scan_1',
      totalTraysUpper: 12,
      totalTraysLower: 10,
      changeEveryDays: 7,
      attachmentBondingTray: true,
      planningNote: 'Planejamento inicial',
    }))

    expect(created.ok).toBe(true)
    if (!created.ok) return

    const result = await Promise.resolve(useCase.execute({
      caseId: created.data.caseId,
      nextStatus: 'planejamento',
      nextPhase: 'orçamento',
      reason: 'Planejamento concluido.',
    }))

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.status).toBe('planejamento')
    expect(result.data.phase).toBe('orçamento')
    expect(repository.findById(created.data.caseId)?.phase).toBe('orçamento')
  })

  it('adds case notes by scope and updates tray notes through the use case', async () => {
    const repository = createLocalCaseRepository(null)
    const useCase = new AddCaseNoteUseCase(repository)

    const result = await Promise.resolve(useCase.execute({
      caseId: 'qa_case_1',
      scope: 'tray',
      trayNumber: 1,
      note: 'Ajustar recorte da placa',
    }))

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.trays.find((tray) => tray.trayNumber === 1)?.notes).toBe('Ajustar recorte da placa')
    expect(result.data.timelineEntries?.[0]?.type).toBe('note_added')
    expect(result.data.timelineEntries?.[0]?.metadata?.trayNumber).toBe(1)
  })

  it('lists consolidated timeline entries from domain timeline and audit trail', async () => {
    const repository = createLocalCaseRepository(null)
    const updateStatus = new UpdateCaseStatusUseCase(repository)
    const addNote = new AddCaseNoteUseCase(repository)
    const listTimeline = new ListCaseTimelineUseCase(repository)
    const current = getCase('qa_case_1')
    const nextStatus = current?.status === 'em_producao' ? 'em_entrega' : 'em_producao'

    const updateResult = await Promise.resolve(updateStatus.execute({
      caseId: 'qa_case_1',
      nextStatus,
      reason: 'Linha do tempo de teste.',
    }))
    expect(updateResult.ok).toBe(true)
    await Promise.resolve(addNote.execute({
      caseId: 'qa_case_1',
      scope: 'budget',
      note: 'Orçamento revisado',
    }))

    const result = await Promise.resolve(listTimeline.execute({ caseId: 'qa_case_1' }))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const types = new Set((result.data ?? []).map((entry) => entry.type))
    expect(types.has('note_added')).toBe(true)
    expect(types.has('case_created')).toBe(true)
    expect(types.has('audit')).toBe(true)
  })

  it('derives lifecycle and treatment status through CaseLifecycleService', () => {
    const caseItem = getCase('qa_case_1')
    expect(caseItem).toBeTruthy()
    if (!caseItem) return

    const lifecycle = CaseLifecycleService.deriveLifecycleFromTrays(caseItem, caseItem.trays.map((tray, index) => (
      index === 0 ? { ...tray, state: 'entregue' } : tray
    )))
    expect(lifecycle.status).toBe('em_entrega')

    const status = CaseLifecycleService.deriveTreatmentStatus({
      installedAt: '2026-03-01',
      changeEveryDays: 7,
      totalUpper: 10,
      totalLower: 10,
      deliveredUpper: 3,
      deliveredLower: 3,
      completedUpper: 3,
      completedLower: 3,
      todayIso: '2026-03-20',
      nextDueDate: '2026-03-15',
    })
    expect(status).toBe('aguardando_reposicao')
  })

  it('blocks status update without permission when actor is provided', async () => {
    const repository = createLocalCaseRepository(null)
    const receptionist = {
      id: 'qa_receptionist',
      name: 'Recepcao',
      email: 'recepcao@qa.local',
      role: 'receptionist',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    } as const
    const useCase = new UpdateCaseStatusUseCase(repository, receptionist)

    const result = await Promise.resolve(useCase.execute({
      caseId: 'qa_case_1',
      nextStatus: 'em_producao',
    }))

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('Sem permissao')
  })

  it('derives the orthodontic lifecycle across lab and delivery milestones', async () => {
    const repository = createLocalCaseRepository(null)
    const created = await Promise.resolve(new CreateCaseFromScanUseCase(repository).execute({
      scanId: 'qa_scan_1',
      totalTraysUpper: 12,
      totalTraysLower: 10,
      changeEveryDays: 7,
      attachmentBondingTray: true,
      planningNote: 'Lifecycle domain test',
    }))
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const caseItem = created.data.caseItem

    const baseOrder: LabOrder = {
      id: 'lab_domain_case_1',
      caseId: caseItem.id,
      patientName: caseItem.patientName,
      trayNumber: 1,
      dueDate: '2026-03-10',
      status: 'aguardando_iniciar',
      priority: 'Urgente',
      plannedDate: '2026-03-01',
      arch: 'ambos',
      createdAt: '2026-03-01T09:00:00.000Z',
      updatedAt: '2026-03-01T09:00:00.000Z',
      requestKind: 'producao',
    }

    const scenarios: Array<{ label: string; caseOverride?: Partial<typeof caseItem>; order?: Partial<LabOrder>; expected: string }> = [
      { label: 'case_created', expected: 'case_created' },
      { label: 'in_production', order: { status: 'em_producao' }, expected: 'in_production' },
      { label: 'qc', order: { status: 'controle_qualidade' }, expected: 'qc' },
      { label: 'shipped', order: { status: 'prontas' }, expected: 'shipped' },
      { label: 'delivered', order: { status: 'prontas', deliveredToProfessionalAt: '2026-03-11' }, expected: 'delivered' },
      { label: 'in_use', caseOverride: { installation: { ...(caseItem.installation ?? {}), installedAt: '2026-03-12' } }, expected: 'in_use' },
      {
        label: 'rework',
        caseOverride: {
          trays: caseItem.trays.map((tray) => (
            tray.trayNumber === 1 ? { ...tray, state: 'rework' } : tray
          )),
        },
        expected: 'rework',
      },
    ]

    scenarios.forEach(({ caseOverride, order, expected }) => {
      const snapshot = CaseLifecycleService.deriveLifecycleSnapshot(
        { ...caseItem, ...caseOverride } as typeof caseItem,
        order ? [{ ...baseOrder, ...order }] : [],
      )
      expect(snapshot.lifecycleStatus).toBe(expected)
    })
  })

  it('builds auditable timeline with domain events ordered from newest to oldest', () => {
    const caseItem = getCase('qa_case_1')
    expect(caseItem).toBeTruthy()
    if (!caseItem) return

    const snapshot = CaseLifecycleService.refreshCase(caseItem, [
      {
        id: 'lab_domain_timeline',
        caseId: caseItem.id,
        patientName: caseItem.patientName,
        trayNumber: 1,
        dueDate: '2026-03-10',
        status: 'prontas',
        priority: 'Urgente',
        plannedDate: '2026-03-01',
        arch: 'ambos',
        createdAt: '2026-03-01T09:00:00.000Z',
        updatedAt: '2026-03-11T10:00:00.000Z',
        deliveredToProfessionalAt: '2026-03-12',
        requestKind: 'producao',
      },
    ])

    const timeline = CaseTimelineService.list(snapshot, loadDb().auditLogs)
    expect(timeline.length).toBeGreaterThan(0)
    expect(timeline[0].at >= timeline[timeline.length - 1].at).toBe(true)
    expect(timeline.some((entry) => entry.metadata?.domainEvent === 'CaseCreated')).toBe(true)
    expect(timeline.some((entry) => entry.metadata?.domainEvent === 'LabShipped')).toBe(true)
  })

  it('publishes and approves planning versions with audit-ready history', async () => {
    const repository = createLocalCaseRepository(null)
    const publish = new PublishPlanningVersionUseCase(repository)
    const approve = new ApprovePlanningVersionUseCase(repository)

    const published = await Promise.resolve(publish.execute({
      caseId: 'qa_case_1',
      note: 'Ajuste de attachment e expansao no setup.',
    }))
    expect(published.ok).toBe(true)
    if (!published.ok) return

    const latestVersion = published.data.planningVersions?.[0]
    expect(latestVersion?.label).toBe('v2')
    expect(latestVersion?.status).toBe('submitted')
    expect(published.data.stageApprovals?.some((item) => item.planningVersionId === latestVersion?.id && item.status === 'pending')).toBe(true)

    const approved = await Promise.resolve(approve.execute({
      caseId: 'qa_case_1',
      versionId: latestVersion?.id ?? '',
    }))
    expect(approved.ok).toBe(true)
    if (!approved.ok) return
    expect(approved.data.planningVersions?.find((item) => item.id === latestVersion?.id)?.status).toBe('approved')
  })

  it('estimates financial summary per case including rework impact', () => {
    const caseItem = getCase('qa_case_1')
    expect(caseItem).toBeTruthy()
    if (!caseItem) return

    const summary = CaseFinancialService.evaluate({
      ...caseItem,
      budget: { value: 5200 },
      reworkSummary: {
        originalCaseId: caseItem.id,
        reworkCount: 1,
        affectedTrayNumbers: [2],
        estimatedFinancialImpact: 180,
        currency: 'BRL',
      },
    }, [])

    expect(summary.revenue).toBe(5200)
    expect(summary.reworkCost).toBe(180)
    expect(summary.margin).toBeLessThan(summary.revenue)
  })
})
