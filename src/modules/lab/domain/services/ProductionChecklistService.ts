import { createValidationError } from '../../../../shared/errors'
import { nowIsoDateTime } from '../../../../shared/utils/date'
import { createEntityId } from '../../../../shared/utils/id'
import type { LabProductionChecklist, LabChecklistItem, LabStageValue } from '../../../../types/Domain'
import type { User } from '../../../../types/User'
import type { LabOrder } from '../entities/LabOrder'
import { LabStage } from '../valueObjects/LabStage'

type ChecklistTemplate = {
  code: LabChecklistItem['code']
  label: string
  stageGate: LabStageValue
  required?: boolean
}

const DEFAULT_CHECKLIST_TEMPLATE: ChecklistTemplate[] = [
  { code: 'planning_confirmed', label: 'Planejamento validado', stageGate: 'in_production' },
  { code: 'scan_files_verified', label: 'Arquivos e anexos conferidos', stageGate: 'in_production' },
  { code: 'production_completed', label: 'Confeccao concluida', stageGate: 'qc' },
  { code: 'finishing_completed', label: 'Acabamento e limpeza finalizados', stageGate: 'qc' },
  { code: 'qc_reviewed', label: 'Controle de qualidade aprovado', stageGate: 'shipped' },
  { code: 'packaging_confirmed', label: 'Embalagem e identificacao confirmadas', stageGate: 'shipped' },
]

type ChecklistRef = Pick<LabOrder, 'productionChecklist'> & Partial<Pick<LabOrder, 'id'>>

function resolveChecklistItemId(orderId: string | undefined, code: LabChecklistItem['code'], currentId?: string) {
  if (currentId && currentId.trim().length > 0) {
    return currentId
  }
  if (orderId && orderId.trim().length > 0) {
    return `lab-check-${orderId}-${code}`
  }
  return createEntityId(`lab-check-${code}`)
}

function buildDefaultChecklist(orderId: string | undefined, at: string): LabProductionChecklist {
  return {
    updatedAt: at,
    items: DEFAULT_CHECKLIST_TEMPLATE.map((item) => ({
      id: resolveChecklistItemId(orderId, item.code),
      code: item.code,
      label: item.label,
      stageGate: item.stageGate,
      required: item.required !== false,
      completed: false,
    })),
  }
}

function normalizeChecklist(orderId: string | undefined, checklist: LabProductionChecklist, at: string): LabProductionChecklist {
  const existingByCode = new Map(checklist.items.map((item) => [item.code, item]))
  return {
    updatedAt: checklist.updatedAt ?? at,
    items: DEFAULT_CHECKLIST_TEMPLATE.map((template) => {
      const existing = existingByCode.get(template.code)
      return {
        id: resolveChecklistItemId(orderId, template.code, existing?.id),
        code: template.code,
        label: existing?.label?.trim() ? existing.label : template.label,
        stageGate: existing?.stageGate ?? template.stageGate,
        required: existing?.required ?? template.required !== false,
        completed: existing?.completed ?? false,
        completedAt: existing?.completed ? existing.completedAt : undefined,
        completedById: existing?.completed ? existing.completedById : undefined,
        completedByName: existing?.completed ? existing.completedByName : undefined,
      }
    }),
  }
}

export function ensureProductionChecklist(order: ChecklistRef, at = nowIsoDateTime()) {
  return order.productionChecklist
    ? normalizeChecklist(order.id, order.productionChecklist, at)
    : buildDefaultChecklist(order.id, at)
}

export function toggleProductionChecklistItem(
  order: ChecklistRef,
  itemId: string,
  completed: boolean,
  actor?: Pick<User, 'id' | 'name'> | null,
  at = nowIsoDateTime(),
): LabProductionChecklist {
  const checklist = ensureProductionChecklist(order, at)
  return {
    updatedAt: at,
    items: checklist.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            completed,
            completedAt: completed ? at : undefined,
            completedById: completed ? actor?.id : undefined,
            completedByName: completed ? actor?.name : undefined,
          }
        : item,
    ),
  }
}

export function pendingItemsForStage(checklist: LabProductionChecklist, stage: LabStageValue) {
  return checklist.items.filter((item) => item.required && item.stageGate === stage && !item.completed)
}

export function assertChecklistReadyForStage(
  order: ChecklistRef & Pick<LabOrder, 'status'>,
  nextStatus: LabOrder['status'],
) {
  const stage = LabStage.fromLegacyStatus(nextStatus).value
  const checklist = ensureProductionChecklist(order)
  const pending = pendingItemsForStage(checklist, stage)
  if (pending.length > 0) {
    throw createValidationError(`Checklist pendente para avancar etapa: ${pending.map((item) => item.label).join(', ')}.`)
  }
}

export class ProductionChecklistService {
  static ensure = ensureProductionChecklist
  static toggleItem = toggleProductionChecklistItem
  static pendingItemsForStage = pendingItemsForStage
  static assertReadyForStage = assertChecklistReadyForStage
}
