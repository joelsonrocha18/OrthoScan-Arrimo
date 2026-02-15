import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Payload = {
  fullName: string
  cpf?: string
  phone?: string
  role: string
  clinicId: string
  dentistId?: string
}

const APP_ROLES = new Set([
  'master_admin',
  'dentist_admin',
  'dentist_client',
  'clinic_client',
  'lab_tech',
  'receptionist',
])

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  // `x-user-jwt` carries the authenticated user's access token (ES256) because the Functions gateway
  // rejects it in the standard `Authorization` header as "Invalid JWT". We keep `Authorization` as anon.
  'Access-Control-Allow-Headers': 'authorization, x-user-jwt, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function randomToken(size = 32) {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (valueByte) => valueByte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  // Use our own secret, since some Supabase-provided env keys are not available/consistent across plans.
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''
  const siteUrl = Deno.env.get('SITE_URL') ?? ''

  if (!supabaseUrl || !serviceRoleKey || !siteUrl) {
    return json({ ok: false, error: 'Missing SUPABASE_URL, SERVICE_ROLE_KEY or SITE_URL.' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // The Functions gateway must receive `Authorization: Bearer <anon>` when the project issues ES256 JWTs.
  // We pass the authenticated user access token via `x-user-jwt` and validate it explicitly here.
  const userJwtRaw = req.headers.get('x-user-jwt') ?? ''
  const userJwt = userJwtRaw.replace(/^Bearer\\s+/i, '').trim()

  const payload = (await req.json()) as Payload
  if (!payload.fullName?.trim() || !payload.role?.trim() || !payload.clinicId?.trim()) {
    return json({ ok: false, error: 'Missing fullName, role or clinicId.' }, 400)
  }
  if (!APP_ROLES.has(payload.role)) {
    return json({ ok: false, error: 'Invalid role.' }, 400)
  }

  const {
    data: { user: actor },
    error: actorError,
  } = await supabase.auth.getUser(userJwt)

  if (actorError || !actor) return json({ ok: false, error: 'Unauthorized.' }, 401)

  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('role, clinic_id')
    .eq('user_id', actor.id)
    .maybeSingle()

  const actorRole = actorProfile?.role ?? 'dentist_client'
  if (!['master_admin', 'dentist_admin'].includes(actorRole)) {
    return json({ ok: false, error: 'Forbidden.' }, 403)
  }
  if (actorRole === 'dentist_admin' && actorProfile?.clinic_id !== payload.clinicId) {
    return json({ ok: false, error: 'Clinic mismatch.' }, 403)
  }
  if (actorRole === 'dentist_admin' && ['master_admin', 'dentist_admin'].includes(payload.role)) {
    return json({ ok: false, error: 'Role not allowed for actor.' }, 403)
  }

  const token = randomToken()
  const tokenHash = await sha256Hex(token)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data: invite, error: insertError } = await supabase
    .from('user_onboarding_invites')
    .insert({
      token_hash: tokenHash,
      role: payload.role,
      clinic_id: payload.clinicId,
      dentist_id: payload.dentistId ?? null,
      full_name: payload.fullName.trim(),
      cpf: payload.cpf?.trim() || null,
      phone: payload.phone?.trim() || null,
      created_by: actor.id,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (insertError || !invite) {
    return json({ ok: false, error: insertError?.message ?? 'Invite insert failed.' }, 400)
  }

  const inviteLink = `${siteUrl.replace(/\/$/, '')}/complete-signup?token=${token}`

  await supabase.from('security_audit_logs').insert({
    event_type: 'onboarding_invite_created',
    actor_user_id: actor.id,
    metadata: {
      invite_id: invite.id,
      role: payload.role,
      clinic_id: payload.clinicId,
      dentist_id: payload.dentistId ?? null,
    },
  })

  return json({ ok: true, inviteId: invite.id, inviteLink })
})
