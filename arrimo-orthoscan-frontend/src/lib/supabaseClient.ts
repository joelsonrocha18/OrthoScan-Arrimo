import { createClient } from '@supabase/supabase-js'
import { DATA_MODE } from '../data/dataMode'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase =
  DATA_MODE === 'supabase' && (!supabaseUrl || !supabaseAnonKey)
    ? (console.error('Supabase env vars ausentes. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'), null)
    : supabaseUrl && supabaseAnonKey
      ? createClient(supabaseUrl, supabaseAnonKey)
      : null
