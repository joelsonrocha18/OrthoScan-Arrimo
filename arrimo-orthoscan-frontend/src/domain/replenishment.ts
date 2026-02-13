import type { Case } from '../types/Case'

export type ReplenishmentAlert = {
  id: string
  type: 'warning_15d' | 'warning_10d' | 'overdue'
  severity: 'medium' | 'high' | 'urgent'
  title: string
  message: string
  dueDate: string
  daysLeft: number
}

function toDateOnly(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`)
}

function diffDays(targetDate: string, nowIso: string) {
  const now = toDateOnly(nowIso)
  const due = toDateOnly(targetDate)
  const ms = due.getTime() - now.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export function getTotalTrays(caseItem: Case): number {
  return caseItem.totalTrays
}

export function getDeliveredRange(caseItem: Case): { maxDelivered: number; deliveredCount: number } {
  const upperFromInstall = caseItem.installation?.deliveredUpper
  const lowerFromInstall = caseItem.installation?.deliveredLower
  if (typeof upperFromInstall === 'number' || typeof lowerFromInstall === 'number') {
    const upper = Math.max(0, upperFromInstall ?? 0)
    const lower = Math.max(0, lowerFromInstall ?? 0)
    return { maxDelivered: Math.max(upper, lower), deliveredCount: Math.min(upper, lower) }
  }

  const lots = caseItem.deliveryLots ?? []
  const maxDelivered = lots.reduce((acc, item) => Math.max(acc, item.toTray), 0)
  const deliveredCount = lots.reduce((acc, item) => acc + item.quantity, 0)
  return { maxDelivered, deliveredCount }
}

export function getNextNeededTray(caseItem: Case): number | null {
  const total = getTotalTrays(caseItem)
  const { maxDelivered } = getDeliveredRange(caseItem)
  if (maxDelivered >= total) return null
  return maxDelivered + 1
}

export function getNextDeliveryDueDate(caseItem: Case): string | null {
  if (!caseItem.installation?.installedAt) return null
  const { maxDelivered } = getDeliveredRange(caseItem)
  const daysToAdd = maxDelivered * caseItem.changeEveryDays
  const base = toDateOnly(caseItem.installation.installedAt)
  base.setDate(base.getDate() + daysToAdd)
  return base.toISOString().slice(0, 10)
}

export function getReplenishmentAlerts(caseItem: Case, nowIso = new Date().toISOString()): ReplenishmentAlert[] {
  const dueDate = getNextDeliveryDueDate(caseItem)
  if (!dueDate) return []

  const daysLeft = diffDays(dueDate, nowIso)
  if (daysLeft <= 15 && daysLeft > 10) {
    return [
      {
        id: `${caseItem.id}_15d_${dueDate}`,
        type: 'warning_15d',
        severity: 'medium',
        title: 'Reposicao em 15 dias',
        message: `Caso ${caseItem.patientName} precisa de novo lote em aproximadamente ${daysLeft} dia(s).`,
        dueDate,
        daysLeft,
      },
    ]
  }
  if (daysLeft <= 10 && daysLeft >= 0) {
    return [
      {
        id: `${caseItem.id}_10d_${dueDate}`,
        type: 'warning_10d',
        severity: 'high',
        title: 'Reposicao em 10 dias',
        message: `Caso ${caseItem.patientName} precisa de reposicao em ${daysLeft} dia(s).`,
        dueDate,
        daysLeft,
      },
    ]
  }
  if (daysLeft < 0) {
    return [
      {
        id: `${caseItem.id}_late_${dueDate}`,
        type: 'overdue',
        severity: 'urgent',
        title: 'Reposicao atrasada',
        message: `Caso ${caseItem.patientName} esta atrasado para reposicao ha ${Math.abs(daysLeft)} dia(s).`,
        dueDate,
        daysLeft,
      },
    ]
  }
  return []
}

export function getCaseSupplySummary(caseItem: Case) {
  const total = getTotalTrays(caseItem)
  const { deliveredCount } = getDeliveredRange(caseItem)
  const delivered = Math.min(deliveredCount, total)
  const remaining = Math.max(0, total - delivered)
  const nextTray = getNextNeededTray(caseItem)
  const nextDueDate = getNextDeliveryDueDate(caseItem)
  return { total, delivered, remaining, nextTray, nextDueDate }
}
