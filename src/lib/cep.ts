export function normalizeCep(value: string) {
  return value.replace(/\D/g, '').slice(0, 8)
}

export function isValidCep(value: string) {
  return normalizeCep(value).length === 8
}

export async function fetchCep(cep: string) {
  const normalized = normalizeCep(cep)
  if (!isValidCep(normalized)) {
    throw new Error('CEP invalido.')
  }

  const response = await fetch(`https://viacep.com.br/ws/${normalized}/json/`)
  if (!response.ok) {
    throw new Error('Nao foi possivel consultar o CEP.')
  }

  const data = (await response.json()) as {
    erro?: boolean
    logradouro?: string
    bairro?: string
    localidade?: string
    uf?: string
  }

  if (data.erro) {
    throw new Error('CEP nao encontrado.')
  }

  return {
    street: data.logradouro ?? '',
    district: data.bairro ?? '',
    city: data.localidade ?? '',
    state: data.uf ?? '',
  }
}
