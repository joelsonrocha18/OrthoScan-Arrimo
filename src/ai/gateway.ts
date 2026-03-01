import type { AiEndpoint, AiRequestPayload } from './types'
import { validateAiPayload } from './validation'
import { redactObject, redactText } from './redaction'

type Provider = {
  run: (args: { endpoint: AiEndpoint; prompt: string }) => Promise<{ text: string }>
}

export async function runAiEndpoint(provider: Provider, endpoint: AiEndpoint, payload: AiRequestPayload) {
  const error = validateAiPayload(payload)
  if (error) return { ok: false as const, error }
  const prompt = buildPrompt(payload)
  const result = await provider.run({ endpoint, prompt })
  return {
    ok: true as const,
    output: result.text,
  }
}

function buildPrompt(payload: AiRequestPayload) {
  const safeText = redactText(payload.inputText)
  const safeMeta = redactObject(payload.metadata ?? {})
  return [
    'OrthoScan AI',
    safeText,
    JSON.stringify(safeMeta),
  ].join('\n')
}
