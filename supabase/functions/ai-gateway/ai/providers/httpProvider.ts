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

    const primary = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildResponsesPayload(model, input)),
    })

    let response = primary
    let mode: 'responses' | 'chat' = 'responses'
    if (primary.status === 404) {
      const fallbackEndpoint = toChatCompletionsEndpoint(endpoint)
      if (fallbackEndpoint !== endpoint) {
        response = await fetch(fallbackEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildChatCompletionsPayload(model, input)),
        })
        mode = 'chat'
      }
    }

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Provider HTTP error: ${response.status} ${text}`)
    }

    const payload = (await response.json()) as Record<string, unknown>
    const outputText = mode === 'responses' ? extractOutputText(payload) : extractChatOutputText(payload)
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
  const value =
    usage?.[key] ??
    (key === 'input_tokens' ? usage?.prompt_tokens : undefined) ??
    (key === 'output_tokens' ? usage?.completion_tokens : undefined)
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

function buildResponsesPayload(model: string, input: AiProviderRequest) {
  return {
    model,
    input: input.prompt,
    metadata: { feature: input.feature },
  }
}

function buildChatCompletionsPayload(model: string, input: AiProviderRequest) {
  return {
    model,
    messages: [{ role: 'user', content: input.prompt }],
    temperature: 0.2,
  }
}

function toChatCompletionsEndpoint(endpoint: string) {
  if (endpoint.includes('/responses')) return endpoint.replace(/\/responses(\?.*)?$/, '/chat/completions$1')
  if (endpoint.endsWith('/')) return `${endpoint}chat/completions`
  return `${endpoint}/chat/completions`
}

function extractChatOutputText(payload: Record<string, unknown>) {
  const choices = payload.choices
  if (!Array.isArray(choices) || choices.length === 0) return ''
  const first = choices[0] as Record<string, unknown> | undefined
  const message = first?.message as Record<string, unknown> | undefined
  const content = message?.content
  if (typeof content === 'string' && content.trim()) return content.trim()
  if (Array.isArray(content)) {
    const parts: string[] = []
    for (const item of content) {
      if (!item || typeof item !== 'object') continue
      const text = (item as Record<string, unknown>).text
      if (typeof text === 'string' && text.trim()) parts.push(text.trim())
    }
    return parts.join('\n').trim()
  }
  return ''
}
