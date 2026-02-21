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
  if (!name) return { ok: false as const, error: 'Nome e obrigatorio.' }

  const type = payload.type
  const cnpj = normalizeText(payload.cnpj)
  if (type === 'clinica') {
    if (!cnpj) return { ok: false as const, error: 'CNPJ e obrigatorio para clinica.' }
    if (!isValidCnpj(cnpj)) return { ok: false as const, error: 'CNPJ invalido.' }
  }

  const now = nowIso()
  const next: DentistClinic = {
    id: `dent_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    type,
    cnpj: cnpj ? formatCnpj(cnpj) : undefined,
    cro: normalizeText(payload.cro),
    gender: payload.gender ?? 'masculino',
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
  if (!current) return { ok: false as const, error: 'Registro nao encontrado.' }

  const nextType = patch.type ?? current.type
  const cnpjValue = patch.cnpj ?? current.cnpj
  if (nextType === 'clinica') {
    if (!cnpjValue) return { ok: false as const, error: 'CNPJ e obrigatorio para clinica.' }
    if (!isValidCnpj(cnpjValue)) return { ok: false as const, error: 'CNPJ invalido.' }
  }

  const next: DentistClinic = {
    ...current,
    ...patch,
    name: patch.name ? patch.name.trim() : current.name,
    cnpj: cnpjValue ? formatCnpj(cnpjValue) : undefined,
    cro: patch.cro !== undefined ? normalizeText(patch.cro) : current.cro,
    gender: patch.gender ?? current.gender ?? 'masculino',
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
  if (!current) return { ok: false as const, error: 'Registro nao encontrado.' }

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
  if (!current) return { ok: false as const, error: 'Registro nao encontrado.' }

  db.dentists = db.dentists.map((item) =>
    item.id === id
      ? { ...item, deletedAt: undefined, isActive: true, updatedAt: nowIso() }
      : item,
  )
  saveDb(db)
  return { ok: true as const }
}
