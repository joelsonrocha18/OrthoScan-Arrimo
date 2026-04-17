import { pushAudit } from '../data/audit'
import { DATA_MODE } from '../data/dataMode'
import { loadDb, saveDb } from '../data/db'
import { getSessionProfile } from '../lib/auth'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabaseClient'
import { nowIsoDateTime, toIsoDateTime } from '../shared/utils/date'
import { createEntityId } from '../shared/utils/id'
import { validatePatientDocumentInput } from '../shared/validators'
import type { PatientDocument } from '../types/PatientDocument'
import {
  buildPatientDocPath,
  createSignedUrl,
  deleteFromStorage,
  uploadToStorage,
  validatePatientDocFile,
} from './storageRepo'
import { uploadFileToStorage } from '../lib/storageUpload'

function nowIso() {
  return nowIsoDateTime()
}

function mapSupabaseDoc(row: Record<string, unknown>): PatientDocument {
  const note = typeof row.note === 'string' ? row.note : undefined
  const errorNote = typeof row.error_note === 'string' ? row.error_note : undefined
  const data = row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {}
  return {
    id: String(row.id ?? ''),
    patientId: String(row.patient_id ?? ''),
    caseId: typeof row.case_id === 'string' ? row.case_id : undefined,
    title: String(row.title ?? 'Documento'),
    category: (String(row.category ?? 'outro') as PatientDocument['category']) ?? 'outro',
    createdAt: String(row.created_at ?? nowIso()),
    note,
    isLocal: false,
    filePath: (row.file_path as string | null) ?? undefined,
    fileName: String(row.file_name ?? row.title ?? 'arquivo'),
    mimeType: (row.mime_type as string | null) ?? undefined,
    status: ((row.status as 'ok' | 'erro' | null) ?? 'ok') as 'ok' | 'erro',
    errorNote,
    metadata: {
      trayNumber: typeof data.trayNumber === 'number' ? data.trayNumber : undefined,
      capturedAt: typeof data.capturedAt === 'string' ? data.capturedAt : undefined,
      accessCode: typeof data.accessCode === 'string' ? data.accessCode : undefined,
      sentAt: typeof data.sentAt === 'string' ? data.sentAt : undefined,
      deviceLabel: typeof data.deviceLabel === 'string' ? data.deviceLabel : undefined,
      source:
        data.source === 'patient_portal' || data.source === 'internal'
          ? data.source
          : undefined,
      uploadedByPatient: typeof data.uploadedByPatient === 'boolean' ? data.uploadedByPatient : undefined,
    },
  }
}

function localListPatientDocs(patientId: string) {
  return loadDb()
    .patientDocuments.filter((doc) => doc.patientId === patientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

async function supabaseListPatientDocs(patientId: string) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('documents')
    .select('id, patient_id, case_id, category, title, file_path, file_name, mime_type, status, note, error_note, created_at, data')
    .eq('patient_id', patientId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []).map((row) => mapSupabaseDoc(row as Record<string, unknown>))
}

export async function listPatientDocs(patientId: string) {
  if (DATA_MODE === 'supabase') return supabaseListPatientDocs(patientId)
  return localListPatientDocs(patientId)
}

export async function getPatientDoc(id: string) {
  if (DATA_MODE === 'supabase') {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('documents')
      .select('id, patient_id, case_id, category, title, file_path, file_name, mime_type, status, note, error_note, created_at, data')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) return null
    return mapSupabaseDoc(data as Record<string, unknown>)
  }
  return loadDb().patientDocuments.find((doc) => doc.id === id) ?? null
}

export async function resolvePatientDocUrl(doc: PatientDocument) {
  if (doc.filePath && doc.metadata?.source === 'patient_portal' && supabase) {
    const { data, error } = await supabase.storage.from('orthoscan').createSignedUrl(doc.filePath, 60 * 60 * 12)
    if (!error && data?.signedUrl) {
      return { ok: true as const, url: data.signedUrl }
    }
  }
  if (doc.filePath) return createSignedUrl(doc.filePath, 300)
  if (doc.url) return { ok: true as const, url: doc.url }
  return { ok: false as const, error: 'Documento sem caminho de arquivo.' }
}

export async function addPatientDoc(payload: {
  patientId: string
  caseId?: string
  clinicId?: string
  title: string
  category: PatientDocument['category']
  note?: string
  createdAt?: string
  file?: File
}) {
  const validated = validatePatientDocumentInput(payload)
  if (validated.file) {
    const fileValidation = validatePatientDocFile(validated.file)
    if (!fileValidation.ok) return fileValidation
  }

  if (DATA_MODE === 'supabase') {
    if (!supabase) return { ok: false as const, error: 'Supabase não configurado.' }
    const profile = getSessionProfile()
    if (!profile?.id) return { ok: false as const, error: 'Sessão inválida. Faça login novamente.' }
    const clinicId = profile.clinicId ?? validated.clinicId
    if (!clinicId) return { ok: false as const, error: 'Sessão sem clinicId e paciente sem clínica vinculada.' }

    let filePath: string | undefined
    if (validated.file) {
      filePath = buildPatientDocPath({
        clinicId,
        patientId: validated.patientId,
        fileName: validated.file.name,
      })
      const upload = await uploadToStorage(filePath, validated.file)
      if (!upload.ok) return upload
    }

    const createdAt = validated.createdAt ? toIsoDateTime(validated.createdAt) : nowIso()
    const { data, error } = await supabase
      .from('documents')
      .insert({
        clinic_id: clinicId,
        patient_id: validated.patientId,
        case_id: payload.caseId ?? null,
        category: validated.category,
        title: validated.title,
        file_path: filePath ?? null,
        file_name: validated.file?.name ?? validated.title,
        mime_type: validated.file?.type ?? null,
        status: 'ok',
        note: validated.note ?? null,
        data: null,
        created_by: profile.id,
        created_at: createdAt,
      })
      .select('id, patient_id, case_id, category, title, file_path, file_name, mime_type, status, note, error_note, created_at, data')
      .single()
    if (error || !data) return { ok: false as const, error: error?.message ?? 'Falha ao criar documento.' }
    const doc = mapSupabaseDoc(data as Record<string, unknown>)
    logger.info('Documento do paciente criado no Supabase.', {
      flow: 'documents.create',
      patientId: validated.patientId,
      documentId: doc.id,
      actorId: profile.id,
    })
    return { ok: true as const, doc }
  }

  const db = loadDb()
  let uploadedUrl: string | undefined
  let isLocal = Boolean(validated.file)

  if (validated.file) {
    const uploaded = await uploadFileToStorage(validated.file, {
      scope: 'patient-docs',
      clinicId: validated.clinicId,
      ownerId: validated.patientId,
    })
    if (uploaded) {
      uploadedUrl = uploaded.url
      isLocal = false
    }
  }

  const doc: PatientDocument = {
    id: createEntityId('pat-doc'),
    patientId: validated.patientId,
    caseId: payload.caseId,
    title: validated.title,
    category: validated.category,
    createdAt: validated.createdAt ? toIsoDateTime(validated.createdAt) : nowIso(),
    note: validated.note,
    isLocal,
    url: validated.file ? (uploadedUrl ?? URL.createObjectURL(validated.file)) : undefined,
    fileName: validated.file?.name ?? validated.title,
    mimeType: validated.file?.type,
    status: 'ok',
  }

  db.patientDocuments = [doc, ...db.patientDocuments]
  pushAudit(db, {
    entity: 'document',
    entityId: doc.id,
    action: 'document.create',
    message: `Documento ${doc.title} registrado para o paciente ${doc.patientId}.`,
  })
  saveDb(db)
  logger.info('Documento do paciente criado no modo local.', {
    flow: 'documents.create',
    patientId: validated.patientId,
    documentId: doc.id,
  })
  return { ok: true as const, doc }
}

export async function updatePatientDoc(id: string, patch: Partial<Pick<PatientDocument, 'title' | 'category' | 'note' | 'createdAt'>>) {
  if (DATA_MODE === 'supabase') {
    if (!supabase) return { ok: false as const, error: 'Supabase não configurado.' }
    const { data, error } = await supabase
      .from('documents')
      .update({
        title: patch.title?.trim() || undefined,
        category: patch.category,
        note: patch.note?.trim() || undefined,
        created_at: patch.createdAt ? toIsoDateTime(patch.createdAt) : undefined,
      })
      .eq('id', id)
      .select('id, patient_id, case_id, category, title, file_path, file_name, mime_type, status, note, error_note, created_at, data')
      .single()
    if (error || !data) return { ok: false as const, error: error?.message ?? 'Documento não encontrado.' }
    return { ok: true as const, doc: mapSupabaseDoc(data as Record<string, unknown>) }
  }

  const db = loadDb()
  const current = db.patientDocuments.find((doc) => doc.id === id)
  if (!current) return { ok: false as const, error: 'Documento não encontrado.' }

  const next: PatientDocument = {
    ...current,
    ...patch,
    title: patch.title !== undefined ? patch.title.trim() || current.title : current.title,
    category: patch.category ?? current.category,
    note: patch.note !== undefined ? patch.note.trim() || undefined : current.note,
    createdAt: patch.createdAt ? toIsoDateTime(patch.createdAt) : current.createdAt,
  }

  db.patientDocuments = db.patientDocuments.map((doc) => (doc.id === id ? next : doc))
  pushAudit(db, {
    entity: 'document',
    entityId: next.id,
    action: 'document.update',
    message: `Documento ${next.title} atualizado.`,
  })
  saveDb(db)
  return { ok: true as const, doc: next }
}

export async function deletePatientDoc(id: string) {
  if (DATA_MODE === 'supabase') {
    if (!supabase) return { ok: false as const, error: 'Supabase não configurado.' }
    const existing = await getPatientDoc(id)
    if (!existing) return { ok: false as const, error: 'Documento não encontrado.' }
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: nowIso() })
      .eq('id', id)
    if (error) return { ok: false as const, error: error.message }
    if (existing.filePath) {
      await deleteFromStorage(existing.filePath)
    }
    logger.info('Documento do paciente removido no Supabase.', {
      flow: 'documents.delete',
      documentId: id,
      patientId: existing.patientId,
    })
    return { ok: true as const }
  }

  const db = loadDb()
  const current = db.patientDocuments.find((doc) => doc.id === id)
  if (!current) return { ok: false as const, error: 'Documento não encontrado.' }

  db.patientDocuments = db.patientDocuments.filter((doc) => doc.id !== id)
  pushAudit(db, {
    entity: 'document',
    entityId: id,
    action: 'document.delete',
    message: `Documento ${current.title} removido.`,
  })
  saveDb(db)
  return { ok: true as const }
}

export async function markPatientDocAsError(id: string, errorNote: string) {
  const trimmed = errorNote.trim()
  if (!trimmed) return { ok: false as const, error: 'Informe o motivo da falha do documento.' }

  if (DATA_MODE === 'supabase') {
    if (!supabase) return { ok: false as const, error: 'Supabase não configurado.' }
    const { error } = await supabase
      .from('documents')
      .update({ status: 'erro', error_note: trimmed })
      .eq('id', id)
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const }
  }

  const db = loadDb()
  const target = db.patientDocuments.find((doc) => doc.id === id)
  if (!target) return { ok: false as const, error: 'Documento não encontrado.' }

  db.patientDocuments = db.patientDocuments.map((doc) =>
    doc.id === id ? { ...doc, status: 'erro', errorNote: trimmed } : doc,
  )
  pushAudit(db, {
    entity: 'document',
    entityId: id,
    action: 'document.mark_error',
    message: `Documento ${target.title} marcado com erro.`,
  })
  saveDb(db)
  return { ok: true as const }
}

export async function restoreDocStatus(id: string) {
  if (DATA_MODE === 'supabase') {
    if (!supabase) return { ok: false as const, error: 'Supabase não configurado.' }
    const { error } = await supabase
      .from('documents')
      .update({ status: 'ok', error_note: null })
      .eq('id', id)
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const }
  }

  const db = loadDb()
  const target = db.patientDocuments.find((doc) => doc.id === id)
  if (!target) return { ok: false as const, error: 'Documento não encontrado.' }

  db.patientDocuments = db.patientDocuments.map((doc) =>
    doc.id === id ? { ...doc, status: 'ok', errorNote: undefined } : doc,
  )
  pushAudit(db, {
    entity: 'document',
    entityId: id,
    action: 'document.restore',
    message: `Documento ${target.title} restaurado para OK.`,
  })
  saveDb(db)
  return { ok: true as const }
}
