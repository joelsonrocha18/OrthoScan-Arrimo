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

export type PermissionModule =
  | 'Dashboard'
  | 'Pacientes'
  | 'Scans'
  | 'Casos'
  | 'Laboratorio'
  | 'Usuarios'
  | 'Configuracoes'
  | 'Documentos'
  | 'Dentistas'
  | 'Clinicas'

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
]

const rolePermissions: Record<Role, Permission[]> = {
  master_admin: allPermissions,
  dentist_admin: allPermissions.filter(
    (perm) =>
      (!perm.endsWith('.delete') || perm === 'users.delete' || perm === 'patients.delete') &&
      perm !== 'dentists.delete' &&
      perm !== 'clinics.delete',
  ),
  dentist_client: ['dashboard.read', 'patients.read', 'patients.write', 'scans.read', 'cases.read', 'docs.read'],
  clinic_client: ['dashboard.read', 'patients.read', 'patients.write', 'scans.read', 'cases.read', 'docs.read'],
  lab_tech: ['lab.read', 'cases.read', 'scans.read'],
  receptionist: ['dashboard.read', 'patients.read', 'patients.write', 'scans.read', 'scans.write', 'cases.read', 'lab.read'],
}

const profileLabels: Record<Role, string> = {
  master_admin: 'Master Admin',
  dentist_admin: 'Dentista Admin',
  dentist_client: 'Dentista Cliente',
  clinic_client: 'Clinica Cliente',
  lab_tech: 'Tecnico de Laboratorio',
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
  'cases.read': 'Visualizar casos',
  'cases.write': 'Criar/editar casos',
  'cases.delete': 'Excluir casos',
  'lab.read': 'Visualizar laboratorio',
  'lab.write': 'Gerenciar laboratorio',
  'docs.read': 'Visualizar documentos',
  'docs.write': 'Gerenciar documentos',
  'settings.read': 'Visualizar configuracoes',
  'settings.write': 'Gerenciar configuracoes',
}

const permissionModules: Record<Permission, PermissionModule> = {
  'dashboard.read': 'Dashboard',
  'users.read': 'Usuarios',
  'users.write': 'Usuarios',
  'users.delete': 'Usuarios',
  'dentists.read': 'Dentistas',
  'dentists.write': 'Dentistas',
  'dentists.delete': 'Dentistas',
  'clinics.read': 'Clinicas',
  'clinics.write': 'Clinicas',
  'clinics.delete': 'Clinicas',
  'patients.read': 'Pacientes',
  'patients.write': 'Pacientes',
  'patients.delete': 'Pacientes',
  'scans.read': 'Scans',
  'scans.write': 'Scans',
  'scans.approve': 'Scans',
  'scans.delete': 'Scans',
  'cases.read': 'Casos',
  'cases.write': 'Casos',
  'cases.delete': 'Casos',
  'lab.read': 'Laboratorio',
  'lab.write': 'Laboratorio',
  'docs.read': 'Documentos',
  'docs.write': 'Documentos',
  'settings.read': 'Configuracoes',
  'settings.write': 'Configuracoes',
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
  return permissionModules[permission] ?? 'Configuracoes'
}

export function groupedPermissionsForRole(role: Role) {
  return permissionsForRole(role).reduce<Record<PermissionModule, Permission[]>>((acc, permission) => {
    const module = permissionModule(permission)
    const current = acc[module] ?? []
    acc[module] = [...current, permission]
    return acc
  }, {} as Record<PermissionModule, Permission[]>)
}
