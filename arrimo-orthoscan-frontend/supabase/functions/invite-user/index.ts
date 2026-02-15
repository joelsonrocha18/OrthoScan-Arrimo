import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type InvitePayload = {
  email: string
  role: string
  clinicId: string
  dentistId?: string
  fullName?: string
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
  'Access-Control-Allow-Headers': 'authorization, x-user-jwt, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''
  const siteUrl = Deno.env.get('SITE_URL') ?? ''
  const inviteRedirect = Deno.env.get('INVITE_REDIRECT_URL') ?? siteUrl

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, error: 'Missing Supabase env vars.' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const userJwtRaw = req.headers.get('x-user-jwt') ?? ''
  const userJwt = userJwtRaw.replace(/^Bearer\\s+/i, '').trim()

  const payload = (await req.json()) as InvitePayload
  if (!payload.email || !payload.role || !payload.clinicId) {
    return json({ ok: false, error: 'Missing payload fields.' }, 400)
  }
  if (!APP_ROLES.has(payload.role)) {
    return json({ ok: false, error: 'Invalid role.' }, 400)
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(userJwt)

  if (authError || !user) {
    return json({ ok: false, error: 'Unauthorized.' }, 401)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, clinic_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const role = profile?.role ?? 'dentist_client'
  if (!['master_admin', 'dentist_admin'].includes(role)) {
    return json({ ok: false, error: 'Forbidden.' }, 403)
  }
  if (role === 'dentist_admin' && profile?.clinic_id !== payload.clinicId) {
    return json({ ok: false, error: 'Clinic mismatch.' }, 403)
  }
  if (role === 'dentist_admin' && ['master_admin', 'dentist_admin'].includes(payload.role)) {
    return json({ ok: false, error: 'Role not allowed for actor.' }, 403)
  }

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(payload.email, {
    redirectTo: inviteRedirect || siteUrl,
  })
  if (inviteError || !inviteData?.user) {
    return json({ ok: false, error: inviteError?.message ?? 'Invite failed.' }, 400)
  }

  const { error: upsertError } = await supabase.from('profiles').upsert({
    user_id: inviteData.user.id,
    login_email: payload.email.toLowerCase(),
    role: payload.role,
    clinic_id: payload.clinicId,
    dentist_id: payload.dentistId ?? null,
    full_name: payload.fullName ?? null,
    is_active: true,
  })
  if (upsertError) {
    return json({ ok: false, error: upsertError.message }, 400)
  }

  return json({ ok: true, invitedEmail: payload.email }, 200)
})
