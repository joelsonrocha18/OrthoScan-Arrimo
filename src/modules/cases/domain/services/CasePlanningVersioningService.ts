import { nowIsoDateTime } from '../../../../shared/utils/date'
import { createEntityId } from '../../../../shared/utils/id'
import type { Case } from '../../../../types/Case'
import type {
  CaseLifecycleStatusValue,
  CasePlanningVersion,
  CasePlanningVersionSnapshot,
  CasePlanningVersionStatusValue,
  CaseStageApproval,
} from '../../../../types/Domain'

type ActorRef = {
  id?: string
  name?: string
}

type CreatePlanningVersionInput = {
  note?: string
  actor?: ActorRef
  status?: CasePlanningVersionStatusValue
  stage?: CaseLifecycleStatusValue
  at?: string
}

type ApprovePlanningVersionInput = {
  versionId: string
  actor?: ActorRef
  at?: string
}

function toPlanningSnapshot(caseItem: Pick<Case, 'totalTrays' | 'totalTraysUpper' | 'totalTraysLower' | 'changeEveryDays' | 'attachmentBondingTray' | 'planningNote' | 'arch'>): CasePlanningVersionSnapshot {
  return {
    totalTrays: Math.max(0, Math.trunc(caseItem.totalTrays ?? 0)),
    totalTraysUpper: typeof caseItem.totalTraysUpper === 'number' ? Math.max(0, Math.trunc(caseItem.totalTraysUpper)) : undefined,
    totalTraysLower: typeof caseItem.totalTraysLower === 'number' ? Math.max(0, Math.trunc(caseItem.totalTraysLower)) : undefined,
    changeEveryDays: Math.max(1, Math.trunc(caseItem.changeEveryDays ?? 7)),
    attachmentBondingTray: Boolean(caseItem.attachmentBondingTray),
    planningNote: caseItem.planningNote?.trim() || undefined,
    arch: caseItem.arch ?? 'ambos',
  }
}

function initialVersion(caseItem: Pick<Case, 'createdAt' | 'patientName' | 'totalTrays' | 'totalTraysUpper' | 'totalTraysLower' | 'changeEveryDays' | 'attachmentBondingTray' | 'planningNote' | 'arch'>): CasePlanningVersion {
  return {
    id: createEntityId('planning-version'),
    versionNumber: 1,
    label: 'v1',
    status: 'approved',
    createdAt: caseItem.createdAt,
    createdByName: 'Sistema',
    note: `Versao inicial do planejamento de ${caseItem.patientName}.`,
    snapshot: toPlanningSnapshot(caseItem),
    approvedAt: caseItem.createdAt,
    approvedByName: 'Sistema',
  }
}

function initialApproval(caseItem: Pick<Case, 'createdAt'>, versionId: string): CaseStageApproval {
  return {
    id: createEntityId('case-approval'),
    stage: 'case_created',
    status: 'approved',
    requestedAt: caseItem.createdAt,
    requestedByName: 'Sistema',
    approvedAt: caseItem.createdAt,
    approvedByName: 'Sistema',
    planningVersionId: versionId,
  }
}

function nextVersionNumber(versions: CasePlanningVersion[]) {
  return versions.reduce((max, item) => Math.max(max, item.versionNumber), 0) + 1
}

function upsertPendingApproval(approvals: CaseStageApproval[], stage: CaseLifecycleStatusValue, planningVersionId: string, actor: ActorRef | undefined, at: string) {
  const current = approvals.find((item) => item.planningVersionId === planningVersionId)
  if (current) {
    return approvals.map((item): CaseStageApproval =>
      item.id === current.id
        ? {
            ...item,
            stage,
            status: 'pending' as const,
            requestedAt: at,
            requestedById: actor?.id,
            requestedByName: actor?.name,
            approvedAt: undefined,
            approvedById: undefined,
            approvedByName: undefined,
          }
        : item,
    )
  }
  return [
    {
      id: createEntityId('case-approval'),
      stage,
      status: 'pending' as const,
      requestedAt: at,
      requestedById: actor?.id,
      requestedByName: actor?.name,
      planningVersionId,
    } satisfies CaseStageApproval,
    ...approvals,
  ]
}

export function ensurePlanningVersions(caseItem: Pick<Case, 'createdAt' | 'patientName' | 'planningVersions' | 'stageApprovals' | 'totalTrays' | 'totalTraysUpper' | 'totalTraysLower' | 'changeEveryDays' | 'attachmentBondingTray' | 'planningNote' | 'arch'>) {
  const versions = (caseItem.planningVersions ?? []).length > 0 ? [...(caseItem.planningVersions ?? [])] : [initialVersion(caseItem)]
  const approvals = (caseItem.stageApprovals ?? []).length > 0
    ? [...(caseItem.stageApprovals ?? [])]
    : [initialApproval(caseItem, versions[0].id)]
  return { versions, approvals }
}

export function createPlanningVersion(caseItem: Pick<Case, 'createdAt' | 'patientName' | 'planningVersions' | 'stageApprovals' | 'totalTrays' | 'totalTraysUpper' | 'totalTraysLower' | 'changeEveryDays' | 'attachmentBondingTray' | 'planningNote' | 'arch'>, input: CreatePlanningVersionInput = {}) {
  const at = input.at ?? nowIsoDateTime()
  const seeded = ensurePlanningVersions(caseItem)
  const versionNumber = nextVersionNumber(seeded.versions)
  const status = input.status ?? 'submitted'
  const nextVersion: CasePlanningVersion = {
    id: createEntityId('planning-version'),
    versionNumber,
    label: `v${versionNumber}`,
    status,
    createdAt: at,
    createdById: input.actor?.id,
    createdByName: input.actor?.name,
    note: input.note?.trim() || undefined,
    snapshot: toPlanningSnapshot(caseItem),
    approvedAt: status === 'approved' ? at : undefined,
    approvedById: status === 'approved' ? input.actor?.id : undefined,
    approvedByName: status === 'approved' ? input.actor?.name : undefined,
  }
  const versions = [nextVersion, ...seeded.versions]
  const approvals =
    status === 'submitted'
      ? upsertPendingApproval(seeded.approvals, input.stage ?? 'case_created', nextVersion.id, input.actor, at)
      : status === 'approved'
        ? [
            {
              id: createEntityId('case-approval'),
              stage: input.stage ?? 'case_created',
              status: 'approved' as const,
              requestedAt: at,
              requestedById: input.actor?.id,
              requestedByName: input.actor?.name,
              approvedAt: at,
              approvedById: input.actor?.id,
              approvedByName: input.actor?.name,
              planningVersionId: nextVersion.id,
            } satisfies CaseStageApproval,
            ...seeded.approvals,
          ]
        : seeded.approvals
  return { versions, approvals, latestVersion: nextVersion }
}

export function approvePlanningVersion(caseItem: Pick<Case, 'createdAt' | 'patientName' | 'planningVersions' | 'stageApprovals' | 'totalTrays' | 'totalTraysUpper' | 'totalTraysLower' | 'changeEveryDays' | 'attachmentBondingTray' | 'planningNote' | 'arch'>, input: ApprovePlanningVersionInput) {
  const at = input.at ?? nowIsoDateTime()
  const seeded = ensurePlanningVersions(caseItem)
  const versions = seeded.versions.map((item): CasePlanningVersion =>
    item.id === input.versionId
      ? {
          ...item,
          status: 'approved' as const,
          approvedAt: at,
          approvedById: input.actor?.id,
          approvedByName: input.actor?.name,
        }
      : item,
  )
  const approvals = seeded.approvals.map((item): CaseStageApproval =>
    item.planningVersionId === input.versionId
      ? {
          ...item,
          status: 'approved' as const,
          approvedAt: at,
          approvedById: input.actor?.id,
          approvedByName: input.actor?.name,
        }
      : item,
  )
  return { versions, approvals }
}

export function listPendingPlanningApprovals(caseItem: Pick<Case, 'createdAt' | 'patientName' | 'planningVersions' | 'stageApprovals' | 'totalTrays' | 'totalTraysUpper' | 'totalTraysLower' | 'changeEveryDays' | 'attachmentBondingTray' | 'planningNote' | 'arch'>) {
  const seeded = ensurePlanningVersions(caseItem)
  const pendingIds = new Set(
    seeded.approvals
      .filter((item) => item.status === 'pending' && item.planningVersionId)
      .map((item) => item.planningVersionId as string),
  )
  return seeded.versions.filter((item) => pendingIds.has(item.id))
}

export class CasePlanningVersioningService {
  static toSnapshot = toPlanningSnapshot
  static ensure = ensurePlanningVersions
  static createVersion = createPlanningVersion
  static approveVersion = approvePlanningVersion
  static listPendingApprovals = listPendingPlanningApprovals
}
