import type { Result } from '../../../../shared/errors'
import type { RepositoryPort } from '../../../../shared/infra'
import type { MaybePromise } from '../../../../shared/types'
import type { Case, CaseNoteScope } from '../../domain/entities/Case'

export type CreateCaseFromScanInput = {
  scanId: string
  totalTraysUpper?: number
  totalTraysLower?: number
  changeEveryDays: number
  attachmentBondingTray: boolean
  planningNote?: string
}

export type UpdateCaseStatusInput = {
  caseId: string
  nextStatus: Case['status']
  nextPhase?: Case['phase']
  reason?: string
}

export type AddCaseNoteInput = {
  caseId: string
  scope: CaseNoteScope
  note: string
  trayNumber?: number
}

export type PublishPlanningVersionInput = {
  caseId: string
  note?: string
}

export type ApprovePlanningVersionInput = {
  caseId: string
  versionId: string
}

export interface CaseRepository extends RepositoryPort<Case, string> {
  createFromScan(input: CreateCaseFromScanInput): MaybePromise<Result<{ caseItem: Case; caseId: string }, string>>
  updateStatus(input: UpdateCaseStatusInput): MaybePromise<Result<Case, string>>
  addNote(input: AddCaseNoteInput): MaybePromise<Result<Case, string>>
  publishPlanningVersion(input: PublishPlanningVersionInput): MaybePromise<Result<Case, string>>
  approvePlanningVersion(input: ApprovePlanningVersionInput): MaybePromise<Result<Case, string>>
  listTimeline(caseId: string): MaybePromise<Result<Case['timelineEntries'], string>>
}
