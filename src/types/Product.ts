export const PRODUCT_TYPES = [
  'escaneamento',
  'alinhador_3m',
  'alinhador_6m',
  'alinhador_12m',
  'contencao',
  'guia_cirurgico',
  'placa_bruxismo',
  'placa_clareamento',
  'protetor_bucal',
  'biomodelo',
] as const

export type ProductType = (typeof PRODUCT_TYPES)[number]

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  escaneamento: 'Escaneamento',
  alinhador_3m: 'Alinhador 3 meses',
  alinhador_6m: 'Alinhador 6 meses',
  alinhador_12m: 'Alinhador 12 meses',
  contencao: 'Contencao',
  guia_cirurgico: 'Guia Cirurgico',
  placa_bruxismo: 'Placa de Bruxismo',
  placa_clareamento: 'Placa de Clareamento',
  protetor_bucal: 'Protetor Bucal',
  biomodelo: 'Biomodelo',
}

const LEGACY_PRODUCT_TYPE_ALIAS: Record<string, ProductType> = {
  protetor_esportivo: 'protetor_bucal',
  guia_implante: 'guia_cirurgico',
  guia_gengivoplastia: 'guia_cirurgico',
  protese_provisoria: 'biomodelo',
}

export function normalizeProductType(value: unknown, fallback: ProductType = 'alinhador_12m'): ProductType {
  if (typeof value !== 'string' || value.length === 0) return fallback
  if ((PRODUCT_TYPES as readonly string[]).includes(value)) {
    return value as ProductType
  }
  return LEGACY_PRODUCT_TYPE_ALIAS[value] ?? fallback
}

export function isAlignerProductType(productType?: ProductType | null) {
  return productType === 'alinhador_3m' || productType === 'alinhador_6m' || productType === 'alinhador_12m'
}
