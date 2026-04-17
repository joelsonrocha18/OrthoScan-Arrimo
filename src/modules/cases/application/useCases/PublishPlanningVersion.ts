import type { ResultUseCase } from '../../../../shared/application/useCase'
import type { Result } from '../../../../shared/errors'
import { createAppError } from '../../../../shared/errors'
import { assertPermission } from '../../../../auth/policies'
import { runGuardedAsync, unwrapResult } from '../../../../shared/application'
import type { User } from '../../../../types/User'
import type { CaseRepository, PublishPlanningVersionInput } from '../ports/CaseRepository'
import { validatePublishPlanningVersionInput } from '../../../../shared/validators'
import type { Case } from '../../domain/entities/Case'

export class PublishPlanningVersionUseCase implements ResultUseCase<PublishPlanningVersionInput, Case, string> {
  private readonly repository: CaseRepository
  private readonly actor: User | null

  constructor(repository: CaseRepository, actor: User | null = null) {
    this.repository = repository
    this.actor = actor
  }

  execute(input: PublishPlanningVersionInput): Result<Case, string> | Promise<Result<Case, string>> {
    return runGuardedAsync(
      {
        flow: 'cases.publish_planning_version',
        action: 'PublishPlanningVersionUseCase.execute',
        actorId: this.actor?.id,
        actorRole: this.actor?.role,
        targetId: input.caseId,
        permission: 'cases.write',
      },
      async () => {
        if (this.actor) {
          assertPermission(this.actor, 'cases.write', 'publicar versão de planejamento')
        }
        const validated = validatePublishPlanningVersionInput(input)
        return unwrapResult(
          await this.repository.publishPlanningVersion(validated),
          (error) => createAppError({ message: typeof error === 'string' ? error : 'Falha ao publicar versão do planejamento.' }),
        )
      },
    )
  }
}
