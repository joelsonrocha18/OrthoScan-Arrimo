export type AuditLog = {
  id: string
  at: string
  entity: 'case' | 'lab' | 'scan' | 'patient' | 'document' | 'auth'
  entityId: string
  action: string
  userId?: string
  userName?: string
  userEmail?: string
  userRole?: string
  message?: string
  context?: Record<string, unknown>
}
