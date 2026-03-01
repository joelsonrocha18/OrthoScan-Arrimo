import type { AiProvider } from './provider.ts'
import type { AiProviderRequest } from '../types.ts'

function titleFromFeature(feature: string) {
  const parts = feature.split('.')
  return `${parts[0]?.toUpperCase() ?? 'AI'} :: ${parts[1] ?? 'resultado'}`
}

export class MockProvider implements AiProvider {
  async run(input: AiProviderRequest) {
    const sample = input.prompt.slice(0, 400).replace(/\s+/g, ' ').trim()
    return {
      text: [
        `${titleFromFeature(input.feature)}`,
        '',
        'Resumo sugerido:',
        `- Contexto analisado: ${sample || 'n/a'}`,
        '- Pontos de atencao: validar dados clinicos e operacionais antes de salvar.',
        '- Proxima acao sugerida: revisar, editar e confirmar no fluxo.',
      ].join('\n'),
      model: 'mock-v1',
      tokensIn: Math.max(1, Math.ceil(input.prompt.length / 4)),
      tokensOut: 140,
    }
  }
}
