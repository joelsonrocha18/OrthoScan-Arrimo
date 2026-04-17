import type { LabItem } from '../types/Lab'
import { getPipelineOrders } from '../modules/lab'

type PipelineOptions = {
  isDeliveredToProfessional?: (item: LabItem) => boolean
}

export function getPipelineItems(items: LabItem[], options: PipelineOptions = {}) {
  const isDeliveredToProfessional = options.isDeliveredToProfessional ?? (() => false)
  return getPipelineOrders(items.map((item) => ({ ...item, requestKind: item.requestKind ?? 'producao' })), new Map()).filter(
    (item) => !isDeliveredToProfessional(item),
  )
}
