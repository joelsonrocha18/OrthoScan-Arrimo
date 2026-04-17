import { DATA_MODE } from '../../../data/dataMode'
import type { User } from '../../../types/User'
import type { CaseRepository } from '../application/ports/CaseRepository'
import { createLocalCaseRepository } from './local/LocalCaseRepository'
import { createSupabaseCaseRepository } from './supabase/SupabaseCaseRepository'

export function createCaseRepository(currentUser: User | null): CaseRepository {
  if (DATA_MODE === 'supabase') {
    return createSupabaseCaseRepository(currentUser)
  }
  return createLocalCaseRepository(currentUser)
}

