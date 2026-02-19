import { DATA_MODE } from '../data/dataMode'
import { supabase } from './supabaseClient'

type UploadScope = 'scans' | 'patient-docs'

type UploadResult = {
  url: string
  path: string
}

function sanitizeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

function uniquePath(scope: UploadScope, clinicId: string, ownerId: string, fileName: string) {
  const safeName = sanitizeFileName(fileName || 'arquivo.bin')
  const stamp = `${Date.now()}_${Math.random().toString(16).slice(2)}`
  return `${scope}/${clinicId}/${ownerId}/${stamp}_${safeName}`
}

export async function uploadFileToStorage(
  file: File,
  params: { scope: UploadScope; clinicId?: string; ownerId: string },
): Promise<UploadResult | null> {
  if (DATA_MODE !== 'supabase' || !supabase) {
    return null
  }
  if (!params.clinicId) {
    return null
  }

  const path = uniquePath(params.scope, params.clinicId, params.ownerId, file.name)
  const storage = supabase.storage.from('orthoscan')

  const upload = await storage.upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  })
  if (upload.error) {
    console.error('Falha ao enviar arquivo para storage:', upload.error.message)
    return null
  }

  const signed = await storage.createSignedUrl(path, 60 * 60 * 24 * 30)
  if (signed.error || !signed.data?.signedUrl) {
    console.error('Falha ao gerar URL assinada:', signed.error?.message)
    return null
  }

  return { path, url: signed.data.signedUrl }
}
