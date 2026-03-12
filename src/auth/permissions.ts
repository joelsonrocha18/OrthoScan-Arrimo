import type { Role, User } from '../types/User'

export type Permission =
  | 'dashboard.read'
  | 'users.read'
  | 'users.write'
  | 'users.delete'
  | 'dentists.read'
  | 'dentists.write'
  | 'dentists.delete'
  | 'clinics.read'
  | 'clinics.write'
  | 'clinics.delete'
  | 'patients.read'
  | 'patients.write'
  | 'patients.delete'
  | 'scans.read'
  | 'scans.write'
  | 'scans.approve'
  | 'scans.delete'
  | 'cases.read'
  | 'cases.write'
  | 'cases.delete'
  | 'lab.read'
  | 'lab.write'
  | 'docs.read'
  | 'docs.write'
  | 'settings.read'
  | 'settings.write'
  | 'ai.clinica'
  | 'ai.lab'
  | 'ai.gestao'
  | 'ai.comercial'

export type PermissionModule =
  | 'Dashboard'
  | 'Pacientes'
  | 'Scans'
  | 'Alinhadores'
  | 'Laboratório'
  | 'Usuarios'
  | 'Configurações'
  | 'Documentos'
  | 'Dentistas'
  | 'Clínicas'
  | 'IA'

const allPermissions: Permission[] = [
  'dashboard.read',
  'users.read',
  'users.write',
  'users.delete',
  'dentists.read',
  'dentists.write',
  'dentists.delete',
  'clinics.read',
  'clinics.write',
  'clinics.delete',
  'patients.read',
  'patients.write',
  'patients.delete',
  'scans.read',
  'scans.write',
  'scans.approve',
  'scans.delete',
  'cases.read',
  'cases.write',
  'cases.delete',
  'lab.read',
  'lab.write',
  'docs.read',
  'docs.write',
  'settings.read',
  'settings.write',
  'ai.clinica',
  'ai.lab',
  'ai.gestao',
  'ai.comercial',
]

const rolePermissions: Record<Role, Permission[]> = {
  master_admin: allPermissions,
  dentist_admin: allPermissions.filter(
    (perm) =>
      (!perm.endsWith('.delete') || perm === 'users.delete' || perm === 'patients.delete') &&
      perm !== 'dentists.delete' &&
      perm !== 'clinics.delete',
  ),
  dentist_client: ['dashboard.read', 'patients.read', 'patients.write', 'scans.read', 'cases.read', 'docs.read', 'ai.clinica'],
  clinic_client: ['dashboard.read', 'patients.read', 'patients.write', 'scans.read', 'cases.read', 'docs.read', 'ai.clinica', 'ai.comercial'],
  lab_tech: ['lab.read', 'cases.read', 'scans.read', 'ai.lab'],
  receptionist: ['dashboard.read', 'patients.read', 'patients.write', 'scans.read', 'scans.write', 'cases.read', 'lab.read', 'ai.clinica', 'ai.comercial'],
}

const profileLabels: Record<Role, string> = {
  master_admin: 'Master Admin',
  dentist_admin: 'Dentista Admin',
  dentist_client: 'Dentista Cliente',
  clinic_client: 'Clínica Cliente',
  lab_tech: 'Tecnico de Laboratório',
  receptionist: 'Recepcao',
}

const profileDescriptions: Record<Role, string> = {
  master_admin: 'Acesso total ao sistema e configuracoes avancadas.',
  dentist_admin: 'Gestao operacional da clinica com permissoes administrativas.',
  dentist_client: 'Perfil externo: visualiza e cadastra pacientes vinculados ao dentista.',
  clinic_client: 'Perfil externo: visualiza e cadastra pacientes vinculados a clinica.',
  lab_tech: 'Execucao e acompanhamento do fluxo de laboratorio.',
  receptionist: 'Suporte de cadastro e atendimento operacional.',
}

const permissionLabels: Record<Permission, string> = {
  'dashboard.read': 'Visualizar dashboard',
  'users.read': 'Visualizar usuarios',
  'users.write': 'Cadastrar/editar usuarios',
  'users.delete': 'Excluir usuarios',
  'dentists.read': 'Visualizar dentistas',
  'dentists.write': 'Cadastrar/editar dentistas',
  'dentists.delete': 'Excluir dentistas',
  'clinics.read': 'Visualizar clinicas',
  'clinics.write': 'Cadastrar/editar clinicas',
  'clinics.delete': 'Excluir clinicas',
  'patients.read': 'Visualizar pacientes',
  'patients.write': 'Cadastrar/editar pacientes',
  'patients.delete': 'Excluir pacientes',
  'scans.read': 'Visualizar escaneamentos',
  'scans.write': 'Enviar escaneamentos',
  'scans.approve': 'Aprovar escaneamentos',
  'scans.delete': 'Excluir escaneamentos',
  'cases.read': 'Visualizar alinhadores',
  'cases.write': 'Criar/editar alinhadores',
  'cases.delete': 'Excluir alinhadores',
  'lab.read': 'Visualizar laboratorio',
  'lab.write': 'Gerenciar laboratorio',
  'docs.read': 'Visualizar documentos',
  'docs.write': 'Gerenciar documentos',
  'settings.read': 'Visualizar configuracoes',
  'settings.write': 'Gerenciar configuracoes',
  'ai.clinica': 'IA clinica',
  'ai.lab': 'IA laboratorio',
  'ai.gestao': 'IA gestao',
  'ai.comercial': 'IA comercial',
}

const permissionModules: Record<Permission, PermissionModule> = {
  'dashboard.read': 'Dashboard',
  'users.read': 'Usuarios',
  'users.write': 'Usuarios',
  'users.delete': 'Usuarios',
  'dentists.read': 'Dentistas',
  'dentists.write': 'Dentistas',
  'dentists.delete': 'Dentistas',
  'clinics.read': 'Clínicas',
  'clinics.write': 'Clínicas',
  'clinics.delete': 'Clínicas',
  'patients.read': 'Pacientes',
  'patients.write': 'Pacientes',
  'patients.delete': 'Pacientes',
  'scans.read': 'Scans',
  'scans.write': 'Scans',
  'scans.approve': 'Scans',
  'scans.delete': 'Scans',
  'cases.read': 'Alinhadores',
  'cases.write': 'Alinhadores',
  'cases.delete': 'Alinhadores',
  'lab.read': 'Laboratório',
  'lab.write': 'Laboratório',
  'docs.read': 'Documentos',
  'docs.write': 'Documentos',
  'settings.read': 'Configurações',
  'settings.write': 'Configurações',
  'ai.clinica': 'IA',
  'ai.lab': 'IA',
  'ai.gestao': 'IA',
  'ai.comercial': 'IA',
}

export function can(user: User | null | undefined, permission: Permission) {
  if (!user) return false
  if (user.role === 'master_admin') return true
  return rolePermissions[user.role]?.includes(permission) ?? false
}

export function permissionsForRole(role: Role) {
  return rolePermissions[role] ?? []
}

export function profileLabel(role: Role) {
  return profileLabels[role] ?? role
}

export function profileDescription(role: Role) {
  return profileDescriptions[role] ?? ''
}

export function permissionLabel(permission: Permission) {
  return permissionLabels[permission] ?? permission
}

export function permissionModule(permission: Permission) {
  return permissionModules[permission] ?? 'Configurações'
}

export function groupedPermissionsForRole(role: Role) {
  return permissionsForRole(role).reduce<Record<PermissionModule, Permission[]>>((acc, permission) => {
    const module = permissionModule(permission)
    const current = acc[module] ?? []
    acc[module] = [...current, permission]
    return acc
  }, {} as Record<PermissionModule, Permission[]>)
}

