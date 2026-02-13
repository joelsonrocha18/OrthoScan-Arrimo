export type PatientDocument = {
  id: string
  patientId: string
  title: string
  category: 'identificacao' | 'contrato' | 'consentimento' | 'exame' | 'foto' | 'outro'
  createdAt: string
  note?: string
  isLocal: boolean
  url?: string
  fileName: string
  mimeType?: string
  status: 'ok' | 'erro'
  errorNote?: string
}
