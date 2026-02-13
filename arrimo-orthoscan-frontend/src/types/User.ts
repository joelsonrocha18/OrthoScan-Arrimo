export type Role =
  | 'master_admin'
  | 'dentist_admin'
  | 'dentist_client'
  | 'clinic_client'
  | 'lab_tech'
  | 'receptionist'

export type User = {
  id: string
  name: string
  email: string
  password?: string
  cpf?: string
  birthDate?: string
  phone?: string
  addressLine?: string
  role: Role
  isActive: boolean
  linkedDentistId?: string
  linkedClinicId?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}
