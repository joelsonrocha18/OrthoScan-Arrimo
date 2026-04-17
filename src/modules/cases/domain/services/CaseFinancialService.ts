import type { Case } from '../../../../types/Case'
import type { CaseFinancialSnapshot } from '../../../../types/Domain'
import type { ProductType } from '../../../../types/Product'
import { isAlignerProductType, normalizeProductType } from '../../../../types/Product'
import type { LabOrder } from '../../../lab/domain/entities/LabOrder'

type CostPolicy = {
  revenueBase: number
  laborCost: number
  materialCost: number
}

const PRODUCT_FINANCIAL_POLICY: Record<ProductType, CostPolicy> = {
  escaneamento: { revenueBase: 250, laborCost: 45, materialCost: 0 },
  alinhador_3m: { revenueBase: 1800, laborCost: 320, materialCost: 260 },
  alinhador_6m: { revenueBase: 2900, laborCost: 540, materialCost: 430 },
  alinhador_12m: { revenueBase: 4600, laborCost: 840, materialCost: 680 },
  contencao: { revenueBase: 700, laborCost: 110, materialCost: 70 },
  guia_cirurgico: { revenueBase: 1200, laborCost: 260, materialCost: 160 },
  placa_bruxismo: { revenueBase: 980, laborCost: 160, materialCost: 110 },
  placa_clareamento: { revenueBase: 690, laborCost: 120, materialCost: 80 },
  protetor_bucal: { revenueBase: 850, laborCost: 180, materialCost: 120 },
  biomodelo: { revenueBase: 500, laborCost: 95, materialCost: 65 },
}

function totalTrays(caseItem: Pick<Case, 'totalTrays' | 'totalTraysUpper' | 'totalTraysLower'>) {
  return Math.max(
    0,
    Math.trunc(
      Math.max(
        caseItem.totalTrays ?? 0,
        caseItem.totalTraysUpper ?? 0,
        caseItem.totalTraysLower ?? 0,
      ),
    ),
  )
}

function estimatedRevenue(caseItem: Pick<Case, 'budget' | 'productId' | 'productType' | 'totalTrays' | 'totalTraysUpper' | 'totalTraysLower'>) {
  const explicit = Number(caseItem.budget?.value)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  const productType = normalizeProductType(caseItem.productId ?? caseItem.productType)
  const policy = PRODUCT_FINANCIAL_POLICY[productType]
  if (!isAlignerProductType(productType)) return policy.revenueBase
  const trays = Math.max(1, totalTrays(caseItem))
  return policy.revenueBase + trays * 42
}

function estimatedBaseCost(caseItem: Pick<Case, 'productId' | 'productType' | 'totalTrays' | 'totalTraysUpper' | 'totalTraysLower' | 'attachmentBondingTray'>) {
  const productType = normalizeProductType(caseItem.productId ?? caseItem.productType)
  const policy = PRODUCT_FINANCIAL_POLICY[productType]
  if (!isAlignerProductType(productType)) {
    return policy.laborCost + policy.materialCost
  }
  const trays = Math.max(1, totalTrays(caseItem))
  const attachmentCost = caseItem.attachmentBondingTray ? 85 : 0
  return policy.laborCost + policy.materialCost + trays * 18 + attachmentCost
}

export function evaluateCaseFinancial(
  caseItem: Pick<Case, 'budget' | 'productId' | 'productType' | 'totalTrays' | 'totalTraysUpper' | 'totalTraysLower' | 'attachmentBondingTray' | 'reworkSummary' | 'updatedAt' | 'financial'>,
  labOrders: LabOrder[] = [],
): CaseFinancialSnapshot {
  const revenue = estimatedRevenue(caseItem)
  const baseCost = estimatedBaseCost(caseItem)
  const reworkCostFromOrders = labOrders.reduce((sum, item) => sum + Math.max(0, item.financialImpact?.estimatedAmount ?? 0), 0)
  const reworkCost = Math.max(reworkCostFromOrders, caseItem.reworkSummary?.estimatedFinancialImpact ?? 0, caseItem.financial?.reworkCost ?? 0)
  const totalCost = baseCost + reworkCost
  const margin = revenue - totalCost
  const marginPercent = revenue > 0 ? Math.round((margin / revenue) * 100) : 0
  return {
    currency: 'BRL',
    revenue,
    baseCost,
    reworkCost,
    totalCost,
    margin,
    marginPercent,
    updatedAt: caseItem.updatedAt,
  }
}

export class CaseFinancialService {
  static evaluate = evaluateCaseFinancial
}
