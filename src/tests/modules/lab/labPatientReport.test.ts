import { describe, expect, it } from 'vitest'
import { LabPatientReportService } from '../../../modules/lab'
import type { Case } from '../../../types/Case'
import type { LabOrder } from '../../../modules/lab'

function makeCase(overrides?: Partial<Case>): Case {
  return {
    id: 'case_report_1',
    treatmentCode: 'ORTH-00099',
    productType: 'alinhador_12m',
    productId: 'alinhador_12m',
    treatmentOrigin: 'interno',
    patientName: 'Maria Souza',
    patientId: 'pat_1',
    dentistId: 'dent_1',
    clinicId: 'clinic_1',
    scanDate: '2026-03-01',
    totalTrays: 12,
    totalTraysUpper: 12,
    totalTraysLower: 12,
    changeEveryDays: 10,
    status: 'em_producao',
    phase: 'em_producao',
    deliveryLots: [
      {
        id: 'lot_1',
        arch: 'ambos',
        fromTray: 1,
        toTray: 3,
        quantity: 3,
        deliveredToDoctorAt: '2026-03-20',
        createdAt: '2026-03-20T00:00:00.000Z',
      },
    ],
    installation: {
      installedAt: '2026-03-20',
      deliveredUpper: 3,
      deliveredLower: 3,
      actualChangeDates: [
        { trayNumber: 2, changedAt: '2026-03-30', arch: 'ambos' },
        { trayNumber: 3, changedAt: '2026-04-09', arch: 'ambos' },
      ],
    },
    trays: [
      { trayNumber: 1, state: 'entregue' },
      { trayNumber: 2, state: 'entregue' },
      { trayNumber: 3, state: 'entregue' },
    ],
    attachments: [],
    arch: 'ambos',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
    ...overrides,
  }
}

describe('LabPatientReportService', () => {
  it('builds patient report rows with replacement forecast and deadline', () => {
    const rows = LabPatientReportService.buildRows({
      cases: [makeCase()],
      labOrders: [
        {
          id: 'lab_ready_1',
          caseId: 'case_report_1',
          patientName: 'Maria Souza',
          trayNumber: 3,
          dueDate: '2026-03-19',
          status: 'prontas',
          priority: 'Medio',
          plannedDate: '2026-03-15',
          arch: 'ambos',
          requestKind: 'producao',
          createdAt: '2026-03-15T00:00:00.000Z',
          updatedAt: '2026-03-19T00:00:00.000Z',
        } satisfies LabOrder,
      ],
      dentistsById: new Map([['dent_1', { name: 'Dr. Joao' }]]),
      guideAutomationLeadDays: 10,
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      caseNumber: 'ORTH-00099',
      patientName: 'Maria Souza',
      dentistName: 'Dr. Joao',
      treatment: 'Alinhador',
      changeDays: 10,
      status: 'Pronto para entrega',
      treatmentOrigin: 'Interno',
      deliveredToDentist: 'Sup 3 | Inf 3',
      lastPatientChangeDate: '09/04/2026',
      predictedReplacementDate: '24/04/2026',
      replacementDeliveryDeadline: '14/04/2026',
    })
  })
})
