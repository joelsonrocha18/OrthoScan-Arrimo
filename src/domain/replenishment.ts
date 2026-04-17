import { diffIsoDays, nowIsoDateTime, toDateOnly, toIsoDate } from '../shared/utils/date'
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
  const actualDates = (caseItem.installation.actualChangeDates ?? [])
    .filter((entry) => entry.trayNumber > 0 && typeof entry.changedAt === 'string' && entry.changedAt.length >= 10)
    .sort((a, b) => a.trayNumber - b.trayNumber)

  const anchorActual = actualDates
    .filter((entry) => entry.trayNumber <= Math.max(0, maxDelivered))
    .at(-1)

  const baseDate = anchorActual?.changedAt
    ? toDateOnly(anchorActual.changedAt)
    : toDateOnly(caseItem.installation.installedAt)

  const deliveredOffset = anchorActual ? Math.max(0, maxDelivered - anchorActual.trayNumber) : maxDelivered
  const daysToAdd = deliveredOffset * caseItem.changeEveryDays
  baseDate.setDate(baseDate.getDate() + daysToAdd)
  return toIsoDate(baseDate)
}

export function getReplenishmentAlerts(caseItem: Case, nowIso: string = nowIsoDateTime()): ReplenishmentAlert[] {
  const dueDate = getNextDeliveryDueDate(caseItem)
  if (!dueDate) return []

  const daysLeft = diffIsoDays(dueDate, nowIso)
  if (daysLeft <= 15 && daysLeft > 10) {
    return [
      {
        id: `${caseItem.id}_15d_${dueDate}`,
        type: 'warning_15d',
        severity: 'medium',
        title: 'Reposição em 15 dias',
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
        title: 'Reposição em 10 dias',
        message: `Caso ${caseItem.patientName} precisa de reposição em ${daysLeft} dia(s).`,
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
        title: 'Reposição atrasada',
          message: `Caso ${caseItem.patientName} está atrasado para reposição há ${Math.abs(daysLeft)} dia(s).`,
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
