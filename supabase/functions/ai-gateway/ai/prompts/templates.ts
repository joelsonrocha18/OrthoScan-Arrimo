import type { AiPromptInput } from '../types.ts'

const BASE_RULES = [
  'Responda em portugues do Brasil.',
  'Nao invente dados clinicos, financeiros ou operacionais nao presentes no contexto.',
  'Estruture em secoes curtas e objetivas.',
  'Nao inclua dados pessoais sensiveis na resposta final.',
]

const INSTRUCTION_BY_FEATURE: Record<AiPromptInput['feature'], string> = {
  'clinica.resumo': 'Gere um resumo clinico objetivo para prontuario.',
  'clinica.plano': 'Gere um plano de tratamento sugerido com proximos passos.',
  'clinica.evolucao': 'Gere uma evolucao clinica em formato cronologico.',
  'lab.auditoria_solicitacao': 'Audite a solicitacao de laboratorio e liste riscos/inconsistencias.',
  'lab.previsao_entrega': 'Estime previsao de entrega e justificativas operacionais.',
  'gestao.insights_dre': 'Gere insights de DRE com foco em margem, custos e eficiencia.',
  'gestao.anomalias': 'Aponte anomalias operacionais/financeiras com nivel de severidade.',
  'comercial.script': 'Crie um script comercial para WhatsApp com tom consultivo.',
  'comercial.resumo_leigo': 'Explique o caso em linguagem leiga para o paciente.',
  'comercial.followup': 'Crie mensagem de follow-up para reativar conversao.',
}

export function buildPrompt(input: AiPromptInput) {
  const rules = BASE_RULES.map((item) => `- ${item}`).join('\n')
  const metadataBlock = input.metadata ? JSON.stringify(input.metadata, null, 2) : '{}'
  return [
    'Voce e o OrthoScan AI Gateway.',
    '',
    'Regras:',
    rules,
    '',
    `Tarefa: ${INSTRUCTION_BY_FEATURE[input.feature]}`,
    `Perfil solicitante: ${input.userRole}`,
    `Clinica: ${input.clinicId}`,
    '',
    'Contexto (texto pseudonimizado):',
    input.text,
    '',
    'Metadados:',
    metadataBlock,
    '',
    'Resposta: entregue conteudo editavel e pragmático.',
  ].join('\n')
}
