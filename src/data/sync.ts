import type { AppDb } from './db'
import { loadDb, saveDb } from './db'
import type { LabItem } from '../types/Lab'
import type { CaseTray } from '../types/Case'
import { isAlignerProductType, normalizeProductType } from '../types/Product'

function trayStateFromLabStatus(status: LabItem['status']) {
  if (status === 'aguardando_iniciar') return 'pendente' as const
  if (status === 'em_producao') return 'em_producao' as const
  if (status === 'controle_qualidade') return 'rework' as const
  if (status === 'prontas') return 'pronta' as const
  return null
}

function deriveCaseLifecycle(trays: CaseTray[], hasInstallation: boolean) {
  const hasDelivery = trays.some((item) => item.state === 'entregue')
  const hasProduction = trays.some((item) => item.state === 'em_producao' || item.state === 'pronta' || item.state === 'rework')
  const allDelivered = trays.length > 0 && trays.every((item) => item.state === 'entregue')
  if (allDelivered) return { status: 'finalizado' as const, phase: 'finalizado' as const }
  if (hasDelivery || hasInstallation) return { status: 'em_entrega' as const, phase: 'em_producao' as const }
  if (hasProduction) return { status: 'em_producao' as const, phase: 'em_producao' as const }
  return null
}

function plannedBatchByArch(item: Pick<LabItem, 'plannedUpperQty' | 'plannedLowerQty'>) {
  return {
    upper: Math.max(0, Math.trunc(item.plannedUpperQty ?? 0)),
    lower: Math.max(0, Math.trunc(item.plannedLowerQty ?? 0)),
  }
}

function deliveredByArch(
  caseItem: {
    deliveryLots?: Array<{ arch: 'superior' | 'inferior' | 'ambos'; toTray: number }>
  },
) {
  const lots = caseItem.deliveryLots ?? []
  return lots.reduce(
    (acc, lot) => {
      if (lot.arch === 'superior') acc.upper = Math.max(acc.upper, lot.toTray)
      if (lot.arch === 'inferior') acc.lower = Math.max(acc.lower, lot.toTray)
      if (lot.arch === 'ambos') {
        acc.upper = Math.max(acc.upper, lot.toTray)
        acc.lower = Math.max(acc.lower, lot.toTray)
      }
      return acc
    },
    { upper: 0, lower: 0 },
  )
}

function nextBatchRange(
  caseItem: {
    totalTrays: number
    deliveryLots?: Array<{ arch: 'superior' | 'inferior' | 'ambos'; toTray: number }>
  },
  labItem: Pick<LabItem, 'arch' | 'trayNumber' | 'plannedUpperQty' | 'plannedLowerQty'>,
) {
  const batchByArch = plannedBatchByArch(labItem)
  const delivered = deliveredByArch(caseItem)

  const upperRange = batchByArch.upper > 0
    ? {
        fromTray: Math.max(1, delivered.upper + 1, labItem.trayNumber),
        toTray: Math.min(caseItem.totalTrays, Math.max(1, delivered.upper + 1, labItem.trayNumber) + batchByArch.upper - 1),
      }
    : null
  const lowerRange = batchByArch.lower > 0
    ? {
        fromTray: Math.max(1, delivered.lower + 1, labItem.trayNumber),
        toTray: Math.min(caseItem.totalTrays, Math.max(1, delivered.lower + 1, labItem.trayNumber) + batchByArch.lower - 1),
      }
    : null

  if (labItem.arch === 'superior') return upperRange
  if (labItem.arch === 'inferior') return lowerRange

  if (upperRange && lowerRange) {
    const fromTray = Math.max(upperRange.fromTray, lowerRange.fromTray)
    const toTray = Math.min(upperRange.toTray, lowerRange.toTray)
    if (toTray < fromTray) return null
    return { fromTray, toTray }
  }
  return upperRange ?? lowerRange
}

function shouldSyncAlignerBatch(labItem: LabItem, caseProductType: unknown) {
  const resolvedProduct = normalizeProductType(labItem.productId ?? labItem.productType ?? caseProductType)
  return isAlignerProductType(resolvedProduct)
}

export function syncLabItemToCaseTray(
  labItem: LabItem,
  dbInput?: AppDb,
): { ok: true } | { ok: false; message: string } {
  if (!labItem.caseId) return { ok: true }

  const db = dbInput ?? loadDb()
  const caseItem = db.cases.find((item) => item.id === labItem.caseId)
  if (!caseItem) return { ok: false, message: 'Caso vinculado nao encontrado.' }

  if (!shouldSyncAlignerBatch(labItem, caseItem.productId ?? caseItem.productType)) {
    return { ok: true }
  }

  if (labItem.trayNumber < 1 || labItem.trayNumber > caseItem.totalTrays) {
    return { ok: false, message: 'Numero da placa fora do intervalo do caso.' }
  }

  const mappedState = trayStateFromLabStatus(labItem.status)
  if (!mappedState) return { ok: true }

  const shouldSyncBatch = (labItem.requestKind ?? 'producao') !== 'reconfeccao'
  if (shouldSyncBatch) {
    const range = nextBatchRange(caseItem, labItem)
    if (!range) return { ok: true }

    caseItem.trays = caseItem.trays.map((tray) => {
      if (tray.trayNumber < range.fromTray || tray.trayNumber > range.toTray) return tray
      if (tray.state === 'entregue') return tray
      if (mappedState === 'pendente' && tray.state !== 'pendente') return tray
      if (mappedState === 'em_producao' && tray.state === 'pronta') return tray
      return { ...tray, state: mappedState }
    })
  } else {
    const targetTray = caseItem.trays.find((item) => item.trayNumber === labItem.trayNumber)
    if (!targetTray) return { ok: false, message: 'Placa nao encontrada no caso.' }
    if (targetTray.state !== 'entregue') {
      if (!(mappedState === 'pendente' && targetTray.state !== 'pendente') && !(mappedState === 'em_producao' && targetTray.state === 'pronta')) {
        targetTray.state = mappedState
      }
    }
  }

  const lifecycle = deriveCaseLifecycle(caseItem.trays, !!caseItem.installation?.installedAt)
  if (lifecycle) {
    caseItem.status = lifecycle.status
    caseItem.phase = lifecycle.phase
  }
  caseItem.updatedAt = new Date().toISOString()

  if (!dbInput) saveDb(db)
  return { ok: true }
}
