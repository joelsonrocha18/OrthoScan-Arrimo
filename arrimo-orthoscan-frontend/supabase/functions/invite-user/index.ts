import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type InvitePayload = {
  email: string
  role: string
  clinicId: string
  dentistId?: string
  fullName?: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const siteUrl = Deno.env.get('SITE_URL') ?? ''
  const inviteRedirect = Deno.env.get('INVITE_REDIRECT_URL') ?? siteUrl

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing Supabase env vars.' }), { status: 500 })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const payload = (await req.json()) as InvitePayload
  if (!payload.email || !payload.role || !payload.clinicId) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing payload fields.' }), { status: 400 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized.' }), { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, clinic_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const role = profile?.role ?? 'dentist_client'
  if (!['master_admin', 'dentist_admin'].includes(role)) {
    return new Response(JSON.stringify({ ok: false, error: 'Forbidden.' }), { status: 403 })
  }
  if (role === 'dentist_admin' && profile?.clinic_id !== payload.clinicId) {
    return new Response(JSON.stringify({ ok: false, error: 'Clinic mismatch.' }), { status: 403 })
  }

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(payload.email, {
    redirectTo: inviteRedirect || siteUrl,
  })
  if (inviteError || !inviteData?.user) {
    return new Response(JSON.stringify({ ok: false, error: inviteError?.message ?? 'Invite failed.' }), { status: 400 })
  }

  const { error: upsertError } = await supabase.from('profiles').upsert({
    user_id: inviteData.user.id,
    role: payload.role,
    clinic_id: payload.clinicId,
    dentist_id: payload.dentistId ?? null,
    full_name: payload.fullName ?? null,
    is_active: true,
  })
  if (upsertError) {
    return new Response(JSON.stringify({ ok: false, error: upsertError.message }), { status: 400 })
  }

  return new Response(JSON.stringify({ ok: true, invitedEmail: payload.email }), { status: 200 })
})
