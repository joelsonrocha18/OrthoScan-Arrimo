import { getSupabaseAccessToken } from '../lib/auth'
import { supabase } from '../lib/supabaseClient'
import type { AiEndpoint, AiRequestPayload } from '../ai/types'
import { validateAiPayload } from '../ai/validation'
import { DATA_MODE } from '../data/dataMode'
import { loadSystemSettings } from '../lib/systemSettings'

async function readFunctionErrorMessage(error: unknown) {
  const fallback = (error as { message?: string } | null)?.message ?? 'Falha ao processar IA.'
  const response = (error as { context?: { text?: () => Promise<string> } } | null)?.context
  if (!response?.text) return fallback
  try {
    const body = await response.text()
    if (!body) return fallback
    try {
      const parsed = JSON.parse(body) as { error?: string }
      return parsed.error ?? fallback
    } catch {
      return body
    }
  } catch {
    return fallback
  }
}

export async function runAiEndpoint(endpoint: AiEndpoint, payload: AiRequestPayload) {
  const settings = loadSystemSettings().aiGateway
  if (!settings.enabled) return { ok: false as const, error: 'IA desativada nas configuracoes.' }
  const module = resolveModule(endpoint)
  if (!settings.modules[module]) {
    return { ok: false as const, error: `IA desativada para o módulo ${module}.` }
  }

  if (!supabase && DATA_MODE === 'local') {
    return {
      ok: true as const,
      output: buildLocalMockOutput(endpoint, payload, settings.provider, settings.model),
      jobId: `local_${Date.now()}`,
      tokensIn: Math.max(1, Math.ceil(payload.inputText.length / 4)),
      tokensOut: 180,
      costEstimated: 0,
    }
  }
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const validation = validateAiPayload(payload)
  if (validation) return { ok: false as const, error: validation }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) return { ok: false as const, error: sessionError.message }
  const accessToken = sessionData.session?.access_token ?? getSupabaseAccessToken()
  if (!accessToken) return { ok: false as const, error: 'Sessao expirada. Faça login novamente.' }
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!anonKey) return { ok: false as const, error: 'Supabase anon key ausente no build.' }

  const { data, error } = await supabase.functions.invoke(`ai-gateway${endpoint}`, {
    body: payload,
    headers: {
      Authorization: `Bearer ${anonKey}`,
      'x-user-jwt': accessToken,
    },
  })
  if (error) {
    const message = await readFunctionErrorMessage(error)
    return { ok: false as const, error: message }
  }
  if (!data?.ok) {
    return { ok: false as const, error: (data?.error as string | undefined) ?? 'Falha ao executar IA.' }
  }
  return {
    ok: true as const,
    output: (data.output as string | undefined) ?? '',
    jobId: (data.jobId as string | undefined) ?? undefined,
    tokensIn: (data.tokens?.in as number | undefined) ?? 0,
    tokensOut: (data.tokens?.out as number | undefined) ?? 0,
    costEstimated: (data.costEstimated as number | undefined) ?? 0,
  }
}

function buildLocalMockOutput(endpoint: AiEndpoint, payload: AiRequestPayload, provider: string, model: string) {
  const titleByEndpoint: Record<AiEndpoint, string> = {
    '/clinica/resumo': 'Resumo clínico (mock local)',
    '/clinica/plano': 'Plano clínico (mock local)',
    '/clinica/evolucao': 'Evolução clínica (mock local)',
    '/lab/auditoria-solicitacao': 'Auditoria de solicitação LAB (mock local)',
    '/lab/previsao-entrega': 'Previsão de entrega LAB (mock local)',
    '/gestao/insights-dre': 'Insights DRE (mock local)',
    '/gestao/anomalias': 'Anomalias de gestão (mock local)',
    '/comercial/script': 'Script comercial WhatsApp (mock local)',
    '/comercial/resumo-leigo': 'Resumo leigo (mock local)',
    '/comercial/followup': 'Mensagem de follow-up (mock local)',
  }

  const sample = payload.inputText.slice(0, 260).replace(/\s+/g, ' ').trim()
  return [
    titleByEndpoint[endpoint],
    '',
    `Este é um retorno de desenvolvimento local sem provider remoto. Provider: ${provider} | Model: ${model}`,
    '',
    'Rascunho sugerido:',
    `- Contexto: ${sample || 'n/a'}`,
    '- Ajuste texto conforme o caso real.',
    '- Confirme manualmente antes de salvar/enviar.',
  ].join('\n')
}

function resolveModule(endpoint: AiEndpoint): 'clinica' | 'lab' | 'gestao' | 'comercial' {
  if (endpoint.startsWith('/clinica/')) return 'clinica'
  if (endpoint.startsWith('/lab/')) return 'lab'
  if (endpoint.startsWith('/gestao/')) return 'gestao'
  return 'comercial'
}
