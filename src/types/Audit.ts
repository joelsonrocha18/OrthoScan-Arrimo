export type AuditLog = {
  id: string
  at: string
  entity: 'case' | 'lab' | 'scan' | 'patient'
  entityId: string
  action: string
  userId?: string
  userName?: string
  userEmail?: string
  message?: string
}
