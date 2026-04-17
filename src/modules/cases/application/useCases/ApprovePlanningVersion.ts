import type { ResultUseCase } from '../../../../shared/application/useCase'
import type { Result } from '../../../../shared/errors'
import { createAppError } from '../../../../shared/errors'
import { assertPermission } from '../../../../auth/policies'
import { runGuardedAsync, unwrapResult } from '../../../../shared/application'
import type { User } from '../../../../types/User'
import type { CaseRepository, ApprovePlanningVersionInput } from '../ports/CaseRepository'
import { validateApprovePlanningVersionInput } from '../../../../shared/validators'
import type { Case } from '../../domain/entities/Case'

export class ApprovePlanningVersionUseCase implements ResultUseCase<ApprovePlanningVersionInput, Case, string> {
  private readonly repository: CaseRepository
  private readonly actor: User | null

  constructor(repository: CaseRepository, actor: User | null = null) {
    this.repository = repository
    this.actor = actor
  }

  execute(input: ApprovePlanningVersionInput): Result<Case, string> | Promise<Result<Case, string>> {
    return runGuardedAsync(
      {
        flow: 'cases.approve_planning_version',
        action: 'ApprovePlanningVersionUseCase.execute',
        actorId: this.actor?.id,
        actorRole: this.actor?.role,
        targetId: input.caseId,
        permission: 'cases.read',
      },
      async () => {
        if (this.actor) {
          assertPermission(this.actor, 'cases.read', 'aprovar versão de planejamento')
        }
        const validated = validateApprovePlanningVersionInput(input)
        return unwrapResult(
          await this.repository.approvePlanningVersion(validated),
          (error) => createAppError({ message: typeof error === 'string' ? error : 'Falha ao aprovar planejamento.' }),
        )
      },
    )
  }
}
