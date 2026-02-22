import type { PhotoSlot } from '../types/Scan'
import { EXTRA_SLOTS, INTRA_SLOTS } from '../mocks/photoSlots'

type SlotSource = {
  kind?: string
  slotId?: string
}

function inferSlotKind(slotId: string): PhotoSlot['kind'] | null {
  if (slotId.startsWith('intra_')) return 'foto_intra'
  if (slotId.startsWith('extra_')) return 'foto_extra'
  return null
}

function buildSlotLabel(slotId: string) {
  const clean = slotId
    .replace(/^intra_/, '')
    .replace(/^extra_/, '')
    .replace(/_/g, ' ')
    .trim()
  const words = clean
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  const prefix = slotId.startsWith('intra_') ? 'Intraoral' : slotId.startsWith('extra_') ? 'Extraoral' : 'Slot'
  return `${prefix} - ${words.join(' ')}`
}

export function buildPhotoSlotsFromItems(items: SlotSource[]) {
  const byId = new Map<string, PhotoSlot>()
  items.forEach((item) => {
    if (!item.slotId) return
    const kind = item.kind === 'foto_intra' || item.kind === 'foto_extra' ? item.kind : inferSlotKind(item.slotId)
    if (!kind || byId.has(item.slotId)) return
    byId.set(item.slotId, { id: item.slotId, kind, label: buildSlotLabel(item.slotId) })
  })
  return Array.from(byId.values())
}

export function mergePhotoSlots(base: PhotoSlot[], extra: PhotoSlot[]) {
  const map = new Map<string, PhotoSlot>()
  ;[...base, ...extra].forEach((slot) => {
    if (!map.has(slot.id)) map.set(slot.id, slot)
  })
  return Array.from(map.values())
}

export async function loadDevPhotoSlots() {
  return [...INTRA_SLOTS, ...EXTRA_SLOTS]
}

export function slotLabel(slotId?: string, slots?: PhotoSlot[]) {
  if (!slotId) return 'Sem slot'
  const label = slots?.find((slot) => slot.id === slotId)?.label
  return label ?? buildSlotLabel(slotId)
}
