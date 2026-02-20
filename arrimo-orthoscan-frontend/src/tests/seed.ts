import { loadDb, resetDb, saveDb, type AppDb } from '../data/db'
import type { Case } from '../types/Case'
import type { Clinic } from '../types/Clinic'
import type { DentistClinic } from '../types/DentistClinic'
import type { LabItem } from '../types/Lab'
import type { Patient } from '../types/Patient'
import type { Scan, ScanAttachment } from '../types/Scan'
import type { User } from '../types/User'

const QA_PREFIX = 'qa_'

function nowIso() {
  return new Date().toISOString()
}

function dateFromToday(offsetDays: number) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function daysFrom(scanDate: string, days: number) {
  const d = new Date(`${scanDate}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function trays(total: number, changeEveryDays: number, scanDate: string): Case['trays'] {
  return Array.from({ length: total }, (_, i) => ({
    trayNumber: i + 1,
    state: 'pendente' as const,
    dueDate: daysFrom(scanDate, changeEveryDays * (i + 1)),
  }))
}

function att(id: string, name: string, kind: ScanAttachment['kind'], extra: Partial<ScanAttachment> = {}): ScanAttachment {
  const ts = nowIso()
  return {
    id,
    name,
    kind,
    status: 'ok',
    attachedAt: ts,
    createdAt: ts,
    ...extra,
  }
}

function removeQaData(db: AppDb) {
  const keep = <T extends { id: string }>(items: T[]) => items.filter((x) => !x.id.startsWith(QA_PREFIX))
  db.clinics = keep(db.clinics)
  db.dentists = keep(db.dentists)
  db.patients = keep(db.patients)
  db.users = keep(db.users)
  db.scans = keep(db.scans)
  db.cases = keep(db.cases)
  db.labItems = keep(db.labItems)
  db.patientDocuments = keep(db.patientDocuments)
}

export function clearQaSeed() {
  const db = loadDb()
  removeQaData(db)
  saveDb(db)
}

export function seedQaData() {
  const db = resetDb('full')
  removeQaData(db)

  const ts = nowIso()

  const clinics: Clinic[] = [
    {
      id: 'qa_clinic_1',
      tradeName: 'Clinica Norte',
      legalName: 'Clinica Norte LTDA',
      cnpj: '11222333000110',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'qa_clinic_2',
      tradeName: 'Clinica Sul',
      legalName: 'Clinica Sul LTDA',
      cnpj: '55444333000110',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  const dentists: DentistClinic[] = [
    {
      id: 'qa_dent_1',
      name: 'Dr. Norte',
      type: 'dentista',
      cro: 'CRO-1001',
      gender: 'masculino',
      clinicId: 'qa_clinic_1',
      whatsapp: '11990000001',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'qa_dent_2',
      name: 'Dra. Leste',
      type: 'dentista',
      cro: 'CRO-1002',
      gender: 'feminino',
      clinicId: 'qa_clinic_1',
      whatsapp: '11990000002',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'qa_dent_3',
      name: 'Dr. Sul',
      type: 'dentista',
      cro: 'CRO-2001',
      gender: 'masculino',
      clinicId: 'qa_clinic_2',
      whatsapp: '11990000003',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  const patients: Patient[] = [
    { id: 'qa_patient_1', name: 'Paciente 1', clinicId: 'qa_clinic_1', primaryDentistId: 'qa_dent_1', createdAt: ts, updatedAt: ts },
    { id: 'qa_patient_2', name: 'Paciente 2', clinicId: 'qa_clinic_1', primaryDentistId: 'qa_dent_1', createdAt: ts, updatedAt: ts },
    { id: 'qa_patient_3', name: 'Paciente 3', clinicId: 'qa_clinic_1', primaryDentistId: 'qa_dent_2', createdAt: ts, updatedAt: ts },
    { id: 'qa_patient_4', name: 'Paciente 4', clinicId: 'qa_clinic_2', primaryDentistId: 'qa_dent_3', createdAt: ts, updatedAt: ts },
    { id: 'qa_patient_5', name: 'Paciente 5', clinicId: 'qa_clinic_2', primaryDentistId: 'qa_dent_3', createdAt: ts, updatedAt: ts },
    { id: 'qa_patient_6', name: 'Paciente 6', clinicId: 'qa_clinic_2', primaryDentistId: 'qa_dent_3', createdAt: ts, updatedAt: ts },
  ]

  const users: User[] = [
    { id: 'qa_user_master', name: 'Master QA', email: 'master.qa@local', password: 'qa@123', role: 'master_admin', isActive: true, createdAt: ts, updatedAt: ts },
    { id: 'qa_user_admin', name: 'Admin QA', email: 'admin.qa@local', password: 'qa@123', role: 'dentist_admin', isActive: true, createdAt: ts, updatedAt: ts },
    { id: 'qa_user_dentist_client', name: 'Dentista Cliente QA', email: 'dentist.client.qa@local', password: 'qa@123', role: 'dentist_client', linkedDentistId: 'qa_dent_1', isActive: true, createdAt: ts, updatedAt: ts },
    { id: 'qa_user_clinic_client', name: 'Clinica Cliente QA', email: 'clinic.client.qa@local', password: 'qa@123', role: 'clinic_client', linkedClinicId: 'qa_clinic_1', isActive: true, createdAt: ts, updatedAt: ts },
    { id: 'qa_user_lab', name: 'Lab QA', email: 'lab.qa@local', password: 'qa@123', role: 'lab_tech', isActive: true, createdAt: ts, updatedAt: ts },
    { id: 'qa_user_reception', name: 'Recepcao QA', email: 'reception.qa@local', password: 'qa@123', role: 'receptionist', isActive: true, createdAt: ts, updatedAt: ts },
  ]

  const fullAttachments: ScanAttachment[] = [
    att('qa_scan_att_1', 'upper.stl', 'scan3d', { arch: 'superior' }),
    att('qa_scan_att_2', 'lower.stl', 'scan3d', { arch: 'inferior' }),
    att('qa_scan_att_3', 'bite.stl', 'scan3d', { arch: 'mordida' }),
    att('qa_scan_att_4', 'intra-frontal.jpg', 'foto_intra', { slotId: 'intra_frontal' }),
    att('qa_scan_att_5', 'extra-frontal.jpg', 'foto_extra', { slotId: 'extra_face_frontal' }),
    att('qa_scan_att_6', 'panoramica.pdf', 'raiox', { rxType: 'panoramica' }),
    att('qa_scan_att_7', 'teleradio.jpg', 'raiox', { rxType: 'teleradiografia' }),
    att('qa_scan_att_8', 'tomo.zip', 'dicom', { rxType: 'tomografia' }),
    att('qa_scan_att_9', 'projeto.setup', 'projeto'),
  ]

  const scans: Scan[] = [
    {
      id: 'qa_scan_1',
      patientName: 'Paciente 1',
      patientId: 'qa_patient_1',
      dentistId: 'qa_dent_1',
      requestedByDentistId: 'qa_dent_2',
      clinicId: 'qa_clinic_1',
      scanDate: dateFromToday(-2),
      arch: 'ambos',
      complaint: 'Queixa A',
      dentistGuidance: 'Orientacao A',
      attachments: fullAttachments,
      status: 'aprovado',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'qa_scan_2',
      patientName: 'Paciente 4',
      patientId: 'qa_patient_4',
      dentistId: 'qa_dent_3',
      clinicId: 'qa_clinic_2',
      scanDate: dateFromToday(-1),
      arch: 'ambos',
      complaint: 'Queixa B',
      dentistGuidance: 'Orientacao B',
      attachments: [att('qa_scan2_att_1', 'scan.jpg', 'foto_intra')],
      status: 'pendente',
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  const cases: Case[] = [
    {
      id: 'qa_case_1',
      patientName: 'Paciente 1',
      patientId: 'qa_patient_1',
      dentistId: 'qa_dent_1',
      requestedByDentistId: 'qa_dent_2',
      clinicId: 'qa_clinic_1',
      scanDate: scans[0].scanDate,
      totalTrays: 20,
      totalTraysUpper: 20,
      totalTraysLower: 20,
      changeEveryDays: 7,
      attachmentBondingTray: true,
      status: 'em_producao',
      phase: 'contrato_aprovado',
      contract: { status: 'aprovado', approvedAt: ts },
      deliveryLots: [],
      trays: trays(20, 7, scans[0].scanDate),
      attachments: [],
      sourceScanId: 'qa_scan_1',
      arch: 'ambos',
      complaint: scans[0].complaint,
      dentistGuidance: scans[0].dentistGuidance,
      scanFiles: scans[0].attachments.map((x) => ({
        id: `${x.id}_copy`,
        name: x.name,
        kind: x.kind,
        slotId: x.slotId,
        rxType: x.rxType,
        arch: x.arch,
        status: x.status,
        attachedAt: x.attachedAt,
        createdAt: x.createdAt,
        note: x.note,
        flaggedAt: x.flaggedAt,
        flaggedReason: x.flaggedReason,
      })),
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'qa_case_2',
      patientName: 'Paciente 4',
      patientId: 'qa_patient_4',
      dentistId: 'qa_dent_3',
      clinicId: 'qa_clinic_2',
      scanDate: dateFromToday(-1),
      totalTrays: 12,
      totalTraysUpper: 12,
      totalTraysLower: 12,
      changeEveryDays: 10,
      attachmentBondingTray: false,
      status: 'planejamento',
      phase: 'contrato_pendente',
      contract: { status: 'pendente' },
      deliveryLots: [],
      trays: trays(12, 10, dateFromToday(-1)),
      attachments: [],
      sourceScanId: 'qa_scan_2',
      arch: 'ambos',
      complaint: 'Queixa B',
      dentistGuidance: 'Orientacao B',
      scanFiles: [],
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  const labItems: LabItem[] = [
    {
      id: 'qa_lab_1',
      caseId: 'qa_case_1',
      arch: 'superior',
      trayNumber: 1,
      patientName: 'Paciente 1',
      plannedDate: dateFromToday(-3),
      dueDate: dateFromToday(-1),
      status: 'em_producao',
      priority: 'Urgente',
      notes: 'Item parado para alerta visual',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'qa_lab_2',
      caseId: 'qa_case_1',
      arch: 'inferior',
      trayNumber: 2,
      patientName: 'Paciente 1',
      plannedDate: dateFromToday(-2),
      dueDate: dateFromToday(1),
      status: 'controle_qualidade',
      priority: 'Medio',
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  db.clinics = [...clinics, ...db.clinics]
  db.dentists = [...dentists, ...db.dentists]
  db.patients = [...patients, ...db.patients]
  db.users = [...users, ...db.users]
  db.scans = [...scans, ...db.scans]
  db.cases = [...cases, ...db.cases]
  db.labItems = [...labItems, ...db.labItems]

  saveDb(db)

  return {
    clinics: clinics.length,
    dentists: dentists.length,
    patients: patients.length,
    users: users.length,
    scans: scans.length,
    cases: cases.length,
    labItems: labItems.length,
  }
}

export const QA_IDS = {
  clinic1: 'qa_clinic_1',
  clinic2: 'qa_clinic_2',
  dent1: 'qa_dent_1',
  dent2: 'qa_dent_2',
  dent3: 'qa_dent_3',
  patient1: 'qa_patient_1',
  patient4: 'qa_patient_4',
  caseApproved: 'qa_case_1',
  casePendingContract: 'qa_case_2',
  scanApproved: 'qa_scan_1',
  scanPending: 'qa_scan_2',
}
