import type { LabItem } from '../types/Lab'

type PipelineOptions = {
  isDeliveredToProfessional?: (item: LabItem) => boolean
}

export function getPipelineItems(items: LabItem[], options: PipelineOptions = {}) {
  const isDeliveredToProfessional = options.isDeliveredToProfessional ?? (() => false)
  return items.filter(
    (item) =>
      !isDeliveredToProfessional(item) &&
      item.requestKind !== 'reconfeccao' &&
      item.requestKind !== 'reposicao_programada',
  )
}
