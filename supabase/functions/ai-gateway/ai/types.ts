export type AiFeature =
  | 'clinica.resumo'
  | 'clinica.plano'
  | 'clinica.evolucao'
  | 'lab.auditoria_solicitacao'
  | 'lab.previsao_entrega'
  | 'gestao.insights_dre'
  | 'gestao.anomalias'
  | 'comercial.script'
  | 'comercial.resumo_leigo'
  | 'comercial.followup'

export type AiModule = 'clinica' | 'lab' | 'gestao' | 'comercial'

export type AiPromptInput = {
  feature: AiFeature
  userRole: string
  clinicId: string
  text: string
  metadata?: Record<string, unknown>
}

export type AiProviderRequest = {
  feature: AiFeature
  prompt: string
}

export type AiProviderResponse = {
  text: string
  model?: string
  tokensIn?: number
  tokensOut?: number
}

export type AiLimits = {
  userPerMinute: number
  clinicPerMinute: number
  dailyCostLimit: number
}

export type AiFeatureFlags = {
  aiEnabled: boolean
  clinicaEnabled: boolean
  labEnabled: boolean
  gestaoEnabled: boolean
  comercialEnabled: boolean
  limitsJson: Record<string, unknown>
}
