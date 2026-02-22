import type { AppDb } from './db'
import { loadDb, saveDb } from './db'
import type { Case } from '../types/Case'
import type { LabItem } from '../types/Lab'
import type { ReplacementBankArch, ReplacementBankEntry } from '../types/ReplacementBank'
import { isAlignerProductType, normalizeProductType } from '../types/Product'

function nowIso() {
  return new Date().toISOString()
}

function nextId() {
  return `rb_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function uniqueByPlate(entries: ReplacementBankEntry[]) {
  const keys = new Set<string>()
  return entries.filter((entry) => {
    const key = `${entry.arcada}_${entry.placaNumero}`
    if (keys.has(key)) return false
    keys.add(key)
    return true
  })
}

function plannedQtyByArch(item: Pick<LabItem, 'arch' | 'plannedUpperQty' | 'plannedLowerQty'>) {
  const upper = Math.max(0, Math.trunc(item.plannedUpperQty ?? 0))
  const lower = Math.max(0, Math.trunc(item.plannedLowerQty ?? 0))
  const fallback = 1
  if (item.arch === 'superior') return { upper: upper > 0 ? upper : fallback, lower: 0 }
  if (item.arch === 'inferior') return { upper: 0, lower: lower > 0 ? lower : fallback }
  return {
    upper: upper > 0 ? upper : fallback,
    lower: lower > 0 ? lower : fallback,
  }
}

function consumeAvailable(
  db: AppDb,
  caseId: string,
  arcada: ReplacementBankArch,
  quantity: number,
  sourceLabItemId: string,
) {
  if (quantity <= 0) return { ok: true as const, consumed: 0 }
  const candidates = uniqueByPlate(
    db.replacementBank
      .filter((entry) => entry.caseId === caseId && entry.arcada === arcada && entry.status === 'disponivel')
      .sort((a, b) => a.placaNumero - b.placaNumero),
  )
  if (candidates.length < quantity) {
    return {
      ok: false as const,
      error: `Saldo insuficiente no banco de reposicoes (${arcada}). Disponivel: ${candidates.length}, solicitado: ${quantity}.`,
    }
  }
  const selected = candidates.slice(0, quantity)
  const now = nowIso()
  const selectedIds = new Set(selected.map((entry) => entry.id))
  db.replacementBank = db.replacementBank.map((entry) =>
    selectedIds.has(entry.id)
      ? {
          ...entry,
          status: 'em_producao',
          sourceLabItemId,
          updatedAt: now,
        }
      : entry,
  )
  return { ok: true as const, consumed: selected.length }
}

export function ensureReplacementBankForCase(
  caseId: string,
  dbInput?: AppDb,
) {
  const db = dbInput ?? loadDb()
  const caseItem = db.cases.find((item) => item.id === caseId)
  if (!caseItem) return { ok: false as const, error: 'Caso nao encontrado.' }

  const totalUpper = caseItem.totalTraysUpper ?? (caseItem.arch === 'inferior' ? 0 : caseItem.totalTrays)
  const totalLower = caseItem.totalTraysLower ?? (caseItem.arch === 'superior' ? 0 : caseItem.totalTrays)
  const existing = db.replacementBank.filter((entry) => entry.caseId === caseId)
  const hasAny = existing.length > 0
  if (hasAny) return { ok: true as const, created: 0 }

  const createdAt = nowIso()
  const nextEntries: ReplacementBankEntry[] = []
  for (let tray = 1; tray <= totalUpper; tray += 1) {
    nextEntries.push({
      id: nextId(),
      caseId,
      arcada: 'superior',
      placaNumero: tray,
      status: 'disponivel',
      createdAt,
      updatedAt: createdAt,
    })
  }
  for (let tray = 1; tray <= totalLower; tray += 1) {
    nextEntries.push({
      id: nextId(),
      caseId,
      arcada: 'inferior',
      placaNumero: tray,
      status: 'disponivel',
      createdAt,
      updatedAt: createdAt,
    })
  }
  if (nextEntries.length > 0) {
    db.replacementBank = [...db.replacementBank, ...nextEntries]
    if (!dbInput) saveDb(db)
  }
  return { ok: true as const, created: nextEntries.length }
}

export function debitReplacementBankForLabStart(
  labItem: LabItem,
  dbInput?: AppDb,
) {
  if (!labItem.caseId) return { ok: true as const, consumedUpper: 0, consumedLower: 0 }
  const db = dbInput ?? loadDb()
  const caseItem = db.cases.find((item) => item.id === labItem.caseId)
  if (!caseItem) return { ok: false as const, error: 'Caso vinculado nao encontrado.' }

  const productType = normalizeProductType(labItem.productId ?? labItem.productType ?? caseItem.productId ?? caseItem.productType)
  if (!isAlignerProductType(productType)) {
    return { ok: true as const, consumedUpper: 0, consumedLower: 0 }
  }

  const seeded = ensureReplacementBankForCase(caseItem.id, db)
  if (!seeded.ok) return seeded

  const requested = plannedQtyByArch(labItem)
  const consumeUpper = requested.upper > 0
    ? consumeAvailable(db, caseItem.id, 'superior', requested.upper, labItem.id)
    : { ok: true as const, consumed: 0 }
  if (!consumeUpper.ok) return consumeUpper
  const consumeLower = requested.lower > 0
    ? consumeAvailable(db, caseItem.id, 'inferior', requested.lower, labItem.id)
    : { ok: true as const, consumed: 0 }
  if (!consumeLower.ok) return consumeLower

  if (!dbInput) saveDb(db)
  return {
    ok: true as const,
    consumedUpper: consumeUpper.consumed,
    consumedLower: consumeLower.consumed,
  }
}

export function markReplacementBankDeliveredByLot(
  caseItem: Pick<Case, 'id'>,
  payload: { arch: 'superior' | 'inferior' | 'ambos'; fromTray: number; toTray: number; deliveredToDoctorAt: string },
  dbInput?: AppDb,
) {
  const db = dbInput ?? loadDb()
  const shouldAffect = (arcada: ReplacementBankArch) =>
    payload.arch === 'ambos' || payload.arch === arcada
  const now = nowIso()
  db.replacementBank = db.replacementBank.map((entry) => {
    if (entry.caseId !== caseItem.id) return entry
    if (!shouldAffect(entry.arcada)) return entry
    if (entry.placaNumero < payload.fromTray || entry.placaNumero > payload.toTray) return entry
    if (entry.status === 'defeituosa') return entry
    return {
      ...entry,
      status: 'entregue',
      deliveredAt: payload.deliveredToDoctorAt,
      updatedAt: now,
    }
  })
  if (!dbInput) saveDb(db)
  return { ok: true as const }
}

export function handleRework(
  caseId: string,
  trayNumber: number,
  arcada: 'superior' | 'inferior' | 'ambos',
  sourceLabItemId?: string,
  dbInput?: AppDb,
) {
  const db = dbInput ?? loadDb()
  const targets: ReplacementBankEntry[] = []
  db.replacementBank.forEach((entry) => {
    if (entry.caseId !== caseId) return
    if (entry.placaNumero !== trayNumber) return
    if (arcada !== 'ambos' && entry.arcada !== arcada) return
    if (entry.status === 'defeituosa') return
    targets.push(entry)
  })

  const now = nowIso()
  const targetIds = new Set(targets.map((entry) => entry.id))
  db.replacementBank = db.replacementBank.map((entry) =>
    targetIds.has(entry.id)
      ? {
          ...entry,
          status: 'defeituosa',
          sourceLabItemId: sourceLabItemId ?? entry.sourceLabItemId,
          updatedAt: now,
        }
      : entry,
  )

  const restoreCount = targets.length > 0 ? targets.length : arcada === 'ambos' ? 2 : 1
  const restoredEntries: ReplacementBankEntry[] = []
  const toCreateArcadas: ReplacementBankArch[] =
    targets.length > 0
      ? targets.map((entry) => entry.arcada)
      : arcada === 'ambos'
        ? ['superior', 'inferior']
        : [arcada]
  for (let index = 0; index < restoreCount; index += 1) {
    const currentArcada = toCreateArcadas[index]
    if (!currentArcada) continue
    restoredEntries.push({
      id: nextId(),
      caseId,
      arcada: currentArcada,
      placaNumero: trayNumber,
      status: 'disponivel',
      sourceLabItemId,
      createdAt: now,
      updatedAt: now,
    })
  }
  db.replacementBank = [...db.replacementBank, ...restoredEntries]
  if (!dbInput) saveDb(db)
  return { ok: true as const, defective: targets.length, restored: restoredEntries.length }
}

export function getReplacementBankSummary(
  caseId: string,
  dbInput?: AppDb,
) {
  const db = dbInput ?? loadDb()
  const entries = db.replacementBank.filter((entry) => entry.caseId === caseId)
  const totalContratado = entries.filter((entry) => entry.status !== 'defeituosa').length
  const emProducaoOuEntregue = entries.filter((entry) => entry.status === 'em_producao' || entry.status === 'entregue').length
  const saldoRestante = entries.filter((entry) => entry.status === 'disponivel').length
  const rework = entries.filter((entry) => entry.status === 'rework').length
  const defeituosa = entries.filter((entry) => entry.status === 'defeituosa').length
  return {
    totalContratado,
    emProducaoOuEntregue,
    saldoRestante,
    rework,
    defeituosa,
  }
}
