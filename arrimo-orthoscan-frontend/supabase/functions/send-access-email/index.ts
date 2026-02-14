import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Payload = {
  email: string
  fullName?: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function sendEmail(params: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  const from = Deno.env.get('EMAIL_FROM') ?? ''
  if (!apiKey || !from) return { ok: false as const, error: 'RESEND_API_KEY/EMAIL_FROM nao configurados.' }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    return { ok: false as const, error: text }
  }
  return { ok: true as const }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const siteUrl = Deno.env.get('SITE_URL') ?? ''
  // Return 200 with {ok:false} so the client can show a helpful message.
  if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: 'Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.' })

  const payload = (await req.json()) as Payload
  if (!payload.email) return json({ ok: false, error: 'Email obrigatorio.' })

  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user: actor },
    error: actorError,
  } = await supabase.auth.getUser()
  if (actorError || !actor) return json({ ok: false, error: 'Unauthorized.' })

  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', actor.id)
    .maybeSingle()

  if (!actorProfile || !['master_admin', 'dentist_admin'].includes(actorProfile.role)) {
    return json({ ok: false, error: 'Forbidden.' })
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: payload.email,
    options: { redirectTo: `${siteUrl.replace(/\/$/, '')}/login` },
  })
  if (linkError || !linkData?.properties?.action_link) {
    return json({ ok: false, error: linkError?.message ?? 'Falha ao gerar link de acesso.' })
  }

  const emailResult = await sendEmail({
    to: payload.email,
    subject: 'Acesso ao sistema OrthoScan',
    html: `<p>Ola ${payload.fullName ?? ''},</p><p>Seu acesso ao sistema esta disponivel.</p><p><a href="${linkData.properties.action_link}">Entrar no sistema</a></p>`,
  })

  await supabase.from('security_audit_logs').insert({
    event_type: 'access_email_sent',
    actor_user_id: actor.id,
    metadata: { email: payload.email, email_sent: emailResult.ok },
  })

  if (!emailResult.ok) {
    return json({ ok: false, error: emailResult.error })
  }
  return json({ ok: true })
})
