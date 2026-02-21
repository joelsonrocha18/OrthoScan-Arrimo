import { describe, expect, it } from 'vitest'

function buildWaLink(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 10 && digits.length !== 11) return ''
  return `https://wa.me/55${digits}`
}

describe('Dentist WhatsApp link pattern', () => {
  it('builds wa.me link for valid phone and rejects invalid values', () => {
    expect(buildWaLink('(11) 99999-0000')).toBe('https://wa.me/5511999990000')
    expect(buildWaLink('119999')).toBe('')
  })
})
