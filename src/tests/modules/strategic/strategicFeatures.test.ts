import { describe, expect, it } from 'vitest'
import { buildExecutiveDashboard } from '../../../modules/dashboard/domain/services/ExecutiveDashboardService'
import { StrategicNotificationsService } from '../../../modules/notifications'
import type { Case } from '../../../types/Case'
import type { Patient } from '../../../types/Patient'
import type { Scan } from '../../../types/Scan'
import type { LabOrder } from '../../../modules/lab'

function buildCase(overrides?: Partial<Case>): Case {
  return {
    id: 'case_1',
    patientId: 'patient_1',
    treatmentCode: 'ORTH-00099',
    patientName: 'Paciente Dashboard',
    scanDate: '2026-03-01',
    totalTrays: 10,
    totalTraysUpper: 10,
    totalTraysLower: 10,
    changeEveryDays: 7,
    status: 'em_producao',
    phase: 'em_producao',
    arch: 'ambos',
    trays: [],
    attachments: [],
    deliveryLots: [],
    planningVersions: [{
      id: 'plan_v2',
      versionNumber: 2,
      label: 'v2',
      status: 'submitted',
      createdAt: '2026-03-10T10:00:00.000Z',
      snapshot: {
        totalTrays: 10,
        totalTraysUpper: 10,
        totalTraysLower: 10,
        changeEveryDays: 7,
        arch: 'ambos',
      },
    }],
    stageApprovals: [{
      id: 'approval_1',
      stage: 'case_created',
      status: 'pending',
      requestedAt: '2026-03-10T10:00:00.000Z',
      planningVersionId: 'plan_v2',
    }],
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z',
    ...overrides,
  }
}

function buildPatient(): Patient {
  return {
    id: 'patient_1',
    name: 'Paciente Dashboard',
    whatsapp: '11999999999',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z',
  }
}

function buildOrder(partial?: Partial<LabOrder>): LabOrder {
  return {
    id: 'lab_1',
    caseId: 'case_1',
    patientName: 'Paciente Dashboard',
    trayNumber: 1,
    dueDate: '2026-03-05',
    status: 'prontas',
    priority: 'Urgente',
    plannedDate: '2026-03-01',
    arch: 'ambos',
    requestKind: 'producao',
    stage: 'shipped',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z',
    ...partial,
  }
}

function buildRejectedScan(): Scan {
  return {
    id: 'scan_1',
    patientName: 'Paciente Dashboard',
    scanDate: '2026-03-01',
    arch: 'ambos',
    attachments: [],
    status: 'reprovado',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-16T10:00:00.000Z',
  }
}

describe('Strategic features', () => {
  it('derives executive dashboard metrics', () => {
    const dashboard = buildExecutiveDashboard({
      cases: [buildCase()],
      patients: [buildPatient()],
      scans: [buildRejectedScan()],
      labOrders: [buildOrder(), buildOrder({ id: 'lab_rework', requestKind: 'reconfeccao', stage: 'rework', status: 'controle_qualidade' })],
    })

    expect(dashboard.kpis.activeCases).toBe(1)
    expect(dashboard.kpis.labBacklog).toBeGreaterThan(0)
    expect(dashboard.kpis.reworkRate).toBeGreaterThan(0)
    expect(dashboard.notifications.length).toBeGreaterThan(0)
  })

  it('derives strategic notifications for rejected scan and case ready', () => {
    const notifications = StrategicNotificationsService.derive({
      cases: [buildCase()],
      patients: [buildPatient()],
      scans: [buildRejectedScan()],
      labOrders: [buildOrder()],
    })

    expect(notifications.some((item) => item.kind === 'scan_rejected')).toBe(true)
    expect(notifications.some((item) => item.kind === 'case_ready')).toBe(true)
    expect(notifications.some((item) => item.kind === 'planning_approval')).toBe(true)
  })

  it('adds a dashboard notification for aligner changes due today with whatsapp action', () => {
    const notifications = StrategicNotificationsService.derive({
      cases: [buildCase({
        totalTrays: 4,
        totalTraysUpper: 4,
        totalTraysLower: 4,
        installation: {
          installedAt: '2026-03-01',
          deliveredUpper: 4,
          deliveredLower: 4,
          actualChangeDates: [{ trayNumber: 2, changedAt: '2026-03-10', arch: 'inferior' }],
        },
      })],
      patients: [buildPatient()],
      scans: [],
      labOrders: [],
      todayIso: '2026-03-17',
    })

    const notification = notifications.find((item) => item.kind === 'aligner_change_due_today')
    expect(notification).toBeTruthy()
    expect(notification?.description).toContain('Paciente Dashboard')
    expect(notification?.description).toContain('alinhador inferior numero 3')
    expect(notification?.actions?.[0]?.href).toContain('wa.me/5511999999999')
  })
})
