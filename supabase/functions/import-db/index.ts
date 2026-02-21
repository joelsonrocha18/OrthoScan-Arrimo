import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type ImportPayload = {
  clinic: { tradeName: string; legalName?: string; cnpj?: string }
  ownerUserId: string
  data: {
    patients?: Array<Record<string, unknown>>
    dentists?: Array<Record<string, unknown>>
    clinics?: Array<Record<string, unknown>>
    scans?: Array<Record<string, unknown>>
    cases?: Array<Record<string, unknown>>
    labItems?: Array<Record<string, unknown>>
    documents?: Array<Record<string, unknown>>
  }
  options?: {
    mergeStrategy?: 'upsert' | 'insert_only'
    dryRun?: boolean
  }
}

type Counts = {
  dentists: number
  patients: number
  scans: number
  cases: number
  lab_items: number
  documents: number
}

function newId() {
  return crypto.randomUUID()
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing Supabase env vars.' }), { status: 500 })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const payload = (await req.json()) as ImportPayload
  if (!payload?.clinic?.tradeName || !payload?.ownerUserId) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing payload fields.' }), { status: 400 })
  }

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
  if (role !== 'master_admin') {
    return new Response(JSON.stringify({ ok: false, error: 'Forbidden.' }), { status: 403 })
  }

  const mergeStrategy = payload.options?.mergeStrategy ?? 'upsert'
  const dryRun = Boolean(payload.options?.dryRun)

  let clinicId = profile?.clinic_id ?? null
  if (!clinicId) {
    const { data: existing } = await supabase
      .from('clinics')
      .select('id')
      .eq('trade_name', payload.clinic.tradeName)
      .maybeSingle()
    if (existing?.id) {
      clinicId = existing.id
    } else if (!dryRun) {
      const { data: inserted, error } = await supabase
        .from('clinics')
        .insert({
          trade_name: payload.clinic.tradeName,
          legal_name: payload.clinic.legalName ?? null,
          cnpj: payload.clinic.cnpj ?? null,
          is_active: true,
        })
        .select('id')
        .single()
      if (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400 })
      }
      clinicId = inserted.id
    } else {
      clinicId = newId()
    }
  }

  const warnings: string[] = []
  const counts: Counts = {
    dentists: 0,
    patients: 0,
    scans: 0,
    cases: 0,
    lab_items: 0,
    documents: 0,
  }

  const mapId = (items?: Array<Record<string, unknown>>) => {
    const map = new Map<string, string>()
    ;(items ?? []).forEach((item) => {
      const localId = String(item.id ?? '')
      if (!localId) return
      map.set(localId, newId())
    })
    return map
  }

  const dentistMap = mapId(payload.data?.dentists)
  const patientMap = mapId(payload.data?.patients)
  const scanMap = mapId(payload.data?.scans)
  const caseMap = mapId(payload.data?.cases)

  const upsertOrInsert = async (table: string, rows: Array<Record<string, unknown>>) => {
    if (rows.length === 0) return
    if (dryRun) return
    if (mergeStrategy === 'upsert') {
      await supabase.from(table).upsert(rows)
    } else {
      await supabase.from(table).insert(rows)
    }
  }

  const dentistsRows = (payload.data?.dentists ?? []).map((item) => ({
    id: dentistMap.get(String(item.id ?? '')) ?? newId(),
    clinic_id: clinicId,
    name: item.name ?? 'Sem nome',
    gender: item.gender ?? 'masculino',
    cro: item.cro ?? null,
    phone: item.phone ?? null,
    whatsapp: item.whatsapp ?? null,
    email: item.email ?? null,
    notes: item.notes ?? null,
    is_active: item.isActive ?? true,
  }))
  await upsertOrInsert('dentists', dentistsRows)
  counts.dentists = dentistsRows.length

  const patientsRows = (payload.data?.patients ?? []).map((item) => ({
    id: patientMap.get(String(item.id ?? '')) ?? newId(),
    clinic_id: clinicId,
    primary_dentist_id: item.primaryDentistId ? dentistMap.get(String(item.primaryDentistId)) ?? null : null,
    name: item.name ?? 'Sem nome',
    cpf: item.cpf ?? null,
    birth_date: item.birthDate ?? null,
    gender: item.gender ?? null,
    phone: item.phone ?? null,
    whatsapp: item.whatsapp ?? null,
    email: item.email ?? null,
    address: item.address ?? null,
    notes: item.notes ?? null,
  }))
  await upsertOrInsert('patients', patientsRows)
  counts.patients = patientsRows.length

  const scansRows = (payload.data?.scans ?? []).map((item) => ({
    id: scanMap.get(String(item.id ?? '')) ?? newId(),
    clinic_id: clinicId,
    patient_id: item.patientId ? patientMap.get(String(item.patientId)) ?? null : null,
    dentist_id: item.dentistId ? dentistMap.get(String(item.dentistId)) ?? null : null,
    requested_by_dentist_id: item.requestedByDentistId ? dentistMap.get(String(item.requestedByDentistId)) ?? null : null,
    arch: item.arch ?? null,
    complaint: item.complaint ?? null,
    dentist_guidance: item.dentistGuidance ?? null,
    data: { ...item, legacy_id: item.id ?? null },
  }))
  await upsertOrInsert('scans', scansRows)
  counts.scans = scansRows.length

  const casesRows = (payload.data?.cases ?? []).map((item) => ({
    id: caseMap.get(String(item.id ?? '')) ?? newId(),
    clinic_id: clinicId,
    patient_id: item.patientId ? patientMap.get(String(item.patientId)) ?? null : null,
    dentist_id: item.dentistId ? dentistMap.get(String(item.dentistId)) ?? null : null,
    requested_by_dentist_id: item.requestedByDentistId ? dentistMap.get(String(item.requestedByDentistId)) ?? null : null,
    scan_id: item.sourceScanId ? scanMap.get(String(item.sourceScanId)) ?? null : null,
    status: item.status ?? 'draft',
    change_every_days: item.changeEveryDays ?? null,
    total_trays_upper: item.totalTraysUpper ?? null,
    total_trays_lower: item.totalTraysLower ?? null,
    attachments_tray: item.attachmentBondingTray ?? false,
    data: { ...item, legacy_id: item.id ?? null },
  }))
  await upsertOrInsert('cases', casesRows)
  counts.cases = casesRows.length

  const labRows = (payload.data?.labItems ?? []).map((item) => ({
    id: newId(),
    clinic_id: clinicId,
    case_id: item.caseId ? caseMap.get(String(item.caseId)) ?? null : null,
    tray_number: item.trayNumber ?? null,
    status: item.status ?? 'aguardando_iniciar',
    priority: item.priority ?? null,
    notes: item.notes ?? null,
    data: { ...item, legacy_id: item.id ?? null },
  }))
  await upsertOrInsert('lab_items', labRows)
  counts.lab_items = labRows.length

  const documentsRows = (payload.data?.documents ?? []).map((item) => {
    const filePath = item.file_path ?? null
    if (!filePath) {
      warnings.push(`Documento sem file_path (legacy_id=${item.id ?? 'n/a'}).`)
    }
    return {
      id: newId(),
      clinic_id: clinicId,
      patient_id: item.patientId ? patientMap.get(String(item.patientId)) ?? null : null,
      case_id: item.caseId ? caseMap.get(String(item.caseId)) ?? null : null,
      scan_id: item.scanId ? scanMap.get(String(item.scanId)) ?? null : null,
      category: item.category ?? 'outro',
      title: item.title ?? 'Documento',
      file_path: filePath,
      file_name: item.fileName ?? null,
      mime_type: item.mimeType ?? null,
      status: item.status ?? 'ok',
      note: item.note ?? null,
      error_note: item.errorNote ?? null,
      created_by: user.id,
    }
  })
  await upsertOrInsert('documents', documentsRows)
  counts.documents = documentsRows.length

  return new Response(
    JSON.stringify({ ok: true, clinicId, counts, warnings, dryRun }),
    { status: 200 },
  )
})
