import { listCasesForUser, listLabItemsForUser } from '../../../../auth/scope'
import { loadDb } from '../../../../data/db'
import { ok } from '../../../../shared/errors'
import type { User } from '../../../../types/User'
import { CaseLifecycleService } from '../../../cases/domain/services/CaseLifecycleService'
import { toLabOrder } from '../../../lab/domain/entities/LabOrder'
import type { DentistPortalRepository } from '../../application/ports/DentistPortalRepository'

export class LocalDentistPortalRepository implements DentistPortalRepository {
  private readonly currentUser: User | null

  constructor(currentUser: User | null) {
    this.currentUser = currentUser
  }

  loadSnapshot() {
    const db = loadDb()
    const labOrders = (this.currentUser ? listLabItemsForUser(db, this.currentUser) : db.labItems).map(toLabOrder)
    const cases = (this.currentUser ? listCasesForUser(db, this.currentUser) : db.cases).map((caseItem) =>
      CaseLifecycleService.refreshCase(caseItem, labOrders.filter((order) => order.caseId === caseItem.id)),
    )
    const patientIds = new Set(cases.map((item) => item.patientId).filter((item): item is string => Boolean(item)))
    const documents = db.patientDocuments.filter((item) => patientIds.has(item.patientId))
    return ok({ cases, labOrders, documents })
  }
}

export function createLocalDentistPortalRepository(currentUser: User | null) {
  return new LocalDentistPortalRepository(currentUser)
}
