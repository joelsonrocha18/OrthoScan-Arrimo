import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Payload = {
  token: string
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

const ROLE_LABEL: Record<string, string> = {
  master_admin: 'Master Admin',
  dentist_admin: 'Dentista Admin',
  dentist_client: 'Dentista Cliente',
  clinic_client: 'Clinica Cliente',
  lab_tech: 'Tecnico de Laboratorio',
  receptionist: 'Recepcao',
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' }, 500)
  }

  const payload = (await req.json()) as Payload
  if (!payload.token?.trim()) return json({ ok: false, error: 'Token obrigatorio.' }, 400)

  const tokenHash = await sha256Hex(payload.token.trim())
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: invite, error } = await supabase
    .from('user_onboarding_invites')
    .select('id, role, clinic_id, full_name, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error) return json({ ok: false, error: error.message }, 400)
  if (!invite) return json({ ok: false, expired: false, used: false, error: 'Token invalido.' }, 404)

  const expired = new Date(invite.expires_at).getTime() <= Date.now()
  const used = Boolean(invite.used_at)

  if (expired || used) {
    return json({ ok: false, expired, used })
  }

  const { data: clinic } = await supabase
    .from('clinics')
    .select('trade_name')
    .eq('id', invite.clinic_id)
    .maybeSingle()

  return json({
    ok: true,
    expired: false,
    used: false,
    preview: {
      fullName: invite.full_name,
      roleLabel: ROLE_LABEL[invite.role] ?? invite.role,
      clinicName: clinic?.trade_name ?? 'Clinica',
    },
  })
})

