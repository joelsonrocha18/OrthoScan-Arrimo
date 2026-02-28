export type DataMode = 'supabase' | 'local'

function resolveDataMode(): DataMode {
  const raw = (import.meta.env.VITE_DATA_MODE as string | undefined)?.trim().toLowerCase()
  if (raw === 'local') return 'local'
  return 'supabase'
}

export const DATA_MODE: DataMode = resolveDataMode()
