import { supabase } from '../lib/supabaseClient'
import type { SystemSettings } from '../lib/systemSettings'

const SETTINGS_KEY = 'global'

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export async function loadSystemSettingsSupabase(): Promise<SystemSettings | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle()
  if (error || !data) return null
  const row = asObject(data)
  const value = row.value
  if (!value || typeof value !== 'object') return null
  return value as SystemSettings
}

export async function saveSystemSettingsSupabase(settings: SystemSettings) {
  if (!supabase) return { ok: false as const, error: 'Supabase nao configurado.' }
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('app_settings')
    .upsert({
      key: SETTINGS_KEY,
      value: settings,
      updated_at: now,
    }, { onConflict: 'key' })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

