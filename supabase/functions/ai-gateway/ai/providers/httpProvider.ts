import type { AiProvider } from './provider.ts'
import type { AiProviderRequest } from '../types.ts'

function readEnv(name: string, fallback = '') {
  return (Deno.env.get(name) ?? fallback).trim()
}

export class HttpProvider implements AiProvider {
  async run(input: AiProviderRequest) {
    const apiKey = readEnv('AI_API_KEY')
    const model = readEnv('AI_MODEL', 'gpt-4.1-mini')
    const endpoint = readEnv('AI_API_BASE_URL', 'https://api.openai.com/v1/responses')
    if (!apiKey) throw new Error('AI_API_KEY nao configurada.')

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: input.prompt,
        metadata: { feature: input.feature },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Provider HTTP error: ${response.status} ${text}`)
    }

    const payload = (await response.json()) as Record<string, unknown>
    const outputText = extractOutputText(payload)
    return {
      text: outputText || 'Sem resposta textual do provider.',
      model,
      tokensIn: extractUsageToken(payload, 'input_tokens'),
      tokensOut: extractUsageToken(payload, 'output_tokens'),
    }
  }
}

function extractUsageToken(payload: Record<string, unknown>, key: string) {
  const usage = payload.usage as Record<string, unknown> | undefined
  const value = usage?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.trunc(value))
  return undefined
}

function extractOutputText(payload: Record<string, unknown>) {
  const direct = payload.output_text
  if (typeof direct === 'string' && direct.trim()) return direct
  const output = payload.output
  if (!Array.isArray(output)) return ''
  const pieces: string[] = []
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const content = (item as Record<string, unknown>).content
    if (!Array.isArray(content)) continue
    for (const fragment of content) {
      if (!fragment || typeof fragment !== 'object') continue
      const text = (fragment as Record<string, unknown>).text
      if (typeof text === 'string' && text.trim()) pieces.push(text.trim())
    }
  }
  return pieces.join('\n').trim()
}
