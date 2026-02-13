import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing Supabase env vars.' }), { status: 500 })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
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
  const clinicId = profile?.clinic_id
  if (!clinicId) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing clinic_id in profile.' }), { status: 400 })
  }

  const clinics = await supabase.from('clinics').select('*').eq('id', clinicId)
  const dentists = await supabase.from('dentists').select('*').eq('clinic_id', clinicId)
  const patients = await supabase.from('patients').select('*').eq('clinic_id', clinicId)
  const scans = await supabase.from('scans').select('*').eq('clinic_id', clinicId)
  const cases = await supabase.from('cases').select('*').eq('clinic_id', clinicId)
  const labItems = await supabase.from('lab_items').select('*').eq('clinic_id', clinicId)
  const documents = await supabase.from('documents').select('*').eq('clinic_id', clinicId)

  return new Response(
    JSON.stringify({
      ok: true,
      clinicId,
      data: {
        clinics: clinics.data ?? [],
        dentists: dentists.data ?? [],
        patients: patients.data ?? [],
        scans: scans.data ?? [],
        cases: cases.data ?? [],
        labItems: labItems.data ?? [],
        documents: documents.data ?? [],
      },
    }),
    { status: 200 },
  )
})
