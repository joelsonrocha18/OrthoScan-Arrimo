import type { Case } from '../../../../types/Case'
import type { CaseLifecycleStatusValue } from '../../../../types/Domain'
import type { LabOrder } from '../../../lab/domain/entities/LabOrder'
import { LabStage } from '../../../lab/domain/valueObjects/LabStage'

export const CASE_LIFECYCLE_FLOW: CaseLifecycleStatusValue[] = [
  'scan_received',
  'scan_approved',
  'case_created',
  'in_production',
  'qc',
  'shipped',
  'delivered',
  'in_use',
  'rework',
]

function hasDeliveredTray(caseItem: Pick<Case, 'trays'>) {
  return caseItem.trays.some((tray) => tray.state === 'entregue')
}

function hasRework(caseItem: Pick<Case, 'trays'>) {
  return caseItem.trays.some((tray) => tray.state === 'rework')
}

function deriveFromCase(caseItem: Pick<Case, 'status' | 'phase' | 'deliveryLots' | 'installation' | 'trays' | 'sourceScanId'>, labOrders: LabOrder[] = []): CaseLifecycleStatusValue {
  if (hasRework(caseItem) || labOrders.some((order) => LabStage.fromOrder(order).equals('rework'))) {
    return 'rework'
  }
  if (caseItem.installation?.installedAt) {
    return 'in_use'
  }
  if (hasDeliveredTray(caseItem) || (caseItem.deliveryLots?.length ?? 0) > 0) {
    return 'delivered'
  }

  const highestLabStage = labOrders
    .map((order) => LabStage.fromOrder(order).value)
    .sort((left, right) => CASE_LIFECYCLE_FLOW.indexOf(CaseStatus.fromLabStage(right).value) - CASE_LIFECYCLE_FLOW.indexOf(CaseStatus.fromLabStage(left).value))[0]

  if (highestLabStage) {
    return CaseStatus.fromLabStage(highestLabStage).value
  }

  if (caseItem.status === 'em_tratamento' || caseItem.status === 'aguardando_reposicao') {
    return 'in_use'
  }
  if (caseItem.status === 'em_entrega') {
    return 'shipped'
  }
  if (caseItem.status === 'em_producao') {
    return 'in_production'
  }
  if (caseItem.sourceScanId) {
    return 'case_created'
  }
  return 'scan_received'
}

export class CaseStatus {
  readonly value: CaseLifecycleStatusValue

  private constructor(value: CaseLifecycleStatusValue) {
    this.value = value
  }

  static create(value: CaseLifecycleStatusValue) {
    return new CaseStatus(value)
  }

  static fromScanStatus(status?: 'pendente' | 'aprovado' | 'reprovado' | 'convertido') {
    if (status === 'aprovado' || status === 'convertido') return new CaseStatus('scan_approved')
    return new CaseStatus('scan_received')
  }

  static fromLabStage(stage: LabStage['value']) {
    if (stage === 'queued' || stage === 'in_production') return new CaseStatus('in_production')
    if (stage === 'qc') return new CaseStatus('qc')
    if (stage === 'shipped') return new CaseStatus('shipped')
    if (stage === 'delivered') return new CaseStatus('delivered')
    return new CaseStatus('rework')
  }

  static fromCase(caseItem: Pick<Case, 'status' | 'phase' | 'deliveryLots' | 'installation' | 'trays' | 'sourceScanId'>, labOrders: LabOrder[] = []) {
    return new CaseStatus(deriveFromCase(caseItem, labOrders))
  }

  toLegacyStatus(): Case['status'] {
    if (this.value === 'scan_received' || this.value === 'scan_approved' || this.value === 'case_created') return 'planejamento'
    if (this.value === 'in_production' || this.value === 'qc' || this.value === 'shipped') return 'em_producao'
    if (this.value === 'delivered') return 'em_entrega'
    return 'em_tratamento'
  }

  toLegacyPhase(currentPhase: Case['phase'] = 'planejamento'): Case['phase'] {
    if (this.value === 'scan_received' || this.value === 'scan_approved' || this.value === 'case_created') {
      return currentPhase !== 'planejamento' && currentPhase !== 'em_producao'
        ? currentPhase
        : 'planejamento'
    }
    if (this.value === 'in_use') return 'em_producao'
    if (this.value === 'rework') return 'em_producao'
    return 'em_producao'
  }

  canTransitionTo(next: CaseStatus | CaseLifecycleStatusValue) {
    const nextValue = next instanceof CaseStatus ? next.value : next
    const currentIndex = CASE_LIFECYCLE_FLOW.indexOf(this.value)
    const nextIndex = CASE_LIFECYCLE_FLOW.indexOf(nextValue)
    if (this.value === nextValue) return true
    if (nextValue === 'rework') return true
    return currentIndex >= 0 && nextIndex >= currentIndex
  }

  equals(other: CaseStatus | CaseLifecycleStatusValue) {
    return this.value === (other instanceof CaseStatus ? other.value : other)
  }
}
