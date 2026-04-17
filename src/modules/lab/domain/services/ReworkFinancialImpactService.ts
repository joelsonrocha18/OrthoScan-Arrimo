import type { LabFinancialImpact } from '../../../../types/Domain'
import type { LabOrder } from '../entities/LabOrder'

export type ReworkImpactInput = {
  arch: LabOrder['arch']
  trayCount?: number
  productType?: string
  reason?: string
}

const PRODUCT_BASE_COST: Record<string, number> = {
  alinhador_3m: 55,
  alinhador_6m: 60,
  alinhador_12m: 70,
  placa_bruxismo: 45,
  contencao: 40,
}

function affectedArchCount(arch: LabOrder['arch']) {
  return arch === 'ambos' ? 2 : 1
}

export function estimateReworkFinancialImpact(input: ReworkImpactInput): LabFinancialImpact {
  const trayCount = Math.max(1, Math.trunc(input.trayCount ?? 1))
  const archCount = affectedArchCount(input.arch)
  const baseCost = PRODUCT_BASE_COST[input.productType ?? ''] ?? 50
  const laborCost = baseCost * archCount
  const materialCost = 18 * trayCount * archCount
  return {
    type: 'rework',
    currency: 'BRL',
    laborCost,
    materialCost,
    estimatedAmount: laborCost + materialCost,
    reason: input.reason?.trim() || 'Reconfecção operacional estimada.',
  }
}

export class ReworkFinancialImpactService {
  static estimate = estimateReworkFinancialImpact
}
