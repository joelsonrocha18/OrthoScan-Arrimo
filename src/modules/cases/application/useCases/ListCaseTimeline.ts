import type { ResultUseCase } from '../../../../shared/application/useCase'
import type { Result } from '../../../../shared/errors'
import { createAppError } from '../../../../shared/errors'
import { assertPermission } from '../../../../auth/policies'
import { runGuardedAsync, unwrapResult } from '../../../../shared/application'
import type { CaseRepository } from '../ports/CaseRepository'
import type { Case } from '../../domain/entities/Case'
import type { User } from '../../../../types/User'
import { parseTrimmedString } from '../../../../shared/validators'

export class ListCaseTimelineUseCase implements ResultUseCase<{ caseId: string }, Case['timelineEntries'], string> {
  private readonly repository: CaseRepository
  private readonly actor: User | null

  constructor(repository: CaseRepository, actor: User | null = null) {
    this.repository = repository
    this.actor = actor
  }

  execute(input: { caseId: string }): Result<Case['timelineEntries'], string> | Promise<Result<Case['timelineEntries'], string>> {
    return runGuardedAsync(
      {
        flow: 'cases.list_timeline',
        action: 'ListCaseTimelineUseCase.execute',
        actorId: this.actor?.id,
        actorRole: this.actor?.role,
        targetId: input.caseId,
        permission: 'cases.read',
      },
      async () => {
        if (this.actor) {
          assertPermission(this.actor, 'cases.read', 'consultar linha do tempo do caso')
        }
        const caseId = parseTrimmedString(input.caseId, 'Caso')
        return unwrapResult(
          await this.repository.listTimeline(caseId),
          (error) => createAppError({ message: typeof error === 'string' ? error : 'Falha ao listar linha do tempo do caso.' }),
        )
      },
    )
  }
}
