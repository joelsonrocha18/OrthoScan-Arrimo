export type TreatmentOrigin = 'interno' | 'externo'

export type TreatmentOriginPatientLookup = {
  clinicId?: string
}

export type TreatmentOriginClinicLookup = {
  tradeName?: string
}

export type TreatmentOriginSubject = {
  treatmentOrigin?: TreatmentOrigin
  clinicId?: string
  patientId?: string
}

function normalizeClinicId(clinicId?: string) {
  return (clinicId ?? '').trim().toLowerCase()
}

export function inferTreatmentOriginFromClinic(
  clinicId: string | undefined,
  clinicsById?: Map<string, TreatmentOriginClinicLookup>,
) {
  const normalizedClinicId = normalizeClinicId(clinicId)
  if (!normalizedClinicId) return null
  if (normalizedClinicId === 'clinic_arrimo' || normalizedClinicId === 'cli-0001') return 'interno' as const
  const tradeName = clinicId ? clinicsById?.get(clinicId)?.tradeName?.trim().toUpperCase() : ''
  if (tradeName === 'ARRIMO') return 'interno' as const
  return 'externo' as const
}

export function resolveTreatmentOrigin(
  subject: TreatmentOriginSubject,
  options: {
    patientsById?: Map<string, TreatmentOriginPatientLookup>
    clinicsById?: Map<string, TreatmentOriginClinicLookup>
  } = {},
): TreatmentOrigin {
  const patientClinicId = subject.patientId ? options.patientsById?.get(subject.patientId)?.clinicId : undefined
  const originFromPatientClinic = inferTreatmentOriginFromClinic(patientClinicId, options.clinicsById)
  if (originFromPatientClinic) return originFromPatientClinic

  const originFromCaseClinic = inferTreatmentOriginFromClinic(subject.clinicId, options.clinicsById)
  if (originFromCaseClinic) return originFromCaseClinic

  return subject.treatmentOrigin === 'interno' ? 'interno' : 'externo'
}

export function treatmentOriginLabel(origin: TreatmentOrigin) {
  return origin === 'interno' ? 'Interno' : 'Externo'
}
