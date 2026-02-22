export type ProductType =
  | 'alinhador_3m'
  | 'alinhador_6m'
  | 'alinhador_12m'
  | 'contencao'
  | 'placa_clareamento'
  | 'placa_bruxismo'
  | 'protetor_esportivo'
  | 'guia_implante'
  | 'guia_gengivoplastia'
  | 'protese_provisoria'
  | 'biomodelo'

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  alinhador_3m: 'Alinhador 3 meses',
  alinhador_6m: 'Alinhador 6 meses',
  alinhador_12m: 'Alinhador 12 meses',
  contencao: 'Contenção',
  placa_clareamento: 'Placa de Clareamento',
  placa_bruxismo: 'Placa de Bruxismo',
  protetor_esportivo: 'Protetor Esportivo',
  guia_implante: 'Guia Cirúrgico - Implante',
  guia_gengivoplastia: 'Guia Cirúrgico - Gengivoplastia',
  protese_provisoria: 'Prótese Provisória',
  biomodelo: 'Biomodelo',
}

export function isAlignerProductType(productType?: ProductType | null) {
  return productType === 'alinhador_3m' || productType === 'alinhador_6m' || productType === 'alinhador_12m'
}
