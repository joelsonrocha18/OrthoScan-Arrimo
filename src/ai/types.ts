export type AiEndpoint =
  | '/clinica/resumo'
  | '/clinica/plano'
  | '/clinica/evolucao'
  | '/lab/auditoria-solicitacao'
  | '/lab/previsao-entrega'
  | '/gestao/insights-dre'
  | '/gestao/anomalias'
  | '/comercial/script'
  | '/comercial/resumo-leigo'
  | '/comercial/followup'

export type AiRequestPayload = {
  clinicId?: string
  inputText: string
  metadata?: Record<string, unknown>
}
