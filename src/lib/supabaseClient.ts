import { createClient } from '@supabase/supabase-js'
import { DATA_MODE } from '../data/dataMode'
import { logger } from './logger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase =
  DATA_MODE === 'supabase' && (!supabaseUrl || !supabaseAnonKey)
    ? (logger.error('Supabase env vars ausentes. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.', {
        dataMode: DATA_MODE,
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasSupabaseAnonKey: Boolean(supabaseAnonKey),
      }), null)
    : supabaseUrl && supabaseAnonKey
      ? createClient(supabaseUrl, supabaseAnonKey)
      : null
