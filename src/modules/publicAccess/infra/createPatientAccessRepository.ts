import { DATA_MODE } from '../../../data/dataMode'
import { createLocalPatientAccessRepository } from './local/LocalPatientAccessRepository'
import { createSupabasePatientAccessRepository } from './supabase/SupabasePatientAccessRepository'

export function createPatientAccessRepository() {
  return DATA_MODE === 'supabase'
    ? createSupabasePatientAccessRepository()
    : createLocalPatientAccessRepository()
}
