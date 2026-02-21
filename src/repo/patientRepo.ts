import { loadDb, saveDb } from '../data/db'
import type { Patient } from '../types/Patient'

function nowIso() {
  return new Date().toISOString()
}

function normalizeName(name: string) {
  return name.trim()
}

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
  const name = normalizeName(payload.name)
  if (!name) return { ok: false as const, error: 'Nome e obrigatorio.' }
  if (!payload.birthDate) return { ok: false as const, error: 'Data de nascimento e obrigatoria.' }

  const now = nowIso()
  const next: Patient = {
    id: `pat_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
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
  if (!current) return { ok: false as const, error: 'Paciente nao encontrado.' }
  const nextBirthDate = patch.birthDate ?? current.birthDate
  if (!nextBirthDate) return { ok: false as const, error: 'Data de nascimento e obrigatoria.' }

  const next: Patient = {
    ...current,
    ...patch,
    name: patch.name ? normalizeName(patch.name) : current.name,
    updatedAt: nowIso(),
  }

  db.patients = db.patients.map((item) => (item.id === id ? next : item))
  saveDb(db)
  return { ok: true as const, patient: next }
}

export function softDeletePatient(id: string) {
  const db = loadDb()
  const current = db.patients.find((item) => item.id === id)
  if (!current) return { ok: false as const, error: 'Paciente nao encontrado.' }

  db.patients = db.patients.map((item) =>
    item.id === id ? { ...item, deletedAt: nowIso(), updatedAt: nowIso() } : item,
  )
  saveDb(db)
  return { ok: true as const }
}

export function restorePatient(id: string) {
  const db = loadDb()
  const current = db.patients.find((item) => item.id === id)
  if (!current) return { ok: false as const, error: 'Paciente nao encontrado.' }

  db.patients = db.patients.map((item) =>
    item.id === id ? { ...item, deletedAt: undefined, updatedAt: nowIso() } : item,
  )
  saveDb(db)
  return { ok: true as const }
}
