import { loadDb, saveDb } from './db'
import { pushAudit } from './audit'
import type { Case, CaseAttachment, CaseTray, TrayState } from '../types/Case'

type RepoResult<T> = { ok: true; data: T } | { ok: false; error: string }

const trayTransitionMap: Record<TrayState, TrayState[]> = {
  pendente: ['pendente', 'em_producao'],
  em_producao: ['em_producao', 'pronta', 'rework'],
  pronta: ['pronta', 'entregue', 'rework'],
  entregue: ['entregue', 'rework'],
  rework: ['rework', 'em_producao', 'pronta'],
}

function nowIso() {
  return new Date().toISOString()
}

function deriveCaseLifecycle(caseItem: Case, nextTrays: CaseTray[]): Pick<Case, 'status' | 'phase'> {
  const hasDelivery = nextTrays.some((item) => item.state === 'entregue')
  const hasProduction = nextTrays.some((item) => item.state === 'em_producao' || item.state === 'pronta' || item.state === 'rework')
  const allDelivered = nextTrays.length > 0 && nextTrays.every((item) => item.state === 'entregue')

  if (allDelivered) {
    return { status: 'finalizado', phase: 'finalizado' }
  }
  if (hasDelivery || !!caseItem.installation?.installedAt) {
    return { status: 'em_entrega', phase: 'em_producao' }
  }
  if (hasProduction) {
    return { status: 'em_producao', phase: 'em_producao' }
  }
  return { status: caseItem.status, phase: caseItem.phase }
}

export function listCases() {
  return loadDb().cases
}

export function getCase(id: string) {
  return loadDb().cases.find((item) => item.id === id) ?? null
}

export function updateCase(id: string, patch: Partial<Case>): Case | null {
  const db = loadDb()
  let updated: Case | null = null

  db.cases = db.cases.map((item) => {
    if (item.id !== id) {
      return item
    }
    updated = {
      ...item,
      ...patch,
      updatedAt: nowIso(),
    }
    return updated
  })

  const updatedCase = db.cases.find((item) => item.id === id) ?? null
  if (updatedCase) {
    pushAudit(db, {
      entity: 'case',
      entityId: id,
      action: 'case.update',
      message: `Caso ${updatedCase.treatmentCode ?? updatedCase.id} atualizado.`,
    })
  }
  saveDb(db)
  return updatedCase
}

export function setTrayState(caseId: string, trayNumber: number, newState: TrayState): RepoResult<Case> {
  const targetCase = getCase(caseId)
  if (!targetCase) {
    return { ok: false, error: 'Caso nao encontrado.' }
  }

  const tray = targetCase.trays.find((item) => item.trayNumber === trayNumber)
  if (!tray) {
    return { ok: false, error: 'Placa nao encontrada.' }
  }

  const allowed = trayTransitionMap[tray.state]
  if (!allowed.includes(newState)) {
    return { ok: false, error: 'Transicao de estado invalida para esta placa.' }
  }
  if (tray.state === 'entregue' && newState !== 'entregue' && newState !== 'rework') {
    return { ok: false, error: 'Nao e permitido regredir uma placa ja entregue ao dentista.' }
  }

  const nextTrays: CaseTray[] = targetCase.trays.map((item) => {
    if (item.trayNumber !== trayNumber) {
      return item
    }
    return {
      ...item,
      state: newState,
      deliveredAt: newState === 'entregue' ? nowIso() : item.deliveredAt,
    }
  })

  const lifecycle = deriveCaseLifecycle(targetCase, nextTrays)
  const updated = updateCase(caseId, { trays: nextTrays, ...lifecycle })
  if (!updated) {
    return { ok: false, error: 'Nao foi possivel atualizar a placa.' }
  }
  const db = loadDb()
  pushAudit(db, {
    entity: 'case',
    entityId: caseId,
    action: 'case.tray_state',
    message: `Placa #${trayNumber} alterada para ${newState}.`,
  })
  saveDb(db)

  return { ok: true, data: updated }
}

export function addAttachment(
  caseId: string,
  attachment: Omit<CaseAttachment, 'id' | 'createdAt'>,
): RepoResult<Case> {
  const targetCase = getCase(caseId)
  if (!targetCase) {
    return { ok: false, error: 'Caso nao encontrado.' }
  }

  const nextAttachment: CaseAttachment = {
    ...attachment,
    id: `att_${Date.now()}`,
    createdAt: nowIso(),
  }

  const updated = updateCase(caseId, { attachments: [nextAttachment, ...targetCase.attachments] })
  if (!updated) {
    return { ok: false, error: 'Nao foi possivel adicionar o anexo.' }
  }

  return { ok: true, data: updated }
}

export function createDeliveryBatch(
  caseId: string,
  fromTray: number,
  toTray: number,
  deliveredAt: string,
): RepoResult<Case> {
  const targetCase = getCase(caseId)
  if (!targetCase) {
    return { ok: false, error: 'Caso nao encontrado.' }
  }

  if (fromTray > toTray) {
    return { ok: false, error: 'Intervalo invalido. O valor "De" deve ser menor ou igual a "Ate".' }
  }

  const range = targetCase.trays.filter((item) => item.trayNumber >= fromTray && item.trayNumber <= toTray)
  if (range.length === 0) {
    return { ok: false, error: 'Nenhuma placa encontrada neste intervalo.' }
  }

  const invalid = range.find((item) => item.state !== 'pronta')
  if (invalid) {
    return { ok: false, error: `A placa #${invalid.trayNumber} nao esta pronta para entrega.` }
  }

  const nextTrays = targetCase.trays.map((item) =>
    item.trayNumber >= fromTray && item.trayNumber <= toTray
      ? { ...item, state: 'entregue' as const, deliveredAt }
      : item,
  )

  const lifecycle = deriveCaseLifecycle(targetCase, nextTrays)
  const updated = updateCase(caseId, { trays: nextTrays, ...lifecycle })
  if (!updated) {
    return { ok: false, error: 'Nao foi possivel registrar a entrega por lote.' }
  }

  return { ok: true, data: updated }
}

export function markCaseScanFileError(caseId: string, scanFileId: string, reason: string): RepoResult<Case> {
  const targetCase = getCase(caseId)
  if (!targetCase) {
    return { ok: false, error: 'Caso nao encontrado.' }
  }
  const trimmed = reason.trim()
  if (!trimmed) {
    return { ok: false, error: 'Motivo do erro e obrigatorio.' }
  }

  const nextScanFiles = (targetCase.scanFiles ?? []).map((item) =>
    item.id === scanFileId
      ? { ...item, status: 'erro' as const, flaggedAt: nowIso(), flaggedReason: trimmed }
      : item,
  )

  const updated = updateCase(caseId, { scanFiles: nextScanFiles })
  if (!updated) {
    return { ok: false, error: 'Nao foi possivel atualizar o anexo.' }
  }
  return { ok: true, data: updated }
}

export function clearCaseScanFileError(caseId: string, scanFileId: string): RepoResult<Case> {
  const targetCase = getCase(caseId)
  if (!targetCase) {
    return { ok: false, error: 'Caso nao encontrado.' }
  }

  const nextScanFiles = (targetCase.scanFiles ?? []).map((item) =>
    item.id === scanFileId
      ? { ...item, status: 'ok' as const }
      : item,
  )

  const updated = updateCase(caseId, { scanFiles: nextScanFiles })
  if (!updated) {
    return { ok: false, error: 'Nao foi possivel atualizar o anexo.' }
  }
  return { ok: true, data: updated }
}

export function registerCaseInstallation(
  caseId: string,
  payload: { installedAt: string; note?: string; deliveredUpper?: number; deliveredLower?: number },
): RepoResult<Case> {
  const db = loadDb()
  const targetCase = db.cases.find((item) => item.id === caseId) ?? null
  if (!targetCase) {
    return { ok: false, error: 'Caso nao encontrado.' }
  }
  const hasProductionOrder = db.labItems.some((item) => item.caseId === caseId && (item.requestKind ?? 'producao') === 'producao')
  if (!hasProductionOrder) {
    return { ok: false, error: 'Ordem de servico do LAB ainda nao foi gerada para este caso.' }
  }
  const deliveryLots = targetCase.deliveryLots ?? []
  if (deliveryLots.length === 0) {
    return { ok: false, error: 'Registre antes a entrega ao dentista para iniciar entrega ao paciente.' }
  }
  const currentInstallation = targetCase.installation
  const isFirstInstallation = !currentInstallation?.installedAt
  if (isFirstInstallation && !payload.installedAt) {
    return { ok: false, error: 'Data de instalacao e obrigatoria.' }
  }
  const upperTotal = targetCase.totalTraysUpper ?? targetCase.totalTrays
  const lowerTotal = targetCase.totalTraysLower ?? targetCase.totalTrays
  const currentDeliveredUpper = currentInstallation?.deliveredUpper ?? 0
  const currentDeliveredLower = currentInstallation?.deliveredLower ?? 0
  const inputUpper = payload.deliveredUpper ?? 0
  const inputLower = payload.deliveredLower ?? 0
  if (!Number.isFinite(inputUpper) || inputUpper < 0) {
    return { ok: false, error: `Quantidade superior invalida. Informe entre 0 e ${upperTotal}.` }
  }
  if (!Number.isFinite(inputLower) || inputLower < 0) {
    return { ok: false, error: `Quantidade inferior invalida. Informe entre 0 e ${lowerTotal}.` }
  }
  const deliveredUpper = Math.trunc(currentDeliveredUpper + inputUpper)
  const deliveredLower = Math.trunc(currentDeliveredLower + inputLower)
  if (deliveredUpper > upperTotal) {
    return { ok: false, error: `Quantidade superior invalida. Informe entre 0 e ${upperTotal}.` }
  }
  if (deliveredLower > lowerTotal) {
    return { ok: false, error: `Quantidade inferior invalida. Informe entre 0 e ${lowerTotal}.` }
  }
  const deliveredToDentist = deliveryLots.reduce(
    (acc, lot) => {
      if (lot.arch === 'superior') acc.upper += lot.quantity
      if (lot.arch === 'inferior') acc.lower += lot.quantity
      if (lot.arch === 'ambos') {
        acc.upper += lot.quantity
        acc.lower += lot.quantity
      }
      return acc
    },
    { upper: 0, lower: 0 },
  )
  if (Math.trunc(deliveredUpper) > deliveredToDentist.upper) {
    return {
      ok: false,
      error: `Entrega ao paciente superior excede o entregue ao dentista (${deliveredToDentist.upper}).`,
    }
  }
  if (Math.trunc(deliveredLower) > deliveredToDentist.lower) {
    return {
      ok: false,
      error: `Entrega ao paciente inferior excede o entregue ao dentista (${deliveredToDentist.lower}).`,
    }
  }

  const normalizedDeliveredUpper = deliveredUpper
  const normalizedDeliveredLower = deliveredLower
  const currentPairDelivered = Math.max(0, Math.min(currentDeliveredUpper, currentDeliveredLower))
  const nextPairDelivered = Math.max(0, Math.min(normalizedDeliveredUpper, normalizedDeliveredLower))
  const newPairQty = Math.max(0, nextPairDelivered - currentPairDelivered)
  if (newPairQty > 0 && !payload.installedAt) {
    return { ok: false, error: 'Data da entrega ao paciente e obrigatoria.' }
  }
  const patientDeliveryLots = [...(currentInstallation?.patientDeliveryLots ?? [])]
  if (newPairQty > 0) {
    const fromTray = currentPairDelivered + 1
    const toTray = fromTray + newPairQty - 1
    patientDeliveryLots.push({
      id: `patient_lot_${Date.now()}`,
      fromTray,
      toTray,
      quantity: newPairQty,
      deliveredAt: payload.installedAt,
      note: payload.note?.trim() || undefined,
      createdAt: nowIso(),
    })
  }
  const finishedByRemaining = normalizedDeliveredUpper >= upperTotal && normalizedDeliveredLower >= lowerTotal

  const updated = updateCase(caseId, {
    installation: {
      installedAt: currentInstallation?.installedAt ?? payload.installedAt,
      note: payload.note?.trim() || currentInstallation?.note,
      deliveredUpper: normalizedDeliveredUpper,
      deliveredLower: normalizedDeliveredLower,
      patientDeliveryLots,
      actualChangeDates: currentInstallation?.actualChangeDates,
    },
    status: finishedByRemaining || targetCase.status === 'finalizado' ? 'finalizado' : 'em_entrega',
    phase: finishedByRemaining || targetCase.phase === 'finalizado' ? 'finalizado' : 'em_producao',
  })
  if (!updated) {
    return { ok: false, error: 'Nao foi possivel registrar a instalacao.' }
  }
  return { ok: true, data: updated }
}

export function registerCaseDeliveryLot(
  caseId: string,
  payload: {
    arch: 'superior' | 'inferior' | 'ambos'
    fromTray: number
    toTray: number
    deliveredToDoctorAt: string
    note?: string
  },
): RepoResult<Case> {
  const db = loadDb()
  const targetCase = db.cases.find((item) => item.id === caseId) ?? null
  if (!targetCase) {
    return { ok: false, error: 'Caso nao encontrado.' }
  }
  if (targetCase.contract?.status !== 'aprovado') {
    return { ok: false, error: 'Contrato nao aprovado para registrar entrega ao dentista.' }
  }
  const hasProductionOrder = db.labItems.some((item) => item.caseId === caseId && (item.requestKind ?? 'producao') === 'producao')
  if (!hasProductionOrder) {
    return { ok: false, error: 'Ordem de servico do LAB ainda nao foi gerada para este caso.' }
  }

  const total = targetCase.totalTrays
  if (!Number.isFinite(payload.fromTray) || payload.fromTray < 1) {
    return { ok: false, error: 'Placa inicial deve ser maior ou igual a 1.' }
  }
  if (!Number.isFinite(payload.toTray) || payload.toTray < payload.fromTray) {
    return { ok: false, error: 'Intervalo de placas invalido.' }
  }
  if (payload.toTray > total) {
    return { ok: false, error: `Intervalo excede o total do caso (${total}).` }
  }
  if (!payload.deliveredToDoctorAt) {
    return { ok: false, error: 'Data da entrega e obrigatoria.' }
  }

  const existing = targetCase.deliveryLots ?? []
  const overlaps = existing.some((lot) => {
    const sameArch = lot.arch === payload.arch
    const sameRange = lot.fromTray === payload.fromTray && lot.toTray === payload.toTray
    const sameDate = lot.deliveredToDoctorAt === payload.deliveredToDoctorAt
    return sameArch && sameRange && sameDate
  })
  if (overlaps) {
    return { ok: false, error: 'Lote duplicado para mesma arcada/intervalo/data.' }
  }
  const inRange = targetCase.trays.filter((item) => item.trayNumber >= payload.fromTray && item.trayNumber <= payload.toTray)
  if (inRange.length === 0) {
    return { ok: false, error: 'Nenhuma placa encontrada neste intervalo.' }
  }
  const notReady = inRange.find((item) => item.state !== 'pronta' && item.state !== 'entregue')
  if (notReady) {
    return { ok: false, error: `A placa #${notReady.trayNumber} nao esta pronta para entrega.` }
  }
  const nextTrays = targetCase.trays.map((item) =>
    item.trayNumber >= payload.fromTray && item.trayNumber <= payload.toTray
      ? { ...item, state: 'entregue' as const, deliveredAt: payload.deliveredToDoctorAt }
      : item,
  )

  const newLot = {
    id: `lot_${Date.now()}`,
    arch: payload.arch,
    fromTray: payload.fromTray,
    toTray: payload.toTray,
    quantity: payload.toTray - payload.fromTray + 1,
    deliveredToDoctorAt: payload.deliveredToDoctorAt,
    note: payload.note?.trim() || undefined,
    createdAt: nowIso(),
  }

  const updated = updateCase(caseId, {
    trays: nextTrays,
    deliveryLots: [...existing, newLot],
    status: nextTrays.every((item) => item.state === 'entregue') ? 'finalizado' : 'em_entrega',
    phase: nextTrays.every((item) => item.state === 'entregue') ? 'finalizado' : 'em_producao',
  })
  if (!updated) {
    return { ok: false, error: 'Nao foi possivel registrar o lote.' }
  }
  return { ok: true, data: updated }
}
