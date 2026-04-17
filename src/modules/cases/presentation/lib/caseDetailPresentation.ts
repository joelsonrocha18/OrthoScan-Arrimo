import { slotLabel as getPhotoSlotLabel } from '../../../../lib/photoSlots'
import { diffIsoDays } from '../../../../shared/utils/date'
import type { Case, TrayState } from '../../../../types/Case'

export const caseStatusLabelMap: Record<Case['status'], string> = {
  planejamento: 'Planejamento',
  em_producao: 'Em produção',
  em_entrega: 'Em entrega',
  em_tratamento: 'Em tratamento',
  aguardando_reposicao: 'Aguardando reposição',
  finalizado: 'Finalizado',
}

export const caseStatusToneMap: Record<Case['status'], 'neutral' | 'info' | 'success' | 'danger'> = {
  planejamento: 'neutral',
  em_producao: 'info',
  em_entrega: 'info',
  em_tratamento: 'info',
  aguardando_reposicao: 'danger',
  finalizado: 'success',
}

export const trayStateClasses: Record<TrayState, string> = {
  pendente: 'bg-slate-100 text-slate-700',
  em_producao: 'bg-blue-100 text-blue-700',
  pronta: 'bg-brand-500 text-white',
  entregue: 'bg-emerald-100 text-emerald-700',
  rework: 'bg-red-100 text-red-700',
}

export const archLabelMap: Record<'superior' | 'inferior' | 'ambos', string> = {
  superior: 'Superior',
  inferior: 'Inferior',
  ambos: 'Ambos',
}

export const scanArchLabelMap: Record<'superior' | 'inferior' | 'mordida', string> = {
  superior: 'Superior',
  inferior: 'Inferior',
  mordida: 'Mordida',
}

export type ReplenishmentAlert = {
  id: string
  type: 'warning_15d' | 'warning_10d' | 'overdue'
  severity: 'medium' | 'high' | 'urgent'
}

export type GroupedCaseScanFiles = {
  scan3d: {
    superior: NonNullable<Case['scanFiles']>
    inferior: NonNullable<Case['scanFiles']>
    mordida: NonNullable<Case['scanFiles']>
  }
  fotosIntra: NonNullable<Case['scanFiles']>
  fotosExtra: NonNullable<Case['scanFiles']>
  radiografias: {
    panoramica: NonNullable<Case['scanFiles']>
    teleradiografia: NonNullable<Case['scanFiles']>
    tomografia: NonNullable<Case['scanFiles']>
  }
  planejamento: NonNullable<Case['scanFiles']>
}

export function caseProgress(total: number, delivered: number) {
  const safeDelivered = Math.max(0, Math.min(delivered, total))
  const safeTotal = Math.max(0, total)
  return {
    delivered: safeDelivered,
    total: safeTotal,
    percent: safeTotal > 0 ? Math.round((safeDelivered / safeTotal) * 100) : 0,
  }
}

export function scheduleStateLabel(state: TrayState | 'nao_aplica') {
  if (state === 'nao_aplica') return '-'
  if (state === 'em_producao') return 'Em produção'
  if (state === 'pronta') return 'Pronta'
  if (state === 'entregue') return 'Entregue'
  if (state === 'rework') return 'Reconfecção'
  return 'Pendente'
}

export function scheduleStateClass(state: TrayState | 'nao_aplica') {
  if (state === 'nao_aplica') return 'text-slate-400'
  if (state === 'em_producao') return 'text-blue-700'
  if (state === 'pronta') return 'text-emerald-700'
  if (state === 'entregue') return 'text-emerald-700'
  if (state === 'rework') return 'text-red-700'
  return 'text-slate-700'
}

export function hasRevisionSuffix(code?: string) {
  return /\/\d+$/.test(code ?? '')
}

export function isReworkProductionLabItem(item: { requestKind?: string; notes?: string }) {
  return (item.requestKind ?? 'producao') === 'producao' && (item.notes ?? '').toLowerCase().includes('rework')
}

export function fileAvailability(item: NonNullable<Case['scanFiles']>[number]) {
  if (item.isLocal && item.url) return { label: 'Abrir', url: item.url }
  if (item.filePath) return { label: 'Abrir' }
  if (item.isLocal && !item.url) return { label: 'arquivo local (reenvie para abrir)' }
  if (item.url) return { label: 'Abrir', url: item.url }
  return { label: 'arquivo local (reenvie para abrir)' }
}

export function slotLabel(slotId?: string) {
  return getPhotoSlotLabel(slotId)
}

export function formatBrlCurrencyInput(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const value = Number(digits) / 100
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parseBrlCurrencyInput(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return 0
  return Number(digits) / 100
}

export function groupCaseScanFiles(caseItem?: Pick<Case, 'scanFiles'> | null): GroupedCaseScanFiles {
  const scanFiles = caseItem?.scanFiles ?? []
  return {
    scan3d: {
      superior: scanFiles.filter((item) => item.kind === 'scan3d' && item.arch === 'superior'),
      inferior: scanFiles.filter((item) => item.kind === 'scan3d' && item.arch === 'inferior'),
      mordida: scanFiles.filter((item) => item.kind === 'scan3d' && item.arch === 'mordida'),
    },
    fotosIntra: scanFiles
      .filter((item) => item.kind === 'foto_intra')
      .sort((left, right) => slotLabel(left.slotId).localeCompare(slotLabel(right.slotId))),
    fotosExtra: scanFiles
      .filter((item) => item.kind === 'foto_extra')
      .sort((left, right) => slotLabel(left.slotId).localeCompare(slotLabel(right.slotId))),
    radiografias: {
      panoramica: scanFiles.filter((item) => item.rxType === 'panoramica'),
      teleradiografia: scanFiles.filter((item) => item.rxType === 'teleradiografia'),
      tomografia: scanFiles.filter((item) => item.rxType === 'tomografia' || item.kind === 'dicom'),
    },
    planejamento: scanFiles.filter((item) => item.kind === 'projeto'),
  }
}

export function getReplenishmentAlerts(caseId: string, nextReplacementDueDate: string | undefined, todayIso: string): ReplenishmentAlert[] {
  if (!nextReplacementDueDate) return []
  const daysLeft = diffIsoDays(nextReplacementDueDate, todayIso)
  if (daysLeft <= 15 && daysLeft > 10) {
    return [{ id: `${caseId}_15d_${nextReplacementDueDate}`, type: 'warning_15d', severity: 'medium' }]
  }
  if (daysLeft <= 10 && daysLeft >= 0) {
    return [{ id: `${caseId}_10d_${nextReplacementDueDate}`, type: 'warning_10d', severity: 'high' }]
  }
  if (daysLeft < 0) {
    return [{ id: `${caseId}_late_${nextReplacementDueDate}`, type: 'overdue', severity: 'urgent' }]
  }
  return []
}
