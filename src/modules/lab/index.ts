export * from './application'
export { createLocalLabRepository } from './infra/local/LocalLabRepository'
export {
  ProductionQueueService,
  enrichLabOrder,
  buildProductionQueue,
  filterLabOrders,
  getPipelineOrders,
  getQueueKpis,
  getReadyDeliveryOrders,
  getRemainingBankOrders,
  getCasesWithReplenishmentAlerts,
  getReplenishmentAlertSummaries,
  getInitialDeliveryQuantities,
  isLabOrderDeliveredToProfessional,
  isLabOrderOverdue,
} from './domain/services/ProductionQueueService'
export { LabSLAService, DEFAULT_LAB_STAGE_SLA_HOURS, evaluateLabOrderSLA } from './domain/services/LabSLAService'
export { ReworkFinancialImpactService, estimateReworkFinancialImpact } from './domain/services/ReworkFinancialImpactService'
export { ProductionChecklistService } from './domain/services/ProductionChecklistService'
export { LabPatientReportService, buildLabPatientReportRows } from './domain/services/LabPatientReportService'
export {
  LAB_ORDER_STAGE_FLOW,
  canTransitionLabOrderStage,
  getNextLabOrderStage,
  getPreviousLabOrderStage,
  hasProductionPlan,
  isProgrammedReplenishmentOrder,
  isReworkOrder,
  isReworkProductionOrder,
  resolveLabOrderProductType,
  requiresLabPlan,
  resolveAutomaticLabOrderStage,
  assertReadyToStartProduction,
  buildStandaloneLabDueDate,
  normalizeLabPriority,
  normalizeLabArch,
  buildLabOrderNotesWithReason,
  toLabOrder,
  createLabOrderDraft,
} from './domain/entities/LabOrder'
export { LabStage, LAB_STAGE_VALUES } from './domain/valueObjects/LabStage'
export type {
  LabOrder,
  LabOrderArch,
  LabOrderKind,
  LabOrderPriority,
  LabOrderStage,
  CreateLabOrderInput,
} from './domain/entities/LabOrder'
