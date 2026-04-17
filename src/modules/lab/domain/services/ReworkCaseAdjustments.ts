import type { Case } from '../../../../types/Case'
import type { LabOrderArch } from '../entities/LabOrder'

function shouldAffectArch(targetArch: LabOrderArch, lotArch: 'superior' | 'inferior' | 'ambos') {
  if (targetArch === 'ambos') return true
  if (lotArch === 'ambos') return false
  return lotArch === targetArch
}

export function removeTrayFromDeliveryLots(
  lots: NonNullable<Case['deliveryLots']>,
  trayNumber: number,
  arch: LabOrderArch,
) {
  const next: NonNullable<Case['deliveryLots']> = []
  lots.forEach((lot) => {
    if (!shouldAffectArch(arch, lot.arch) || trayNumber < lot.fromTray || trayNumber > lot.toTray) {
      next.push(lot)
      return
    }
    const leftQty = Math.max(0, trayNumber - lot.fromTray)
    const rightQty = Math.max(0, lot.toTray - trayNumber)
    if (leftQty > 0) {
      next.push({
        ...lot,
        id: `${lot.id}_l_${trayNumber}`,
        fromTray: lot.fromTray,
        toTray: trayNumber - 1,
        quantity: leftQty,
      })
    }
    if (rightQty > 0) {
      next.push({
        ...lot,
        id: `${lot.id}_r_${trayNumber}`,
        fromTray: trayNumber + 1,
        toTray: lot.toTray,
        quantity: rightQty,
      })
    }
  })
  return next
}

export function adjustInstallationForRework(
  installation: Case['installation'],
  trayNumber: number,
  arch: LabOrderArch,
) {
  if (!installation) return installation
  const currentUpper = installation.deliveredUpper ?? 0
  const currentLower = installation.deliveredLower ?? 0
  const affectUpper = (arch === 'superior' || arch === 'ambos') && trayNumber <= currentUpper
  const affectLower = (arch === 'inferior' || arch === 'ambos') && trayNumber <= currentLower
  return {
    ...installation,
    deliveredUpper: Math.max(0, currentUpper - (affectUpper ? 1 : 0)),
    deliveredLower: Math.max(0, currentLower - (affectLower ? 1 : 0)),
  }
}
