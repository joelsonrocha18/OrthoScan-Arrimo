import { useMemo } from 'react'
import type { User } from '../../../../types/User'
import {
  AddCaseNoteUseCase,
  ApprovePlanningVersionUseCase,
  ListCaseTimelineUseCase,
  PublishPlanningVersionUseCase,
  UpdateCaseStatusUseCase,
} from '../../application'
import { createCaseRepository } from '../../infra/createCaseRepository'

export function useCaseModuleActions(currentUser: User | null) {
  const repository = useMemo(() => createCaseRepository(currentUser), [currentUser])
  const updateCaseStatus = useMemo(() => new UpdateCaseStatusUseCase(repository, currentUser), [currentUser, repository])
  const addCaseNote = useMemo(() => new AddCaseNoteUseCase(repository, currentUser), [currentUser, repository])
  const publishPlanningVersion = useMemo(() => new PublishPlanningVersionUseCase(repository, currentUser), [currentUser, repository])
  const approvePlanningVersion = useMemo(() => new ApprovePlanningVersionUseCase(repository, currentUser), [currentUser, repository])
  const listCaseTimeline = useMemo(() => new ListCaseTimelineUseCase(repository, currentUser), [currentUser, repository])

  return {
    repository,
    updateCaseStatus,
    addCaseNote,
    publishPlanningVersion,
    approvePlanningVersion,
    listCaseTimeline,
  }
}
