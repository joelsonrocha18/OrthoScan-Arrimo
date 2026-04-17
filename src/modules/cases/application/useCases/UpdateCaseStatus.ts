import type { ResultUseCase } from '../../../../shared/application/useCase'
import type { Result } from '../../../../shared/errors'
import { createAppError } from '../../../../shared/errors'
import { assertPermission } from '../../../../auth/policies'
import { runGuardedAsync, unwrapResult } from '../../../../shared/application'
import type { Case } from '../../domain/entities/Case'
import type { CaseRepository, UpdateCaseStatusInput } from '../ports/CaseRepository'
import type { User } from '../../../../types/User'
import { validateUpdateCaseStatusInput } from '../../../../shared/validators'

export class UpdateCaseStatusUseCase implements ResultUseCase<UpdateCaseStatusInput, Case, string> {
  private readonly repository: CaseRepository
  private readonly actor: User | null

  constructor(repository: CaseRepository, actor: User | null = null) {
    this.repository = repository
    this.actor = actor
  }

  execute(input: UpdateCaseStatusInput): Result<Case, string> | Promise<Result<Case, string>> {
    return runGuardedAsync(
      {
        flow: 'cases.update_status',
        action: 'UpdateCaseStatusUseCase.execute',
        actorId: this.actor?.id,
        actorRole: this.actor?.role,
        targetId: input.caseId,
        permission: 'cases.write',
      },
      async () => {
        if (this.actor) {
          assertPermission(this.actor, 'cases.write', 'atualizar status do caso')
        }
        const validated = validateUpdateCaseStatusInput(input)
        return unwrapResult(
          await this.repository.updateStatus(validated),
          (error) => createAppError({ message: typeof error === 'string' ? error : 'Falha ao atualizar status do caso.' }),
        )
      },
    )
  }
}
