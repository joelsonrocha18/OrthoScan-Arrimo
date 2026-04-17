const RAW_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
const SUPABASE_PROXY_PATH = '/supabase'

function shouldUseVercelSupabaseProxy() {
  if (!import.meta.env.PROD || typeof window === 'undefined') return false
  return window.location.hostname.endsWith('vercel.app')
}

function normalizeUrl(value: string) {
  return value.replace(/\/$/, '')
}

export const DIRECT_SUPABASE_URL = normalizeUrl(RAW_SUPABASE_URL)

export const PUBLIC_SUPABASE_URL = shouldUseVercelSupabaseProxy()
  ? `${window.location.origin}${SUPABASE_PROXY_PATH}`
  : DIRECT_SUPABASE_URL

export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''
