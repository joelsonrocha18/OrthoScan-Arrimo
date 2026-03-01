import type { AiProviderRequest, AiProviderResponse } from '../types.ts'

export interface AiProvider {
  run(input: AiProviderRequest): Promise<AiProviderResponse>
}
