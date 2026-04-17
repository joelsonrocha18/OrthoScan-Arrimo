import type { Case } from '../../../../types/Case'
import type { ProductType } from '../../../../types/Product'
import { normalizeProductType } from '../../../../types/Product'
import { nowIsoDateTime } from '../../../../shared/utils/date'
import type { LabOrder } from '../../domain/entities/LabOrder'
import type { LabCasePrintFallback } from '../../application/ports/LabRepository'
import { ProductionQueueService } from '../../domain/services/ProductionQueueService'

export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export function asText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function asNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function asProductType(value: unknown, fallback: ProductType = 'alinhador_12m') {
  return normalizeProductType(value, fallback)
}

export function nextRequestRevisionFromCodes(baseCode: string, codes: string[]) {
  const escapedBase = baseCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^${escapedBase}/(\\d+)$`)
  const max = codes.reduce((acc, code) => {
    const match = code.match(regex)
    if (!match) return acc
    return Math.max(acc, Number(match[1]))
  }, 0)
  return max + 1
}

export function mapSupabaseCaseRow(
  row: Record<string, unknown>,
  sourceScanData: Record<string, unknown>,
  treatmentCodeFromScan: string,
) {
  const data = asObject(row.data)
  const createdAt = nowIsoDateTime()
  return {
    id: asText(row.id),
    shortId: asText(data.shortId) || undefined,
    productType: normalizeProductType(data.productType ?? data.productId),
    productId: normalizeProductType(data.productId ?? data.productType),
    requestedProductId: asText(data.requestedProductId, asText(sourceScanData.purposeProductId)) || undefined,
    requestedProductLabel: asText(data.requestedProductLabel, asText(sourceScanData.purposeLabel)) || undefined,
    patientId: asText(data.patientId, asText(row.patient_id)) || undefined,
    dentistId: asText(data.dentistId, asText(row.dentist_id)) || undefined,
    clinicId: asText(data.clinicId, asText(row.clinic_id)) || undefined,
    treatmentCode: asText(data.treatmentCode) || treatmentCodeFromScan || undefined,
    treatmentOrigin: asText(data.treatmentOrigin, 'externo') as 'interno' | 'externo',
    patientName: asText(data.patientName, '-'),
    requestedByDentistId: asText(row.requested_by_dentist_id) || undefined,
    scanDate: asText(data.scanDate, createdAt.slice(0, 10)),
    totalTrays: asNumber(data.totalTrays, 0),
    changeEveryDays: asNumber(data.changeEveryDays, 7),
    totalTraysUpper: asNumber(data.totalTraysUpper, asNumber(data.totalTrays, 0)),
    totalTraysLower: asNumber(data.totalTraysLower, asNumber(data.totalTrays, 0)),
    attachmentBondingTray: Boolean(data.attachmentBondingTray),
    status: asText(data.status, 'planejamento') as Case['status'],
    phase: asText(data.phase, 'planejamento') as Case['phase'],
    budget: data.budget as Case['budget'],
    contract: data.contract as Case['contract'],
    deliveryLots: (data.deliveryLots as Case['deliveryLots']) ?? [],
    installation: data.installation as Case['installation'],
    trays: (data.trays as Case['trays']) ?? [],
    attachments: [],
    sourceScanId: asText(data.sourceScanId, asText(row.scan_id)) || undefined,
    arch: asText(data.arch, 'ambos') as Case['arch'],
    complaint: asText(data.complaint) || undefined,
    dentistGuidance: asText(data.dentistGuidance) || undefined,
    scanFiles: data.scanFiles as Case['scanFiles'],
    createdAt: asText(data.createdAt, createdAt),
    updatedAt: asText(data.updatedAt, createdAt),
  } satisfies Case
}

export function mapSupabaseLabRow(row: Record<string, unknown>) {
  const data = asObject(row.data)
  const createdAt = asText(row.created_at, nowIsoDateTime())
  const updatedAt = asText(row.updated_at, createdAt)
  const order = {
    id: asText(row.id),
    productType: normalizeProductType(data.productType ?? data.productId),
    productId: normalizeProductType(data.productId ?? data.productType),
    requestedProductId: asText(data.requestedProductId) || undefined,
    requestedProductLabel: asText(data.requestedProductLabel) || undefined,
    patientId: asText(data.patientId) || undefined,
    dentistId: asText(data.dentistId) || undefined,
    clinicId: asText(row.clinic_id, asText(data.clinicId)) || undefined,
    requestCode: asText(data.requestCode) || undefined,
    requestKind: asText(data.requestKind, 'producao') as LabOrder['requestKind'],
    expectedReplacementDate: asText(data.expectedReplacementDate) || undefined,
    deliveredToProfessionalAt: asText(data.deliveredToProfessionalAt) || undefined,
    caseId: asText(row.case_id) || undefined,
    arch: asText(data.arch, 'ambos') as LabOrder['arch'],
    plannedUpperQty: asNumber(data.plannedUpperQty, 0),
    plannedLowerQty: asNumber(data.plannedLowerQty, 0),
    planningDefinedAt: asText(data.planningDefinedAt) || undefined,
    trayNumber: asNumber(row.tray_number, asNumber(data.trayNumber, 1)),
    patientName: asText(data.patientName, '-'),
    plannedDate: asText(data.plannedDate, createdAt.slice(0, 10)),
    dueDate: asText(data.dueDate, createdAt.slice(0, 10)),
    status: asText(row.status, 'aguardando_iniciar') as LabOrder['status'],
    stage: asText(data.stage) as LabOrder['stage'] | undefined,
    stageTimeline: data.stageTimeline as LabOrder['stageTimeline'],
    sla: data.sla as LabOrder['sla'],
    productionChecklist: data.productionChecklist as LabOrder['productionChecklist'],
    reworkOfCaseId: asText(data.reworkOfCaseId) || undefined,
    reworkOfLabOrderId: asText(data.reworkOfLabOrderId) || undefined,
    reworkOfTrayNumber: typeof data.reworkOfTrayNumber === 'number' ? data.reworkOfTrayNumber : undefined,
    financialImpact: data.financialImpact as LabOrder['financialImpact'],
    domainEvents: data.domainEvents as LabOrder['domainEvents'],
    priority: asText(row.priority, 'Medio') as LabOrder['priority'],
    notes: asText(row.notes, asText(data.notes)) || undefined,
    createdAt,
    updatedAt,
  } satisfies LabOrder
  return ProductionQueueService.enrichOrder(order)
}

export function buildCasePrintFallback(row: Record<string, unknown>, sourceScanData: Record<string, unknown>): LabCasePrintFallback {
  const data = asObject(row.data)
  return {
    clinicName: asText(data.clinicName, asText(sourceScanData.clinicName)),
    dentistName: asText(data.dentistName, asText(sourceScanData.dentistName)),
    requesterName: asText(
      data.requestedByDentistName,
      asText(data.requesterName, asText(sourceScanData.requestedByDentistName, asText(sourceScanData.requesterName, asText(sourceScanData.dentistName)))),
    ),
    patientBirthDate: asText(
      data.patientBirthDate,
      asText(data.birthDate, asText(sourceScanData.patientBirthDate, asText(sourceScanData.birthDate))),
    ),
  }
}
