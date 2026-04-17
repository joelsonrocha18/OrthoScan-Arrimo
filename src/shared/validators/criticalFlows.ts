import type { AddCaseNoteInput, CreateCaseFromScanInput, UpdateCaseStatusInput } from '../../modules/cases/application/ports/CaseRepository'
import type { ApprovePlanningVersionInput, PublishPlanningVersionInput } from '../../modules/cases/application/ports/CaseRepository'
import type {
  RegisterLabOrderInput,
  RegisterReworkInput,
  RegisterShipmentInput,
  UpdateLabStageInput,
} from '../../modules/lab/application/ports/LabRepository'
import type { UpdateProductionChecklistInput } from '../../modules/lab/application/useCases/UpdateProductionChecklist'
import type { PatientDocument } from '../../types/PatientDocument'
import type { Scan, ScanAttachment, ScanArch, ScanFileKind, ScanStatus } from '../../types/Scan'
import {
  parseArray,
  parseBoolean,
  parseEnum,
  parseInteger,
  parseIsoDate,
  parseIsoDateTime,
  parseObject,
  parseOptionalIsoDate,
  parseOptionalTrimmedString,
  parseTrimmedString,
} from './schema'

const SCAN_ARCHES = ['superior', 'inferior', 'ambos'] as const satisfies readonly ScanArch[]
const SCAN_STATUSES = ['pendente', 'aprovado', 'reprovado', 'convertido'] as const satisfies readonly ScanStatus[]
const SCAN_FILE_KINDS = ['scan3d', 'foto_intra', 'foto_extra', 'raiox', 'dicom', 'projeto', 'outro'] as const satisfies readonly ScanFileKind[]
const SCAN_RX_TYPES = ['panoramica', 'teleradiografia', 'tomografia'] as const
const CASE_NOTE_SCOPES = ['planning', 'budget', 'contract', 'installation', 'tray'] as const
const LAB_ARCHES = ['superior', 'inferior', 'ambos'] as const
const LAB_PRIORITIES = ['Baixo', 'Medio', 'Alto', 'Urgente'] as const
const LAB_STAGES = ['aguardando_iniciar', 'em_producao', 'controle_qualidade', 'prontas', 'entregue'] as const
const DOC_CATEGORIES = ['identificacao', 'contrato', 'consentimento', 'exame', 'foto', 'outro'] as const satisfies readonly PatientDocument['category'][]

function validateScanAttachment(input: unknown, index: number): ScanAttachment {
  const attachment = parseObject(input, `Anexo ${index + 1} inválido.`)
  const createdAt = parseIsoDateTime(attachment.createdAt ?? attachment.attachedAt ?? new Date().toISOString(), `Data do anexo ${index + 1}`)
  return {
    id: String(attachment.id ?? ''),
    name: parseTrimmedString(attachment.name, `Nome do anexo ${index + 1}`),
    kind: parseEnum(attachment.kind, SCAN_FILE_KINDS, `Tipo do anexo ${index + 1}`),
    rxType:
      attachment.rxType === undefined || attachment.rxType === null || attachment.rxType === ''
        ? undefined
        : parseEnum(attachment.rxType, SCAN_RX_TYPES, `Tipo RX do anexo ${index + 1}`),
    slotId: parseOptionalTrimmedString(attachment.slotId, `Slot do anexo ${index + 1}`),
    arch: attachment.arch as ScanAttachment['arch'],
    mime: parseOptionalTrimmedString(attachment.mime, `Mime do anexo ${index + 1}`),
    size: typeof attachment.size === 'number' ? attachment.size : undefined,
    url: parseOptionalTrimmedString(attachment.url, `URL do anexo ${index + 1}`),
    filePath: parseOptionalTrimmedString(attachment.filePath, `Caminho do anexo ${index + 1}`),
    isLocal: typeof attachment.isLocal === 'boolean' ? attachment.isLocal : undefined,
    status: attachment.status === 'erro' ? 'erro' : 'ok',
    attachedAt: parseOptionalTrimmedString(attachment.attachedAt, `Data de anexacao ${index + 1}`),
    note: parseOptionalTrimmedString(attachment.note, `Observação do anexo ${index + 1}`, { max: 2000 }),
    flaggedAt: parseOptionalTrimmedString(attachment.flaggedAt, `Data de flag do anexo ${index + 1}`),
    flaggedReason: parseOptionalTrimmedString(attachment.flaggedReason, `Motivo do anexo ${index + 1}`, { max: 500 }),
    createdAt,
  }
}

export function validateCreateScanInput(input: Omit<Scan, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    ...input,
    patientName: parseTrimmedString(input.patientName, 'Paciente'),
    patientId: parseOptionalTrimmedString(input.patientId, 'Paciente'),
    dentistId: parseOptionalTrimmedString(input.dentistId, 'Dentista'),
    requestedByDentistId: parseOptionalTrimmedString(input.requestedByDentistId, 'Solicitante'),
    clinicId: parseOptionalTrimmedString(input.clinicId, 'Clinica'),
    shortId: parseOptionalTrimmedString(input.shortId, 'Código curto'),
    serviceOrderCode: parseOptionalTrimmedString(input.serviceOrderCode, 'Código do caso'),
    purposeProductId: parseOptionalTrimmedString(input.purposeProductId, 'Produto'),
    purposeProductType: parseOptionalTrimmedString(input.purposeProductType, 'Tipo do produto'),
    purposeLabel: parseOptionalTrimmedString(input.purposeLabel, 'Rotulo do produto'),
    scanDate: parseIsoDate(input.scanDate, 'Data do exame'),
    arch: parseEnum(input.arch, SCAN_ARCHES, 'Arcada'),
    complaint: parseOptionalTrimmedString(input.complaint, 'Queixa', { max: 4000 }),
    dentistGuidance: parseOptionalTrimmedString(input.dentistGuidance, 'Orientacao do dentista', { max: 4000 }),
    notes: parseOptionalTrimmedString(input.notes, 'Observacoes', { max: 4000 }),
    planningDetectedUpperTrays:
      input.planningDetectedUpperTrays === undefined ? undefined : parseInteger(input.planningDetectedUpperTrays, 'Placas superiores detectadas', { min: 0 }),
    planningDetectedLowerTrays:
      input.planningDetectedLowerTrays === undefined ? undefined : parseInteger(input.planningDetectedLowerTrays, 'Placas inferiores detectadas', { min: 0 }),
    planningDetectedAt: parseOptionalTrimmedString(input.planningDetectedAt, 'Data do planejamento detectado'),
    planningDetectedSource: input.planningDetectedSource,
    attachments: parseArray(input.attachments, 'Anexos do exame', validateScanAttachment),
    status: parseEnum(input.status, SCAN_STATUSES, 'Status do exame'),
    linkedCaseId: parseOptionalTrimmedString(input.linkedCaseId, 'Caso vinculado'),
  } satisfies Omit<Scan, 'id' | 'createdAt' | 'updatedAt'>
}

export function validateCreateCaseFromScanInput(input: CreateCaseFromScanInput) {
  return {
    scanId: parseTrimmedString(input.scanId, 'Exame'),
    totalTraysUpper: input.totalTraysUpper === undefined ? undefined : parseInteger(input.totalTraysUpper, 'Total de placas superiores', { min: 0 }),
    totalTraysLower: input.totalTraysLower === undefined ? undefined : parseInteger(input.totalTraysLower, 'Total de placas inferiores', { min: 0 }),
    changeEveryDays: parseInteger(input.changeEveryDays, 'Troca a cada dias', { min: 1, max: 365 }),
    attachmentBondingTray: parseBoolean(input.attachmentBondingTray, 'Uso de bandeja de colagem'),
    planningNote: parseOptionalTrimmedString(input.planningNote, 'Observação do planejamento', { max: 4000 }),
  } satisfies CreateCaseFromScanInput
}

export function validateUpdateCaseStatusInput(input: UpdateCaseStatusInput) {
  return {
    caseId: parseTrimmedString(input.caseId, 'Caso'),
    nextStatus: parseTrimmedString(input.nextStatus, 'Status do caso') as UpdateCaseStatusInput['nextStatus'],
    nextPhase: parseOptionalTrimmedString(input.nextPhase, 'Fase do caso') as UpdateCaseStatusInput['nextPhase'],
    reason: parseOptionalTrimmedString(input.reason, 'Motivo', { max: 1000 }),
  } satisfies UpdateCaseStatusInput
}

export function validateAddCaseNoteInput(input: AddCaseNoteInput) {
  return {
    caseId: parseTrimmedString(input.caseId, 'Caso'),
    scope: parseEnum(input.scope, CASE_NOTE_SCOPES, 'Escopo da observação') as AddCaseNoteInput['scope'],
    note: parseTrimmedString(input.note, 'Observação', { max: 4000 }),
    trayNumber: input.trayNumber === undefined ? undefined : parseInteger(input.trayNumber, 'Placa', { min: 1, max: 999 }),
  } satisfies AddCaseNoteInput
}

export function validatePublishPlanningVersionInput(input: PublishPlanningVersionInput) {
  return {
    caseId: parseTrimmedString(input.caseId, 'Caso'),
    note: parseOptionalTrimmedString(input.note, 'Observação da versão', { max: 2000 }),
  } satisfies PublishPlanningVersionInput
}

export function validateApprovePlanningVersionInput(input: ApprovePlanningVersionInput) {
  return {
    caseId: parseTrimmedString(input.caseId, 'Caso'),
    versionId: parseTrimmedString(input.versionId, 'Versao'),
  } satisfies ApprovePlanningVersionInput
}

export function validateRegisterLabOrderInput(input: RegisterLabOrderInput) {
  return {
    ...input,
    caseId: parseOptionalTrimmedString(input.caseId, 'Caso'),
    arch: parseEnum(input.arch, LAB_ARCHES, 'Arcada LAB') as RegisterLabOrderInput['arch'],
    patientName: parseTrimmedString(input.patientName, 'Paciente'),
    trayNumber: parseInteger(input.trayNumber, 'Placa LAB', { min: 1, max: 999 }),
    plannedDate: input.plannedDate ? parseIsoDate(input.plannedDate, 'Data planejada LAB') : undefined,
    dueDate: parseIsoDate(input.dueDate, 'Prazo LAB'),
    status: parseEnum(input.status, LAB_STAGES, 'Status LAB') as RegisterLabOrderInput['status'],
    priority: parseEnum(input.priority, LAB_PRIORITIES, 'Prioridade LAB') as RegisterLabOrderInput['priority'],
    notes: parseOptionalTrimmedString(input.notes, 'Observação LAB', { max: 4000 }),
    plannedUpperQty: input.plannedUpperQty === undefined ? undefined : parseInteger(input.plannedUpperQty, 'Quantidade superior LAB', { min: 0 }),
    plannedLowerQty: input.plannedLowerQty === undefined ? undefined : parseInteger(input.plannedLowerQty, 'Quantidade inferior LAB', { min: 0 }),
    requestCode: parseOptionalTrimmedString(input.requestCode, 'Código da OS'),
    requestKind: input.requestKind,
    expectedReplacementDate: parseOptionalIsoDate(input.expectedReplacementDate, 'Data prevista de reposicao'),
  } satisfies RegisterLabOrderInput
}

export function validateUpdateLabStageInput(input: UpdateLabStageInput) {
  return {
    id: parseTrimmedString(input.id, 'OS LAB'),
    nextStage: parseEnum(input.nextStage, LAB_STAGES, 'Proximo status LAB') as UpdateLabStageInput['nextStage'],
  } satisfies UpdateLabStageInput
}

export function validateUpdateProductionChecklistInput(input: UpdateProductionChecklistInput) {
  return {
    id: parseTrimmedString(input.id, 'OS LAB'),
    itemId: parseTrimmedString(input.itemId, 'Item do checklist'),
    completed: parseBoolean(input.completed, 'Status do checklist'),
  } satisfies UpdateProductionChecklistInput
}

export function validateRegisterShipmentInput(input: RegisterShipmentInput) {
  return {
    labOrderId: parseTrimmedString(input.labOrderId, 'OS LAB'),
    deliveredToDoctorAt: parseIsoDate(input.deliveredToDoctorAt, 'Data de entrega'),
    note: parseOptionalTrimmedString(input.note, 'Observação da entrega', { max: 2000 }),
    upperQty: parseInteger(input.upperQty, 'Quantidade superior entregue', { min: 0, max: 999 }),
    lowerQty: parseInteger(input.lowerQty, 'Quantidade inferior entregue', { min: 0, max: 999 }),
  } satisfies RegisterShipmentInput
}

export function validateRegisterReworkInput(input: RegisterReworkInput) {
  return {
    caseId: parseTrimmedString(input.caseId, 'Caso'),
    trayNumber: parseInteger(input.trayNumber, 'Placa da reconfecção', { min: 1, max: 999 }),
    arch: parseEnum(input.arch, LAB_ARCHES, 'Arcada da reconfecção') as RegisterReworkInput['arch'],
    reason: parseTrimmedString(input.reason, 'Motivo da reconfecção', { min: 3, max: 1000 }),
  } satisfies RegisterReworkInput
}

export function validatePatientDocumentInput(input: {
  patientId: string
  clinicId?: string
  title: string
  category: PatientDocument['category']
  note?: string
  createdAt?: string
  file?: File
}) {
  return {
    patientId: parseTrimmedString(input.patientId, 'Paciente do documento'),
    clinicId: parseOptionalTrimmedString(input.clinicId, 'Clinica do documento'),
    title: parseTrimmedString(input.title, 'Título do documento', { max: 250 }),
    category: parseEnum(input.category, DOC_CATEGORIES, 'Categoria do documento'),
    note: parseOptionalTrimmedString(input.note, 'Observação do documento', { max: 2000 }),
    createdAt: input.createdAt ? parseIsoDate(input.createdAt, 'Data do documento') : undefined,
    file: input.file,
  }
}

export function validateSignInInput(input: { email: string; password: string }) {
  return {
    email: parseTrimmedString(input.email, 'Usuario ou email', { min: 3, max: 160 }).toLowerCase(),
    password: parseTrimmedString(input.password, 'Senha', { min: 3, max: 160 }),
  }
}
