import type { LabItem } from '../../../../types/Lab'
import type { LabStageValue } from '../../../../types/Domain'

export const LAB_STAGE_VALUES: LabStageValue[] = ['queued', 'in_production', 'qc', 'shipped', 'delivered', 'rework']

export class LabStage {
  readonly value: LabStageValue

  private constructor(value: LabStageValue) {
    this.value = value
  }

  static create(value: LabStageValue) {
    return new LabStage(value)
  }

  static fromLegacyStatus(status: LabItem['status']) {
    if (status === 'em_producao') return new LabStage('in_production')
    if (status === 'controle_qualidade') return new LabStage('qc')
    if (status === 'prontas') return new LabStage('shipped')
    return new LabStage('queued')
  }

  static fromOrder(order: Pick<LabItem, 'status' | 'requestKind' | 'notes' | 'deliveredToProfessionalAt'>) {
    if (order.deliveredToProfessionalAt) return new LabStage('delivered')
    if ((order.requestKind ?? 'producao') === 'reconfeccao' || (order.notes ?? '').toLowerCase().includes('rework')) {
      return new LabStage('rework')
    }
    return LabStage.fromLegacyStatus(order.status)
  }

  toLegacyStatus(): LabItem['status'] {
    if (this.value === 'queued') return 'aguardando_iniciar'
    if (this.value === 'in_production') return 'em_producao'
    if (this.value === 'qc' || this.value === 'rework') return 'controle_qualidade'
    return 'prontas'
  }

  canTransitionTo(next: LabStage | LabStageValue) {
    const nextValue = next instanceof LabStage ? next.value : next
    if (this.value === nextValue) return true
    if (nextValue === 'rework') return true
    const currentIndex = LAB_STAGE_VALUES.indexOf(this.value)
    const nextIndex = LAB_STAGE_VALUES.indexOf(nextValue)
    return currentIndex >= 0 && nextIndex >= currentIndex
  }

  equals(other: LabStage | LabStageValue) {
    return this.value === (other instanceof LabStage ? other.value : other)
  }
}
