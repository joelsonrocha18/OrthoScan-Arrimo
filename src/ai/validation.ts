import type { AiRequestPayload } from './types'

export function validateAiPayload(payload: AiRequestPayload) {
  if (!payload.inputText?.trim()) return 'Informe o texto para IA.'
  if (payload.inputText.length > 8000) return 'Texto excede o limite de 8000 caracteres.'
  const raw = JSON.stringify(payload.metadata ?? {}).toLowerCase()
  if (raw.includes('data:image/') || raw.includes('data:application/pdf;base64')) {
    return 'Não envie imagem ou PDF bruto para IA. Use apenas texto e metadados.'
  }
  return null
}

