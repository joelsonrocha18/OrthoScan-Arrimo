import { normalizeProductType } from '../../../../types/Product'
import type { Scan, ScanAttachment } from '../../../../types/Scan'
import type { Case, CaseTray } from '../../../../types/Case'
import { nowIsoDateTime } from '../../../../shared/utils/date'
import { CaseLifecycleService } from '../../domain/services/CaseLifecycleService'

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function mapSupabaseScanRow(row: {
  id: string
  clinic_id?: string | null
  patient_id?: string | null
  dentist_id?: string | null
  requested_by_dentist_id?: string | null
  created_at?: string
  data?: Record<string, unknown>
}): Scan {
  const data = row.data ?? {}
  const now = nowIsoDateTime()
  return {
    id: row.id,
    shortId: data.shortId as string | undefined,
    clinicId: row.clinic_id ?? undefined,
    patientId: row.patient_id ?? undefined,
    dentistId: row.dentist_id ?? undefined,
    requestedByDentistId: row.requested_by_dentist_id ?? undefined,
    patientName: (data.patientName as string | undefined) ?? '-',
    purposeProductId: data.purposeProductId as string | undefined,
    purposeProductType: data.purposeProductType as string | undefined,
    purposeLabel: data.purposeLabel as string | undefined,
    serviceOrderCode: data.serviceOrderCode as string | undefined,
    scanDate: (data.scanDate as string | undefined) ?? (row.created_at ?? now).slice(0, 10),
    arch: (data.arch as Scan['arch'] | undefined) ?? 'ambos',
    complaint: data.complaint as string | undefined,
    dentistGuidance: data.dentistGuidance as string | undefined,
    notes: data.notes as string | undefined,
    planningDetectedUpperTrays: data.planningDetectedUpperTrays as number | undefined,
    planningDetectedLowerTrays: data.planningDetectedLowerTrays as number | undefined,
    planningDetectedAt: data.planningDetectedAt as string | undefined,
    planningDetectedSource: data.planningDetectedSource as Scan['planningDetectedSource'] | undefined,
    attachments: (Array.isArray(data.attachments) ? data.attachments : []) as ScanAttachment[],
    status: (data.status as Scan['status'] | undefined) ?? 'pendente',
    linkedCaseId: data.linkedCaseId as string | undefined,
    createdAt: (data.createdAt as string | undefined) ?? row.created_at ?? now,
    updatedAt: (data.updatedAt as string | undefined) ?? row.created_at ?? now,
  }
}

export function mapSupabaseCaseRow(row: {
  id: string
  product_type?: string
  product_id?: string
  scan_id?: string | null
  clinic_id?: string | null
  patient_id?: string | null
  dentist_id?: string | null
  requested_by_dentist_id?: string | null
  data?: Record<string, unknown>
}): Case {
  const data = row.data ?? {}
  const now = nowIsoDateTime()
  const mappedCase: Case = {
    id: row.id,
    productType: normalizeProductType(row.product_id ?? row.product_type ?? data.productId ?? data.productType),
    productId: normalizeProductType(row.product_id ?? row.product_type ?? data.productId ?? data.productType),
    requestedProductId: data.requestedProductId as string | undefined,
    requestedProductLabel: data.requestedProductLabel as string | undefined,
    treatmentCode: data.treatmentCode as string | undefined,
    treatmentOrigin: data.treatmentOrigin as Case['treatmentOrigin'] | undefined,
    patientName: (data.patientName as string | undefined) ?? '-',
    patientId: (data.patientId as string | undefined) ?? row.patient_id ?? undefined,
    dentistId: (data.dentistId as string | undefined) ?? row.dentist_id ?? undefined,
    requestedByDentistId: (data.requestedByDentistId as string | undefined) ?? row.requested_by_dentist_id ?? undefined,
    clinicId: (data.clinicId as string | undefined) ?? row.clinic_id ?? undefined,
    scanDate: (data.scanDate as string | undefined) ?? now.slice(0, 10),
    totalTrays: (data.totalTrays as number | undefined) ?? 0,
    changeEveryDays: (data.changeEveryDays as number | undefined) ?? 7,
    totalTraysUpper: data.totalTraysUpper as number | undefined,
    totalTraysLower: data.totalTraysLower as number | undefined,
    attachmentBondingTray: data.attachmentBondingTray as boolean | undefined,
    status: (data.status as Case['status'] | undefined) ?? 'planejamento',
    phase: (data.phase as Case['phase'] | undefined) ?? 'planejamento',
    budget: data.budget as Case['budget'] | undefined,
    contract: data.contract as Case['contract'] | undefined,
    deliveryLots: (data.deliveryLots as Case['deliveryLots']) ?? [],
    installation: data.installation as Case['installation'] | undefined,
    trays: (data.trays as CaseTray[] | undefined) ?? [],
    attachments: (data.attachments as Case['attachments']) ?? [],
    sourceScanId: (data.sourceScanId as string | undefined) ?? row.scan_id ?? undefined,
    sourceExamCode: data.sourceExamCode as string | undefined,
    arch: data.arch as Case['arch'] | undefined,
    planningNote: data.planningNote as string | undefined,
    complaint: data.complaint as string | undefined,
    dentistGuidance: data.dentistGuidance as string | undefined,
    planningVersions: data.planningVersions as Case['planningVersions'],
    stageApprovals: data.stageApprovals as Case['stageApprovals'],
    financial: data.financial as Case['financial'],
    lifecycleStatus: data.lifecycleStatus as Case['lifecycleStatus'],
    sla: data.sla as Case['sla'],
    reworkSummary: data.reworkSummary as Case['reworkSummary'],
    domainEvents: data.domainEvents as Case['domainEvents'],
    timelineEntries: (data.timelineEntries as Case['timelineEntries']) ?? [],
    scanFiles: data.scanFiles as Case['scanFiles'] | undefined,
    createdAt: (data.createdAt as string | undefined) ?? now,
    updatedAt: (data.updatedAt as string | undefined) ?? now,
  }
  return CaseLifecycleService.refreshCase(mappedCase, [])
}

export { asObject, asText }
