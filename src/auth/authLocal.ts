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
    const credential = email.trim().toLowerCase()
    let db = loadDb()
    let user = db.users.find((item) => {
      if (!item.isActive || item.deletedAt) return false
      const emailMatch = item.email.toLowerCase() === credential
      const usernameMatch = (item.username ?? '').trim().toLowerCase() === credential
      return emailMatch || usernameMatch
    })
    if (!user) {
      db = ensureMasterUserInDb()
      user = db.users.find((item) => {
        if (!item.isActive || item.deletedAt) return false
        const emailMatch = item.email.toLowerCase() === credential
        const usernameMatch = (item.username ?? '').trim().toLowerCase() === credential
        return emailMatch || usernameMatch
      })
    }
    if (!user) {
      throw new Error('Usuario nao encontrado.')
    }
    if (!user.password) {
      throw new Error('Senha nao configurada para este usuario.')
    }
    const validPassword = password === user.password
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
