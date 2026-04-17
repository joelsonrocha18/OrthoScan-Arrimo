import { CasePlanningVersioningService } from '../../../cases/domain/services/CasePlanningVersioningService'
import { CaseLifecycleService } from '../../../cases/domain/services/CaseLifecycleService'
import { StrategicNotificationsService } from '../../../notifications/domain/services/StrategicNotificationsService'
import type { DentistPortalSnapshot } from '../../application/ports/DentistPortalRepository'

export type DentistPortalView = {
  trackedCases: Array<{
    id: string
    patientName: string
    treatmentCode: string
    lifecycleStatus?: string
    slaStatus?: string
    planningVersionLabel?: string
    approvalPending: boolean
  }>
  pendingApprovals: Array<{
    caseId: string
    patientName: string
    treatmentCode: string
    versionId: string
    versionLabel: string
    note?: string
    createdAt: string
  }>
  documents: Array<{
    id: string
    caseId: string
    patientName: string
    title: string
    category: string
    createdAt: string
  }>
  notifications: ReturnType<typeof StrategicNotificationsService.derive>
}

export function buildDentistPortal(snapshot: DentistPortalSnapshot): DentistPortalView {
  const labByCaseId = new Map<string, typeof snapshot.labOrders>()
  snapshot.labOrders.forEach((order) => {
    if (!order.caseId) return
    const current = labByCaseId.get(order.caseId) ?? []
    labByCaseId.set(order.caseId, [...current, order])
  })

  const cases = snapshot.cases.map((caseItem) => CaseLifecycleService.refreshCase(caseItem, labByCaseId.get(caseItem.id) ?? []))

  const pendingApprovals = cases.flatMap((caseItem) =>
    CasePlanningVersioningService.listPendingApprovals(caseItem).map((version) => ({
      caseId: caseItem.id,
      patientName: caseItem.patientName,
      treatmentCode: caseItem.treatmentCode ?? caseItem.id,
      versionId: version.id,
      versionLabel: version.label,
      note: version.note,
      createdAt: version.createdAt,
    })),
  )

  const documents = snapshot.documents
    .flatMap((document) => {
      const caseItem = cases.find((current) => current.patientId === document.patientId)
      if (!caseItem) return []
      return [{
        id: document.id,
        caseId: caseItem.id,
        patientName: caseItem.patientName,
        title: document.title,
        category: document.category,
        createdAt: document.createdAt,
      }]
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 10)

  return {
    trackedCases: cases
      .map((caseItem) => ({
        id: caseItem.id,
        patientName: caseItem.patientName,
        treatmentCode: caseItem.treatmentCode ?? caseItem.id,
        lifecycleStatus: caseItem.lifecycleStatus,
        slaStatus: caseItem.sla?.overallStatus,
        planningVersionLabel: caseItem.planningVersions?.[0]?.label,
        approvalPending: pendingApprovals.some((item) => item.caseId === caseItem.id),
      }))
      .sort((left, right) => Number(right.approvalPending) - Number(left.approvalPending) || left.patientName.localeCompare(right.patientName)),
    pendingApprovals,
    documents,
    notifications: StrategicNotificationsService.derive({
      cases,
      scans: [],
      labOrders: snapshot.labOrders,
      todayIso: undefined,
    }),
  }
}

export class DentistPortalService {
  static build = buildDentistPortal
}
