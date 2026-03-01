const CPF_REGEX = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g
const PHONE_REGEX = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9?\d{4})-?\d{4}\b/g
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi

export function redactText(input: string) {
  return input
    .replace(PHONE_REGEX, '[TELEFONE]')
    .replace(CPF_REGEX, '[CPF]')
    .replace(EMAIL_REGEX, '[EMAIL]')
}

export function redactObject(value: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [key, current] of Object.entries(value)) {
    const lowered = key.toLowerCase()
    if (typeof current === 'string') {
      if (['cpf', 'documento', 'phone', 'telefone', 'whatsapp', 'email', 'nome', 'name'].includes(lowered)) {
        out[key] = '[REDACTED]'
      } else {
        out[key] = redactText(current)
      }
      continue
    }
    if (Array.isArray(current)) {
      out[key] = current.map((item) => (typeof item === 'string' ? redactText(item) : item))
      continue
    }
    out[key] = current
  }
  return out
}
