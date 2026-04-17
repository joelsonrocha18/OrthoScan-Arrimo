export type PatientPortalSummary = {
  patientId: string
  patientName: string
  cpfMasked: string
  birthDate: string
  clinicName?: string
  dentistName?: string
  activeCaseCode?: string
  treatmentStatus?: string
  nextChangeDate?: string
  lastChangeDate?: string
  productLabel?: string
  treatmentOrigin?: 'interno' | 'externo'
  changeEveryDays: number
  totalTrays: number
  deliveredTrays: {
    upper: number
    lower: number
  }
  currentTrays: {
    upper: number
    lower: number
  }
}

export type PatientPortalTimelineItem = {
  id: string
  date: string
  title: string
  description?: string
  trayNumber?: number
  status: 'done' | 'today' | 'upcoming' | 'pending'
  kind: 'milestone' | 'change'
  photoStatus?: 'recebida' | 'pendente' | 'aguardando'
}

export type PatientPortalPhotoSlot = {
  id: string
  trayNumber: number
  plannedDate: string
  recordedAt?: string
  documentId?: string
  title: string
  fileName?: string
  note?: string
  previewUrl?: string
  status: 'recebida' | 'pendente' | 'aguardando'
}

export type PatientPortalCalendarDay = {
  isoDate: string
  dayNumber: number
  isToday: boolean
  isChangeDay: boolean
  trayNumbers: number[]
}

export type PatientPortalCalendarMonth = {
  key: string
  label: string
  cells: Array<PatientPortalCalendarDay | null>
}

export type PatientPortalDocument = {
  id: string
  title: string
  category: 'identificacao' | 'contrato' | 'consentimento' | 'exame' | 'foto' | 'outro'
  createdAt: string
  fileName?: string
  url?: string
  note?: string
  trayNumber?: number
  capturedAt?: string
  sentAt?: string
  deviceLabel?: string
  source?: 'patient_portal' | 'internal'
}

export type PatientPortalSnapshot = {
  summary: PatientPortalSummary
  accessCode: string
  timeline: PatientPortalTimelineItem[]
  photoSlots: PatientPortalPhotoSlot[]
  calendarMonths: PatientPortalCalendarMonth[]
  documents: PatientPortalDocument[]
}

export type PatientPortalSession = {
  token: string
  accessCode: string
  portalUrl: string
  preview: Pick<
    PatientPortalSummary,
    'patientId' | 'patientName' | 'activeCaseCode' | 'treatmentStatus' | 'clinicName' | 'dentistName'
  >
}

export type PatientPortalPhotoUploadInput = {
  token: string
  accessCode: string
  trayNumber: number
  capturedAt: string
  sentAt?: string
  deviceLabel?: string
  note?: string
  file: File
}

export type PatientPortalPhotoUploadReceipt = {
  documentId: string
  trayNumber: number
  capturedAt: string
  title: string
}
