function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14)
  const part1 = digits.slice(0, 2)
  const part2 = digits.slice(2, 5)
  const part3 = digits.slice(5, 8)
  const part4 = digits.slice(8, 12)
  const part5 = digits.slice(12, 14)

  let formatted = part1
  if (part2) formatted += `.${part2}`
  if (part3) formatted += `.${part3}`
  if (part4) formatted += `/${part4}`
  if (part5) formatted += `-${part5}`
  return formatted
}

export function isValidCnpj(value: string) {
  const digits = onlyDigits(value)
  if (digits.length !== 14) return false
  if (/^(\d)\1+$/.test(digits)) return false

  const numbers = digits.split('').map((d) => Number(d))
  const calcCheck = (length: number) => {
    let sum = 0
    let weight = length - 7
    for (let i = 0; i < length; i += 1) {
      sum += numbers[i] * weight
      weight = weight === 2 ? 9 : weight - 1
    }
    const mod = sum % 11
    return mod < 2 ? 0 : 11 - mod
  }

  const digit1 = calcCheck(12)
  const digit2 = calcCheck(13)
  return digit1 === numbers[12] && digit2 === numbers[13]
}
