import { createValidationError } from '../../../../shared/errors'
import { normalizeText, onlyDigits } from '../../../../shared/validators'
import { formatPtBrDate, isIsoDateString, toIsoDate } from '../../../../shared/utils/date'

type RawPreview = {
  patientId: string
  patientName: string
  cpf?: string
  birthDate: string
  clinicName?: string
  dentistName?: string
  activeCaseCode?: string
  treatmentStatus?: string
  nextChangeDate?: string
  patientEmail?: string
}

export function normalizeCpfInput(value: string) {
  return onlyDigits(value).slice(0, 11)
}

export function normalizePortalAccessCode(value: string) {
  return value.trim().toUpperCase()
}

export function formatCpf(value: string) {
  const digits = normalizeCpfInput(value)
  const part1 = digits.slice(0, 3)
  const part2 = digits.slice(3, 6)
  const part3 = digits.slice(6, 9)
  const part4 = digits.slice(9, 11)

  let formatted = part1
  if (part2) formatted += `.${part2}`
  if (part3) formatted += `.${part3}`
  if (part4) formatted += `-${part4}`
  return formatted
}

export function maskCpf(value?: string) {
  const digits = normalizeCpfInput(value ?? '')
  if (digits.length !== 11) return '***.***.***-**'
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`
}

export function maskEmail(value?: string) {
  const email = value?.trim().toLowerCase() ?? ''
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return ''
  const head = localPart.slice(0, 1)
  const hidden = '*'.repeat(Math.max(2, Math.min(6, localPart.length - 1)))
  return `${head}${hidden}@${domain}`
}

export function validatePatientIdentityInput(input: { cpf: string; birthDate: string }) {
  const cpf = normalizeCpfInput(input.cpf)
  if (cpf.length !== 11) {
    throw createValidationError('Informe um CPF válido com 11 dígitos.')
  }

  const birthDate = input.birthDate?.trim() ?? ''
  if (!birthDate) {
    throw createValidationError('Informe a data de nascimento.')
  }

  if (!isIsoDateString(birthDate)) {
    throw createValidationError('Informe uma data de nascimento valida.')
  }

  return {
    cpf,
    birthDate: toIsoDate(birthDate),
  }
}

export function validatePatientPortalAccessInput(input: { cpf: string; birthDate: string; accessCode: string }) {
  const base = validatePatientIdentityInput(input)
  const accessCode = normalizePortalAccessCode(input.accessCode ?? '')
  if (accessCode.length < 4) {
    throw createValidationError('Informe o código do tratamento disponibilizado pela clínica.')
  }
  return {
    ...base,
    accessCode,
  }
}

export function validatePatientPortalPhotoInput(input: {
  trayNumber: number
  capturedAt: string
  sentAt?: string
  deviceLabel?: string
  note?: string
  file?: File | null
}) {
  const trayNumber = Math.max(1, Math.trunc(Number(input.trayNumber)))
  if (!Number.isFinite(trayNumber)) {
    throw createValidationError('Informe o número do alinhador para vincular a foto.')
  }

  const capturedAt = input.capturedAt?.trim() ?? ''
  if (!capturedAt || !isIsoDateString(capturedAt)) {
    throw createValidationError('Informe uma data válida para a foto do alinhador.')
  }

  if (!input.file) {
    throw createValidationError('Selecione uma foto do tratamento antes de enviar.')
  }

  return {
    trayNumber,
    capturedAt: toIsoDate(capturedAt),
    sentAt:
      input.sentAt?.trim()
        ? input.sentAt.trim()
        : undefined,
    deviceLabel: normalizeText(input.deviceLabel),
    note: normalizeText(input.note),
    file: input.file,
  }
}

export function buildPatientAccessPreview(raw: RawPreview) {
  const nextChangeDate = raw.nextChangeDate ? formatPtBrDate(raw.nextChangeDate) : undefined
  const destinationHint = maskEmail(raw.patientEmail)

  return {
    patientId: raw.patientId,
    patientName: raw.patientName,
    cpfMasked: maskCpf(raw.cpf),
    birthDate: formatPtBrDate(raw.birthDate),
    clinicName: raw.clinicName,
    dentistName: raw.dentistName,
    activeCaseCode: raw.activeCaseCode,
    treatmentStatus: raw.treatmentStatus,
    nextChangeDate,
    magicLinkEnabled: Boolean(destinationHint),
    destinationHint: destinationHint || undefined,
  }
}
