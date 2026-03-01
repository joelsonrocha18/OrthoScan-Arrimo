import { describe, expect, it, vi } from 'vitest'
import { runAiEndpoint } from '../../ai/gateway'
import type { AiEndpoint } from '../../ai/types'

describe('ai gateway integration (mock provider)', () => {
  const provider = {
    run: vi.fn(async ({ endpoint }: { endpoint: AiEndpoint }) => ({ text: `ok:${endpoint}` })),
  }

  it('handles clinica endpoint', async () => {
    const result = await runAiEndpoint(provider, '/clinica/resumo', { inputText: 'dados clinicos' })
    expect(result.ok).toBe(true)
    expect(result.ok && result.output).toContain('/clinica/resumo')
  })

  it('handles lab endpoint', async () => {
    const result = await runAiEndpoint(provider, '/lab/auditoria-solicitacao', { inputText: 'dados lab' })
    expect(result.ok).toBe(true)
  })

  it('handles gestao endpoint', async () => {
    const result = await runAiEndpoint(provider, '/gestao/insights-dre', { inputText: 'dados dre' })
    expect(result.ok).toBe(true)
  })

  it('handles comercial endpoint', async () => {
    const result = await runAiEndpoint(provider, '/comercial/followup', { inputText: 'dados comercial' })
    expect(result.ok).toBe(true)
  })
})
