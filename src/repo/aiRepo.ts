import type { AiEndpoint, AiRequestPayload } from '../ai/types'

export async function runAiEndpoint(_endpoint: AiEndpoint, _payload: AiRequestPayload) {
  return { ok: false as const, error: 'IA desativada no modo enxuto.' }
}
