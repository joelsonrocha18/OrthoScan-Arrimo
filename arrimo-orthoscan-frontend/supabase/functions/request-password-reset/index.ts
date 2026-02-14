import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Payload = {
  email: string
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
  if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: 'Missing Supabase env vars.' }, 500)

  const payload = (await req.json()) as Payload
  if (!payload.email) return json({ ok: false, error: 'Email obrigatorio.' }, 400)

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Avoid user enumeration: always return success.
  const email = payload.email.trim().toLowerCase()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id')
    .ilike('login_email', email)
    .maybeSingle()
  if (profileError || !profile?.user_id) return json({ ok: true })

  const rawToken = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-', '')}`
  const tokenHash = await sha256(rawToken)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString()

  await supabase.from('password_reset_tokens').insert({
    user_id: profile.user_id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  })

  const resetUrl = `${siteUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`
  const emailResult = await sendEmail({
    to: payload.email,
    subject: 'Redefinicao de senha - OrthoScan',
    html: `<p>Solicitamos a redefinicao de senha.</p><p><a href="${resetUrl}">Clique aqui para redefinir sua senha</a></p><p>Validade: 30 minutos.</p>`,
  })

  await supabase.from('security_audit_logs').insert({
    event_type: 'password_reset_requested',
    target_user_id: profile.user_id,
    metadata: { email: payload.email, email_sent: emailResult.ok },
  })

  if (!emailResult.ok) {
    return json({ ok: true, warning: 'Email nao enviado. Configure RESEND_API_KEY/EMAIL_FROM.' })
  }
  return json({ ok: true })
})
