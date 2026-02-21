import { describe, expect, it, beforeEach } from 'vitest'
import { can, permissionsForRole } from '../../auth/permissions'
import { listCasesForUser, listPatientsForUser, listScansForUser } from '../../auth/scope'
import { loadDb } from '../../data/db'
import { seedQaData, clearQaSeed } from '../seed'

describe('RBAC and scope', () => {
  beforeEach(() => {
    clearQaSeed()
    seedQaData()
  })

  it('has permissions configured for all required roles', () => {
    const roles = ['master_admin', 'dentist_admin', 'dentist_client', 'clinic_client', 'lab_tech', 'receptionist'] as const
    for (const role of roles) {
      expect(permissionsForRole(role).length).toBeGreaterThan(0)
    }
  })

  it('enforces key permission boundaries', () => {
    const master = { id: '1', name: 'm', email: 'm@x', role: 'master_admin', isActive: true, createdAt: '', updatedAt: '' } as const
    const admin = { id: '2', name: 'a', email: 'a@x', role: 'dentist_admin', isActive: true, createdAt: '', updatedAt: '' } as const
    const lab = { id: '3', name: 'l', email: 'l@x', role: 'lab_tech', isActive: true, createdAt: '', updatedAt: '' } as const
    const recep = { id: '4', name: 'r', email: 'r@x', role: 'receptionist', isActive: true, createdAt: '', updatedAt: '' } as const

    expect(can(master, 'users.delete')).toBe(true)
    expect(can(admin, 'users.delete')).toBe(true)
    expect(can(lab, 'patients.write')).toBe(false)
    expect(can(recep, 'scans.write')).toBe(true)
  })

  it('applies dentist_client and clinic_client scope to patients/scans/cases', () => {
    const db = loadDb()
    const dentistClient = db.users.find((u) => u.id === 'qa_user_dentist_client') ?? null
    const clinicClient = db.users.find((u) => u.id === 'qa_user_clinic_client') ?? null

    const dentistPatients = listPatientsForUser(db, dentistClient)
    const clinicPatients = listPatientsForUser(db, clinicClient)
    const dentistScans = listScansForUser(db, dentistClient)
    const clinicCases = listCasesForUser(db, clinicClient)

    expect(dentistPatients.map((x) => x.id).sort()).toEqual(['qa_patient_1', 'qa_patient_2'])
    expect(clinicPatients.map((x) => x.id).sort()).toEqual(['qa_patient_1', 'qa_patient_2', 'qa_patient_3'])
    expect(dentistScans.map((x) => x.id)).toContain('qa_scan_1')
    expect(dentistScans.map((x) => x.id)).not.toContain('qa_scan_2')
    expect(clinicCases.map((x) => x.id)).toContain('qa_case_1')
    expect(clinicCases.map((x) => x.id)).not.toContain('qa_case_2')
  })
})
