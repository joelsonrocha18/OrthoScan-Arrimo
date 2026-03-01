import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveProvider } from './ai/providers/index.ts'
import { buildPrompt } from './ai/prompts/templates.ts'
import { redactText, redactUnknown } from './ai/redaction/mask.ts'
import { estimateUsage, readNumberLimit } from './ai/usage/cost.ts'
import { createAiJob, updateAiJobStatus } from './ai/jobs/repo.ts'
import type { AiFeature, AiFeatureFlags, AiLimits, AiModule } from './ai/types.ts'

type EndpointConfig = {
  feature: AiFeature
  module: AiModule
  roles: string[]
}

const ENDPOINTS: Record<string, EndpointConfig> = {
  '/clinica/resumo': { feature: 'clinica.resumo', module: 'clinica', roles: ['master_admin', 'dentist_admin', 'dentist_client', 'clinic_client', 'receptionist'] },
  '/clinica/plano': { feature: 'clinica.plano', module: 'clinica', roles: ['master_admin', 'dentist_admin', 'dentist_client', 'clinic_client'] },
  '/clinica/evolucao': { feature: 'clinica.evolucao', module: 'clinica', roles: ['master_admin', 'dentist_admin', 'dentist_client', 'clinic_client'] },
  '/lab/auditoria-solicitacao': { feature: 'lab.auditoria_solicitacao', module: 'lab', roles: ['master_admin', 'dentist_admin', 'lab_tech'] },
  '/lab/previsao-entrega': { feature: 'lab.previsao_entrega', module: 'lab', roles: ['master_admin', 'dentist_admin', 'lab_tech'] },
  '/gestao/insights-dre': { feature: 'gestao.insights_dre', module: 'gestao', roles: ['master_admin', 'dentist_admin'] },
  '/gestao/anomalias': { feature: 'gestao.anomalias', module: 'gestao', roles: ['master_admin', 'dentist_admin'] },
  '/comercial/script': { feature: 'comercial.script', module: 'comercial', roles: ['master_admin', 'dentist_admin', 'receptionist', 'clinic_client'] },
  '/comercial/resumo-leigo': { feature: 'comercial.resumo_leigo', module: 'comercial', roles: ['master_admin', 'dentist_admin', 'receptionist', 'clinic_client'] },
  '/comercial/followup': { feature: 'comercial.followup', module: 'comercial', roles: ['master_admin', 'dentist_admin', 'receptionist', 'clinic_client'] },
}

function resolveAllowedOrigin(_req: Request) {
  const configured = (Deno.env.get('ALLOWED_ORIGIN') ?? '').trim()
  if (configured) return configured
  const siteUrl = (Deno.env.get('SITE_URL') ?? '').trim()
  if (!siteUrl) return 'null'
  try {
    return new URL(siteUrl).origin
  } catch {
    return 'null'
  }
}

function corsHeaders(req: Request) {
  const allowedOrigin = resolveAllowedOrigin(req)
  const requestOrigin = req.headers.get('origin') ?? ''
  const origin = requestOrigin && requestOrigin === allowedOrigin ? requestOrigin : allowedOrigin
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-user-jwt, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function endpointFromRequest(req: Request) {
  const url = new URL(req.url)
  let path = url.pathname
  const idx = path.indexOf('/ai-gateway')
  if (idx >= 0) path = path.slice(idx + '/ai-gateway'.length)
  if (!path.startsWith('/')) path = `/${path}`
  return path.replace(/\/+$/, '')
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback
  const lowered = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(lowered)) return true
  if (['0', 'false', 'no', 'off'].includes(lowered)) return false
  return fallback
}

function toPublicErrorMessage(message: string) {
  const lower = message.toLowerCase()
  if (message.includes('Provider HTTP error: 429') || lower.includes('quota exceeded') || lower.includes('resource_exhausted')) {
    return 'Cota da IA Gemini excedida (429). Revise plano/faturamento da chave API ou aguarde o reset de cota.'
  }
  if (message.includes('Provider HTTP error: 401') || lower.includes('invalid api key') || lower.includes('api key not valid')) {
    return 'Chave da IA invalida ou sem permissao (401). Atualize a AI_API_KEY.'
  }
  if (message.includes('Provider HTTP error: 403')) {
    return 'Acesso negado pelo provider (403). Verifique permissoes da chave/modelo.'
  }
  if (message.length > 280) return `${message.slice(0, 280)}...`
  return message
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (current) => current.toString(16).padStart(2, '0')).join('')
}

function assertNoRawBinary(payload: Record<string, unknown>) {
  const text = JSON.stringify(payload).toLowerCase()
  if (text.includes('data:application/pdf;base64') || text.includes('data:image/')) {
    throw new Error('Envio de PDF/imagem bruta nao permitido. Envie apenas texto e metadados.')
  }
}

function parseBody(raw: unknown) {
  const value = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const inputText = typeof value.inputText === 'string' ? value.inputText.trim() : ''
  if (!inputText) throw new Error('inputText obrigatorio.')
  if (inputText.length > 8000) throw new Error('inputText excede limite de 8000 caracteres.')
  const metadata = value.metadata && typeof value.metadata === 'object' ? (value.metadata as Record<string, unknown>) : {}
  assertNoRawBinary({ inputText, metadata })
  const clinicId = typeof value.clinicId === 'string' ? value.clinicId.trim() : ''
  return { inputText, metadata, clinicId }
}

function parseLimits(flags: AiFeatureFlags): AiLimits {
  const json = flags.limitsJson ?? {}
  return {
    userPerMinute: readNumberLimit(json.userPerMinute, readNumberLimit(Number(Deno.env.get('AI_RATE_LIMIT_USER') ?? 20), 20)),
    clinicPerMinute: readNumberLimit(json.clinicPerMinute, readNumberLimit(Number(Deno.env.get('AI_RATE_LIMIT_CLINIC') ?? 120), 120)),
    dailyCostLimit: readNumberLimit(json.dailyCostLimit, readNumberLimit(Number(Deno.env.get('AI_DAILY_QUOTA_COST') ?? 10), 10)),
  }
}

function isModuleEnabled(flags: AiFeatureFlags, module: AiModule) {
  if (!flags.aiEnabled) return false
  if (module === 'clinica') return flags.clinicaEnabled
  if (module === 'lab') return flags.labEnabled
  if (module === 'gestao') return flags.gestaoEnabled
  return flags.comercialEnabled
}

async function readFeatureFlags(supabase: ReturnType<typeof createClient>, clinicId: string) {
  const defaultEnabled = parseBoolean(Deno.env.get('AI_ENABLED_DEFAULT') ?? '', false)
  const { data, error } = await supabase
    .from('ai_feature_flags')
    .select('ai_enabled, clinica_enabled, lab_enabled, gestao_enabled, comercial_enabled, limits_json')
    .eq('clinic_id', clinicId)
    .maybeSingle()

  if (error) throw new Error(error.message ?? 'Falha ao carregar ai_feature_flags.')
  if (!data) {
    return {
      aiEnabled: defaultEnabled,
      clinicaEnabled: defaultEnabled,
      labEnabled: defaultEnabled,
      gestaoEnabled: defaultEnabled,
      comercialEnabled: defaultEnabled,
      limitsJson: {},
    } satisfies AiFeatureFlags
  }
  return {
    aiEnabled: Boolean(data.ai_enabled),
    clinicaEnabled: Boolean(data.clinica_enabled),
    labEnabled: Boolean(data.lab_enabled),
    gestaoEnabled: Boolean(data.gestao_enabled),
    comercialEnabled: Boolean(data.comercial_enabled),
    limitsJson: (data.limits_json as Record<string, unknown>) ?? {},
  } satisfies AiFeatureFlags
}

async function enforceRateLimits(
  supabase: ReturnType<typeof createClient>,
  params: { userId: string; clinicId: string; limits: AiLimits },
) {
  const minuteStart = new Date(Date.now() - 60_000).toISOString()

  const [userCountRes, clinicCountRes] = await Promise.all([
    supabase
      .from('ai_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', params.userId)
      .gte('created_at', minuteStart),
    supabase
      .from('ai_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', params.clinicId)
      .gte('created_at', minuteStart),
  ])

  const userCount = userCountRes.count ?? 0
  const clinicCount = clinicCountRes.count ?? 0
  if (userCount >= params.limits.userPerMinute || clinicCount >= params.limits.clinicPerMinute) {
    throw new Error('Rate limit de IA atingido. Tente novamente em instantes.')
  }
}

async function enforceDailyQuota(
  supabase: ReturnType<typeof createClient>,
  params: { clinicId: string; limits: AiLimits },
) {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('ai_usage')
    .select('cost_total')
    .eq('clinic_id', params.clinicId)
    .eq('day', today)
  if (error) throw new Error(error.message ?? 'Falha ao validar cota diaria.')
  const used = ((data ?? []) as Array<{ cost_total?: number | string }>).reduce((acc, item) => {
    const numeric = typeof item.cost_total === 'number' ? item.cost_total : Number(item.cost_total ?? 0)
    return acc + (Number.isFinite(numeric) ? numeric : 0)
  }, 0)
  if (used >= params.limits.dailyCostLimit) {
    throw new Error('Limite diario atingido')
  }
}

async function incrementUsage(
  supabase: ReturnType<typeof createClient>,
  payload: {
    clinicId: string
    userId: string
    feature: string
    tokens: number
    cost: number
  },
) {
  const day = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('ai_usage')
    .select('id, tokens_total, cost_total')
    .eq('clinic_id', payload.clinicId)
    .eq('user_id', payload.userId)
    .eq('feature', payload.feature)
    .eq('day', day)
    .maybeSingle()
  if (error) throw new Error(error.message ?? 'Falha ao ler ai_usage.')

  if (!data?.id) {
    const insertRes = await supabase
      .from('ai_usage')
      .insert({
        clinic_id: payload.clinicId,
        user_id: payload.userId,
        feature: payload.feature,
        day,
        tokens_total: payload.tokens,
        cost_total: payload.cost,
      })
    if (insertRes.error) throw new Error(insertRes.error.message ?? 'Falha ao criar ai_usage.')
    return
  }

  const nextTokens = Math.max(0, Math.trunc((data.tokens_total as number ?? 0) + payload.tokens))
  const nextCost = Number(((Number(data.cost_total ?? 0) + payload.cost)).toFixed(6))
  const updateRes = await supabase
    .from('ai_usage')
    .update({ tokens_total: nextTokens, cost_total: nextCost })
    .eq('id', String(data.id))
  if (updateRes.error) throw new Error(updateRes.error.message ?? 'Falha ao atualizar ai_usage.')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { ok: false, error: 'Method not allowed' }, 405)

  const endpointPath = endpointFromRequest(req)
  const endpoint = ENDPOINTS[endpointPath]
  if (!endpoint) return json(req, { ok: false, error: 'Endpoint de IA nao encontrado.' }, 404)

  const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').trim()
  const serviceRoleKey = (Deno.env.get('SERVICE_ROLE_KEY') ?? '').trim()
  if (!supabaseUrl || !serviceRoleKey) {
    return json(req, { ok: false, error: 'Missing SUPABASE_URL/SERVICE_ROLE_KEY.' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const userJwtRaw = req.headers.get('x-user-jwt') ?? ''
  const userJwt = userJwtRaw.replace(/^Bearer\s+/i, '').trim()
  if (!userJwt) return json(req, { ok: false, error: 'Unauthorized.' }, 401)

  const actorRes = await supabase.auth.getUser(userJwt)
  const actor = actorRes.data.user
  if (actorRes.error || !actor) return json(req, { ok: false, error: 'Unauthorized.' }, 401)

  const profileRes = await supabase
    .from('profiles')
    .select('role, clinic_id')
    .eq('user_id', actor.id)
    .maybeSingle()
  if (profileRes.error || !profileRes.data) return json(req, { ok: false, error: 'Perfil nao encontrado.' }, 403)

  const actorRole = String(profileRes.data.role ?? '')
  const actorClinicId = String(profileRes.data.clinic_id ?? '')
  if (!endpoint.roles.includes(actorRole)) return json(req, { ok: false, error: 'Forbidden.' }, 403)

  let jobId: string | null = null
  try {
    const body = parseBody(await req.json())
    const clinicId = body.clinicId || actorClinicId
    if (!clinicId) throw new Error('clinicId obrigatorio.')
    if (actorRole !== 'master_admin' && actorClinicId && clinicId !== actorClinicId) {
      return json(req, { ok: false, error: 'Clinic mismatch.' }, 403)
    }

    const featureFlags = await readFeatureFlags(supabase, clinicId)
    if (!isModuleEnabled(featureFlags, endpoint.module)) {
      return json(req, { ok: false, error: 'Recurso de IA desabilitado para esta clinica.' }, 403)
    }
    const limits = parseLimits(featureFlags)
    await enforceRateLimits(supabase, { userId: actor.id, clinicId, limits })
    await enforceDailyQuota(supabase, { clinicId, limits })

    const redactedInputText = redactText(body.inputText)
    const redactedMetadata = (redactUnknown(body.metadata) as Record<string, unknown>) ?? {}
    const inputHash = await sha256Hex(JSON.stringify({ inputText: body.inputText, metadata: body.metadata ?? {}, clinicId }))

    jobId = await createAiJob(supabase, {
      clinicId,
      userId: actor.id,
      feature: endpoint.feature,
      inputHash,
      inputRedacted: { inputText: redactedInputText, metadata: redactedMetadata },
    })
    await updateAiJobStatus(supabase, jobId, { status: 'processing' })

    const prompt = buildPrompt({
      feature: endpoint.feature,
      userRole: actorRole,
      clinicId,
      text: redactedInputText,
      metadata: redactedMetadata,
    })
    const provider = resolveProvider()
    const result = await provider.run({ feature: endpoint.feature, prompt })
    const usage = estimateUsage({
      input: prompt,
      output: result.text,
      inputTokens: result.tokensIn,
      outputTokens: result.tokensOut,
    })

    await updateAiJobStatus(supabase, jobId, {
      status: 'done',
      output: result.text,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      costEstimated: usage.costEstimated,
    })

    await incrementUsage(supabase, {
      clinicId,
      userId: actor.id,
      feature: endpoint.feature,
      tokens: usage.tokensIn + usage.tokensOut,
      cost: usage.costEstimated,
    })

    return json(req, {
      ok: true,
      jobId,
      feature: endpoint.feature,
      status: 'done',
      output: result.text,
      tokens: { in: usage.tokensIn, out: usage.tokensOut },
      costEstimated: usage.costEstimated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const publicMessage = toPublicErrorMessage(message)
    if (jobId) {
      try {
        await updateAiJobStatus(supabase, jobId, { status: 'failed', error: publicMessage })
      } catch {
        // noop
      }
    }
    const status =
      message.includes('Provider HTTP error: 429') ||
      message.toLowerCase().includes('quota exceeded') ||
      message.toLowerCase().includes('resource_exhausted') ||
      message.toLowerCase().includes('limite diario') ||
      message.toLowerCase().includes('rate limit')
        ? 429
        : 400
    return json(req, { ok: false, error: publicMessage, jobId }, status)
  }
})
