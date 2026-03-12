export type DentistClinicAddress = {
  cep?: string
  street?: string
  number?: string
  complement?: string
  district?: string
  city?: string
  state?: string
}

export type DentistClinic = {
  id: string
  shortId?: string
  name: string
  firstName?: string
  lastName?: string
  type: 'dentista' | 'clinica'
  cnpj?: string
  cro?: string
  gender?: 'masculino' | 'feminino'
  cpf?: string
  birthDate?: string
  clinicId?: string
  phone?: string
  whatsapp?: string
  email?: string
  address?: DentistClinicAddress
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string
}
