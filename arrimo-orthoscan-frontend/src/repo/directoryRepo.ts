import { supabase } from '../lib/supabaseClient'

export type ClinicOption = { id: string; tradeName: string }
export type DentistOption = { id: string; name: string; clinicId: string | null }

export async function listClinicsSupabase(): Promise<ClinicOption[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('clinics')
    .select('id, trade_name, deleted_at')
    .is('deleted_at', null)
    .order('trade_name', { ascending: true })
  if (error) return []
  return (data ?? []).map((row) => ({ id: row.id as string, tradeName: (row.trade_name as string) ?? '' }))
}

export async function listDentistsSupabase(options?: { clinicId?: string }): Promise<DentistOption[]> {
  if (!supabase) return []
  let query = supabase
    .from('dentists')
    .select('id, name, clinic_id, deleted_at')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (options?.clinicId) {
    query = query.eq('clinic_id', options.clinicId)
  }

  const { data, error } = await query
  if (error) return []
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as string) ?? '',
    clinicId: (row.clinic_id as string | null) ?? null,
  }))
}

