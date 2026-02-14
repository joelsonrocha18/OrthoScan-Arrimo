import { ensureMasterUserInDb, loadDb } from '../data/db'
import { getSessionUserId, setSessionUserId, clearSession, setSessionProfile } from '../lib/auth'
import type { AuthProvider, SessionUser } from './session'

export const authLocal: AuthProvider = {
  async getCurrentUser(): Promise<SessionUser | null> {
    const userId = getSessionUserId()
    if (!userId) return null
    const db = loadDb()
    const user = db.users.find((item) => item.id === userId)
    if (!user || user.deletedAt || !user.isActive) return null
    const profile = {
      id: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.linkedClinicId,
      dentistId: user.linkedDentistId,
    }
    setSessionProfile(profile)
    return profile
  },
  async signIn(email: string, password: string) {
    const localPassword = (import.meta.env.VITE_LOCAL_PASSWORD as string | undefined)?.trim()
    let db = loadDb()
    let user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.isActive && !item.deletedAt)
    if (!user) {
      db = ensureMasterUserInDb()
      user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.isActive && !item.deletedAt)
    }
    if (!user) {
      throw new Error('Usuario nao encontrado.')
    }
    if (!user.password && !localPassword) {
      throw new Error('Senha local nao configurada. Defina VITE_LOCAL_PASSWORD para ambiente local.')
    }
    const validPassword = user.password ? password === user.password : Boolean(localPassword) && password === localPassword
    if (!validPassword) {
      throw new Error('Senha invalida.')
    }
    setSessionUserId(user.id)
    setSessionProfile({
      id: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.linkedClinicId,
      dentistId: user.linkedDentistId,
    })
  },
  async signOut() {
    clearSession()
  },
}
