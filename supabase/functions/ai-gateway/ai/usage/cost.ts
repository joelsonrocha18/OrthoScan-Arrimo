type EstimateInput = {
  input: string
  output: string
  inputTokens?: number
  outputTokens?: number
}

const DEFAULT_COST_PER_1K_INPUT = 0.0005
const DEFAULT_COST_PER_1K_OUTPUT = 0.0015

function estimateTokensFromText(value: string) {
  return Math.max(1, Math.ceil(value.length / 4))
}

export function estimateUsage(input: EstimateInput) {
  const tokensIn = Math.max(0, Math.trunc(input.inputTokens ?? estimateTokensFromText(input.input)))
  const tokensOut = Math.max(0, Math.trunc(input.outputTokens ?? estimateTokensFromText(input.output)))
  const costEstimated =
    (tokensIn / 1000) * DEFAULT_COST_PER_1K_INPUT +
    (tokensOut / 1000) * DEFAULT_COST_PER_1K_OUTPUT
  return {
    tokensIn,
    tokensOut,
    costEstimated: Number(costEstimated.toFixed(6)),
  }
}

export function readNumberLimit(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback
  return value
}
