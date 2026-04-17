import { createClient } from '@supabase/supabase-js'
import { DATA_MODE } from '../data/dataMode'
import { logger } from './logger'
import {
  clearLegacyPersistentAuthStorage,
  createSessionStorageAdapter,
  SUPABASE_SESSION_STORAGE_KEY,
} from './authStorage'
import { PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseEndpoint'

clearLegacyPersistentAuthStorage()

export const supabase =
  DATA_MODE === 'supabase' && (!PUBLIC_SUPABASE_URL || !SUPABASE_ANON_KEY)
    ? (logger.error('Supabase env vars ausentes. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.', {
        dataMode: DATA_MODE,
        hasSupabaseUrl: Boolean(PUBLIC_SUPABASE_URL),
        hasSupabaseAnonKey: Boolean(SUPABASE_ANON_KEY),
      }), null)
    : PUBLIC_SUPABASE_URL && SUPABASE_ANON_KEY
      ? createClient(PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storageKey: SUPABASE_SESSION_STORAGE_KEY,
            storage: createSessionStorageAdapter(),
          },
        })
      : null
