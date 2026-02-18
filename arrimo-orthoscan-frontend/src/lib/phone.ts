export function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function formatFixedPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 10)
  const ddd = digits.slice(0, 2)
  const part1 = digits.slice(2, 6)
  const part2 = digits.slice(6, 10)
  if (!ddd) return ''
  if (!part1) return `(${ddd})`
  if (!part2) return `(${ddd}) ${part1}`
  return `(${ddd}) ${part1}-${part2}`
}

export function formatMobilePhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11)
  const ddd = digits.slice(0, 2)
  const part1 = digits.slice(2, 7)
  const part2 = digits.slice(7, 11)
  if (!ddd) return ''
  if (!part1) return `(${ddd})`
  if (!part2) return `(${ddd}) ${part1}`
  return `(${ddd}) ${part1}-${part2}`
}

export function isValidFixedPhone(value: string) {
  const digits = onlyDigits(value)
  if (digits.length !== 10) return false
  const firstLocalDigit = Number(digits[2] ?? '0')
  return firstLocalDigit >= 2 && firstLocalDigit <= 5
}

export function isValidMobilePhone(value: string) {
  const digits = onlyDigits(value)
  return digits.length === 11 && digits[2] === '9'
}
