export type ReplacementBankStatus = 'disponivel' | 'em_producao' | 'entregue' | 'rework' | 'defeituosa'

export type ReplacementBankArch = 'superior' | 'inferior'

export type ReplacementBankEntry = {
  id: string
  caseId: string
  arcada: ReplacementBankArch
  placaNumero: number
  status: ReplacementBankStatus
  sourceLabItemId?: string
  deliveredAt?: string
  createdAt: string
  updatedAt: string
}
