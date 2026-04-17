import { pushAudit } from './audit'
import { loadDb, saveDb } from './db'
import { getCurrentUser } from '../lib/auth'
import { logger } from '../lib/logger'
import { uploadFileToStorage } from '../lib/storageUpload'
import { nextOrthTreatmentCode, normalizeOrthTreatmentCode } from '../lib/treatmentCode'
import { createLocalCaseRepository } from '../modules/cases/infra/local/LocalCaseRepository'
import { nowIsoDateTime } from '../shared/utils/date'
import { createEntityId, createExamCode } from '../shared/utils/id'
import { validateCreateCaseFromScanInput, validateCreateScanInput } from '../shared/validators'
import type { Scan, ScanAttachment } from '../types/Scan'

function nowIso() {
  return nowIsoDateTime()
}

function nextExamCode() {
  return createExamCode()
}

function nextTreatmentCode(db: ReturnType<typeof loadDb>) {
  const existing = [
    ...db.cases.map((item) => item.treatmentCode ?? ''),
    ...db.scans.map((item) => item.serviceOrderCode ?? ''),
  ]
  return nextOrthTreatmentCode(existing)
}

export function listScans() {
  return [...loadDb().scans].sort((a, b) => b.scanDate.localeCompare(a.scanDate))
}

export function getScan(id: string) {
  return loadDb().scans.find((item) => item.id === id) ?? null
}

async function fileFromAttachment(att: ScanAttachment) {
  if (!att.isLocal || !att.url?.startsWith('blob:')) return null
  try {
    const response = await fetch(att.url)
    const blob = await response.blob()
    return new File([blob], att.name, { type: att.mime || blob.type || 'application/octet-stream' })
  } catch (error) {
    logger.warn('Não foi possível reabrir o anexo local do exame antes do envio.', {
      flow: 'scan.attachment.rehydrate',
      attachmentId: att.id,
      attachmentName: att.name,
    })
    logger.error('Erro ao reidratar o anexo local do exame.', { flow: 'scan.attachment.rehydrate' }, error)
    return null
  }
}

export async function createScan(scan: Omit<Scan, 'id' | 'createdAt' | 'updatedAt'>) {
  const validatedScan = validateCreateScanInput(scan)
  const db = loadDb()
  const serviceOrderCode = normalizeOrthTreatmentCode(validatedScan.serviceOrderCode) || nextTreatmentCode(db)
  const attachments: ScanAttachment[] = []

  for (const att of validatedScan.attachments) {
    const localFile = await fileFromAttachment(att)
    if (localFile) {
      const uploaded = await uploadFileToStorage(localFile, {
        scope: 'scans',
        clinicId: validatedScan.clinicId,
        ownerId: validatedScan.patientId ?? validatedScan.patientName.replace(/\s+/g, '_').toLowerCase(),
      })
      if (uploaded) {
        attachments.push({
          ...att,
          url: uploaded.url,
          isLocal: false,
          status: att.status ?? 'ok',
          attachedAt: att.attachedAt ?? att.createdAt ?? nowIso(),
        })
        continue
      }
    }
    attachments.push({
      ...att,
      status: att.status ?? 'ok',
      attachedAt: att.attachedAt ?? att.createdAt ?? nowIso(),
    })
  }

  const next: Scan = {
    ...validatedScan,
    shortId: validatedScan.shortId ?? nextExamCode(),
    serviceOrderCode,
    attachments,
    id: createEntityId('scan'),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  db.scans = [next, ...db.scans]
  pushAudit(db, { entity: 'scan', entityId: next.id, action: 'scan.create', message: `Exame criado para ${next.patientName}.` })
  saveDb(db)
  logger.info('Exame criado no repositório local.', {
    flow: 'scan.create',
    scanId: next.id,
    patientId: next.patientId,
    clinicId: next.clinicId,
    attachments: next.attachments.length,
  })
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
  attachment: Omit<ScanAttachment, 'id' | 'createdAt' | 'status'> & { id?: string; status?: 'ok' | 'erro'; file?: File },
) {
  return addScanAttachmentAsync(scanId, attachment)
}

export async function addScanAttachmentAsync(
  scanId: string,
  attachment: Omit<ScanAttachment, 'id' | 'createdAt' | 'status'> & { id?: string; status?: 'ok' | 'erro'; file?: File },
) {
  const scan = getScan(scanId)
  if (!scan) return null
  let nextUrl = attachment.url
  let nextIsLocal = attachment.isLocal

  if (attachment.file) {
    const uploaded = await uploadFileToStorage(attachment.file, {
      scope: 'scans',
      clinicId: scan.clinicId,
      ownerId: scan.patientId ?? scan.patientName.replace(/\s+/g, '_').toLowerCase(),
    })
    if (uploaded) {
      nextUrl = uploaded.url
      nextIsLocal = false
    }
  }

  const nextAttachment: ScanAttachment = {
    ...attachment,
    id: attachment.id ?? createEntityId('scan-file'),
    url: nextUrl,
    isLocal: nextIsLocal ?? true,
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
  const linkedCaseIds = new Set<string>()
  db.cases.forEach((item) => {
    if (item.sourceScanId === id || item.id === target.linkedCaseId) {
      linkedCaseIds.add(item.id)
    }
  })

  if (linkedCaseIds.size > 0) {
    db.labItems = db.labItems.filter((item) => !item.caseId || !linkedCaseIds.has(item.caseId))
    db.replacementBank = db.replacementBank.filter((entry) => !linkedCaseIds.has(entry.caseId))
    db.cases = db.cases.filter((item) => !linkedCaseIds.has(item.id))
  }
  db.scans = db.scans.filter((item) => item.id !== id)
  pushAudit(
    db,
    {
      entity: 'scan',
      entityId: id,
      action: 'scan.delete',
      message:
        linkedCaseIds.size > 0
          ? `Exame removido com cascata (${linkedCaseIds.size} pedido(s), OS e reposicoes vinculadas).`
          : 'Exame removido.',
    },
  )
  if (target.patientId) {
    pushAudit(db, {
      entity: 'patient',
      entityId: target.patientId,
      action: 'patient.history.scan_delete',
      message:
        linkedCaseIds.size > 0
          ? `Exame removido com cascata completa: ${target.serviceOrderCode ?? target.id}.`
          : `Exame removido: ${target.serviceOrderCode ?? target.id}.`,
    })
  }
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
  const repository = createLocalCaseRepository(null)
  const actor = getCurrentUser()
  const result = repository.createFromScan(validateCreateCaseFromScanInput({ scanId, ...payload }))
  if (!result.ok) {
    logger.warn('Falha ao criar caso a partir do exame no modo local.', { flow: 'cases.create_from_scan', scanId, actorId: actor?.id, reason: result.error })
    return { ok: false, error: result.error }
  }
  logger.info('Caso criado a partir do exame no modo local.', { flow: 'cases.create_from_scan', scanId, caseId: result.data.caseId, actorId: actor?.id })
  return { ok: true, caseId: result.data.caseId }
}
