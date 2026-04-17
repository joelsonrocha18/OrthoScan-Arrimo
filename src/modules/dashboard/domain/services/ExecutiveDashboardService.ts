import { CaseFinancialService } from '../../../cases/domain/services/CaseFinancialService'
import { CaseLifecycleService } from '../../../cases/domain/services/CaseLifecycleService'
import { ProductionQueueService } from '../../../lab/domain/services/ProductionQueueService'
import type { ExecutiveDashboardSnapshot } from '../../application/ports/DashboardRepository'
import { StrategicNotificationsService } from '../../../notifications/domain/services/StrategicNotificationsService'

export type ExecutiveDashboardView = {
  kpis: {
    activeCases: number
    overdueSla: number
    labBacklog: number
    reworkRate: number
  }
  sla: {
    onTrack: number
    warning: number
    overdue: number
  }
  backlog: {
    queued: number
    inProduction: number
    qc: number
    shipped: number
  }
  finance: {
    revenue: number
    totalCost: number
    margin: number
  }
  delayedCases: Array<{
    caseId: string
    patientName: string
    treatmentCode: string
    alerts: string[]
  }>
  notifications: ReturnType<typeof StrategicNotificationsService.derive>
}

export function buildExecutiveDashboard(snapshot: ExecutiveDashboardSnapshot): ExecutiveDashboardView {
  const labByCaseId = new Map<string, typeof snapshot.labOrders>()
  snapshot.labOrders.forEach((order) => {
    if (!order.caseId) return
    const current = labByCaseId.get(order.caseId) ?? []
    labByCaseId.set(order.caseId, [...current, order])
  })

  const enrichedCases = snapshot.cases.map((caseItem) =>
    CaseLifecycleService.refreshCase(caseItem, labByCaseId.get(caseItem.id) ?? []),
  )
  const caseById = new Map(enrichedCases.map((item) => [item.id, item]))
  const queue = ProductionQueueService.buildQueue(snapshot.labOrders, caseById)
  const queueKpis = ProductionQueueService.getKpis(snapshot.labOrders)
  const reworkOrders = snapshot.labOrders.filter((order) => order.requestKind === 'reconfeccao' || order.reworkOfCaseId || order.reworkOfLabOrderId)
  const productionOrders = snapshot.labOrders.filter((order) => (order.requestKind ?? 'producao') === 'producao')
  const finance = enrichedCases.reduce(
    (acc, caseItem) => {
      const summary = CaseFinancialService.evaluate(caseItem, labByCaseId.get(caseItem.id) ?? [])
      return {
        revenue: acc.revenue + summary.revenue,
        totalCost: acc.totalCost + summary.totalCost,
        margin: acc.margin + summary.margin,
      }
    },
    { revenue: 0, totalCost: 0, margin: 0 },
  )
  const sla = enrichedCases.reduce(
    (acc, caseItem) => {
      const status = caseItem.sla?.overallStatus ?? 'on_track'
      if (status === 'overdue') acc.overdue += 1
      else if (status === 'warning') acc.warning += 1
      else acc.onTrack += 1
      return acc
    },
    { onTrack: 0, warning: 0, overdue: 0 },
  )

  return {
    kpis: {
      activeCases: enrichedCases.filter((item) => item.status !== 'finalizado').length,
      overdueSla: sla.overdue,
      labBacklog: queue.length,
      reworkRate: productionOrders.length > 0 ? Number(((reworkOrders.length / productionOrders.length) * 100).toFixed(1)) : 0,
    },
    sla,
    backlog: {
      queued: queueKpis.aguardando_iniciar,
      inProduction: queueKpis.em_producao,
      qc: queueKpis.controle_qualidade,
      shipped: queueKpis.prontas,
    },
    finance,
    delayedCases: enrichedCases
      .filter((item) => item.sla?.overallStatus === 'overdue')
      .map((item) => ({
        caseId: item.id,
        patientName: item.patientName,
        treatmentCode: item.treatmentCode ?? item.id,
        alerts: item.sla?.alerts ?? [],
      }))
      .slice(0, 6),
    notifications: StrategicNotificationsService.derive({
      cases: enrichedCases,
      patients: snapshot.patients,
      scans: snapshot.scans,
      labOrders: snapshot.labOrders,
    }),
  }
}

export class ExecutiveDashboardService {
  static build = buildExecutiveDashboard
}
