import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Payload = {
  token: string
  newPassword: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: 'Missing Supabase env vars.' }, 500)

  const payload = (await req.json()) as Payload
  if (!payload.token || !payload.newPassword) return json({ ok: false, error: 'Token e nova senha obrigatorios.' }, 400)
  if (payload.newPassword.length < 8) return json({ ok: false, error: 'Senha deve ter no minimo 8 caracteres.' }, 400)

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const tokenHash = await sha256(payload.token)

  const { data: tokenRow, error: tokenError } = await supabase
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (tokenError || !tokenRow) return json({ ok: false, error: 'Token invalido.' }, 400)
  if (tokenRow.used_at) return json({ ok: false, error: 'Token ja utilizado.' }, 400)
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) return json({ ok: false, error: 'Token expirado.' }, 400)

  const { error: updateError } = await supabase.auth.admin.updateUserById(tokenRow.user_id, { password: payload.newPassword })
  if (updateError) return json({ ok: false, error: updateError.message }, 400)

  await supabase.from('password_reset_tokens').update({ used_at: new Date().toISOString() }).eq('id', tokenRow.id)
  await supabase.from('security_audit_logs').insert({
    event_type: 'password_reset_completed',
    target_user_id: tokenRow.user_id,
    metadata: {},
  })

  return json({ ok: true })
})
