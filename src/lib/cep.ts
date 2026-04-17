import { createExternalServiceError, createNotFoundError, createValidationError } from '../shared/errors'
import { onlyDigits } from '../shared/validators'

export function normalizeCep(value: string) {
  return onlyDigits(value).slice(0, 8)
}

export function isValidCep(value: string) {
  return normalizeCep(value).length === 8
}

export async function fetchCep(cep: string) {
  const normalized = normalizeCep(cep)
  if (!isValidCep(normalized)) {
    throw createValidationError('CEP inválido.')
  }

  const response = await fetch(`https://viacep.com.br/ws/${normalized}/json/`)
  if (!response.ok) {
    throw createExternalServiceError('Não foi possível consultar o CEP.', undefined, { cep: normalized })
  }

  const data = (await response.json()) as {
    erro?: boolean
    logradouro?: string
    bairro?: string
    localidade?: string
    uf?: string
  }

  if (data.erro) {
    throw createNotFoundError('CEP não encontrado.', { cep: normalized })
  }

  return {
    street: data.logradouro ?? '',
    district: data.bairro ?? '',
    city: data.localidade ?? '',
    state: data.uf ?? '',
  }
}
