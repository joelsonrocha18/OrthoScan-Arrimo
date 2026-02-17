import { loadDb, saveDb } from './db'
import { pushAudit } from './audit'
import type { Case, CaseTray } from '../types/Case'
import type { Scan, ScanAttachment } from '../types/Scan'

function nowIso() {
  return new Date().toISOString()
}

function buildPendingTrays(totalTrays: number, scanDate: string, changeEveryDays: number) {
  const trays: CaseTray[] = []
  const base = new Date(`${scanDate}T00:00:00`)
  for (let tray = 1; tray <= totalTrays; tray += 1) {
    const due = new Date(base)
    due.setDate(due.getDate() + changeEveryDays * tray)
    trays.push({ trayNumber: tray, state: 'pendente', dueDate: due.toISOString().slice(0, 10) })
  }
  return trays
}

function isInternalClinic(db: ReturnType<typeof loadDb>, clinicId?: string) {
  if (!clinicId) return false
  const clinic = db.clinics.find((item) => item.id === clinicId)
  if (!clinic) return false
  return clinic.id === 'clinic_arrimo' || clinic.tradeName.trim().toUpperCase() === 'ARRIMO'
}

function nextTreatmentCode(db: ReturnType<typeof loadDb>, prefix: 'A' | 'C') {
  const maxFromCases = db.cases.reduce((acc, item) => {
    const match = item.treatmentCode?.match(/^([AC])-([0-9]{4})$/)
    if (!match || match[1] !== prefix) return acc
    return Math.max(acc, Number(match[2]))
  }, 0)
  const maxFromScans = db.scans.reduce((acc, item) => {
    const match = item.serviceOrderCode?.match(/^([AC])-([0-9]{4})$/)
    if (!match || match[1] !== prefix) return acc
    return Math.max(acc, Number(match[2]))
  }, 0)
  const max = Math.max(maxFromCases, maxFromScans)
  return `${prefix}-${String(max + 1).padStart(4, '0')}`
}

export function listScans() {
  return [...loadDb().scans].sort((a, b) => b.scanDate.localeCompare(a.scanDate))
}

export function getScan(id: string) {
  return loadDb().scans.find((item) => item.id === id) ?? null
}

export function createScan(scan: Omit<Scan, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = loadDb()
  const internal = isInternalClinic(db, scan.clinicId)
  const serviceOrderCode = scan.serviceOrderCode ?? nextTreatmentCode(db, internal ? 'A' : 'C')
  const next: Scan = {
    ...scan,
    serviceOrderCode,
    attachments: scan.attachments.map((att) => ({
      ...att,
      status: att.status ?? 'ok',
      attachedAt: att.attachedAt ?? att.createdAt ?? nowIso(),
    })),
    id: `scan_${Date.now()}`,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  db.scans = [next, ...db.scans]
  pushAudit(db, { entity: 'scan', entityId: next.id, action: 'scan.create', message: `Exame criado para ${next.patientName}.` })
  saveDb(db)
  return next
}

export function updateScan(id: string, patch: Partial<Scan>) {
  const db = loadDb()
  let updated: Scan | null = null
  db.scans = db.scans.map((item) => {
    if (item.id !== id) return item
    updated = { ...item, ...patch, updatedAt: nowIso() }
    return updated
  })
  if (updated) {
    pushAudit(db, { entity: 'scan', entityId: id, action: 'scan.update', message: 'Exame atualizado.' })
  }
  saveDb(db)
  return updated
}

export function addScanAttachment(
  scanId: string,
  attachment: Omit<ScanAttachment, 'id' | 'createdAt' | 'status'> & { id?: string; status?: 'ok' | 'erro' },
) {
  const scan = getScan(scanId)
  if (!scan) return null

  const nextAttachment: ScanAttachment = {
    ...attachment,
    id: attachment.id ?? `scan_file_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    status: attachment.status ?? 'ok',
    attachedAt: attachment.attachedAt ?? nowIso(),
    createdAt: nowIso(),
  }

  return updateScan(scanId, { attachments: [...scan.attachments, nextAttachment] })
}

export function markScanAttachmentError(scanId: string, attachmentId: string, reason: string) {
  const scan = getScan(scanId)
  if (!scan) return null
  const trimmed = reason.trim()
  if (!trimmed) return null

  const nextAttachments = scan.attachments.map((item) =>
    item.id === attachmentId
      ? { ...item, status: 'erro' as const, flaggedAt: nowIso(), flaggedReason: trimmed }
      : item,
  )
  return updateScan(scanId, { attachments: nextAttachments })
}

export function clearScanAttachmentError(scanId: string, attachmentId: string) {
  const scan = getScan(scanId)
  if (!scan) return null

  const nextAttachments = scan.attachments.map((item) =>
    item.id === attachmentId
      ? { ...item, status: 'ok' as const }
      : item,
  )
  return updateScan(scanId, { attachments: nextAttachments })
}

export function approveScan(id: string) {
  return updateScan(id, { status: 'aprovado' })
}

export function rejectScan(id: string) {
  return updateScan(id, { status: 'reprovado' })
}

export function linkScanToCase(scanId: string, caseId: string) {
  return updateScan(scanId, { status: 'convertido', linkedCaseId: caseId })
}

export function deleteScan(id: string) {
  const db = loadDb()
  const target = db.scans.find((item) => item.id === id)
  if (!target) return
  db.scans = db.scans.filter((item) => item.id !== id)
  db.cases = db.cases.map((item) =>
    item.sourceScanId === id
      ? { ...item, sourceScanId: undefined, updatedAt: nowIso() }
      : item,
  )
  pushAudit(db, { entity: 'scan', entityId: id, action: 'scan.delete', message: 'Exame removido.' })
  saveDb(db)
}

export function createCaseFromScan(
  scanId: string,
  payload: {
    totalTraysUpper?: number
    totalTraysLower?: number
    changeEveryDays: number
    attachmentBondingTray: boolean
    planningNote?: string
  },
): { ok: true; caseId: string } | { ok: false; error: string } {
  const db = loadDb()
  const scan = db.scans.find((item) => item.id === scanId)
  if (!scan) return { ok: false, error: 'Scan nao encontrado.' }
  if (scan.status !== 'aprovado') return { ok: false, error: 'Apenas scans aprovados podem gerar caso.' }
  if (scan.linkedCaseId) return { ok: false, error: 'Este scan ja foi convertido em caso.' }

  const upper = payload.totalTraysUpper ?? 0
  const lower = payload.totalTraysLower ?? 0
  const fallback = Math.max(upper, lower)
  if (fallback <= 0) return { ok: false, error: 'Informe total de placas superior e/ou inferior.' }

  const caseId = `case_${Date.now()}`
  const internal = isInternalClinic(db, scan.clinicId)
  const treatmentCode = scan.serviceOrderCode ?? nextTreatmentCode(db, internal ? 'A' : 'C')
  const scanFiles = scan.attachments.map((att: ScanAttachment) => ({
    id: att.id,
    name: att.name,
    kind: att.kind,
    slotId: att.slotId,
    rxType: att.rxType,
    arch: att.arch,
    isLocal: att.isLocal,
    url: att.url,
    filePath: att.filePath,
    status: att.status ?? 'ok',
    attachedAt: att.attachedAt ?? att.createdAt,
    note: att.note,
    flaggedAt: att.flaggedAt,
    flaggedReason: att.flaggedReason,
    createdAt: att.createdAt,
  }))

  const newCase: Case = {
    id: caseId,
    treatmentCode,
    treatmentOrigin: internal ? 'interno' : 'externo',
    patientName: scan.patientName,
    patientId: scan.patientId,
    dentistId: scan.dentistId,
    requestedByDentistId: scan.requestedByDentistId,
    clinicId: scan.clinicId,
    scanDate: scan.scanDate,
    totalTrays: fallback,
    totalTraysUpper: upper || undefined,
    totalTraysLower: lower || undefined,
    changeEveryDays: payload.changeEveryDays,
    attachmentBondingTray: payload.attachmentBondingTray,
    status: 'planejamento',
    phase: 'planejamento',
    budget: undefined,
    contract: { status: 'pendente' },
    deliveryLots: [],
    installation: undefined,
    trays: buildPendingTrays(fallback, scan.scanDate, payload.changeEveryDays),
    attachments: [],
    sourceScanId: scan.id,
    arch: scan.arch,
    complaint: scan.complaint,
    dentistGuidance: scan.dentistGuidance,
    scanFiles,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }

  db.cases = [newCase, ...db.cases]
  db.scans = db.scans.map((item) =>
    item.id === scan.id
      ? { ...item, status: 'convertido', linkedCaseId: caseId, serviceOrderCode: treatmentCode, updatedAt: nowIso() }
      : item,
  )
  pushAudit(db, {
    entity: 'case',
    entityId: newCase.id,
    action: 'case.create_from_scan',
    message: `Caso ${newCase.treatmentCode ?? newCase.id} criado a partir do scan ${scan.id}.`,
  })
  saveDb(db)
  return { ok: true, caseId }
}
