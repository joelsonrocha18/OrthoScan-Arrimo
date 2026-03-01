import type { AiProvider } from './provider.ts'
import { MockProvider } from './mockProvider.ts'
import { HttpProvider } from './httpProvider.ts'

function readProviderName() {
  return (Deno.env.get('AI_PROVIDER') ?? 'mock').trim().toLowerCase()
}

export function resolveProvider(): AiProvider {
  const provider = readProviderName()
  if (provider === 'http' || provider === 'openai') return new HttpProvider()
  return new MockProvider()
}
