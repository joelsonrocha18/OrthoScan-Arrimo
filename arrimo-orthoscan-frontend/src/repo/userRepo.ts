import { loadDb, saveDb } from '../data/db'
import type { Role, User } from '../types/User'

function nowIso() {
  return new Date().toISOString()
}

export function listUsers(includeDeleted = false) {
  return loadDb()
    .users.filter((user) => (includeDeleted ? true : !user.deletedAt))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getUser(id: string) {
  return loadDb().users.find((user) => user.id === id) ?? null
}

export function createUser(payload: {
  name: string
  username?: string
  email: string
  password: string
  cpf?: string
  cep?: string
  birthDate?: string
  phone?: string
  addressLine?: string
  role: Role
  isActive: boolean
  linkedDentistId?: string
  linkedClinicId?: string
}) {
  const db = loadDb()
  if (!payload.name.trim()) return { ok: false as const, error: 'Nome e obrigatorio.' }
  if (!payload.email.trim()) return { ok: false as const, error: 'Email e obrigatorio.' }
  if (!payload.password.trim()) return { ok: false as const, error: 'Senha e obrigatoria.' }
  const duplicated = db.users.find((user) => user.email.toLowerCase() === payload.email.trim().toLowerCase())
  if (duplicated) return { ok: false as const, error: 'Email ja cadastrado.' }

  const now = nowIso()
  const user: User = {
    id: `user_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name: payload.name.trim(),
    username: payload.username?.trim() || undefined,
    email: payload.email.trim(),
    password: payload.password,
    cpf: payload.cpf?.trim() || undefined,
    cep: payload.cep?.trim() || undefined,
    birthDate: payload.birthDate || undefined,
    phone: payload.phone?.trim() || undefined,
    addressLine: payload.addressLine?.trim() || undefined,
    role: payload.role,
    isActive: payload.isActive,
    linkedDentistId: payload.linkedDentistId,
    linkedClinicId: payload.linkedClinicId,
    createdAt: now,
    updatedAt: now,
  }

  db.users = [user, ...db.users]
  saveDb(db)
  return { ok: true as const, user }
}

export function updateUser(id: string, patch: Partial<User>) {
  const db = loadDb()
  const current = db.users.find((user) => user.id === id)
  if (!current) return { ok: false as const, error: 'Usuario nao encontrado.' }

  const next: User = {
    ...current,
    ...patch,
    name: patch.name ? patch.name.trim() : current.name,
    email: patch.email ? patch.email.trim() : current.email,
    password: typeof patch.password === 'string' ? patch.password : current.password,
    cpf: patch.cpf ? patch.cpf.trim() : current.cpf,
    cep: patch.cep ? patch.cep.trim() : current.cep,
    username: patch.username ? patch.username.trim() : current.username,
    phone: patch.phone ? patch.phone.trim() : current.phone,
    addressLine: patch.addressLine ? patch.addressLine.trim() : current.addressLine,
    updatedAt: nowIso(),
  }

  db.users = db.users.map((user) => (user.id === id ? next : user))
  saveDb(db)
  return { ok: true as const, user: next }
}

export function resetUserPassword(id: string, password: string) {
  if (!password.trim()) return { ok: false as const, error: 'Senha temporaria invalida.' }
  return updateUser(id, { password })
}

export function setUserActive(id: string, isActive: boolean) {
  const current = getUser(id)
  if (current?.role === 'master_admin') return { ok: false as const, error: 'Nao e permitido desativar o master admin.' }
  return updateUser(id, { isActive })
}

export function softDeleteUser(id: string) {
  const db = loadDb()
  const current = db.users.find((user) => user.id === id)
  if (!current) return { ok: false as const, error: 'Usuario nao encontrado.' }
  if (current.role === 'master_admin') return { ok: false as const, error: 'Nao e permitido excluir o master admin.' }

  db.users = db.users.map((user) =>
    user.id === id ? { ...user, deletedAt: nowIso(), isActive: false, updatedAt: nowIso() } : user,
  )
  saveDb(db)
  return { ok: true as const }
}

export function restoreUser(id: string) {
  const db = loadDb()
  const current = db.users.find((user) => user.id === id)
  if (!current) return { ok: false as const, error: 'Usuario nao encontrado.' }

  db.users = db.users.map((user) =>
    user.id === id ? { ...user, deletedAt: undefined, isActive: true, updatedAt: nowIso() } : user,
  )
  saveDb(db)
  return { ok: true as const }
}
