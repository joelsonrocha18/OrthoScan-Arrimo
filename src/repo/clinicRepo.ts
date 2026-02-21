import { loadDb, saveDb } from '../data/db'
import type { Clinic } from '../types/Clinic'
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

export function listClinics(options?: { query?: string; includeDeleted?: boolean }) {
  const query = options?.query?.trim().toLowerCase() ?? ''
  const includeDeleted = options?.includeDeleted ?? false
  return loadDb()
    .clinics.filter((clinic) => (includeDeleted ? true : !clinic.deletedAt))
    .filter((clinic) => {
      if (!query) return true
      return (
        matchesQuery(clinic.tradeName, query) ||
        matchesQuery(clinic.legalName, query) ||
        matchesQuery(clinic.cnpj, query) ||
        matchesQuery(clinic.phone, query)
      )
    })
    .sort((a, b) => a.tradeName.localeCompare(b.tradeName))
}

export function getClinic(id: string) {
  return loadDb().clinics.find((clinic) => clinic.id === id) ?? null
}

export function createClinic(payload: Omit<Clinic, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) {
  const db = loadDb()
  const tradeName = payload.tradeName.trim()
  if (!tradeName) return { ok: false as const, error: 'Nome fantasia e obrigatorio.' }
  if (payload.cnpj && !isValidCnpj(payload.cnpj)) {
    return { ok: false as const, error: 'CNPJ invalido.' }
  }

  const now = nowIso()
  const clinic: Clinic = {
    id: `clinic_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    tradeName,
    legalName: normalizeText(payload.legalName),
    cnpj: payload.cnpj ? formatCnpj(payload.cnpj) : undefined,
    phone: normalizeText(payload.phone),
    whatsapp: normalizeText(payload.whatsapp),
    email: normalizeText(payload.email),
    address: payload.address,
    notes: normalizeText(payload.notes),
    isActive: payload.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  }

  db.clinics = [clinic, ...db.clinics]
  saveDb(db)
  return { ok: true as const, clinic }
}

export function updateClinic(id: string, patch: Partial<Clinic>) {
  const db = loadDb()
  const current = db.clinics.find((clinic) => clinic.id === id)
  if (!current) return { ok: false as const, error: 'Clinica nao encontrada.' }
  if (patch.cnpj && !isValidCnpj(patch.cnpj)) {
    return { ok: false as const, error: 'CNPJ invalido.' }
  }

  const next: Clinic = {
    ...current,
    ...patch,
    tradeName: patch.tradeName ? patch.tradeName.trim() : current.tradeName,
    legalName: patch.legalName !== undefined ? normalizeText(patch.legalName) : current.legalName,
    cnpj: patch.cnpj ? formatCnpj(patch.cnpj) : patch.cnpj === '' ? undefined : current.cnpj,
    phone: patch.phone !== undefined ? normalizeText(patch.phone) : current.phone,
    whatsapp: patch.whatsapp !== undefined ? normalizeText(patch.whatsapp) : current.whatsapp,
    email: patch.email !== undefined ? normalizeText(patch.email) : current.email,
    notes: patch.notes !== undefined ? normalizeText(patch.notes) : current.notes,
    updatedAt: nowIso(),
  }

  db.clinics = db.clinics.map((clinic) => (clinic.id === id ? next : clinic))
  saveDb(db)
  return { ok: true as const, clinic: next }
}

export function softDeleteClinic(id: string) {
  const db = loadDb()
  const current = db.clinics.find((clinic) => clinic.id === id)
  if (!current) return { ok: false as const, error: 'Clinica nao encontrada.' }
  db.clinics = db.clinics.map((clinic) =>
    clinic.id === id ? { ...clinic, deletedAt: nowIso(), isActive: false, updatedAt: nowIso() } : clinic,
  )
  saveDb(db)
  return { ok: true as const }
}

export function restoreClinic(id: string) {
  const db = loadDb()
  const current = db.clinics.find((clinic) => clinic.id === id)
  if (!current) return { ok: false as const, error: 'Clinica nao encontrada.' }
  db.clinics = db.clinics.map((clinic) =>
    clinic.id === id ? { ...clinic, deletedAt: undefined, isActive: true, updatedAt: nowIso() } : clinic,
  )
  saveDb(db)
  return { ok: true as const }
}
