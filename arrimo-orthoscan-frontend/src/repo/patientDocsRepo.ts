import { loadDb, saveDb } from '../data/db'
import type { PatientDocument } from '../types/PatientDocument'

function nowIso() {
  return new Date().toISOString()
}

export function listPatientDocs(patientId: string) {
  return loadDb()
    .patientDocuments.filter((doc) => doc.patientId === patientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function addPatientDoc(payload: {
  patientId: string
  title: string
  category: PatientDocument['category']
  note?: string
  createdAt?: string
  file?: File
}) {
  const db = loadDb()
  const doc: PatientDocument = {
    id: `pat_doc_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    patientId: payload.patientId,
    title: payload.title.trim() || 'Documento',
    category: payload.category,
    createdAt: payload.createdAt ? new Date(payload.createdAt).toISOString() : nowIso(),
    note: payload.note?.trim() || undefined,
    isLocal: Boolean(payload.file),
    url: payload.file ? URL.createObjectURL(payload.file) : undefined,
    fileName: payload.file?.name ?? (payload.title.trim() || 'arquivo'),
    mimeType: payload.file?.type,
    status: 'ok',
  }

  db.patientDocuments = [doc, ...db.patientDocuments]
  saveDb(db)
  return doc
}

export function markPatientDocAsError(id: string, errorNote: string) {
  const db = loadDb()
  const target = db.patientDocuments.find((doc) => doc.id === id)
  if (!target) return { ok: false as const, error: 'Documento nao encontrado.' }

  db.patientDocuments = db.patientDocuments.map((doc) =>
    doc.id === id ? { ...doc, status: 'erro', errorNote: errorNote.trim() } : doc,
  )
  saveDb(db)
  return { ok: true as const }
}

export function restoreDocStatus(id: string) {
  const db = loadDb()
  const target = db.patientDocuments.find((doc) => doc.id === id)
  if (!target) return { ok: false as const, error: 'Documento nao encontrado.' }

  db.patientDocuments = db.patientDocuments.map((doc) =>
    doc.id === id ? { ...doc, status: 'ok', errorNote: undefined } : doc,
  )
  saveDb(db)
  return { ok: true as const }
}
