import { loadDb, saveDb } from './db'
import type { DentistClinic } from '../types/DentistClinic'
import { formatCnpj, isValidCnpj } from '../lib/cnpj'

function nowIso() {
  return new Date().toISOString()
}

function normalizeText(value?: string) {
  return value?.trim() || undefined
}

function matchesQuery(value: string | undefined, query: string) {
  if (!value) return false
  return value.toLowerCase().includes(query)
}

export function listDentists(options?: {
  query?: string
  includeDeleted?: boolean
  includeInactive?: boolean
}) {
  const query = options?.query?.trim().toLowerCase() ?? ''
  const { includeDeleted = false, includeInactive = true } = options ?? {}
  return loadDb()
    .dentists.filter((item) => (includeDeleted ? true : !item.deletedAt))
    .filter((item) => (includeInactive ? true : item.isActive))
    .filter((item) => {
      if (!query) return true
      return (
        matchesQuery(item.name, query) ||
        matchesQuery(item.cnpj, query) ||
        matchesQuery(item.cro, query) ||
        matchesQuery(item.phone, query) ||
        matchesQuery(item.whatsapp, query) ||
        matchesQuery(item.email, query)
      )
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getDentist(id: string) {
  return loadDb().dentists.find((item) => item.id === id) ?? null
}

export function createDentist(payload: Omit<DentistClinic, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) {
  const db = loadDb()
  const name = payload.name.trim()
  if (!name) return { ok: false as const, error: 'Nome é obrigatório.' }

  const type = payload.type
  const cnpj = normalizeText(payload.cnpj)
  if (type === 'clinica') {
    if (!cnpj) return { ok: false as const, error: 'CNPJ é obrigatório para clínica.' }
    if (!isValidCnpj(cnpj)) return { ok: false as const, error: 'CNPJ inválido.' }
  }

  const now = nowIso()
  const next: DentistClinic = {
    id: `dent_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    firstName: normalizeText(payload.firstName),
    lastName: normalizeText(payload.lastName),
    type,
    cnpj: cnpj ? formatCnpj(cnpj) : undefined,
    cro: normalizeText(payload.cro),
    gender: payload.gender ?? 'masculino',
    cpf: normalizeText(payload.cpf),
    birthDate: normalizeText(payload.birthDate),
    clinicId: payload.clinicId,
    phone: normalizeText(payload.phone),
    whatsapp: normalizeText(payload.whatsapp),
    email: normalizeText(payload.email),
    address: payload.address,
    notes: normalizeText(payload.notes),
    isActive: payload.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  }

  db.dentists = [next, ...db.dentists]
  saveDb(db)
  return { ok: true as const, dentist: next }
}

export function updateDentist(id: string, patch: Partial<DentistClinic>) {
  const db = loadDb()
  const current = db.dentists.find((item) => item.id === id)
  if (!current) return { ok: false as const, error: 'Registro não encontrado.' }

  const nextType = patch.type ?? current.type
  const cnpjValue = patch.cnpj ?? current.cnpj
  if (nextType === 'clinica') {
    if (!cnpjValue) return { ok: false as const, error: 'CNPJ é obrigatório para clínica.' }
    if (!isValidCnpj(cnpjValue)) return { ok: false as const, error: 'CNPJ inválido.' }
  }

  const next: DentistClinic = {
    ...current,
    ...patch,
    name: patch.name ? patch.name.trim() : current.name,
    firstName: patch.firstName !== undefined ? normalizeText(patch.firstName) : current.firstName,
    lastName: patch.lastName !== undefined ? normalizeText(patch.lastName) : current.lastName,
    cnpj: cnpjValue ? formatCnpj(cnpjValue) : undefined,
    cro: patch.cro !== undefined ? normalizeText(patch.cro) : current.cro,
    gender: patch.gender ?? current.gender ?? 'masculino',
    cpf: patch.cpf !== undefined ? normalizeText(patch.cpf) : current.cpf,
    birthDate: patch.birthDate !== undefined ? normalizeText(patch.birthDate) : current.birthDate,
    clinicId: patch.clinicId ?? current.clinicId,
    phone: patch.phone !== undefined ? normalizeText(patch.phone) : current.phone,
    whatsapp: patch.whatsapp !== undefined ? normalizeText(patch.whatsapp) : current.whatsapp,
    email: patch.email !== undefined ? normalizeText(patch.email) : current.email,
    notes: patch.notes !== undefined ? normalizeText(patch.notes) : current.notes,
    updatedAt: nowIso(),
  }

  db.dentists = db.dentists.map((item) => (item.id === id ? next : item))
  saveDb(db)
  return { ok: true as const, dentist: next }
}

export function softDeleteDentist(id: string) {
  const db = loadDb()
  const current = db.dentists.find((item) => item.id === id)
  if (!current) return { ok: false as const, error: 'Registro não encontrado.' }

  db.dentists = db.dentists.map((item) =>
    item.id === id
      ? { ...item, deletedAt: nowIso(), isActive: false, updatedAt: nowIso() }
      : item,
  )
  saveDb(db)
  return { ok: true as const }
}

export function restoreDentist(id: string) {
  const db = loadDb()
  const current = db.dentists.find((item) => item.id === id)
  if (!current) return { ok: false as const, error: 'Registro não encontrado.' }

  db.dentists = db.dentists.map((item) =>
    item.id === id
      ? { ...item, deletedAt: undefined, isActive: true, updatedAt: nowIso() }
      : item,
  )
  saveDb(db)
  return { ok: true as const }
}

