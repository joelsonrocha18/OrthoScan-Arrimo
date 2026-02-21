import { isValidMobilePhone, onlyDigits } from './phone'

export function normalizeWhatsapp(value: string) {
  return onlyDigits(value)
}

export function isValidWhatsapp(value: string) {
  return isValidMobilePhone(value)
}

export function buildWhatsappUrl(value: string) {
  if (!isValidWhatsapp(value)) return ''
  return `https://wa.me/55${normalizeWhatsapp(value)}`
}
