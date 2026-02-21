import { DB_KEY, loadDb, saveDb, type AppDb } from '../../data/db'

export function emptyDb(): AppDb {
  return {
    cases: [],
    labItems: [],
    patients: [],
    patientDocuments: [],
    scans: [],
    dentists: [],
    clinics: [],
    users: [],
    auditLogs: [],
  }
}

export function setDb(db: AppDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export function getDb() {
  return loadDb()
}

export function resetDb(db?: AppDb) {
  saveDb(db ?? emptyDb())
}
