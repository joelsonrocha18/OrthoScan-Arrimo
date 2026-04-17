import { loadDb, saveDb } from '../data/db'
import { normalizeText } from '../shared/validators'
import { nowIsoDateTime } from '../shared/utils/date'
import { createEntityId } from '../shared/utils/id'
import type { Patient } from '../types/Patient'

function matchesQuery(value: string | undefined, query: string) {
  if (!value) return false
  return value.toLowerCase().includes(query)
}

export function listPatients(options?: { query?: string; includeDeleted?: boolean }) {
  const query = options?.query?.trim().toLowerCase() ?? ''
  const includeDeleted = options?.includeDeleted ?? false
  return loadDb()
    .patients.filter((item) => (includeDeleted ? true : !item.deletedAt))
    .filter((item) => {
      if (!query) return true
      return (
        matchesQuery(item.name, query) ||
        matchesQuery(item.cpf, query) ||
        matchesQuery(item.phone, query) ||
        matchesQuery(item.whatsapp, query)
      )
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getPatient(id: string) {
  return loadDb().patients.find((item) => item.id === id) ?? null
}

export function createPatient(payload: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) {
  const db = loadDb()
  const name = normalizeText(payload.name) ?? ''
  if (!name) return { ok: false as const, error: 'Nome é obrigatório.' }
  if (!payload.birthDate) return { ok: false as const, error: 'Data de nascimento é obrigatória.' }

  const now = nowIsoDateTime()
  const next: Patient = {
    id: createEntityId('pat'),
    name,
    firstName: payload.firstName,
    lastName: payload.lastName,
    cpf: payload.cpf,
    gender: payload.gender,
    phone: payload.phone,
    whatsapp: payload.whatsapp,
    email: payload.email,
    birthDate: payload.birthDate,
    address: payload.address,
    primaryDentistId: payload.primaryDentistId,
    clinicId: payload.clinicId,
    notes: payload.notes,
    createdAt: now,
    updatedAt: now,
  }

  db.patients = [next, ...db.patients]
  saveDb(db)
  return { ok: true as const, patient: next }
}

export function updatePatient(id: string, patch: Partial<Patient>) {
  const db = loadDb()
  const current = db.patients.find((item) => item.id === id)
  if (!current) return { ok: false as const, error: 'Paciente não encontrado.' }
  const nextBirthDate = patch.birthDate ?? current.birthDate
  if (!nextBirthDate) return { ok: false as const, error: 'Data de nascimento é obrigatória.' }

  const next: Patient = {
    ...current,
    ...patch,
    name: patch.name ? (normalizeText(patch.name) ?? current.name) : current.name,
    firstName: patch.firstName !== undefined ? patch.firstName?.trim() || undefined : current.firstName,
    lastName: patch.lastName !== undefined ? patch.lastName?.trim() || undefined : current.lastName,
    updatedAt: nowIsoDateTime(),
  }

  db.patients = db.patients.map((item) => (item.id === id ? next : item))
  saveDb(db)
  return { ok: true as const, patient: next }
}

export function softDeletePatient(id: string) {
  const db = loadDb()
  const current = db.patients.find((item) => item.id === id)
  if (!current) return { ok: false as const, error: 'Paciente não encontrado.' }

  db.patients = db.patients.map((item) =>
    item.id === id ? { ...item, deletedAt: nowIsoDateTime(), updatedAt: nowIsoDateTime() } : item,
  )
  saveDb(db)
  return { ok: true as const }
}

export function restorePatient(id: string) {
  const db = loadDb()
  const current = db.patients.find((item) => item.id === id)
  if (!current) return { ok: false as const, error: 'Paciente não encontrado.' }

  db.patients = db.patients.map((item) =>
    item.id === id ? { ...item, deletedAt: undefined, updatedAt: nowIsoDateTime() } : item,
  )
  saveDb(db)
  return { ok: true as const }
}
