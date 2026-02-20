import type { AppDb } from '../data/db'
import type { User } from '../types/User'

function dentistIdsForClinic(db: AppDb, clinicId?: string) {
  if (!clinicId) return new Set<string>()
  return new Set(db.dentists.filter((item) => item.type === 'dentista' && item.clinicId === clinicId).map((item) => item.id))
}

function resolveClinicScope(user: User | null) {
  if (!user?.linkedClinicId) return undefined
  if (user.role === 'master_admin') return undefined
  return user.linkedClinicId
}

export function listPatientsForUser(db: AppDb, user: User | null) {
  if (!user) return []
  if (user.role === 'dentist_client') {
    return db.patients.filter((patient) => patient.primaryDentistId === user.linkedDentistId)
  }
  const clinicId = resolveClinicScope(user)
  if (clinicId) {
    const dentistIds = dentistIdsForClinic(db, clinicId)
    const patientsByClinic = db.patients.filter((patient) => patient.clinicId === clinicId)
    const patientsByDentist = db.patients.filter((patient) => patient.primaryDentistId && dentistIds.has(patient.primaryDentistId))
    return Array.from(new Set([...patientsByClinic, ...patientsByDentist]))
  }
  return db.patients
}

export function listScansForUser(db: AppDb, user: User | null) {
  if (!user) return []
  if (user.role === 'dentist_client') {
    const patientIds = new Set(listPatientsForUser(db, user).map((item) => item.id))
    return db.scans.filter(
      (scan) =>
        (scan.patientId && patientIds.has(scan.patientId)) ||
        scan.dentistId === user.linkedDentistId ||
        scan.requestedByDentistId === user.linkedDentistId,
    )
  }
  const clinicId = resolveClinicScope(user)
  if (clinicId) {
    const patientIds = new Set(listPatientsForUser(db, user).map((item) => item.id))
    return db.scans.filter(
      (scan) =>
        scan.clinicId === clinicId ||
        (scan.patientId && patientIds.has(scan.patientId)),
    )
  }
  return db.scans
}

export function listCasesForUser(db: AppDb, user: User | null) {
  if (!user) return []
  if (user.role === 'dentist_client') {
    const patientIds = new Set(listPatientsForUser(db, user).map((item) => item.id))
    return db.cases.filter(
      (caseItem) =>
        (caseItem.patientId && patientIds.has(caseItem.patientId)) ||
        caseItem.dentistId === user.linkedDentistId ||
        caseItem.requestedByDentistId === user.linkedDentistId,
    )
  }
  const clinicId = resolveClinicScope(user)
  if (clinicId) {
    const patientIds = new Set(listPatientsForUser(db, user).map((item) => item.id))
    return db.cases.filter(
      (caseItem) =>
        caseItem.clinicId === clinicId ||
        (caseItem.patientId && patientIds.has(caseItem.patientId)),
    )
  }
  return db.cases
}

export function listLabItemsForUser(db: AppDb, user: User | null) {
  if (!user) return []
  if (user.role === 'dentist_client' || resolveClinicScope(user)) {
    const allowedCases = new Set(listCasesForUser(db, user).map((item) => item.id))
    return db.labItems.filter((item) => item.caseId && allowedCases.has(item.caseId))
  }
  return db.labItems
}
