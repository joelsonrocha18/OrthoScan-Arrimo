import type { Case, CaseAttachment, CasePhase, CaseStatus, CaseTray, TrayState } from '../types/Case'
import type { LabItem } from '../types/Lab'
import type { Patient } from '../types/Patient'
import type { PatientDocument } from '../types/PatientDocument'
import type { Scan, ScanArch, ScanAttachment, ScanStatus } from '../types/Scan'
import type { DentistClinic } from '../types/DentistClinic'
import type { User } from '../types/User'
import type { Clinic } from '../types/Clinic'
import type { AuditLog } from '../types/Audit'
import { emitDbChanged } from '../lib/events'
import { EXTRA_SLOTS, INTRA_SLOTS } from '../mocks/photoSlots'

export const DB_KEY = 'arrimo_orthoscan_db_v1'
const DB_MODE_KEY = 'arrimo_orthoscan_seed_mode_v1'
const SEED_MODE = ((import.meta.env.VITE_LOCAL_SEED as string | undefined) ?? 'full') as 'full' | 'empty'
const MASTER_EMAIL = (import.meta.env.VITE_LOCAL_MASTER_EMAIL as string | undefined)?.trim()
const LOCAL_DEFAULT_PASSWORD = (import.meta.env.VITE_LOCAL_PASSWORD as string | undefined)?.trim()

export type AppDb = {
  cases: Case[]
  labItems: LabItem[]
  patients: Patient[]
  patientDocuments: PatientDocument[]
  scans: Scan[]
  dentists: DentistClinic[]
  clinics: Clinic[]
  users: User[]
  auditLogs: AuditLog[]
  [key: string]: unknown
}

type LegacyCase = {
  id: string
  paciente?: { nome?: string }
  data_scan?: string
  planejamento?: { quantidade_total_placas?: number; troca_a_cada_dias?: number }
  status?: CaseStatus
  phase?: CasePhase
  budget?: Case['budget']
  contract?: Case['contract']
  deliveryLots?: Case['deliveryLots']
  installation?: Case['installation']
  patientName?: string
  patientId?: string
  scanDate?: string
  totalTrays?: number
  changeEveryDays?: number
  trays?: CaseTray[]
  attachments?: CaseAttachment[]
  sourceScanId?: string
  arch?: ScanArch
  complaint?: string
  dentistGuidance?: string
  dentistId?: string
  requestedByDentistId?: string
  clinicId?: string
  treatmentCode?: string
  treatmentOrigin?: 'interno' | 'externo'
  scanAttachments?: Array<{
    id: string
    name: string
    type?: string
    kind?: string
    slotId?: string
    rxType?: string
    arch?: string
    isLocal?: boolean
    url?: string
    filePath?: string
    status?: 'ok' | 'erro'
    attachedAt?: string
    note?: string
    flaggedAt?: string
    flaggedReason?: string
    createdAt?: string
  }>
  scanFiles?: Array<{
    id: string
    name: string
    kind?: string
    slotId?: string
    rxType?: string
    arch?: string
    isLocal?: boolean
    url?: string
    filePath?: string
    status?: 'ok' | 'erro'
    attachedAt?: string
    note?: string
    flaggedAt?: string
    flaggedReason?: string
    createdAt?: string
  }>
  totalTraysUpper?: number
  totalTraysLower?: number
  attachmentBondingTray?: boolean
  createdAt?: string
  updatedAt?: string
}

type LegacyScan = Partial<Scan> & {
  id: string
  serviceOrderCode?: string
  patientId?: string
  dentistId?: string
  requestedByDentistId?: string
  clinicId?: string
  attachments?: Array<
    Partial<ScanAttachment> & {
      type?: string
    }
  >
}

type LegacyLabItem = Partial<LabItem> & { id: string }
type LegacyDentistClinic = Partial<DentistClinic> & { id: string }
type LegacyPatientDocument = Partial<PatientDocument> & { id: string }
type LegacyUser = Partial<User> & { id: string }
type LegacyClinic = Partial<Clinic> & { id: string }

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function daysFrom(baseDate: string, days: number) {
  const date = new Date(`${baseDate}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

function daysFromNow(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

function nowIso() {
  return new Date().toISOString()
}

function patientIdFromName(name: string) {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `pat_${normalized || 'sem_nome'}`
}

function isArrimoClinic(clinic?: Pick<Clinic, 'id' | 'tradeName'> | null) {
  if (!clinic) return false
  if (clinic.id === 'clinic_arrimo') return true
  return clinic.tradeName.trim().toUpperCase() === 'ARRIMO'
}

function inferCaseOrigin(caseItem: Pick<Case, 'clinicId'>, clinicsById: Map<string, Clinic>): 'interno' | 'externo' {
  if (!caseItem.clinicId) return 'externo'
  return isArrimoClinic(clinicsById.get(caseItem.clinicId) ?? null) ? 'interno' : 'externo'
}

function nextTreatmentCode(prefix: 'A' | 'C', current: string[]) {
  const max = current.reduce((acc, item) => {
    const match = item.match(/^([AC])-([0-9]{4})$/)
    if (!match || match[1] !== prefix) return acc
    return Math.max(acc, Number(match[2]))
  }, 0)
  return `${prefix}-${String(max + 1).padStart(4, '0')}`
}

function ensureTreatmentCodes(cases: Case[], clinics: Clinic[]) {
  const clinicsById = new Map(clinics.map((item) => [item.id, item]))
  const used = cases.map((item) => item.treatmentCode).filter((item): item is string => Boolean(item))
  const sorted = [...cases].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const normalized = new Map<string, Case>()
  sorted.forEach((item) => {
    const origin = item.treatmentOrigin ?? inferCaseOrigin(item, clinicsById)
    const prefix = origin === 'interno' ? 'A' : 'C'
    const code = item.treatmentCode ?? nextTreatmentCode(prefix, used)
    if (!item.treatmentCode) {
      used.push(code)
    }
    normalized.set(item.id, { ...item, treatmentOrigin: origin, treatmentCode: code })
  })

  return cases.map((item) => normalized.get(item.id) ?? item)
}

function isObjectUrl(url?: string) {
  return Boolean(url && url.startsWith('blob:'))
}

function statusForTray(index: number, total: number): TrayState {
  if (index === 5) return 'rework'
  if (index <= Math.min(4, total)) return 'entregue'
  if (index <= Math.min(8, total)) return 'pronta'
  if (index <= Math.min(12, total)) return 'em_producao'
  return 'pendente'
}

function buildTrays(scanDate: string, totalTrays: number, changeEveryDays: number) {
  const trays: CaseTray[] = []
  for (let tray = 1; tray <= totalTrays; tray += 1) {
    const state = statusForTray(tray, totalTrays)
    trays.push({
      trayNumber: tray,
      state,
      dueDate: daysFrom(scanDate, changeEveryDays * tray),
      deliveredAt: state === 'entregue' ? daysFrom(scanDate, changeEveryDays * tray) : undefined,
      notes: state === 'rework' ? 'Reavaliar ajuste da placa.' : undefined,
    })
  }
  return trays
}

function buildPendingTrays(scanDate: string, totalTrays: number, changeEveryDays: number): CaseTray[] {
  const trays: CaseTray[] = []
  const base = new Date(`${scanDate}T00:00:00`)
  for (let tray = 1; tray <= totalTrays; tray += 1) {
    const due = new Date(base)
    due.setDate(due.getDate() + changeEveryDays * tray)
    trays.push({ trayNumber: tray, state: 'pendente', dueDate: due.toISOString().slice(0, 10) })
  }
  return trays
}

function mapLegacyKind(item: { kind?: string; type?: string; rxType?: string; arch?: string }) {
  if (item.kind) return item.kind
  if (item.type === 'stl') return 'scan3d'
  if (item.type === 'foto') return 'foto_intra'
  if (item.type === 'raiox') return item.rxType === 'tomografia' ? 'dicom' : 'raiox'
  if (item.type === 'outro') return 'outro'
  return 'outro'
}

function phaseFromStatus(status: CaseStatus): CasePhase {
  if (status === 'finalizado') return 'finalizado'
  if (status === 'em_producao' || status === 'em_entrega') return 'em_producao'
  return 'planejamento'
}

function mockCaseAttachments(caseId: string): CaseAttachment[] {
  return [
    { id: `att_${caseId}_1`, name: 'scan_intraoral.pdf', type: 'scan', url: 'https://example.com/scan_intraoral.pdf', createdAt: nowIso() },
    { id: `att_${caseId}_2`, name: 'planejamento.png', type: 'outro', url: 'https://example.com/planejamento.png', createdAt: nowIso() },
  ]
}

function seedPatients(): Patient[] {
  const names = ['Maria Silva', 'Joao Santos', 'Ana Costa', 'Paciente Demo Completo']
  return names.map((name) => ({
    id: patientIdFromName(name),
    name,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }))
}

function seedCases(): Case[] {
  const seed: Array<{
    id: string
    patientName: string
    scanDate: string
    totalTrays: number
    changeEveryDays: number
    status: CaseStatus
  }> = [
    { id: 'case_001', patientName: 'Maria Silva', scanDate: '2026-01-06', totalTrays: 24, changeEveryDays: 7, status: 'em_producao' },
    { id: 'case_002', patientName: 'Joao Santos', scanDate: '2026-01-18', totalTrays: 20, changeEveryDays: 10, status: 'planejamento' },
    { id: 'case_003', patientName: 'Ana Costa', scanDate: '2025-12-20', totalTrays: 18, changeEveryDays: 14, status: 'em_entrega' },
  ]

  return seed.map((item) => ({
    ...item,
    patientId: patientIdFromName(item.patientName),
    phase: phaseFromStatus(item.status),
    contract: {
      status: item.status === 'planejamento' ? 'pendente' : 'aprovado',
      approvedAt: item.status === 'planejamento' ? undefined : nowIso(),
    },
    budget: item.status === 'planejamento' ? undefined : { value: 12000, notes: 'Orcamento seed', createdAt: nowIso() },
    trays: buildTrays(item.scanDate, item.totalTrays, item.changeEveryDays),
    attachments: mockCaseAttachments(item.id),
    totalTraysUpper: item.totalTrays,
    totalTraysLower: item.totalTrays,
    attachmentBondingTray: false,
    scanFiles: [],
    deliveryLots: [],
    installation: undefined,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }))
}

function seedLabItems(): LabItem[] {
  const timestamp = nowIso()
  return [
    { id: 'lab_001', caseId: 'case_001', arch: 'ambos', patientName: 'Maria Silva', trayNumber: 11, plannedDate: daysFromNow(-4), dueDate: daysFromNow(-1), status: 'aguardando_iniciar', priority: 'Medio', notes: 'Validar novo escaneamento antes da producao.', createdAt: timestamp, updatedAt: timestamp },
    { id: 'lab_002', caseId: 'case_002', arch: 'ambos', patientName: 'Joao Santos', trayNumber: 3, plannedDate: daysFromNow(-2), dueDate: daysFromNow(1), status: 'aguardando_iniciar', priority: 'Baixo', createdAt: timestamp, updatedAt: timestamp },
    { id: 'lab_003', caseId: 'case_001', arch: 'ambos', patientName: 'Maria Silva', trayNumber: 12, plannedDate: daysFromNow(-5), dueDate: daysFromNow(0), status: 'em_producao', priority: 'Medio', createdAt: timestamp, updatedAt: timestamp },
    { id: 'lab_004', caseId: 'case_003', arch: 'ambos', patientName: 'Ana Costa', trayNumber: 15, plannedDate: daysFromNow(-7), dueDate: daysFromNow(-2), status: 'em_producao', priority: 'Urgente', notes: 'Paciente com evento clinico proximo.', createdAt: timestamp, updatedAt: timestamp },
    { id: 'lab_005', caseId: 'case_001', arch: 'ambos', patientName: 'Maria Silva', trayNumber: 10, plannedDate: daysFromNow(-6), dueDate: daysFromNow(-3), status: 'controle_qualidade', priority: 'Urgente', notes: 'Rework por ajuste de margem gengival.', createdAt: timestamp, updatedAt: timestamp },
    { id: 'lab_006', caseId: 'case_003', arch: 'ambos', patientName: 'Ana Costa', trayNumber: 16, plannedDate: daysFromNow(-3), dueDate: daysFromNow(2), status: 'prontas', priority: 'Baixo', createdAt: timestamp, updatedAt: timestamp },
    { id: 'lab_007', caseId: 'case_002', arch: 'ambos', patientName: 'Joao Santos', trayNumber: 2, plannedDate: daysFromNow(-10), dueDate: daysFromNow(-5), status: 'prontas', priority: 'Baixo', createdAt: timestamp, updatedAt: timestamp },
    { id: 'lab_008', arch: 'ambos', patientName: 'Carla Menezes', trayNumber: 1, plannedDate: daysFromNow(-1), dueDate: daysFromNow(3), status: 'prontas', priority: 'Medio', createdAt: timestamp, updatedAt: timestamp },
  ]
}

function seedScans(cases: Case[]): Scan[] {
  const linkedCaseId = cases[0]?.id
  return [
    {
      id: 'scan_001',
      patientName: 'Bruna Oliveira',
      patientId: patientIdFromName('Bruna Oliveira'),
      scanDate: daysFromNow(-1),
      arch: 'ambos',
      complaint: 'Desalinhamento frontal.',
      dentistGuidance: 'Verificar necessidade de attachments vestibulares.',
      notes: 'Paciente sensivel na regiao posterior.',
      attachments: [
        { id: 'scan_001_att_1', name: 'intra_frontal.jpg', kind: 'foto_intra', slotId: 'intra_frontal', status: 'ok', attachedAt: nowIso(), createdAt: nowIso() },
        { id: 'scan_001_att_2', name: 'extra_face_frontal.jpg', kind: 'foto_extra', slotId: 'extra_face_frontal', status: 'ok', attachedAt: nowIso(), createdAt: nowIso() },
      ],
      status: 'pendente',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: 'scan_002',
      patientName: 'Carlos Mendes',
      patientId: patientIdFromName('Carlos Mendes'),
      scanDate: daysFromNow(-3),
      arch: 'ambos',
      complaint: 'Mordida cruzada leve.',
      dentistGuidance: 'Planejamento com foco em expansao superior.',
      attachments: [
        { id: 'scan_002_att_1', name: 'arcada_superior.stl', kind: 'scan3d', arch: 'superior', status: 'ok', attachedAt: nowIso(), createdAt: nowIso() },
        { id: 'scan_002_att_2', name: 'arcada_inferior.stl', kind: 'scan3d', arch: 'inferior', status: 'ok', attachedAt: nowIso(), createdAt: nowIso() },
        { id: 'scan_002_att_3', name: 'raiox_panoramica.pdf', kind: 'raiox', rxType: 'panoramica', status: 'ok', attachedAt: nowIso(), createdAt: nowIso() },
        { id: 'scan_002_att_4', name: 'telerradiografia.jpg', kind: 'raiox', rxType: 'teleradiografia', status: 'ok', attachedAt: nowIso(), createdAt: nowIso() },
        { id: 'scan_002_att_5', name: 'tomografia.zip', kind: 'dicom', rxType: 'tomografia', status: 'ok', attachedAt: nowIso(), createdAt: nowIso() },
      ],
      status: 'aprovado',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: 'scan_003',
      patientName: linkedCaseId ? cases[0].patientName : 'Paciente Seed',
      patientId: linkedCaseId ? cases[0].patientId : patientIdFromName('Paciente Seed'),
      scanDate: daysFromNow(-10),
      arch: 'ambos',
      complaint: 'Acompanhar alinhamento inferior.',
      dentistGuidance: 'Plano conservador.',
      attachments: [{ id: 'scan_003_att_1', name: 'registro_inicial.jpg', kind: 'foto_intra', slotId: 'intra_frontal', status: 'ok', attachedAt: nowIso(), createdAt: nowIso() }],
      status: linkedCaseId ? 'convertido' : 'aprovado',
      linkedCaseId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ]
}

function seedDentists(): DentistClinic[] {
  const now = nowIso()
  return [
    {
      id: 'dent_demo',
      name: 'Dentista Demo',
      type: 'dentista',
      cro: 'CRO-00000',
      phone: '(11) 99999-0000',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

function seedClinics(): Clinic[] {
  const now = nowIso()
  return [
    {
      id: 'clinic_arrimo',
      tradeName: 'ARRIMO',
      legalName: '',
      cnpj: '',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

function seedUsers(): User[] {
  const now = nowIso()
  return [
    {
      id: 'user_master',
      name: 'Master Admin',
      email: MASTER_EMAIL || 'master@orthoscan.local',
      password: LOCAL_DEFAULT_PASSWORD,
      role: 'master_admin',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

function ensureMasterUser(users: User[]): User[] {
  const masterSeed = seedUsers().find((user) => user.role === 'master_admin')
  if (!masterSeed) return users
  const existing = users.find((user) => user.role === 'master_admin')
  if (!existing) return [masterSeed, ...users]

  let changed = false
  let next = existing
  if (existing.deletedAt) {
    next = { ...next, deletedAt: undefined }
    changed = true
  }
  if (!existing.isActive) {
    next = { ...next, isActive: true }
    changed = true
  }
  if (MASTER_EMAIL && existing.email !== MASTER_EMAIL) {
    next = { ...next, email: MASTER_EMAIL }
    changed = true
  }
  if (LOCAL_DEFAULT_PASSWORD && existing.password !== LOCAL_DEFAULT_PASSWORD) {
    next = { ...next, password: LOCAL_DEFAULT_PASSWORD }
    changed = true
  }
  if (!changed) return users
  return users.map((user) => (user.id === existing.id ? { ...next, updatedAt: nowIso() } : user))
}

function buildSeededDb(mode: 'full' | 'empty'): AppDb {
  if (mode === 'empty') {
    return {
      cases: [],
      labItems: [],
      patients: [],
      patientDocuments: [],
      scans: [],
      dentists: [],
      clinics: [],
      users: ensureMasterUser(seedUsers()),
      auditLogs: [],
    }
  }
  const clinics = seedClinics()
  const cases = ensureTreatmentCodes(seedCases(), clinics)
  return ensureFullSeedData({
    cases,
    labItems: seedLabItems(),
    patients: seedPatients(),
    patientDocuments: [],
    scans: seedScans(cases),
    dentists: seedDentists(),
    clinics,
    users: ensureMasterUser(seedUsers()),
    auditLogs: [],
  })
}

function readPersistedMode(): 'full' | 'empty' | null {
  const raw = localStorage.getItem(DB_MODE_KEY)
  if (raw === 'full' || raw === 'empty') return raw
  return null
}

function effectiveSeedMode(): 'full' | 'empty' {
  return readPersistedMode() ?? SEED_MODE
}

function fullDemoAttachments(): ScanAttachment[] {
  const createdAt = nowIso()
  const base: ScanAttachment[] = [
    { id: 'scan_full_001_sup_3d', name: 'upper.stl', kind: 'scan3d', arch: 'superior', isLocal: false, status: 'ok', attachedAt: createdAt, createdAt },
    { id: 'scan_full_001_inf_3d', name: 'lower.stl', kind: 'scan3d', arch: 'inferior', isLocal: false, status: 'ok', attachedAt: createdAt, createdAt },
    { id: 'scan_full_001_pan', name: 'panoramica.pdf', kind: 'raiox', rxType: 'panoramica', isLocal: false, status: 'ok', attachedAt: createdAt, createdAt },
    { id: 'scan_full_001_tel', name: 'tele.jpg', kind: 'raiox', rxType: 'teleradiografia', isLocal: false, status: 'ok', attachedAt: createdAt, createdAt },
    { id: 'scan_full_001_tom', name: 'tomografia.zip', kind: 'dicom', rxType: 'tomografia', isLocal: false, status: 'ok', attachedAt: createdAt, createdAt },
    { id: 'scan_full_001_setup', name: 'setup.project', kind: 'projeto', isLocal: false, status: 'ok', attachedAt: createdAt, createdAt },
  ]

  const intra = INTRA_SLOTS.map((slot, index) => ({
    id: `scan_full_001_intra_${index + 1}`,
    name: `${slot.id}.jpg`,
    kind: slot.kind,
    slotId: slot.id,
    isLocal: false,
    status: 'ok' as const,
    attachedAt: createdAt,
    createdAt,
  }))
  const extra = EXTRA_SLOTS.map((slot, index) => ({
    id: `scan_full_001_extra_${index + 1}`,
    name: `${slot.id}.jpg`,
    kind: slot.kind,
    slotId: slot.id,
    isLocal: false,
    status: 'ok' as const,
    attachedAt: createdAt,
    createdAt,
  }))

  return [...base, ...intra, ...extra]
}

function ensureFullSeedData(db: AppDb): AppDb {
  const scanId = 'scan_full_001'
  const caseId = 'case_from_scan_full_001'
  const now = nowIso()
  const recentScanDate = daysFromNow(-2)

  const hasFullScan = db.scans.some((item) => item.id === scanId)
  if (db.scans.length === 0 || !hasFullScan) {
    const fullScan: Scan = {
      id: scanId,
      patientName: 'Paciente Demo Completo',
      patientId: patientIdFromName('Paciente Demo Completo'),
      scanDate: recentScanDate,
      arch: 'ambos',
      complaint: 'Apinhamento leve anterior e necessidade de alinhamento global.',
      dentistGuidance: 'Executar setup completo com controle de torque e avaliar attachments vestibulares.',
      attachments: fullDemoAttachments(),
      status: 'aprovado',
      createdAt: now,
      updatedAt: now,
    }
    db.scans = [fullScan, ...db.scans]
  }

  const fullScan = db.scans.find((item) => item.id === scanId)
  if (!fullScan) return db

  const hasFullCase = db.cases.some((item) => item.id === caseId)
  if (!hasFullCase) {
    const totalTraysUpper = 24
    const totalTraysLower = 20
    const totalTrays = Math.max(totalTraysUpper, totalTraysLower)
    const changeEveryDays = 7

    const fullCase: Case = {
      id: caseId,
      patientName: fullScan.patientName,
      patientId: fullScan.patientId,
      scanDate: fullScan.scanDate,
      totalTrays,
      totalTraysUpper,
      totalTraysLower,
      changeEveryDays,
      attachmentBondingTray: true,
      status: 'planejamento',
      phase: 'planejamento',
      contract: { status: 'pendente' },
      deliveryLots: [],
      installation: undefined,
      trays: buildPendingTrays(fullScan.scanDate, totalTrays, changeEveryDays),
      attachments: [],
      sourceScanId: fullScan.id,
      arch: fullScan.arch,
      complaint: fullScan.complaint,
      dentistGuidance: fullScan.dentistGuidance,
      scanFiles: fullScan.attachments.map((att) => ({
        id: att.id,
        name: att.name,
        kind: att.kind,
        slotId: att.slotId,
        rxType: att.rxType,
        arch: att.arch,
        isLocal: att.isLocal,
        url: att.url,
        filePath: att.filePath,
        status: att.status ?? 'ok',
        attachedAt: att.attachedAt ?? att.createdAt,
        note: att.note,
        flaggedAt: att.flaggedAt,
        flaggedReason: att.flaggedReason,
        createdAt: att.createdAt,
      })),
      createdAt: now,
      updatedAt: now,
    }
    db.cases = [fullCase, ...db.cases]
  }

  db.scans = db.scans.map((item) =>
    item.id === scanId
      ? {
          ...item,
          status: 'convertido',
          linkedCaseId: caseId,
          updatedAt: nowIso(),
        }
      : item,
  )

  db.cases = ensureTreatmentCodes(db.cases, db.clinics)

  return db
}

function migrateCase(oldCase: LegacyCase): Case {
  const patientName = oldCase.patientName ?? oldCase.paciente?.nome ?? 'Paciente sem nome'
  const scanDate = oldCase.scanDate ?? oldCase.data_scan ?? toIsoDate(new Date())
  const totalTrays = oldCase.totalTrays ?? oldCase.planejamento?.quantidade_total_placas ?? 12
  const changeEveryDays = oldCase.changeEveryDays ?? oldCase.planejamento?.troca_a_cada_dias ?? 7
  const legacyStatus = oldCase.status ?? 'planejamento'
  const hasInstallation = Boolean(oldCase.installation?.installedAt)
  const status: CaseStatus =
    legacyStatus === 'finalizado' ? 'finalizado' : hasInstallation && legacyStatus !== 'planejamento' ? 'em_entrega' : legacyStatus
  const phase = oldCase.phase ?? phaseFromStatus(status)
  const trays = Array.isArray(oldCase.trays) && oldCase.trays.length > 0 ? oldCase.trays : buildTrays(scanDate, totalTrays, changeEveryDays)
  const attachments = Array.isArray(oldCase.attachments) ? oldCase.attachments : []

  const sourceScanFiles = Array.isArray(oldCase.scanFiles) ? oldCase.scanFiles : oldCase.scanAttachments
  const scanFiles = Array.isArray(sourceScanFiles)
    ? sourceScanFiles.map((item, index) => ({
        id: item.id ?? `scan_file_${oldCase.id}_${index}`,
        name: item.name,
        kind: mapLegacyKind(item) as NonNullable<Case['scanFiles']>[number]['kind'],
        slotId: item.slotId,
        rxType: item.rxType as NonNullable<Case['scanFiles']>[number]['rxType'],
        arch: item.arch as NonNullable<Case['scanFiles']>[number]['arch'],
        isLocal: item.isLocal ?? isObjectUrl(item.url),
        url: item.url,
        filePath: item.filePath,
        status: item.status ?? 'ok',
        attachedAt: item.attachedAt ?? item.createdAt ?? nowIso(),
        note: item.note,
        flaggedAt: item.flaggedAt,
        flaggedReason: item.flaggedReason,
        createdAt: item.createdAt ?? nowIso(),
      }))
    : []

  return {
    id: oldCase.id,
    treatmentCode: oldCase.treatmentCode,
    treatmentOrigin: oldCase.treatmentOrigin,
    patientName,
    patientId: oldCase.patientId,
    dentistId: oldCase.dentistId,
    requestedByDentistId: oldCase.requestedByDentistId,
    clinicId: oldCase.clinicId,
    scanDate,
    totalTrays,
    changeEveryDays,
    totalTraysUpper: oldCase.totalTraysUpper ?? totalTrays,
    totalTraysLower: oldCase.totalTraysLower ?? totalTrays,
    attachmentBondingTray: oldCase.attachmentBondingTray ?? false,
    status,
    phase,
    budget: oldCase.budget,
    contract: oldCase.contract
      ? {
          ...oldCase.contract,
          approvedAt:
            oldCase.contract.status === 'aprovado'
              ? oldCase.contract.approvedAt ?? nowIso()
              : oldCase.contract.approvedAt,
        }
      : phase === 'planejamento' || phase === 'orcamento' || phase === 'contrato_pendente'
        ? { status: 'pendente' }
        : { status: 'aprovado', approvedAt: nowIso() },
    deliveryLots: Array.isArray(oldCase.deliveryLots) ? oldCase.deliveryLots : [],
    installation: oldCase.installation,
    trays: trays.slice(0, totalTrays),
    attachments,
    sourceScanId: oldCase.sourceScanId,
    arch: oldCase.arch ?? 'ambos',
    complaint: oldCase.complaint,
    dentistGuidance: oldCase.dentistGuidance,
    scanFiles,
    createdAt: oldCase.createdAt ?? nowIso(),
    updatedAt: oldCase.updatedAt ?? nowIso(),
  }
}

function migrateScan(raw: LegacyScan): Scan {
  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments.map((item, index) => {
        const isLocal = item.isLocal ?? isObjectUrl(item.url)
        const kind = mapLegacyKind(item) as ScanAttachment['kind']
        return {
          id: item.id ?? `scan_att_${Date.now()}_${index}`,
          name: item.name ?? 'arquivo_sem_nome',
          kind,
          rxType: item.rxType as ScanAttachment['rxType'],
          slotId: item.slotId,
          arch: item.arch as ScanAttachment['arch'],
          mime: item.mime,
          size: item.size,
          url: isLocal ? undefined : item.url,
          filePath: (item as { filePath?: string; file_path?: string }).filePath ?? (item as { file_path?: string }).file_path,
          isLocal,
          status: item.status ?? 'ok',
          attachedAt: item.attachedAt ?? item.createdAt ?? nowIso(),
          note: item.note,
          flaggedAt: item.flaggedAt,
          flaggedReason: item.flaggedReason,
          createdAt: item.createdAt ?? nowIso(),
        }
      })
    : []

  return {
    id: raw.id,
    serviceOrderCode: raw.serviceOrderCode,
    patientName: raw.patientName ?? 'Paciente sem nome',
    patientId: raw.patientId,
    dentistId: raw.dentistId,
    requestedByDentistId: raw.requestedByDentistId,
    clinicId: raw.clinicId,
    scanDate: raw.scanDate ?? toIsoDate(new Date()),
    arch: raw.arch ?? 'ambos',
    complaint: raw.complaint,
    dentistGuidance: raw.dentistGuidance,
    notes: raw.notes,
    attachments,
    status: (raw.status as ScanStatus) ?? 'pendente',
    linkedCaseId: raw.linkedCaseId,
    createdAt: raw.createdAt ?? nowIso(),
    updatedAt: raw.updatedAt ?? nowIso(),
  }
}

function migratePatient(raw: Partial<Patient>): Patient {
  const name = raw.name?.trim() || 'Paciente sem nome'
  return {
    id: raw.id ?? patientIdFromName(name),
    name,
    cpf: (raw as { document?: string }).document ?? raw.cpf,
    gender: raw.gender,
    address: raw.address,
    clinicId: raw.clinicId,
    primaryDentistId: raw.primaryDentistId,
    phone: raw.phone,
    whatsapp: raw.whatsapp,
    email: raw.email,
    birthDate: raw.birthDate,
    notes: raw.notes,
    createdAt: raw.createdAt ?? nowIso(),
    updatedAt: raw.updatedAt ?? nowIso(),
    deletedAt: raw.deletedAt,
  }
}

function normalizeLabStatus(status?: string): LabItem['status'] {
  if (status === 'aguardando_iniciar') return 'aguardando_iniciar'
  if (status === 'em_producao') return 'em_producao'
  if (status === 'controle_qualidade') return 'controle_qualidade'
  if (status === 'prontas') return 'prontas'
  if (status === 'triagem') return 'aguardando_iniciar'
  if (status === 'rework') return 'controle_qualidade'
  if (status === 'entregue') return 'prontas'
  if (status === 'pronta') return 'prontas'
  return 'aguardando_iniciar'
}

function migrateLabItem(raw: LegacyLabItem): LabItem {
  const plannedUpperQty = Number.isFinite(raw.plannedUpperQty) ? Math.max(0, Math.trunc(raw.plannedUpperQty as number)) : 0
  const plannedLowerQty = Number.isFinite(raw.plannedLowerQty) ? Math.max(0, Math.trunc(raw.plannedLowerQty as number)) : 0
  return {
    id: raw.id,
    requestCode: raw.requestCode,
    requestKind: raw.requestKind,
    expectedReplacementDate: raw.expectedReplacementDate ?? raw.dueDate ?? toIsoDate(new Date()),
    caseId: raw.caseId,
    arch: raw.arch ?? 'ambos',
    plannedUpperQty,
    plannedLowerQty,
    planningDefinedAt: plannedUpperQty + plannedLowerQty > 0 ? raw.planningDefinedAt ?? nowIso() : undefined,
    trayNumber: raw.trayNumber ?? 1,
    patientName: raw.patientName ?? 'Paciente sem nome',
    plannedDate: raw.plannedDate ?? toIsoDate(new Date()),
    dueDate: raw.dueDate ?? toIsoDate(new Date()),
    status: normalizeLabStatus(raw.status),
    priority: raw.priority ?? 'Medio',
    notes: raw.notes,
    createdAt: raw.createdAt ?? nowIso(),
    updatedAt: raw.updatedAt ?? nowIso(),
  }
}

function migrateDentist(raw: LegacyDentistClinic): DentistClinic {
  const now = nowIso()
  return {
    id: raw.id,
    name: raw.name?.trim() || 'Sem nome',
    type: raw.type === 'clinica' ? 'clinica' : 'dentista',
    cnpj: raw.cnpj || undefined,
    cro: raw.cro || undefined,
    gender: raw.gender === 'feminino' ? 'feminino' : 'masculino',
    clinicId: raw.clinicId || undefined,
    phone: raw.phone || undefined,
    whatsapp: raw.whatsapp || undefined,
    email: raw.email || undefined,
    address: raw.address,
    notes: raw.notes || undefined,
    isActive: raw.isActive ?? true,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
    deletedAt: raw.deletedAt || undefined,
  }
}

function migrateClinic(raw: LegacyClinic): Clinic {
  const now = nowIso()
  return {
    id: raw.id,
    legalName: raw.legalName,
    tradeName: raw.tradeName?.trim() || 'Clinica',
    cnpj: raw.cnpj,
    phone: raw.phone,
    whatsapp: raw.whatsapp,
    email: raw.email,
    address: raw.address,
    notes: raw.notes,
    isActive: raw.isActive ?? true,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
    deletedAt: raw.deletedAt,
  }
}

function migrateUser(raw: LegacyUser): User {
  const now = nowIso()
  return {
    id: raw.id,
    name: raw.name?.trim() || 'Usuario',
    email: raw.email?.trim() || 'user@orthoscan.local',
    password: raw.password,
    role: raw.role ?? 'receptionist',
    isActive: raw.isActive ?? true,
    linkedDentistId: raw.linkedDentistId,
    linkedClinicId: raw.linkedClinicId,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
    deletedAt: raw.deletedAt,
  }
}

function normalizeDb(raw: unknown): AppDb {
  if (!raw || typeof raw !== 'object') {
    return { cases: [], labItems: [], patients: [], patientDocuments: [], scans: [], dentists: [], clinics: [], users: [], auditLogs: [] }
  }

  const input = raw as {
    cases?: unknown
    casos?: unknown
    labItems?: unknown
    scans?: unknown
    patients?: unknown
    patientDocuments?: unknown
    dentists?: unknown
    clinics?: unknown
    users?: unknown
    auditLogs?: unknown
    [key: string]: unknown
  }
  const rawCases = Array.isArray(input.cases) ? (input.cases as LegacyCase[]) : Array.isArray(input.casos) ? (input.casos as LegacyCase[]) : []
  const cases = rawCases.map(migrateCase)
  const labItems = Array.isArray(input.labItems) ? (input.labItems as LegacyLabItem[]).map(migrateLabItem) : []
  const patients = Array.isArray(input.patients) ? (input.patients as Partial<Patient>[]).map(migratePatient) : []
  const scans = Array.isArray(input.scans) ? (input.scans as LegacyScan[]).map(migrateScan) : []
  const patientDocuments = Array.isArray(input.patientDocuments)
    ? (input.patientDocuments as LegacyPatientDocument[]).map((item) => ({
        id: item.id,
        patientId: item.patientId ?? 'unknown',
        title: item.title ?? item.fileName ?? 'Documento',
        category: item.category ?? 'outro',
        createdAt: item.createdAt ?? nowIso(),
        note: item.note,
        isLocal: item.isLocal ?? false,
        url: item.url,
        filePath: (item as { filePath?: string; file_path?: string }).filePath ?? (item as { file_path?: string }).file_path,
        fileName: item.fileName ?? item.title ?? 'arquivo',
        mimeType: item.mimeType,
        status: item.status ?? 'ok',
        errorNote: item.errorNote,
      }))
    : []
  const legacyDocsFromPatients: PatientDocument[] = patients.flatMap((patient) => {
    const rawDocs = (input.patients as Array<{ id?: string; documents?: Array<{ id: string; name?: string; url?: string; isLocal?: boolean; status?: 'ok' | 'erro'; note?: string; flaggedReason?: string; createdAt?: string }> }> | undefined) ?? []
    const matched = rawDocs.find((item) => item.id === patient.id)
    const docs = matched?.documents ?? []
    return docs.map((doc) => ({
      id: doc.id,
      patientId: patient.id,
      title: doc.name ?? 'Documento',
      category: 'outro',
      createdAt: doc.createdAt ?? nowIso(),
      note: doc.note,
      isLocal: doc.isLocal ?? false,
      url: doc.url,
      fileName: doc.name ?? 'arquivo',
      mimeType: undefined,
      status: doc.status ?? 'ok',
      errorNote: doc.flaggedReason,
    }))
  })
  const dentistsRaw = Array.isArray(input.dentists)
    ? (input.dentists as LegacyDentistClinic[]).map(migrateDentist)
    : []
  const clinicsFromDentists = dentistsRaw
    .filter((item) => item.type === 'clinica')
    .map((item) => ({
      id: item.id.replace('dent_', 'clinic_'),
      tradeName: item.name,
      legalName: undefined,
      cnpj: item.cnpj,
      phone: item.phone,
      whatsapp: item.whatsapp,
      email: item.email,
      address: item.address,
      notes: item.notes,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      deletedAt: item.deletedAt,
    })) as Clinic[]
  const dentists = dentistsRaw.filter((item) => item.type === 'dentista')
  const clinicsRaw = Array.isArray(input.clinics)
    ? (input.clinics as LegacyClinic[]).map(migrateClinic)
    : []
  const clinicById = new Map(clinicsRaw.map((item) => [item.id, item]))
  clinicsFromDentists.forEach((clinic) => {
    if (!clinicById.has(clinic.id)) {
      clinicById.set(clinic.id, clinic)
    }
  })
  const clinics = Array.from(clinicById.values())
  const users = Array.isArray(input.users) ? (input.users as LegacyUser[]).map(migrateUser) : []
  const auditLogs = Array.isArray(input.auditLogs) ? (input.auditLogs as AuditLog[]) : []
  const byName = new Map(patients.map((item) => [item.name.toLowerCase(), item.id]))
  const linkedCases = cases.map((item) => ({
    ...item,
    patientId: item.patientId ?? byName.get(item.patientName.toLowerCase()),
  }))
  const casesWithCode = ensureTreatmentCodes(linkedCases, clinics)
  const caseCodeById = new Map(casesWithCode.map((item) => [item.id, item.treatmentCode]))
  const linkedScans = scans.map((item) => ({
    ...item,
    patientId: item.patientId ?? byName.get(item.patientName.toLowerCase()),
    serviceOrderCode: item.serviceOrderCode ?? (item.linkedCaseId ? caseCodeById.get(item.linkedCaseId) : undefined),
  }))

  return {
    ...input,
    cases: casesWithCode,
    labItems,
    patients,
    patientDocuments: patientDocuments.length > 0 ? patientDocuments : legacyDocsFromPatients,
    scans: linkedScans,
    dentists,
    clinics,
    users,
    auditLogs,
  }
}

export function ensureSeed() {
  const mode = effectiveSeedMode()
  const raw = localStorage.getItem(DB_KEY)
  if (!raw) {
    const seeded = buildSeededDb(mode)
    localStorage.setItem(DB_KEY, JSON.stringify(seeded))
    return seeded
  }

  try {
    const normalized = normalizeDb(JSON.parse(raw) as unknown)
    if (mode === 'empty') {
      const nextDb: AppDb = {
        ...normalized,
        users: ensureMasterUser(normalized.users.length === 0 ? seedUsers() : normalized.users),
      }
      localStorage.setItem(DB_KEY, JSON.stringify(nextDb))
      return nextDb
    }
    const required = seedPatients()
    const existingByName = new Set(normalized.patients.map((item) => item.name.toLowerCase()))
    const mergedPatients = [
      ...normalized.patients,
      ...required.filter((item) => !existingByName.has(item.name.toLowerCase())),
    ]
    const nextDb = ensureFullSeedData({
      ...normalized,
      cases: normalized.cases,
      labItems: normalized.labItems,
      patients: mergedPatients,
      patientDocuments: normalized.patientDocuments ?? [],
      scans: normalized.scans.length === 0 ? seedScans(normalized.cases) : normalized.scans,
      dentists: normalized.dentists.length === 0 ? seedDentists() : normalized.dentists,
      clinics: normalized.clinics.length === 0 ? seedClinics() : normalized.clinics,
      users: ensureMasterUser(normalized.users.length === 0 ? seedUsers() : normalized.users),
    })
    localStorage.setItem(DB_KEY, JSON.stringify(nextDb))
    return nextDb
  } catch {
    const seeded = buildSeededDb(mode)
    localStorage.setItem(DB_KEY, JSON.stringify(seeded))
    return seeded
  }
}

export function loadDb(): AppDb {
  return ensureSeed()
}

export function saveDb(db: AppDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
  emitDbChanged()
}

export function resetDb(mode?: 'full' | 'empty') {
  const resolvedMode = mode ?? SEED_MODE
  localStorage.setItem(DB_MODE_KEY, resolvedMode)
  const next = buildSeededDb(resolvedMode)
  localStorage.setItem(DB_KEY, JSON.stringify(next))
  emitDbChanged()
  return next
}

export function ensureMasterUserInDb() {
  const db = loadDb()
  const nextUsers = ensureMasterUser(db.users)
  if (nextUsers === db.users) return db
  const nextDb = { ...db, users: nextUsers }
  saveDb(nextDb)
  return nextDb
}
