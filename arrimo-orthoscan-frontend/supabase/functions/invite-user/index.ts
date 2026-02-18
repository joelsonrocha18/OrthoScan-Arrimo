import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type InvitePayload = {
  email: string
  role: string
  clinicId: string
  dentistId?: string
  fullName?: string
  password?: string
  cpf?: string
  phone?: string
}

const APP_ROLES = new Set([
  'master_admin',
  'dentist_admin',
  'dentist_client',
  'clinic_client',
  'lab_tech',
  'receptionist',
])

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') {
    return json(req, { ok: false, error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !serviceRoleKey) {
    return json(req, { ok: false, error: 'Missing Supabase env vars.' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const userJwtRaw = req.headers.get('x-user-jwt') ?? req.headers.get('authorization') ?? ''
  const userJwt = userJwtRaw.replace(/^Bearer\\s+/i, '').trim()

  const payload = (await req.json()) as InvitePayload
  if (!payload.email || !payload.role || !payload.clinicId) {
    return json(req, { ok: false, error: 'Missing payload fields.' }, 400)
  }
  if (!APP_ROLES.has(payload.role)) {
    return json(req, { ok: false, error: 'Invalid role.' }, 400)
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(userJwt)

  if (authError || !user) {
    return json(req, { ok: false, error: 'Unauthorized.' }, 401)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, clinic_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const role = profile?.role ?? 'dentist_client'
  if (!['master_admin', 'dentist_admin'].includes(role)) {
    return json(req, { ok: false, error: 'Forbidden.' }, 403)
  }
  if (role === 'dentist_admin' && profile?.clinic_id !== payload.clinicId) {
    return json(req, { ok: false, error: 'Clinic mismatch.' }, 403)
  }
  if (role === 'dentist_admin' && ['master_admin', 'dentist_admin'].includes(payload.role)) {
    return json(req, { ok: false, error: 'Role not allowed for actor.' }, 403)
  }

  const inviteWindowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { count: recentInvites } = await supabase
    .from('security_audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'access_email_sent')
    .eq('actor_user_id', user.id)
    .gte('created_at', inviteWindowStart)
  if ((recentInvites ?? 0) >= 30) {
    return json(req, { ok: false, error: 'Rate limit exceeded. Try again later.' }, 429)
  }

  const password = payload.password?.trim()
  if (password && password.length < 8) {
    return json(req, { ok: false, error: 'Senha deve ter no minimo 8 caracteres.' }, 400)
  }
  const email = payload.email.trim().toLowerCase()
  const fullName = payload.fullName?.trim() ?? null
  const createPayload: {
    email: string
    password?: string
    email_confirm: boolean
    user_metadata: Record<string, string>
  } = {
    email,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
  }
  if (password) createPayload.password = password

  const { data: createdData, error: createError } = await supabase.auth.admin.createUser(createPayload)
  if (createError || !createdData?.user) {
    const message = createError?.message ?? 'Create user failed.'
    if (message.toLowerCase().includes('already')) {
      return json(req, { ok: false, error: 'Email ja cadastrado.' }, 400)
    }
    return json(req, { ok: false, error: message }, 400)
  }

  const { error: upsertError } = await supabase.from('profiles').upsert({
    user_id: createdData.user.id,
    login_email: email,
    role: payload.role,
    clinic_id: payload.clinicId,
    dentist_id: payload.dentistId ?? null,
    full_name: fullName,
    cpf: payload.cpf?.trim() || null,
    phone: payload.phone?.trim() || null,
    is_active: true,
  })
  if (upsertError) {
    return json(req, { ok: false, error: upsertError.message }, 400)
  }

  return json(req, { ok: true, invitedEmail: email }, 200)
})
