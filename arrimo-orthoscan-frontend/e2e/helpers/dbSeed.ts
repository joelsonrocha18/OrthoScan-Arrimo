export const DB_KEY = 'arrimo_orthoscan_db_v1'

function nowIso() {
  return new Date().toISOString()
}

function day(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

export function makeE2ESeedDb() {
  const ts = nowIso()

  return {
    cases: [
      {
        id: 'qa_case_1',
        patientName: 'Paciente 1',
        patientId: 'qa_patient_1',
        dentistId: 'qa_dent_1',
        requestedByDentistId: 'qa_dent_2',
        clinicId: 'qa_clinic_1',
        scanDate: day(-2),
        totalTrays: 12,
        totalTraysUpper: 12,
        totalTraysLower: 12,
        changeEveryDays: 7,
        attachmentBondingTray: true,
        status: 'planejamento',
        phase: 'contrato_aprovado',
        contract: { status: 'aprovado', approvedAt: ts },
        deliveryLots: [],
        trays: Array.from({ length: 12 }, (_, i) => ({ trayNumber: i + 1, state: 'pendente', dueDate: day(i + 1) })),
        attachments: [],
        sourceScanId: 'qa_scan_prev',
        arch: 'ambos',
        complaint: 'Queixa seed',
        dentistGuidance: 'Orientacao seed',
        scanFiles: [],
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: 'qa_case_2',
        patientName: 'Paciente 4',
        patientId: 'qa_patient_4',
        dentistId: 'qa_dent_3',
        clinicId: 'qa_clinic_2',
        scanDate: day(-1),
        totalTrays: 10,
        totalTraysUpper: 10,
        totalTraysLower: 10,
        changeEveryDays: 10,
        status: 'planejamento',
        phase: 'contrato_pendente',
        contract: { status: 'pendente' },
        deliveryLots: [],
        trays: Array.from({ length: 10 }, (_, i) => ({ trayNumber: i + 1, state: 'pendente', dueDate: day(i + 1) })),
        attachments: [],
        arch: 'ambos',
        complaint: 'Queixa B',
        dentistGuidance: 'Orientacao B',
        scanFiles: [],
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    labItems: [
      {
        id: 'qa_lab_1',
        caseId: 'qa_case_1',
        arch: 'superior',
        trayNumber: 1,
        patientName: 'Paciente 1',
        plannedDate: day(-3),
        dueDate: day(-1),
        status: 'em_producao',
        priority: 'Urgente',
        notes: 'Atrasado para alerta',
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    patients: [
      { id: 'qa_patient_1', name: 'Paciente 1', clinicId: 'qa_clinic_1', primaryDentistId: 'qa_dent_1', createdAt: ts, updatedAt: ts },
      { id: 'qa_patient_2', name: 'Paciente 2', clinicId: 'qa_clinic_1', primaryDentistId: 'qa_dent_1', createdAt: ts, updatedAt: ts },
      { id: 'qa_patient_3', name: 'Paciente 3', clinicId: 'qa_clinic_1', primaryDentistId: 'qa_dent_2', createdAt: ts, updatedAt: ts },
      { id: 'qa_patient_4', name: 'Paciente 4', clinicId: 'qa_clinic_2', primaryDentistId: 'qa_dent_3', createdAt: ts, updatedAt: ts },
      { id: 'qa_patient_5', name: 'Paciente 5', clinicId: 'qa_clinic_2', primaryDentistId: 'qa_dent_3', createdAt: ts, updatedAt: ts },
      { id: 'qa_patient_6', name: 'Paciente 6', clinicId: 'qa_clinic_2', primaryDentistId: 'qa_dent_3', createdAt: ts, updatedAt: ts },
    ],
    patientDocuments: [],
    scans: [
      {
        id: 'qa_scan_1',
        patientName: 'Paciente 1',
        patientId: 'qa_patient_1',
        dentistId: 'qa_dent_1',
        requestedByDentistId: 'qa_dent_2',
        clinicId: 'qa_clinic_1',
        scanDate: day(-2),
        arch: 'ambos',
        complaint: 'Queixa A',
        dentistGuidance: 'Orientacao A',
        attachments: [
          { id: 'qa_scan_att_1', name: 'upper.stl', kind: 'scan3d', arch: 'superior', status: 'ok', attachedAt: ts, createdAt: ts },
          { id: 'qa_scan_att_2', name: 'lower.stl', kind: 'scan3d', arch: 'inferior', status: 'ok', attachedAt: ts, createdAt: ts },
          { id: 'qa_scan_att_3', name: 'intra.jpg', kind: 'foto_intra', slotId: 'intra_frontal', status: 'ok', attachedAt: ts, createdAt: ts },
          { id: 'qa_scan_att_4', name: 'extra.jpg', kind: 'foto_extra', slotId: 'extra_face_frontal', status: 'ok', attachedAt: ts, createdAt: ts },
          { id: 'qa_scan_att_5', name: 'pan.pdf', kind: 'raiox', rxType: 'panoramica', status: 'ok', attachedAt: ts, createdAt: ts },
        ],
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
        scanDate: day(-1),
        arch: 'ambos',
        complaint: 'Queixa B',
        dentistGuidance: 'Orientacao B',
        attachments: [{ id: 'qa_scan2_att_1', name: 'scan.jpg', kind: 'foto_intra', status: 'ok', attachedAt: ts, createdAt: ts }],
        status: 'pendente',
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    dentists: [
      { id: 'qa_dent_1', name: 'Dr. Norte', type: 'dentista', cro: 'CRO-1001', gender: 'masculino', clinicId: 'qa_clinic_1', isActive: true, createdAt: ts, updatedAt: ts },
      { id: 'qa_dent_2', name: 'Dra. Leste', type: 'dentista', cro: 'CRO-1002', gender: 'feminino', clinicId: 'qa_clinic_1', isActive: true, createdAt: ts, updatedAt: ts },
      { id: 'qa_dent_3', name: 'Dr. Sul', type: 'dentista', cro: 'CRO-2001', gender: 'masculino', clinicId: 'qa_clinic_2', isActive: true, createdAt: ts, updatedAt: ts },
    ],
    clinics: [
      { id: 'qa_clinic_1', tradeName: 'Clinica Norte', legalName: 'Clinica Norte LTDA', cnpj: '11222333000110', isActive: true, createdAt: ts, updatedAt: ts },
      { id: 'qa_clinic_2', tradeName: 'Clinica Sul', legalName: 'Clinica Sul LTDA', cnpj: '55444333000110', isActive: true, createdAt: ts, updatedAt: ts },
    ],
    users: [
      { id: 'qa_user_master', name: 'Master QA', email: 'master.qa@local', role: 'master_admin', isActive: true, createdAt: ts, updatedAt: ts },
      { id: 'qa_user_admin', name: 'Admin QA', email: 'admin.qa@local', role: 'dentist_admin', isActive: true, createdAt: ts, updatedAt: ts },
      { id: 'qa_user_dentist_client', name: 'Dentista Cliente QA', email: 'dentist.client.qa@local', role: 'dentist_client', linkedDentistId: 'qa_dent_1', isActive: true, createdAt: ts, updatedAt: ts },
      { id: 'qa_user_clinic_client', name: 'Clinica Cliente QA', email: 'clinic.client.qa@local', role: 'clinic_client', linkedClinicId: 'qa_clinic_1', isActive: true, createdAt: ts, updatedAt: ts },
      { id: 'qa_user_lab', name: 'Lab QA', email: 'lab.qa@local', role: 'lab_tech', isActive: true, createdAt: ts, updatedAt: ts },
      { id: 'qa_user_reception', name: 'Recepcao QA', email: 'reception.qa@local', role: 'receptionist', isActive: true, createdAt: ts, updatedAt: ts },
    ],
  }
}
