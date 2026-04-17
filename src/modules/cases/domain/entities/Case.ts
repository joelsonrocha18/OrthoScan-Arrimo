import { normalizeOrthTreatmentCode } from '../../../../lib/treatmentCode'
import { inferTreatmentOriginFromClinic } from '../../../../lib/treatmentOrigin'
import { createOrthoDomainEvent } from '../../../../shared/domain'
import { createValidationError } from '../../../../shared/errors'
import { addDaysToIsoDate, nowIsoDateTime, toIsoDate } from '../../../../shared/utils/date'
import { createEntityId } from '../../../../shared/utils/id'
import type { Case as BaseCase, CaseTimelineEntry, CaseTray } from '../../../../types/Case'
import { isAlignerProductType, normalizeProductType } from '../../../../types/Product'
import type { Scan, ScanAttachment } from '../../../../types/Scan'

export type Case = BaseCase
export type CaseNoteScope = 'planning' | 'budget' | 'contract' | 'installation' | 'tray' | 'general'

export type CreateCaseFromScanDraftInput = {
  scanId: string
  scan: Scan
  totalTraysUpper?: number
  totalTraysLower?: number
  changeEveryDays: number
  attachmentBondingTray: boolean
  planningNote?: string
  treatmentCode: string
  treatmentOrigin: 'interno' | 'externo'
  nowIso?: string
}

export function normalizeCaseCode(value?: string) {
  return normalizeOrthTreatmentCode(value)
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((value ?? '').trim())
}

export function toReadableCaseCode(value?: string) {
  const raw = (value ?? '').trim()
  if (!raw) return '-'
  if (isUuidLike(raw)) return `CASO-${raw.slice(0, 8).toUpperCase()}`
  if (raw.length > 24 && /^[0-9a-f-]+$/i.test(raw)) return `CASO-${raw.slice(0, 8).toUpperCase()}`
  return raw
}

export function buildPendingCaseTrays(totalTrays: number, scanDate: string, changeEveryDays: number) {
  const trays: CaseTray[] = []
  const baseDate = toIsoDate(scanDate)
  for (let trayNumber = 1; trayNumber <= totalTrays; trayNumber += 1) {
    trays.push({
      trayNumber,
      state: 'pendente',
      dueDate: addDaysToIsoDate(baseDate, changeEveryDays * trayNumber),
    })
  }
  return trays
}

export function normalizeScanAttachmentsForCase(attachments: ScanAttachment[], nowIso = nowIsoDateTime()) {
  return attachments.map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    kind: attachment.kind,
    slotId: attachment.slotId,
    rxType: attachment.rxType,
    arch: attachment.arch,
    isLocal: attachment.isLocal,
    url: attachment.url,
    filePath: attachment.filePath,
    status: attachment.status ?? 'ok',
    attachedAt: attachment.attachedAt ?? attachment.createdAt ?? nowIso,
    note: attachment.note,
    flaggedAt: attachment.flaggedAt,
    flaggedReason: attachment.flaggedReason,
    createdAt: attachment.createdAt ?? nowIso,
  }))
}

export function resolveTreatmentOriginFromClinic(
  clinicId: string | undefined,
  clinicsById?: Map<string, { tradeName?: string }>,
) {
  return inferTreatmentOriginFromClinic(clinicId, clinicsById) ?? 'externo'
}

export function resolveCaseTotalsFromScan(
  scan: Pick<Scan, 'arch' | 'purposeProductId' | 'purposeProductType'>,
  payload: Pick<CreateCaseFromScanDraftInput, 'totalTraysUpper' | 'totalTraysLower'>,
) {
  const selectedProductType = normalizeProductType(scan.purposeProductType ?? scan.purposeProductId)
  const isAlignerFlow = isAlignerProductType(selectedProductType)
  const upper = payload.totalTraysUpper ?? 0
  const lower = payload.totalTraysLower ?? 0
  const normalizedUpper = isAlignerFlow ? (scan.arch === 'inferior' ? 0 : Math.max(0, Math.trunc(upper))) : 0
  const normalizedLower = isAlignerFlow ? (scan.arch === 'superior' ? 0 : Math.max(0, Math.trunc(lower))) : 0
  const totalTrays = Math.max(normalizedUpper, normalizedLower)
  return {
    productType: selectedProductType,
    isAlignerFlow,
    totalTrays,
    totalTraysUpper: normalizedUpper || undefined,
    totalTraysLower: normalizedLower || undefined,
  }
}

export function assertCanCreateCaseFromScan(scan: Pick<Scan, 'status' | 'linkedCaseId'>, totalTrays: number, isAlignerFlow: boolean) {
  if (scan.status !== 'aprovado') {
    throw createValidationError('Apenas exames aprovados podem gerar caso.')
  }
  if (scan.linkedCaseId) {
    throw createValidationError('Este exame já foi convertido em caso.')
  }
  if (isAlignerFlow && totalTrays <= 0) {
    throw createValidationError('Informe total de placas superior e/ou inferior.')
  }
}

export function createCaseTimelineEntry(input: Omit<CaseTimelineEntry, 'id' | 'source'> & { id?: string; source?: CaseTimelineEntry['source'] }) {
  return {
    id: input.id ?? createEntityId('case-timeline'),
    source: input.source ?? 'domain',
    ...input,
  } satisfies CaseTimelineEntry
}

export function appendCaseTimelineEntry(caseItem: Pick<Case, 'timelineEntries'>, entry: CaseTimelineEntry) {
  const current = caseItem.timelineEntries ?? []
  return [entry, ...current].slice(0, 400)
}

export function buildCaseFromScanDraft(input: CreateCaseFromScanDraftInput): Case {
  const nowIso = input.nowIso ?? nowIsoDateTime()
  const {
    productType,
    isAlignerFlow,
    totalTrays,
    totalTraysUpper,
    totalTraysLower,
  } = resolveCaseTotalsFromScan(input.scan, input)
  assertCanCreateCaseFromScan(input.scan, totalTrays, isAlignerFlow)

  const initialTimeline = createCaseTimelineEntry({
    at: nowIso,
    type: 'case_created',
    title: 'Caso criado a partir do exame',
    description: `Caso ${input.treatmentCode} criado a partir do scan ${input.scanId}.`,
    metadata: {
      status: 'planejamento',
      phase: 'planejamento',
      caseLifecycleStatus: 'case_created',
      domainEvent: 'CaseCreated',
      caseId: input.treatmentCode,
    },
  })

  const approvedEvent = createOrthoDomainEvent('CaseApproved', input.treatmentCode, 'case', {
    caseId: input.treatmentCode,
    scanId: input.scanId,
    sourceStatus: input.scan.status,
  }, input.scan.updatedAt ?? input.scan.createdAt ?? nowIso)

  const createdEvent = createOrthoDomainEvent('CaseCreated', input.treatmentCode, 'case', {
    caseId: input.treatmentCode,
    scanId: input.scanId,
    treatmentCode: input.treatmentCode,
  }, nowIso)

  return {
    id: input.treatmentCode,
    productType,
    productId: productType,
    requestedProductId: input.scan.purposeProductId,
    requestedProductLabel: input.scan.purposeLabel,
    treatmentCode: input.treatmentCode,
    treatmentOrigin: input.treatmentOrigin,
    patientName: input.scan.patientName,
    patientId: input.scan.patientId,
    dentistId: input.scan.dentistId,
    requestedByDentistId: input.scan.requestedByDentistId,
    clinicId: input.scan.clinicId,
    scanDate: toIsoDate(input.scan.scanDate),
    totalTrays: isAlignerFlow ? totalTrays : 0,
    totalTraysUpper,
    totalTraysLower,
    changeEveryDays: isAlignerFlow ? Math.max(1, Math.trunc(input.changeEveryDays)) : 0,
    attachmentBondingTray: isAlignerFlow ? input.attachmentBondingTray : false,
    status: 'planejamento',
    phase: 'planejamento',
    budget: undefined,
    contract: { status: 'pendente' },
    deliveryLots: [],
    installation: undefined,
    trays: isAlignerFlow ? buildPendingCaseTrays(totalTrays, input.scan.scanDate, input.changeEveryDays) : [],
    attachments: [],
    sourceScanId: input.scan.id,
    sourceExamCode: input.scan.shortId,
    arch: input.scan.arch,
    planningNote: input.planningNote?.trim() || undefined,
    complaint: input.scan.complaint,
    dentistGuidance: input.scan.dentistGuidance,
    lifecycleStatus: 'case_created',
    domainEvents: [createdEvent, approvedEvent],
    sla: { overallStatus: 'on_track', alerts: [] },
    reworkSummary: {
      originalCaseId: input.treatmentCode,
      reworkCount: 0,
      affectedTrayNumbers: [],
      estimatedFinancialImpact: 0,
      currency: 'BRL',
    },
    timelineEntries: [initialTimeline],
    scanFiles: normalizeScanAttachmentsForCase(input.scan.attachments, nowIso),
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}
