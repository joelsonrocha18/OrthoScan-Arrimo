import { describe, expect, it, vi } from 'vitest'
import { fetchCep, isValidCep, normalizeCep } from '../../lib/cep'

describe('Dentists and CEP helpers', () => {
  it('normalizes and validates CEP', () => {
    expect(normalizeCep('01.001-000')).toBe('01001000')
    expect(isValidCep('01001000')).toBe(true)
    expect(isValidCep('1234')).toBe(false)
  })

  it('fetches address from ViaCEP response', async () => {
    const mock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' }),
    } as Response)

    const data = await fetchCep('01001-000')
    expect(data).toEqual({
      street: 'Praça da Sé',
      district: 'Sé',
      city: 'São Paulo',
      state: 'SP',
    })
    expect(mock).toHaveBeenCalledWith('https://viacep.com.br/ws/01001000/json/')
  })
})
