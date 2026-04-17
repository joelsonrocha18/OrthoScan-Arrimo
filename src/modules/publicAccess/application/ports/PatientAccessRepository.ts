import type { AsyncResult } from '../../../../shared/errors'
import type {
  PatientPortalPhotoUploadInput,
  PatientPortalPhotoUploadReceipt,
  PatientPortalSession,
  PatientPortalSnapshot,
} from '../../domain/models/PatientPortal'

export type PatientAccessIdentityInput = {
  cpf: string
  birthDate: string
}

export type PatientPortalAccessInput = PatientAccessIdentityInput & {
  accessCode: string
}

export type PatientAccessPreview = {
  patientId: string
  patientName: string
  cpfMasked: string
  birthDate: string
  clinicName?: string
  dentistName?: string
  activeCaseCode?: string
  treatmentStatus?: string
  nextChangeDate?: string
  magicLinkEnabled: boolean
  destinationHint?: string
}

export type PatientMagicLinkReceipt = {
  deliveryChannel: 'email' | 'debug'
  destinationHint: string
  magicLinkUrl?: string
}

export interface PatientAccessRepository {
  validateIdentity(input: PatientAccessIdentityInput): AsyncResult<PatientAccessPreview, string>
  requestMagicLink(input: PatientAccessIdentityInput): AsyncResult<PatientMagicLinkReceipt, string>
  resolveMagicLink(token: string): AsyncResult<PatientAccessPreview, string>
  startPortalSession(input: PatientPortalAccessInput): AsyncResult<PatientPortalSession, string>
  resolvePortalSession(input: { token: string; accessCode?: string }): AsyncResult<PatientPortalSnapshot, string>
  uploadPortalPhoto(input: PatientPortalPhotoUploadInput): AsyncResult<PatientPortalPhotoUploadReceipt, string>
}
