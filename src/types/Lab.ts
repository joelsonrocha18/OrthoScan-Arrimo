export type LabStatus = 'aguardando_iniciar' | 'em_producao' | 'controle_qualidade' | 'prontas'

export type LabPriority = 'Baixo' | 'Medio' | 'Urgente'

export type LabItem = {
  id: string
  requestCode?: string
  requestKind?: 'producao' | 'reconfeccao' | 'reposicao_programada'
  expectedReplacementDate?: string
  caseId?: string
  arch: 'superior' | 'inferior' | 'ambos'
  plannedUpperQty?: number
  plannedLowerQty?: number
  planningDefinedAt?: string
  trayNumber: number
  patientName: string
  plannedDate: string
  dueDate: string
  status: LabStatus
  priority: LabPriority
  notes?: string
  createdAt: string
  updatedAt: string
}
