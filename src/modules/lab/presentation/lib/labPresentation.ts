import { formatPtBrDate } from '../../../../shared/utils/date'
import type { Case } from '../../../../types/Case'
import type { ProductType } from '../../../../types/Product'
import { resolveRequestedProductLabel } from '../../../../lib/productLabel'
import { resolveTreatmentOrigin } from '../../../../lib/treatmentOrigin'
import type { LabPatientOption } from '../../application/ports/LabRepository'
import type { LabOrder } from '../../domain/entities/LabOrder'

export function formatDate(dateIso: string) {
  return formatPtBrDate(dateIso)
}

export function toNonNegativeInt(value?: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value ?? 0))
}

export function formatFriendlyRequestCode(code?: string) {
  return code?.trim() || '-'
}

export function revisionSuffix(code?: string) {
  if (!code) return ''
  const match = code.trim().match(/(\/\d+)$/)
  return match ? match[1] : ''
}

export function hasRevisionSuffix(code?: string) {
  return Boolean(revisionSuffix(code))
}

export function isReworkItem(item: Pick<LabOrder, 'requestKind'>) {
  return item.requestKind === 'reconfeccao'
}

export function isReworkProductionItem(item: Pick<LabOrder, 'requestKind' | 'notes'>) {
  return (item.requestKind ?? 'producao') === 'producao' && (item.notes ?? '').toLowerCase().includes('rework')
}

export function getGuideKindForLabOrder(item: Pick<LabOrder, 'requestKind' | 'requestCode' | 'notes'>): 'initial' | 'replenishment' {
  if (item.requestKind === 'reposicao_programada') return 'replenishment'
  if (item.requestKind === 'reconfeccao' || isReworkProductionItem(item)) return 'initial'
  return hasRevisionSuffix(item.requestCode) ? 'replenishment' : 'initial'
}

export function getGuideReprintLabel(item: Pick<LabOrder, 'requestKind' | 'requestCode' | 'notes'>) {
  return getGuideKindForLabOrder(item) === 'replenishment' ? 'Reimpressao guia de reposicao' : 'Reimpressao guia inicial'
}

export function archLabel(arch: 'superior' | 'inferior' | 'ambos' | '') {
  if (arch === 'superior') return 'Superior'
  if (arch === 'inferior') return 'Inferior'
  if (arch === 'ambos') return 'Ambas'
  return ''
}

export function getCaseTotalsByArch(caseItem?: Pick<Case, 'totalTrays' | 'totalTraysUpper' | 'totalTraysLower'>) {
  if (!caseItem) return { upper: 0, lower: 0 }
  return {
    upper: toNonNegativeInt(caseItem.totalTraysUpper ?? caseItem.totalTrays),
    lower: toNonNegativeInt(caseItem.totalTraysLower ?? caseItem.totalTrays),
  }
}

export function normalizeByTreatmentArch(
  counts: { upper: number; lower: number },
  arch: 'superior' | 'inferior' | 'ambos' | '',
) {
  if (arch === 'superior') return { upper: counts.upper, lower: 0 }
  if (arch === 'inferior') return { upper: 0, lower: counts.lower }
  return counts
}

export function formatInfSupByArch(
  counts: { upper: number; lower: number },
  arch: 'superior' | 'inferior' | 'ambos' | '',
) {
  const lower = arch === 'superior' ? '-' : String(counts.lower)
  const upper = arch === 'inferior' ? '-' : String(counts.upper)
  return `${lower}/${upper}`
}

export function getDeliveredByArch(caseItem?: Pick<Case, 'installation'>) {
  if (!caseItem) return { upper: 0, lower: 0 }
  return {
    upper: toNonNegativeInt(caseItem.installation?.deliveredUpper),
    lower: toNonNegativeInt(caseItem.installation?.deliveredLower),
  }
}

export function hasRemainingByArch(caseItem?: Pick<Case, 'totalTrays' | 'totalTraysUpper' | 'totalTraysLower' | 'arch' | 'installation'>) {
  if (!caseItem) return false
  const treatmentArch = caseItem.arch ?? 'ambos'
  const totals = normalizeByTreatmentArch(getCaseTotalsByArch(caseItem), treatmentArch)
  const delivered = normalizeByTreatmentArch(getDeliveredByArch(caseItem), treatmentArch)
  return Math.max(0, totals.upper - delivered.upper) > 0 || Math.max(0, totals.lower - delivered.lower) > 0
}

export function resolveLabProductLabel(
  item: Pick<LabOrder, 'caseId' | 'requestedProductId' | 'requestedProductLabel' | 'productType' | 'productId'>,
  context: {
    caseById: Map<string, Pick<Case, 'requestedProductId' | 'requestedProductLabel' | 'productType' | 'productId' | 'sourceScanId' | 'treatmentOrigin' | 'clinicId' | 'patientId'>>
    scansById?: Map<string, { purposeLabel?: string; purposeProductId?: string; purposeProductType?: ProductType }>
  },
  caseItemOverride?: Pick<Case, 'requestedProductId' | 'requestedProductLabel' | 'productType' | 'productId' | 'sourceScanId'>,
) {
  const linkedCase = caseItemOverride ?? (item.caseId ? context.caseById.get(item.caseId) : undefined)
  const sourceScan = linkedCase?.sourceScanId ? context.scansById?.get(linkedCase.sourceScanId) : undefined
  return resolveRequestedProductLabel({
    requestedProductLabel: item.requestedProductLabel ?? linkedCase?.requestedProductLabel ?? sourceScan?.purposeLabel,
    requestedProductId: item.requestedProductId ?? linkedCase?.requestedProductId ?? sourceScan?.purposeProductId,
    productType: item.productType ?? linkedCase?.productType ?? sourceScan?.purposeProductType,
    productId: item.productId ?? linkedCase?.productId ?? sourceScan?.purposeProductId,
  })
}

export function resolveLabOrderOrigin(
  item: Pick<LabOrder, 'clinicId' | 'patientId' | 'caseId'>,
  caseById: Map<string, Pick<Case, 'treatmentOrigin' | 'clinicId' | 'patientId'>>,
  patientById: Map<string, LabPatientOption>,
  clinicsById: Map<string, { tradeName: string }>,
) {
  const caseItem = item.caseId ? caseById.get(item.caseId) : undefined
  return resolveTreatmentOrigin(
    {
      treatmentOrigin: caseItem?.treatmentOrigin,
      clinicId: caseItem?.clinicId ?? item.clinicId,
      patientId: caseItem?.patientId ?? item.patientId,
    },
    {
      patientsById: patientById,
      clinicsById: clinicsById,
    },
  )
}
