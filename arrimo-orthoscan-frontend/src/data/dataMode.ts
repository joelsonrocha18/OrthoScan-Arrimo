const configuredMode = (import.meta.env.VITE_DATA_MODE as string | undefined) ?? 'local'
const isProd = Boolean(import.meta.env.PROD)
const isLocalHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// In production deployments, force server-backed mode to avoid local credential/data storage.
export const DATA_MODE = isProd && !isLocalHost && configuredMode !== 'supabase' ? 'supabase' : configuredMode
