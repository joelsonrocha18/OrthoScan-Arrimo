import { err, ok, type Result } from '../../../../shared/errors'
import { nowIsoDateTime } from '../../../../shared/utils/date'
import { createEntityId } from '../../../../shared/utils/id'
import { loadDb } from '../../../../data/db'
import { saveDb } from '../../../../data/db'
import { getCaseAlignerChangeSummary } from '../../../../lib/alignerChange'
import type { AppDb } from '../../../../data/db'
import type { Patient } from '../../../../types/Patient'
import type { Case } from '../../../../types/Case'
import {
  buildPatientAccessPreview,
  normalizeCpfInput,
  validatePatientIdentityInput,
  validatePatientPortalPhotoInput,
  validatePatientPortalAccessInput,
} from '../../domain/services/PatientAccessService'
import {
  buildPatientPortalSnapshot,
  isMatchingPatientAccessCode,
  resolvePatientPortalAccessCode,
} from '../../domain/services/PatientPortalService'
import type {
  PatientAccessIdentityInput,
  PatientAccessPreview,
  PatientAccessRepository,
  PatientMagicLinkReceipt,
  PatientPortalAccessInput,
} from '../../application/ports/PatientAccessRepository'
import type {
  PatientPortalPhotoUploadInput,
  PatientPortalPhotoUploadReceipt,
  PatientPortalSession,
  PatientPortalSnapshot,
} from '../../domain/models/PatientPortal'
import { buildPatientDocPath, uploadToStorage, validatePatientDocFile } from '../../../../repo/storageRepo'

const LOCAL_MAGIC_PREFIX = 'local-patient-link:'

function readStorage() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage
}

function buildLocalToken(patientId: string) {
  return `${LOCAL_MAGIC_PREFIX}${patientId}:${Date.now()}`
}

function persistLocalToken(token: string, patientId: string) {
  readStorage()?.setItem(token, patientId)
}

function readPatientIdFromToken(token: string) {
  return readStorage()?.getItem(token) ?? null
}

function findPatientByIdentity(db: AppDb, input: PatientAccessIdentityInput) {
  const validated = validatePatientIdentityInput(input)
  return (
    db.patients.find((item) => {
      if (item.deletedAt) return false
      return normalizeCpfInput(item.cpf ?? '') === validated.cpf && (item.birthDate ?? '') === validated.birthDate
    }) ?? null
  )
}

function resolveLatestCase(db: AppDb, patientId: string) {
  return [...db.cases]
    .filter((item) => item.patientId === patientId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
}

function resolvePatientCases(db: AppDb, patientId: string) {
  return db.cases
    .filter((item) => item.patientId === patientId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

function resolveCaseByAccessCode(db: AppDb, patientId: string, accessCode: string) {
  return resolvePatientCases(db, patientId).find((item) => isMatchingPatientAccessCode(item, accessCode)) ?? null
}

function toTreatmentStatus(caseItem?: Case | null) {
  if (!caseItem) return 'Cadastro localizado'
  if (caseItem.lifecycleStatus === 'delivered') return 'Entregue'
  if (caseItem.lifecycleStatus === 'in_use') return 'Em uso'
  if (caseItem.lifecycleStatus === 'rework') return 'Reconfecção'
  if (caseItem.lifecycleStatus === 'in_production') return 'Em produção'
  if (caseItem.lifecycleStatus === 'shipped') return 'Despachado'
  if (caseItem.lifecycleStatus === 'qc') return 'Controle de qualidade'
  return caseItem.status.replaceAll('_', ' ')
}

function buildPreviewFromPatient(db: AppDb, patient: Patient, caseItemOverride?: Case | null): PatientAccessPreview {
  const clinic = patient.clinicId ? db.clinics.find((item) => item.id === patient.clinicId) : undefined
  const dentist = patient.primaryDentistId ? db.dentists.find((item) => item.id === patient.primaryDentistId) : undefined
  const caseItem = caseItemOverride ?? resolveLatestCase(db, patient.id)
  const changeSummary = caseItem ? getCaseAlignerChangeSummary(caseItem) : null

  return buildPatientAccessPreview({
    patientId: patient.id,
    patientName: patient.name,
    cpf: patient.cpf,
    birthDate: patient.birthDate ?? '',
    clinicName: clinic?.tradeName,
    dentistName: dentist?.name,
    activeCaseCode: caseItem?.treatmentCode ?? caseItem?.id,
    treatmentStatus: toTreatmentStatus(caseItem),
    nextChangeDate: changeSummary?.nextDueDate,
    patientEmail: patient.email,
  })
}

function buildPortalSession(
  token: string,
  caseItem: Case,
  preview: PatientAccessPreview,
): PatientPortalSession {
  const accessCode = resolvePatientPortalAccessCode(caseItem) || caseItem.id
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const portalUrl = `${origin}/acesso/pacientes/portal?token=${encodeURIComponent(token)}&accessCode=${encodeURIComponent(accessCode)}`

  return {
    token,
    accessCode,
    portalUrl,
    preview: {
      patientId: preview.patientId,
      patientName: preview.patientName,
      activeCaseCode: preview.activeCaseCode,
      treatmentStatus: preview.treatmentStatus,
      clinicName: preview.clinicName,
      dentistName: preview.dentistName,
    },
  }
}

function buildPortalSnapshot(db: AppDb, patient: Patient, caseItem?: Case | null): PatientPortalSnapshot {
  const clinic = patient.clinicId ? db.clinics.find((item) => item.id === patient.clinicId) : undefined
  const dentist = patient.primaryDentistId ? db.dentists.find((item) => item.id === patient.primaryDentistId) : undefined
  const documents = db.patientDocuments.filter((item) => {
    if (item.patientId !== patient.id) return false
    if (!caseItem?.id) return true
    return !item.caseId || item.caseId === caseItem.id
  })

  return buildPatientPortalSnapshot({
    patient,
    caseItem,
    clinicName: clinic?.tradeName,
    dentistName: dentist?.name,
    documents,
  })
}

export class LocalPatientAccessRepository implements PatientAccessRepository {
  async validateIdentity(input: PatientAccessIdentityInput): Promise<Result<PatientAccessPreview, string>> {
    const db = loadDb()
    const patient = findPatientByIdentity(db, input)
    if (!patient) return err('Não encontramos um paciente com os dados informados.')
    return ok(buildPreviewFromPatient(db, patient))
  }

  async requestMagicLink(input: PatientAccessIdentityInput): Promise<Result<PatientMagicLinkReceipt, string>> {
    const db = loadDb()
    const patient = findPatientByIdentity(db, input)
    if (!patient) return err('Não encontramos um paciente com os dados informados.')
    if (!patient.email?.trim()) {
      return err('Este paciente ainda não possui email cadastrado para receber link mágico.')
    }

    const token = buildLocalToken(patient.id)
    persistLocalToken(token, patient.id)

    return ok({
      deliveryChannel: 'debug',
      destinationHint: patient.email,
      magicLinkUrl: `${window.location.origin}/acesso/pacientes/portal?token=${encodeURIComponent(token)}`,
    })
  }

  async resolveMagicLink(token: string): Promise<Result<PatientAccessPreview, string>> {
    if (!token.startsWith(LOCAL_MAGIC_PREFIX)) return err('Link do paciente inválido.')
    const patientId = readPatientIdFromToken(token)
    if (!patientId) return err('Link do paciente expirado ou inválido.')

    const db = loadDb()
    const patient = db.patients.find((item) => item.id === patientId && !item.deletedAt)
    if (!patient) return err('Paciente não encontrado para este link.')

    return ok(buildPreviewFromPatient(db, patient))
  }

  async startPortalSession(input: PatientPortalAccessInput): Promise<Result<PatientPortalSession, string>> {
    const validated = validatePatientPortalAccessInput(input)
    const db = loadDb()
    const patient = findPatientByIdentity(db, validated)
    if (!patient) return err('Não encontramos um paciente com os dados informados.')

    const caseItem = resolveCaseByAccessCode(db, patient.id, validated.accessCode)
    if (!caseItem) {
      return err('Código do tratamento não localizado para este paciente.')
    }

    const token = buildLocalToken(patient.id)
    persistLocalToken(token, patient.id)
    const preview = buildPreviewFromPatient(db, patient, caseItem)
    return ok(buildPortalSession(token, caseItem, preview))
  }

  async resolvePortalSession(input: { token: string; accessCode?: string }): Promise<Result<PatientPortalSnapshot, string>> {
    if (!input.token.startsWith(LOCAL_MAGIC_PREFIX)) return err('Sessão do paciente inválida.')
    const patientId = readPatientIdFromToken(input.token)
    if (!patientId) return err('Sessão do paciente expirada ou inválida.')

    const db = loadDb()
    const patient = db.patients.find((item) => item.id === patientId && !item.deletedAt)
    if (!patient) return err('Paciente não encontrado para esta sessão.')

    const caseItem = input.accessCode
      ? resolveCaseByAccessCode(db, patient.id, input.accessCode)
      : resolveLatestCase(db, patient.id)

    return ok(buildPortalSnapshot(db, patient, caseItem))
  }

  async uploadPortalPhoto(input: PatientPortalPhotoUploadInput): Promise<Result<PatientPortalPhotoUploadReceipt, string>> {
    if (!input.token.startsWith(LOCAL_MAGIC_PREFIX)) return err('Sessão do paciente inválida.')
    const patientId = readPatientIdFromToken(input.token)
    if (!patientId) return err('Sessão do paciente expirada ou inválida.')

    const validated = validatePatientPortalPhotoInput(input)
    const fileValidation = validatePatientDocFile(validated.file)
    if (!fileValidation.ok) return err(fileValidation.error)

    const db = loadDb()
    const patient = db.patients.find((item) => item.id === patientId && !item.deletedAt)
    if (!patient) return err('Paciente não encontrado para esta sessão.')

    const caseItem = resolveCaseByAccessCode(db, patient.id, input.accessCode)
    if (!caseItem) return err('Código do tratamento não localizado para este paciente.')

    const alreadyConfirmed = db.patientDocuments.some((item) => {
      if (item.patientId !== patient.id || item.category !== 'foto') return false
      return item.metadata?.trayNumber === validated.trayNumber
    })
    if (alreadyConfirmed) {
      return err('Esta troca já foi confirmada. Não é possível alterar ou excluir a foto.')
    }

    const clinicId = patient.clinicId ?? caseItem.clinicId ?? 'portal_publico'
    const filePath = buildPatientDocPath({
      clinicId,
      patientId: patient.id,
      fileName: validated.file.name,
    })
    const upload = await uploadToStorage(filePath, validated.file)
    if (!upload.ok) return err(upload.error)

    const sentAt = validated.sentAt?.trim() || nowIsoDateTime()
    const title = `Foto do alinhador #${validated.trayNumber}`
    db.patientDocuments = [
      {
        id: createEntityId('pat-doc'),
        patientId: patient.id,
        caseId: caseItem.id,
        title,
        category: 'foto',
        createdAt: sentAt,
        note: validated.note,
        isLocal: false,
        url: URL.createObjectURL(validated.file),
        filePath: upload.path,
        fileName: validated.file.name,
        mimeType: validated.file.type || undefined,
        status: 'ok',
        metadata: {
          trayNumber: validated.trayNumber,
          capturedAt: validated.capturedAt,
          accessCode: resolvePatientPortalAccessCode(caseItem) || caseItem.id,
          sentAt,
          deviceLabel: validated.deviceLabel,
          source: 'patient_portal',
          uploadedByPatient: true,
        },
      },
      ...db.patientDocuments,
    ]
    saveDb(db)

    return ok({
      documentId: db.patientDocuments[0].id,
      trayNumber: validated.trayNumber,
      capturedAt: validated.capturedAt,
      title,
    })
  }
}

export function createLocalPatientAccessRepository() {
  return new LocalPatientAccessRepository()
}
