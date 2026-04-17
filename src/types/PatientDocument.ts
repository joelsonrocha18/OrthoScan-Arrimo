export type PatientDocumentMetadata = {
  trayNumber?: number
  capturedAt?: string
  accessCode?: string
  sentAt?: string
  deviceLabel?: string
  source?: 'patient_portal' | 'internal'
  uploadedByPatient?: boolean
}

export type PatientDocument = {
  id: string
  patientId: string
  caseId?: string
  title: string
  category: 'identificacao' | 'contrato' | 'consentimento' | 'exame' | 'foto' | 'outro'
  createdAt: string
  note?: string
  isLocal: boolean
  url?: string
  filePath?: string
  fileName: string
  mimeType?: string
  status: 'ok' | 'erro'
  errorNote?: string
  metadata?: PatientDocumentMetadata
}
