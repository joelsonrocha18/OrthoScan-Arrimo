import type { AppDb } from '../data/db'
import type { User } from '../types/User'

function dentistIdsForClinic(db: AppDb, clinicId?: string) {
  if (!clinicId) return new Set<string>()
  return new Set(db.dentists.filter((item) => item.type === 'dentista' && item.clinicId === clinicId).map((item) => item.id))
}

export function listPatientsForUser(db: AppDb, user: User | null) {
  if (!user) return []
  if (user.role === 'dentist_client') {
    return db.patients.filter((patient) => patient.primaryDentistId === user.linkedDentistId)
  }
  if (user.role === 'clinic_client') {
    const clinicId = user.linkedClinicId
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
  if (user.role === 'clinic_client') {
    const patientIds = new Set(listPatientsForUser(db, user).map((item) => item.id))
    return db.scans.filter(
      (scan) =>
        scan.clinicId === user.linkedClinicId ||
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
  if (user.role === 'clinic_client') {
    const patientIds = new Set(listPatientsForUser(db, user).map((item) => item.id))
    return db.cases.filter(
      (caseItem) =>
        caseItem.clinicId === user.linkedClinicId ||
        (caseItem.patientId && patientIds.has(caseItem.patientId)),
    )
  }
  return db.cases
}

export function listLabItemsForUser(db: AppDb, user: User | null) {
  if (!user) return []
  if (user.role === 'dentist_client' || user.role === 'clinic_client') {
    const allowedCases = new Set(listCasesForUser(db, user).map((item) => item.id))
    return db.labItems.filter((item) => item.caseId && allowedCases.has(item.caseId))
  }
  return db.labItems
}
