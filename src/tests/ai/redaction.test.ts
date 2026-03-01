import { describe, expect, it } from 'vitest'
import { redactObject, redactText } from '../../ai/redaction'

describe('ai redaction', () => {
  it('masks cpf, phone and email in free text', () => {
    const input = 'CPF 123.456.789-09 telefone 11988887777 email paciente@teste.com'
    const output = redactText(input)
    expect(output).not.toContain('123.456.789-09')
    expect(output).not.toContain('11988887777')
    expect(output).not.toContain('paciente@teste.com')
    expect(output).toContain('[CPF]')
    expect(output).toContain('[TELEFONE]')
    expect(output).toContain('[EMAIL]')
  })

  it('redacts sensitive object fields', () => {
    const output = redactObject({ name: 'Maria', cpf: '12345678909', email: 'maria@teste.com', notes: 'sem restricoes' })
    expect(output.name).toBe('[REDACTED]')
    expect(output.cpf).toBe('[REDACTED]')
    expect(output.email).toBe('[REDACTED]')
    expect(output.notes).toBe('sem restricoes')
  })
})
