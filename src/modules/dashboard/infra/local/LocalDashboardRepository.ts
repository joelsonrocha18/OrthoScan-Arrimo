import { listCasesForUser, listLabItemsForUser, listPatientsForUser, listScansForUser } from '../../../../auth/scope'
import { loadDb } from '../../../../data/db'
import { ok } from '../../../../shared/errors'
import type { User } from '../../../../types/User'
import { CaseLifecycleService } from '../../../cases/domain/services/CaseLifecycleService'
import { toLabOrder } from '../../../lab/domain/entities/LabOrder'
import type { DashboardRepository } from '../../application/ports/DashboardRepository'

export class LocalDashboardRepository implements DashboardRepository {
  private readonly currentUser: User | null

  constructor(currentUser: User | null) {
    this.currentUser = currentUser
  }

  loadSnapshot() {
    const db = loadDb()
    const visibleCases = this.currentUser ? listCasesForUser(db, this.currentUser) : db.cases
    const visiblePatients = this.currentUser ? listPatientsForUser(db, this.currentUser) : db.patients
    const visibleScans = this.currentUser ? listScansForUser(db, this.currentUser) : db.scans
    const visibleLabOrders = (this.currentUser ? listLabItemsForUser(db, this.currentUser) : db.labItems).map(toLabOrder)
    const cases = visibleCases.map((caseItem) =>
      CaseLifecycleService.refreshCase(caseItem, visibleLabOrders.filter((order) => order.caseId === caseItem.id)),
    )
    return ok({
      cases,
      patients: visiblePatients,
      scans: visibleScans,
      labOrders: visibleLabOrders,
    })
  }
}

export function createLocalDashboardRepository(currentUser: User | null) {
  return new LocalDashboardRepository(currentUser)
}
