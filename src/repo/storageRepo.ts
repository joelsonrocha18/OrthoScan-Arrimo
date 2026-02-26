import { supabase } from '../lib/supabaseClient'
import { getSupabaseAccessToken } from '../lib/auth'

const BUCKET = 'orthoscan'
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
const STORAGE_PROVIDER = ((import.meta.env.VITE_STORAGE_PROVIDER as string | undefined) ?? 'supabase').trim().toLowerCase()
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

function sanitizeSegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

function utcStamp() {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const hh = String(now.getUTCHours()).padStart(2, '0')
  const mm = String(now.getUTCMinutes()).padStart(2, '0')
  const ss = String(now.getUTCSeconds()).padStart(2, '0')
  return `${y}${m}${d}_${hh}${mm}${ss}`
}

function fileNameWithTimestamp(fileName: string, params: { patientId?: string; origin?: string }) {
  const cleaned = sanitizeSegment(fileName || 'arquivo')
  const patientToken = sanitizeSegment(params.patientId || 'sem_paciente')
  const originToken = sanitizeSegment(params.origin || 'origem_desconhecida')
  return `${patientToken}_${utcStamp()}_${originToken}_${cleaned || 'arquivo'}`
}

export function buildPatientDocPath(params: { clinicId: string; patientId: string; fileName: string }) {
  return `clinics/${sanitizeSegment(params.clinicId)}/patients/${sanitizeSegment(params.patientId)}/documents/${fileNameWithTimestamp(params.fileName, {
    patientId: params.patientId,
    origin: 'patient_doc',
  })}`
}

export function buildScanAttachmentPath(params: {
  clinicId: string
  scanId: string
  patientId?: string
  kind: string
  fileName: string
}) {
  return `clinics/${sanitizeSegment(params.clinicId)}/scans/${sanitizeSegment(params.scanId)}/${sanitizeSegment(params.kind)}/${fileNameWithTimestamp(params.fileName, {
    patientId: params.patientId,
    origin: params.kind,
  })}`
}

export async function uploadToStorage(path: string, file: File) {
  if (STORAGE_PROVIDER === 'microsoft_drive') {
    return uploadToMicrosoftDrive(path, file)
  }
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, path }
}

export async function createSignedUrl(path: string, expiresIn = 300) {
  if (STORAGE_PROVIDER === 'microsoft_drive') {
    return resolveMicrosoftDriveDownloadUrl(path)
  }
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) return { ok: false as const, error: error?.message ?? 'Falha ao gerar URL assinada.' }
  return { ok: true as const, url: data.signedUrl }
}

export async function downloadBlob(path: string) {
  if (STORAGE_PROVIDER === 'microsoft_drive') {
    const resolved = await resolveMicrosoftDriveDownloadUrl(path)
    if (!resolved.ok) return resolved
    const response = await fetch(resolved.url)
    if (!response.ok) return { ok: false as const, error: 'Falha ao baixar arquivo no Microsoft Drive.' }
    const blob = await response.blob()
    return { ok: true as const, blob }
  }
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error || !data) return { ok: false as const, error: error?.message ?? 'Falha ao baixar arquivo.' }
  return { ok: true as const, blob: data }
}

export async function deleteFromStorage(path: string) {
  if (STORAGE_PROVIDER === 'microsoft_drive') {
    return deleteFromMicrosoftDrive(path)
  }
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

function fileExt(fileName: string) {
  const idx = fileName.lastIndexOf('.')
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : ''
}

function validateFile(file: File, allowedExt: string[], allowedMimePrefixes: string[]) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false as const, error: 'Arquivo excede o limite de 50MB.' }
  }
  const ext = fileExt(file.name)
  const mime = (file.type || '').toLowerCase()
  const extOk = allowedExt.length === 0 || allowedExt.includes(ext)
  const mimeOk = allowedMimePrefixes.length === 0 || allowedMimePrefixes.some((prefix) => mime.startsWith(prefix))
  if (!extOk && !mimeOk) {
    return { ok: false as const, error: 'Tipo de arquivo nao permitido.' }
  }
  return { ok: true as const }
}

export function validatePatientDocFile(file: File) {
  return validateFile(
    file,
    ['.pdf', '.jpg', '.jpeg', '.png', '.heic', '.doc', '.docx'],
    ['application/pdf', 'image/', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  )
}

export function validateScanAttachmentFile(file: File, kind: string) {
  if (kind === 'scan3d') {
    return validateFile(file, ['.stl', '.obj', '.ply'], ['application/sla', 'model/', 'application/octet-stream'])
  }
  if (kind === 'foto_intra' || kind === 'foto_extra') {
    return validateFile(file, ['.jpg', '.jpeg', '.png', '.heic'], ['image/'])
  }
  if (kind === 'raiox' || kind === 'dicom') {
    return validateFile(file, ['.pdf', '.jpg', '.jpeg', '.png', '.dcm', '.zip'], ['image/', 'application/pdf', 'application/zip', 'application/octet-stream'])
  }
  return validateFile(file, [], [])
}

async function readAccessToken() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? getSupabaseAccessToken() ?? null
}

function msFunctionUrl() {
  return `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/ms-drive-storage`
}

async function callMicrosoftDriveFunction(params: {
  action: 'create-link' | 'delete' | 'download-url'
  path: string
  expiresIn?: number
}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false as const, error: 'Supabase env ausente para chamar ms-drive-storage.' }
  }
  const token = await readAccessToken()
  if (!token) return { ok: false as const, error: 'Sessao expirada. Saia e entre novamente.' }

  const response = await fetch(msFunctionUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'x-user-jwt': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  let payload: { ok?: boolean; error?: string; url?: string } | null = null
  try {
    payload = (await response.json()) as { ok?: boolean; error?: string; url?: string }
  } catch {
    payload = null
  }
  if (!response.ok || !payload?.ok) {
    return { ok: false as const, error: payload?.error ?? `Falha ms-drive-storage (${response.status}).` }
  }
  return { ok: true as const, url: payload.url }
}

async function uploadToMicrosoftDrive(path: string, file: File) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false as const, error: 'Supabase env ausente para chamar ms-drive-storage.' }
  }
  const token = await readAccessToken()
  if (!token) return { ok: false as const, error: 'Sessao expirada. Saia e entre novamente.' }

  const form = new FormData()
  form.set('action', 'upload')
  form.set('path', path)
  form.set('file', file, file.name)

  const response = await fetch(msFunctionUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'x-user-jwt': token,
    },
    body: form,
  })

  let payload: { ok?: boolean; error?: string } | null = null
  try {
    payload = (await response.json()) as { ok?: boolean; error?: string }
  } catch {
    payload = null
  }
  if (!response.ok || !payload?.ok) {
    return { ok: false as const, error: payload?.error ?? `Falha ms-drive-storage (${response.status}).` }
  }
  return { ok: true as const, path }
}

async function resolveMicrosoftDriveDownloadUrl(path: string) {
  const response = await callMicrosoftDriveFunction({ action: 'download-url', path })
  if (!response.ok || !response.url) {
    return { ok: false as const, error: response.error ?? 'Falha ao resolver download no Microsoft Drive.' }
  }
  return { ok: true as const, url: response.url }
}

async function deleteFromMicrosoftDrive(path: string) {
  const response = await callMicrosoftDriveFunction({ action: 'delete', path })
  if (!response.ok) return { ok: false as const, error: response.error ?? 'Falha ao remover arquivo no Microsoft Drive.' }
  return { ok: true as const }
}
