import { getCaseAlignerChangeSummary } from '../../../../lib/alignerChange'
import { resolveRequestedProductLabel } from '../../../../lib/productLabel'
import { addDaysToIsoDate, formatPtBrDate, pickMaxIsoDate } from '../../../../shared/utils/date'
import type { Case } from '../../../../types/Case'
import type { LabOrder } from '../entities/LabOrder'
import { deliveredToDentistByArch } from '../../../cases/domain/services/CaseLifecycleService'

export type LabPatientReportRow = {
  caseNumber: string
  patientName: string
  dentistName: string
  treatment: string
  changeDays: number | ''
  status: string
  treatmentOrigin: string
  deliveredToDentist: string
  lastPatientChangeDate: string
  predictedReplacementDate: string
  replacementDeliveryDeadline: string
}

type BuildLabPatientReportRowsInput = {
  cases: Case[]
  labOrders: LabOrder[]
  dentistsById: Map<string, { name: string }>
  guideAutomationLeadDays: number
}

const LAB_STATUS_PRIORITY: Array<LabOrder['status']> = [
  'aguardando_iniciar',
  'em_producao',
  'controle_qualidade',
  'prontas',
]

const CASE_STATUS_LABEL: Record<Case['status'], string> = {
  planejamento: 'Planejamento',
  em_producao: 'Em produção',
  em_entrega: 'Em entrega',
  em_tratamento: 'Em tratamento',
  aguardando_reposicao: 'Aguardando reposicao',
  finalizado: 'Finalizado',
}

function formatDentistName(name?: string) {
  const normalized = name?.trim() ?? ''
  return normalized || '-'
}

function formatDeliveredByArch(delivered: { upper: number; lower: number }) {
  return `Sup ${Math.max(0, delivered.upper)} | Inf ${Math.max(0, delivered.lower)}`
}

function resolveLiveLabStatus(caseItem: Case, labOrders: LabOrder[]) {
  const openOrders = labOrders.filter((item) => item.caseId === caseItem.id && !item.deliveredToProfessionalAt)
  if (openOrders.length === 0) return undefined

  const best = openOrders.reduce<LabOrder['status'] | undefined>((current, item) => {
    if (!current) return item.status
    return LAB_STATUS_PRIORITY.indexOf(item.status) > LAB_STATUS_PRIORITY.indexOf(current) ? item.status : current
  }, undefined)

  if (best === 'prontas') return 'Pronto para entrega'
  if (best === 'controle_qualidade') return 'Controle de qualidade'
  if (best === 'em_producao') return 'Em produção'
  if (best === 'aguardando_iniciar') return 'Aguardando iniciar'
  return undefined
}

function resolveReportStatus(caseItem: Case, labOrders: LabOrder[]) {
  const liveLabStatus = resolveLiveLabStatus(caseItem, labOrders)
  if (liveLabStatus) return liveLabStatus
  if ((caseItem.deliveryLots?.length ?? 0) > 0 && !caseItem.installation?.installedAt) return 'Entregue ao dentista'
  return CASE_STATUS_LABEL[caseItem.status] ?? caseItem.status
}

function resolveLatestDentistDeliveryBatch(caseItem: Case) {
  const latestDeliveryDate = pickMaxIsoDate((caseItem.deliveryLots ?? []).map((item) => item.deliveredToDoctorAt))
  if (!latestDeliveryDate) {
    return {
      latestDeliveryDate: undefined,
      deliveredUpper: 0,
      deliveredLower: 0,
      batchCount: 0,
    }
  }

  const delivered = (caseItem.deliveryLots ?? [])
    .filter((item) => item.deliveredToDoctorAt === latestDeliveryDate)
    .reduce(
      (acc, item) => {
        const quantity = Math.max(0, Math.trunc(item.quantity ?? 0))
        if (item.arch === 'superior') acc.upper += quantity
        if (item.arch === 'inferior') acc.lower += quantity
        if (item.arch === 'ambos') {
          acc.upper += quantity
          acc.lower += quantity
        }
        return acc
      },
      { upper: 0, lower: 0 },
    )

  const treatmentArch = caseItem.arch ?? 'ambos'
  const batchCount =
    treatmentArch === 'superior'
      ? delivered.upper
      : treatmentArch === 'inferior'
        ? delivered.lower
        : delivered.upper > 0 && delivered.lower > 0
          ? Math.min(delivered.upper, delivered.lower)
          : Math.max(delivered.upper, delivered.lower)

  return {
    latestDeliveryDate,
    deliveredUpper: delivered.upper,
    deliveredLower: delivered.lower,
    batchCount: Math.max(0, batchCount),
  }
}

function resolvePredictedReplacementDate(caseItem: Case) {
  const { latestDeliveryDate, batchCount } = resolveLatestDentistDeliveryBatch(caseItem)
  if (!latestDeliveryDate || batchCount <= 0) return undefined
  const changeDays = Math.max(1, Math.trunc(caseItem.changeEveryDays || 0) || 1)
  return addDaysToIsoDate(latestDeliveryDate, 15 + Math.max(0, batchCount - 1) * changeDays)
}

function resolveTreatmentLabel(caseItem: Case) {
  return resolveRequestedProductLabel({
    requestedProductLabel: caseItem.requestedProductLabel,
    requestedProductId: caseItem.requestedProductId,
    productType: caseItem.productType,
    productId: caseItem.productId,
    alignerFallbackLabel: 'Alinhador',
  })
}

function formatDateOrFallback(date?: string) {
  return date ? formatPtBrDate(date) : '-'
}

export function buildLabPatientReportRows(input: BuildLabPatientReportRowsInput): LabPatientReportRow[] {
  return [...input.cases]
    .sort((left, right) => {
      const leftCode = (left.treatmentCode ?? left.id).toLowerCase()
      const rightCode = (right.treatmentCode ?? right.id).toLowerCase()
      return leftCode.localeCompare(rightCode) || left.patientName.localeCompare(right.patientName)
    })
    .map((caseItem) => {
      const deliveredToDentist = deliveredToDentistByArch(caseItem)
      const alignerSummary = getCaseAlignerChangeSummary(caseItem)
      const predictedReplacementDate = resolvePredictedReplacementDate(caseItem)
      const replacementDeliveryDeadline = predictedReplacementDate
        ? addDaysToIsoDate(predictedReplacementDate, -Math.max(0, Math.trunc(input.guideAutomationLeadDays)))
        : undefined

      return {
        caseNumber: caseItem.treatmentCode ?? caseItem.shortId ?? caseItem.id,
        patientName: caseItem.patientName,
        dentistName: formatDentistName(
          input.dentistsById.get(caseItem.dentistId ?? caseItem.requestedByDentistId ?? '')?.name,
        ),
        treatment: resolveTreatmentLabel(caseItem),
        changeDays: caseItem.changeEveryDays > 0 ? caseItem.changeEveryDays : '',
        status: resolveReportStatus(caseItem, input.labOrders),
        treatmentOrigin: caseItem.treatmentOrigin === 'interno' ? 'Interno' : 'Externo',
        deliveredToDentist: formatDeliveredByArch(deliveredToDentist),
        lastPatientChangeDate: formatDateOrFallback(alignerSummary.lastChangeDate),
        predictedReplacementDate: formatDateOrFallback(predictedReplacementDate),
        replacementDeliveryDeadline: formatDateOrFallback(replacementDeliveryDeadline),
      }
    })
}

export class LabPatientReportService {
  static buildRows = buildLabPatientReportRows
}
