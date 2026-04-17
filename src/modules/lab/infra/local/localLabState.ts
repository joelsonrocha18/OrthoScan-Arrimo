import type { AppDb } from '../../../../data/db'
import { loadSystemSettings } from '../../../../lib/systemSettings'
import { nowIsoDate, nowIsoDateTime } from '../../../../shared/utils/date'
import { createEntityId } from '../../../../shared/utils/id'
import type { Case } from '../../../../types/Case'
import type { LabItem } from '../../../../types/Lab'
import { normalizeProductType } from '../../../../types/Product'
import type { LabOrder } from '../../domain/entities/LabOrder'
import {
  createLabOrderDraft,
  hasProductionPlan,
  isProgrammedReplenishmentOrder,
  toLabOrder,
} from '../../domain/entities/LabOrder'

function caseCode(caseItem: Pick<Case, 'treatmentCode' | 'id'>) {
  return caseItem.treatmentCode ?? caseItem.id
}

export function nextRequestRevision(db: Pick<AppDb, 'labItems'>, baseCode: string) {
  const max = db.labItems.reduce((acc, item) => {
    if (!item.requestCode) return acc
    const match = item.requestCode.match(/^(.+)\/([0-9]+)$/)
    if (!match || match[1] !== baseCode) return acc
    return Math.max(acc, Number(match[2]))
  }, 0)
  return max + 1
}

export function nextPendingTrayNumber(caseItem: Pick<Case, 'trays'>) {
  const pending = caseItem.trays
    .filter((tray) => tray.state !== 'entregue')
    .map((tray) => tray.trayNumber)
    .sort((a, b) => a - b)
  return pending[0]
}

export function isDeliveredToDentist(caseItem: Pick<Case, 'trays'>, trayNumber: number) {
  const tray = caseItem.trays.find((current) => current.trayNumber === trayNumber)
  return tray?.state === 'entregue'
}

function getGuideAutomationConfig() {
  try {
    const settings = loadSystemSettings()
    return {
      enabled: settings.guideAutomation?.enabled !== false,
      leadDays: Math.max(0, Math.trunc(settings.guideAutomation?.leadDays ?? 10)),
    }
  } catch {
    return { enabled: true, leadDays: 10 }
  }
}

export function ensureProgrammedReplenishments(db: AppDb) {
  const automation = getGuideAutomationConfig()
  if (!automation.enabled) return false
  const today = nowIsoDate()
  let created = false

  db.cases.forEach((caseItem) => {
    if (caseItem.contract?.status !== 'aprovado') return
    const hasDelivered = caseItem.trays.some((tray) => tray.state === 'entregue')
    const hasPending = caseItem.trays.some((tray) => tray.state === 'pendente')
    if (!hasDelivered || !hasPending) return

    const baseCode = caseCode(caseItem)
    caseItem.trays
      .filter((tray) => tray.state === 'pendente' && Boolean(tray.dueDate))
      .forEach((tray) => {
        const expected = tray.dueDate as string
        const plannedDate = new Date(`${expected}T00:00:00`)
        plannedDate.setDate(plannedDate.getDate() - automation.leadDays)
        const plannedDateIso = plannedDate.toISOString().slice(0, 10)
        if (plannedDateIso > today) return

        const exists = db.labItems.some(
          (item) =>
            item.caseId === caseItem.id &&
            (item.requestKind ?? 'producao') === 'reposicao_programada' &&
            item.expectedReplacementDate === expected &&
            item.trayNumber === tray.trayNumber,
        )
        if (exists) return

        const revision = nextRequestRevision(db, baseCode)
        const notes = `Solicitação automática de reposição programada (${caseItem.id}_${tray.trayNumber}_${expected}).`
        const draft = createLabOrderDraft({
          caseId: caseItem.id,
          productType: normalizeProductType(caseItem.productType),
          productId: normalizeProductType(caseItem.productId ?? caseItem.productType),
          requestedProductId: caseItem.requestedProductId,
          requestedProductLabel: caseItem.requestedProductLabel,
          requestCode: `${baseCode}/${revision}`,
          requestKind: 'reposicao_programada',
          expectedReplacementDate: expected,
          arch: caseItem.arch ?? 'ambos',
          plannedUpperQty: 0,
          plannedLowerQty: 0,
          patientName: caseItem.patientName,
          trayNumber: tray.trayNumber,
          plannedDate: plannedDateIso,
          dueDate: expected,
          status: 'aguardando_iniciar',
          priority: 'Medio',
          notes,
        })
        db.labItems = [
          {
            ...draft,
            id: createEntityId('lab'),
            createdAt: nowIsoDateTime(),
            updatedAt: nowIsoDateTime(),
          },
          ...db.labItems,
        ]
        created = true
      })
  })

  return created
}

export function ensureLabRequestCodes(db: AppDb) {
  const caseById = new Map(db.cases.map((item) => [item.id, item]))
  let changed = false
  const nextItems = [...db.labItems]

  for (let index = 0; index < nextItems.length; index += 1) {
    const item = nextItems[index]
    if (!item.caseId) continue
    const linkedCase = caseById.get(item.caseId)
    if (!linkedCase) continue

    const baseCode = caseCode(linkedCase)
    const kind = item.requestKind ?? 'producao'
    if (item.requestCode && item.requestCode.trim().length > 0) {
      if (!item.requestKind) {
        changed = true
        nextItems[index] = { ...item, requestKind: kind, updatedAt: nowIsoDateTime() }
      }
      continue
    }

    const hasBase = nextItems.some((other) => other.id !== item.id && other.caseId === item.caseId && other.requestCode === baseCode)
    const requestCode =
      kind === 'producao' && !hasBase
        ? baseCode
        : `${baseCode}/${nextRequestRevision({ labItems: nextItems } as Pick<AppDb, 'labItems'>, baseCode)}`
    changed = true
    nextItems[index] = {
      ...item,
      requestKind: kind,
      requestCode,
      updatedAt: nowIsoDateTime(),
    }
  }

  db.labItems = nextItems
  return changed
}

export function dedupeProgrammedReplenishments(db: AppDb) {
  const keepByKey = new Map<string, LabItem>()
  const passthrough: LabItem[] = []
  let changed = false

  db.labItems.forEach((item) => {
    if ((item.requestKind ?? 'producao') !== 'reposicao_programada' || item.status !== 'aguardando_iniciar') {
      passthrough.push(item)
      return
    }
    const key = `${item.caseId ?? '-'}_${item.trayNumber}_${item.expectedReplacementDate ?? item.dueDate}`
    const current = keepByKey.get(key)
    if (!current) {
      keepByKey.set(key, item)
      return
    }
    changed = true
    if ((item.updatedAt ?? '') > (current.updatedAt ?? '')) {
      keepByKey.set(key, item)
    }
  })

  if (!changed) return false
  db.labItems = [...keepByKey.values(), ...passthrough]
  return true
}

export function removeLegacyAutoReworkOrders(db: AppDb) {
  const before = db.labItems.length
  db.labItems = db.labItems.filter((item) => {
    if ((item.requestKind ?? 'producao') !== 'reconfeccao') return true
    const note = (item.notes ?? '').toLowerCase()
    const isLegacyAuto = note.includes('reconfeccao automatica por defeito identificado')
    if (!isLegacyAuto) return true
    const linkedCase = item.caseId ? db.cases.find((current) => current.id === item.caseId) : null
    if (!linkedCase) return false
    const tray = linkedCase.trays.find((current) => current.trayNumber === item.trayNumber)
    return tray?.state === 'rework'
  })
  return db.labItems.length !== before
}

export function ensureInitialReplenishmentSeed(db: AppDb, source: LabOrder) {
  if (!source.caseId) return null
  if ((source.requestKind ?? 'producao') !== 'producao') return null
  if (source.status !== 'em_producao') return null
  const linkedCase = db.cases.find((item) => item.id === source.caseId)
  if (!linkedCase) return null

  const expectedReplacementDate =
    linkedCase.trays.find((tray) => tray.trayNumber === source.trayNumber)?.dueDate ??
    source.expectedReplacementDate ??
    source.dueDate
  const dueDate = expectedReplacementDate ?? source.dueDate
  const exists = db.labItems.some(
    (item) =>
      item.caseId === source.caseId &&
      (item.requestKind ?? 'producao') === 'reposicao_programada' &&
      item.trayNumber === source.trayNumber,
  )
  if (exists) return null

  const nowIso = nowIsoDateTime()
  const baseCode = caseCode(linkedCase)
  const seeded: LabItem = {
    ...source,
    id: createEntityId('lab'),
    requestCode: `${baseCode}/${nextRequestRevision(db, baseCode)}`,
    requestKind: 'reposicao_programada',
    expectedReplacementDate,
    plannedUpperQty: 0,
    plannedLowerQty: 0,
    planningDefinedAt: undefined,
    plannedDate: nowIso.slice(0, 10),
    dueDate,
    status: 'aguardando_iniciar',
    notes: `Reposição inicial gerada no início da confeccao da placa #${source.trayNumber}.`,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
  db.labItems = [seeded, ...db.labItems]
  return toLabOrder(seeded)
}

export function listLocalLabOrders(db: AppDb) {
  const coded = ensureLabRequestCodes(db)
  const created = ensureProgrammedReplenishments(db)
  const deduped = dedupeProgrammedReplenishments(db)
  const cleaned = removeLegacyAutoReworkOrders(db)
  return {
    changed: coded || created || deduped || cleaned,
    items: [...db.labItems].map(toLabOrder).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  }
}

export function buildResolvedRequestCode(
  db: AppDb,
  linkedCase: Pick<Case, 'id' | 'treatmentCode'> | null,
  payload: Pick<LabOrder, 'requestCode' | 'requestKind'>,
) {
  if (payload.requestCode && payload.requestCode.trim().length > 0) {
    return payload.requestCode
  }
  const baseCode = linkedCase ? caseCode(linkedCase) : `OS-${createEntityId('lab-code', 0)}`
  if (!linkedCase) return baseCode
  const kind = payload.requestKind ?? 'producao'
  const hasBase = db.labItems.some((other) => other.caseId === linkedCase.id && other.requestCode === baseCode)
  if (kind === 'producao' && !hasBase) return baseCode
  return `${baseCode}/${nextRequestRevision(db, baseCode)}`
}

export function resolveProductionPlanning(
  order: Pick<LabOrder, 'plannedUpperQty' | 'plannedLowerQty'>,
) {
  const plannedUpperQty = Math.trunc(order.plannedUpperQty ?? 0)
  const plannedLowerQty = Math.trunc(order.plannedLowerQty ?? 0)
  return {
    plannedUpperQty,
    plannedLowerQty,
    planDefined: hasProductionPlan({
      plannedUpperQty,
      plannedLowerQty,
    }),
  }
}

export function isProgrammedReplacementSource(order: Pick<LabOrder, 'requestKind'>) {
  return isProgrammedReplenishmentOrder(order)
}
