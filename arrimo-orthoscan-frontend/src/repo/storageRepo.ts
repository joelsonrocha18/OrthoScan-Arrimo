import { supabase } from '../lib/supabaseClient'

const BUCKET = 'orthoscan'
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

function sanitizeSegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

function fileNameWithTimestamp(fileName: string) {
  const cleaned = sanitizeSegment(fileName || 'arquivo')
  return `${Date.now()}_${cleaned || 'arquivo'}`
}

export function buildPatientDocPath(params: { clinicId: string; patientId: string; fileName: string }) {
  return `clinics/${sanitizeSegment(params.clinicId)}/patients/${sanitizeSegment(params.patientId)}/documents/${fileNameWithTimestamp(params.fileName)}`
}

export function buildScanAttachmentPath(params: {
  clinicId: string
  scanId: string
  kind: string
  fileName: string
}) {
  return `clinics/${sanitizeSegment(params.clinicId)}/scans/${sanitizeSegment(params.scanId)}/${sanitizeSegment(params.kind)}/${fileNameWithTimestamp(params.fileName)}`
}

export async function uploadToStorage(path: string, file: File) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, path }
}

export async function createSignedUrl(path: string, expiresIn = 300) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) return { ok: false as const, error: error?.message ?? 'Falha ao gerar URL assinada.' }
  return { ok: true as const, url: data.signedUrl }
}

export async function downloadBlob(path: string) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error || !data) return { ok: false as const, error: error?.message ?? 'Falha ao baixar arquivo.' }
  return { ok: true as const, blob: data }
}

export async function deleteFromStorage(path: string) {
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
