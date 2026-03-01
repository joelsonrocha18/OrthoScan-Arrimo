const CPF_REGEX = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g
const PHONE_REGEX = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9?\d{4})-?\d{4}\b/g
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const NAME_HINT_REGEX = /\b(nome|paciente|responsavel)\s*:\s*([^\n,;]+)/gi

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 11) return '[CPF]'
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 8) return '[TELEFONE]'
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`
}

function maskName(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return '[NOME]'
  const first = trimmed.slice(0, 1).toUpperCase()
  return `${first}${'*'.repeat(Math.max(2, trimmed.length - 1))}`
}

export function redactText(input: string) {
  let text = input
  text = text.replace(CPF_REGEX, (value) => maskCpf(value))
  text = text.replace(PHONE_REGEX, (value) => maskPhone(value))
  text = text.replace(EMAIL_REGEX, '[EMAIL]')
  text = text.replace(NAME_HINT_REGEX, (_match, label, rawName) => `${label}: ${maskName(String(rawName ?? ''))}`)
  return text
}

export function redactUnknown(value: unknown): unknown {
  if (typeof value === 'string') return redactText(value)
  if (Array.isArray(value)) return value.map((item) => redactUnknown(item))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, current] of Object.entries(value as Record<string, unknown>)) {
      const lowered = key.toLowerCase()
      if (['cpf', 'documento', 'phone', 'telefone', 'whatsapp', 'email', 'nome', 'name'].includes(lowered)) {
        out[key] = typeof current === 'string' ? redactText(current) : '[REDACTED]'
      } else {
        out[key] = redactUnknown(current)
      }
    }
    return out
  }
  return value
}
