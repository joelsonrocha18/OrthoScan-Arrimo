import { DATA_MODE } from '../../../data/dataMode'
import type { User } from '../../../types/User'
import type { LabRepository } from '../application/ports/LabRepository'
import { createLocalLabRepository } from './local/LocalLabRepository'
import { createSupabaseLabRepository } from './supabase/SupabaseLabRepository'

export function createLabRepository(currentUser: User | null): LabRepository {
  if (DATA_MODE === 'supabase') {
    return createSupabaseLabRepository(currentUser)
  }
  return createLocalLabRepository(currentUser)
}
