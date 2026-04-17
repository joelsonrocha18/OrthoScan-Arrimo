import {
  buildStandaloneLabDueDate,
  canTransitionLabOrderStage,
  createLocalLabRepository,
  getNextLabOrderStage,
  getPreviousLabOrderStage,
} from '../modules/lab'
import { nowIsoDate } from '../shared/utils/date'
import type { Case } from '../types/Case'
import type { LabItem, LabStatus } from '../types/Lab'
import { loadDb } from './db'

const repository = createLocalLabRepository(null)

function toSyncResult(message?: string) {
  return message ? ({ ok: false as const, message }) : ({ ok: true as const })
}

function getCase(caseId: string) {
  return loadDb().cases.find((item) => item.id === caseId) ?? null
}

export function canMoveToStatus(current: LabStatus, next: LabStatus) {
  return canTransitionLabOrderStage(current, next)
}

export function previousStatus(status: LabStatus) {
  return getPreviousLabOrderStage(status)
}

export function nextStatus(status: LabStatus) {
  return getNextLabOrderStage(status)
}

export function listLabItems() {
  const result = repository.listOrders()
  return result.ok ? result.data : []
}

export function addLabItem(item: Omit<LabItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const result = repository.createOrder(item)
  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }
  return {
    ok: true as const,
    item: result.data.order,
    sync: toSyncResult(result.data.syncMessage),
  }
}

export function updateLabItem(id: string, patch: Partial<LabItem>) {
  const result = repository.updateOrder(id, patch)
  if (!result.ok) {
    return { item: null, sync: { ok: true as const }, error: result.error }
  }
  return {
    item: result.data.order,
    sync: toSyncResult(result.data.syncMessage),
    error: undefined,
  }
}

export function moveLabItem(id: string, status: LabStatus) {
  const result = repository.moveOrderToStage({ id, nextStage: status })
  if (!result.ok) {
    return {
      item: listLabItems().find((item) => item.id === id) ?? null,
      sync: { ok: true as const },
      error: result.error,
    }
  }
  return {
    item: result.data.order,
    sync: toSyncResult(result.data.syncMessage),
    error: undefined,
  }
}

export function deleteLabItem(id: string) {
  repository.deleteOrder(id)
}

export function generateLabOrder(caseId: string) {
  const caseItem = getCase(caseId)
  if (!caseItem) {
    return { ok: false as const, error: 'Caso não encontrado.' }
  }
  if (caseItem.contract?.status !== 'aprovado') {
    return { ok: false as const, error: 'Contrato não aprovado. Não é possível gerar OS para o laboratório.' }
  }

  const existing = listLabItems().find((item) => item.caseId === caseId && (item.requestKind ?? 'producao') === 'producao')
  if (existing) {
    return { ok: true as const, item: existing, alreadyExists: true as const }
  }

  const today = nowIsoDate()
  const dueDate = buildStandaloneLabDueDate(today, 7)
  const created = repository.createOrder({
    caseId,
    requestCode: caseCode(caseItem),
    requestKind: 'producao',
    expectedReplacementDate: dueDate,
    arch: caseItem.arch ?? 'ambos',
    patientName: caseItem.patientName,
    trayNumber: 1,
    plannedDate: today,
    dueDate,
    status: 'aguardando_iniciar',
    priority: 'Medio',
    plannedUpperQty: undefined,
    plannedLowerQty: undefined,
    notes: 'OS gerada a partir do fluxo comercial do caso. Defina quantidade por arcada antes de produzir.',
  })
  if (!created.ok) {
    return { ok: false as const, error: created.error }
  }
  return { ok: true as const, item: created.data.order, alreadyExists: false as const }
}

export function createAdvanceLabOrder(
  sourceLabItemId: string,
  payload: { plannedUpperQty: number; plannedLowerQty: number; dueDate?: string },
) {
  const result = repository.createAdvanceOrder({
    sourceLabItemId,
    plannedUpperQty: payload.plannedUpperQty,
    plannedLowerQty: payload.plannedLowerQty,
    dueDate: payload.dueDate,
  })
  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }
  return {
    ok: true as const,
    item: result.data.order,
    sync: toSyncResult(result.data.syncMessage),
  }
}

function caseCode(caseItem: Pick<Case, 'treatmentCode' | 'id'>) {
  return caseItem.treatmentCode ?? caseItem.id
}
