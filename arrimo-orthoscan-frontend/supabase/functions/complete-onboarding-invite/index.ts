import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Payload = {
  token: string
  email: string
  password: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (valueByte) => valueByte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' }, 500)
  }

  const payload = (await req.json()) as Payload
  const email = payload.email?.trim().toLowerCase()
  const password = payload.password?.trim()
  const token = payload.token?.trim()

  if (!token || !email || !password) {
    return json({ ok: false, error: 'Token, email e senha sao obrigatorios.' }, 400)
  }
  if (password.length < 8) {
    return json({ ok: false, error: 'Senha deve ter ao menos 8 caracteres.' }, 400)
  }

  const tokenHash = await sha256Hex(token)
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: invite, error: inviteError } = await supabase
    .from('user_onboarding_invites')
    .select('id, role, clinic_id, dentist_id, full_name, cpf, phone, created_by, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (inviteError) return json({ ok: false, error: inviteError.message }, 400)
  if (!invite) return json({ ok: false, error: 'Token invalido.' }, 404)

  if (invite.used_at) return json({ ok: false, error: 'Token ja utilizado.' }, 400)
  if (new Date(invite.expires_at).getTime() <= Date.now()) return json({ ok: false, error: 'Token expirado.' }, 400)

  const { data: created, error: createAuthError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createAuthError || !created?.user) {
    return json({ ok: false, error: createAuthError?.message ?? 'Falha ao criar usuario.' }, 400)
  }

  const userId = created.user.id

  const { error: profileError } = await supabase.from('profiles').upsert({
    user_id: userId,
    role: invite.role,
    clinic_id: invite.clinic_id,
    dentist_id: invite.dentist_id,
    full_name: invite.full_name,
    cpf: invite.cpf,
    phone: invite.phone,
    onboarding_completed_at: new Date().toISOString(),
    is_active: true,
    deleted_at: null,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId)
    return json({ ok: false, error: profileError.message }, 400)
  }

  const { data: consumeRows, error: consumeError } = await supabase
    .from('user_onboarding_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)
    .is('used_at', null)
    .select('id')

  if (consumeError || !consumeRows || consumeRows.length === 0) {
    await supabase.auth.admin.deleteUser(userId)
    return json({ ok: false, error: 'Nao foi possivel consumir o token.' }, 409)
  }

  await supabase.from('security_audit_logs').insert({
    event_type: 'onboarding_invite_completed',
    actor_user_id: invite.created_by,
    target_user_id: userId,
    metadata: {
      invite_id: invite.id,
      role: invite.role,
      clinic_id: invite.clinic_id,
    },
  })

  return json({ ok: true })
})

