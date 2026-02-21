import { loadDb, saveDb } from '../data/db'
import type { Clinic } from '../types/Clinic'
import type { DentistClinic } from '../types/DentistClinic'
import type { Patient } from '../types/Patient'
import type { Scan } from '../types/Scan'
import type { Case } from '../types/Case'
import type { LabItem } from '../types/Lab'
import type { User } from '../types/User'
import type { PatientDocument } from '../types/PatientDocument'

const DIAG_PREFIX = 'diag_'

function nowIso() {
  return new Date().toISOString()
}

function diagId(id: string) {
  return `${DIAG_PREFIX}${id}`
}

export function createDiagnosticsTestData() {
  const db = loadDb()
  const now = nowIso()

  const clinics: Clinic[] = [
    {
      id: diagId('clinic_c1'),
      tradeName: 'Clinica Teste C1',
      legalName: 'Clinica Teste C1 LTDA',
      cnpj: '',
      phone: '(11) 90000-0001',
      whatsapp: '(11) 90000-0001',
      email: 'diag_c1@clinic.local',
      notes: 'DIAG_TEST: clinica C1',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: diagId('clinic_c2'),
      tradeName: 'Clinica Teste C2',
      legalName: 'Clinica Teste C2 LTDA',
      cnpj: '',
      phone: '(11) 90000-0002',
      whatsapp: '(11) 90000-0002',
      email: 'diag_c2@clinic.local',
      notes: 'DIAG_TEST: clinica C2',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ]

  const dentists: DentistClinic[] = [
    {
      id: diagId('dentist_d1'),
      name: 'Dentista Teste D1',
      type: 'dentista',
      cro: 'CRO-D1',
      gender: 'masculino',
      clinicId: clinics[0].id,
      phone: '(11) 90000-1001',
      whatsapp: '(11) 90000-1001',
      email: 'diag_d1@dent.local',
      notes: 'DIAG_TEST: dentista D1',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: diagId('dentist_d2'),
      name: 'Dentista Teste D2',
      type: 'dentista',
      cro: 'CRO-D2',
      gender: 'feminino',
      clinicId: clinics[1].id,
      phone: '(11) 90000-1002',
      whatsapp: '(11) 90000-1002',
      email: 'diag_d2@dent.local',
      notes: 'DIAG_TEST: dentista D2',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ]

  const patients: Patient[] = [
    {
      id: diagId('patient_p1'),
      name: 'Paciente Teste P1',
      primaryDentistId: dentists[0].id,
      clinicId: clinics[0].id,
      phone: '(11) 90000-2001',
      whatsapp: '(11) 90000-2001',
      notes: 'DIAG_TEST: paciente P1',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: diagId('patient_p2'),
      name: 'Paciente Teste P2',
      primaryDentistId: dentists[1].id,
      clinicId: clinics[1].id,
      phone: '(11) 90000-2002',
      whatsapp: '(11) 90000-2002',
      notes: 'DIAG_TEST: paciente P2',
      createdAt: now,
      updatedAt: now,
    },
  ]

  const scans: Scan[] = [
    {
      id: diagId('scan_s1'),
      patientName: patients[0].name,
      patientId: patients[0].id,
      dentistId: dentists[0].id,
      clinicId: clinics[0].id,
      scanDate: now.slice(0, 10),
      arch: 'ambos',
      attachments: [],
      status: 'pendente',
      notes: 'DIAG_TEST: scan S1',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: diagId('scan_s2'),
      patientName: patients[1].name,
      patientId: patients[1].id,
      dentistId: dentists[1].id,
      clinicId: clinics[1].id,
      scanDate: now.slice(0, 10),
      arch: 'ambos',
      attachments: [],
      status: 'pendente',
      notes: 'DIAG_TEST: scan S2',
      createdAt: now,
      updatedAt: now,
    },
  ]

  const cases: Case[] = [
    {
      id: diagId('case_k1'),
      patientName: patients[0].name,
      patientId: patients[0].id,
      dentistId: dentists[0].id,
      clinicId: clinics[0].id,
      scanDate: now.slice(0, 10),
      totalTrays: 10,
      changeEveryDays: 7,
      status: 'planejamento',
      phase: 'planejamento',
      trays: [],
      attachments: [],
      scanFiles: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: diagId('case_k2'),
      patientName: patients[1].name,
      patientId: patients[1].id,
      dentistId: dentists[1].id,
      clinicId: clinics[1].id,
      scanDate: now.slice(0, 10),
      totalTrays: 10,
      changeEveryDays: 7,
      status: 'planejamento',
      phase: 'planejamento',
      trays: [],
      attachments: [],
      scanFiles: [],
      createdAt: now,
      updatedAt: now,
    },
  ]

  const labItems: LabItem[] = [
    {
      id: diagId('lab_l1'),
      caseId: cases[0].id,
      arch: 'ambos',
      trayNumber: 1,
      patientName: patients[0].name,
      plannedDate: now.slice(0, 10),
      dueDate: now.slice(0, 10),
      status: 'aguardando_iniciar',
      priority: 'Baixo',
      notes: 'DIAG_TEST: lab item',
      createdAt: now,
      updatedAt: now,
    },
  ]

  const users: User[] = [
    {
      id: diagId('user_master'),
      name: 'DIAG_TEST Master',
      email: 'diag_master@local',
      role: 'master_admin',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: diagId('user_dentist_client'),
      name: 'DIAG_TEST Dentist Client',
      email: 'diag_dentist_client@local',
      role: 'dentist_client',
      linkedDentistId: dentists[0].id,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: diagId('user_clinic_client'),
      name: 'DIAG_TEST Clinic Client',
      email: 'diag_clinic_client@local',
      role: 'clinic_client',
      linkedClinicId: clinics[0].id,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: diagId('user_lab'),
      name: 'DIAG_TEST Lab',
      email: 'diag_lab@local',
      role: 'lab_tech',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: diagId('user_recep'),
      name: 'DIAG_TEST Recepcao',
      email: 'diag_recep@local',
      role: 'receptionist',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ]

  const documents: PatientDocument[] = [
    {
      id: diagId('doc_1'),
      patientId: patients[0].id,
      title: 'Documento teste',
      category: 'outro',
      createdAt: now,
      note: 'DIAG_TEST: doc',
      isLocal: true,
      fileName: 'diag_doc.txt',
      mimeType: 'text/plain',
      status: 'ok',
    },
  ]

  const ensureUnique = <T extends { id: string }>(target: T[], additions: T[]) => {
    const existing = new Set(target.map((item) => item.id))
    additions.forEach((item) => {
      if (!existing.has(item.id)) {
        target.push(item)
      }
    })
  }

  ensureUnique(db.clinics, clinics)
  ensureUnique(db.dentists, dentists)
  ensureUnique(db.patients, patients)
  ensureUnique(db.scans, scans)
  ensureUnique(db.cases, cases)
  ensureUnique(db.labItems, labItems)
  ensureUnique(db.users, users)
  ensureUnique(db.patientDocuments, documents)

  saveDb(db)
}

export function clearDiagnosticsTestData() {
  const db = loadDb()
  const removeDiag = <T extends { id: string }>(items: T[]) => items.filter((item) => !item.id.startsWith(DIAG_PREFIX))

  db.clinics = removeDiag(db.clinics)
  db.dentists = removeDiag(db.dentists)
  db.patients = removeDiag(db.patients)
  db.scans = removeDiag(db.scans)
  db.cases = removeDiag(db.cases)
  db.labItems = removeDiag(db.labItems)
  db.users = removeDiag(db.users)
  db.patientDocuments = removeDiag(db.patientDocuments)

  saveDb(db)
}
