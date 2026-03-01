import { describe, expect, it } from 'vitest'
import { validateAiPayload } from '../../ai/validation'

describe('ai validation', () => {
  it('rejects empty input', () => {
    const error = validateAiPayload({ inputText: '   ', metadata: {} })
    expect(error).toBeTruthy()
  })

  it('rejects raw binary payloads', () => {
    const error = validateAiPayload({
      inputText: 'ok',
      metadata: { raw: 'data:image/png;base64,abc' },
    })
    expect(error).toContain('Nao envie imagem ou PDF bruto')
  })
})
