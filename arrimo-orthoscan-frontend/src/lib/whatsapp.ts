export function normalizeWhatsapp(value: string) {
  return value.replace(/\D/g, '')
}

export function isValidWhatsapp(value: string) {
  const digits = normalizeWhatsapp(value)
  return digits.length === 10 || digits.length === 11
}

export function buildWhatsappUrl(value: string) {
  if (!isValidWhatsapp(value)) return ''
  return `https://wa.me/55${normalizeWhatsapp(value)}`
}
