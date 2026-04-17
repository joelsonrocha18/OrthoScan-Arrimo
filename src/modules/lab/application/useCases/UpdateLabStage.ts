import type { ResultUseCase } from '../../../../shared/application/useCase'
import type { Result } from '../../../../shared/errors'
import { createAppError } from '../../../../shared/errors'
import { assertPermission } from '../../../../auth/policies'
import { runGuardedAsync, unwrapResult } from '../../../../shared/application'
import type { LabOrder } from '../../domain/entities/LabOrder'
import type { LabRepository, UpdateLabStageInput } from '../ports/LabRepository'
import type { User } from '../../../../types/User'
import { validateUpdateLabStageInput } from '../../../../shared/validators'

export type UpdateLabStageOutput = {
  order: LabOrder
  syncMessage?: string
}

export class UpdateLabStageUseCase implements ResultUseCase<UpdateLabStageInput, UpdateLabStageOutput, string> {
  private readonly repository: LabRepository
  private readonly actor: User | null

  constructor(repository: LabRepository, actor: User | null = null) {
    this.repository = repository
    this.actor = actor
  }

  execute(input: UpdateLabStageInput): Result<UpdateLabStageOutput, string> | Promise<Result<UpdateLabStageOutput, string>> {
    return runGuardedAsync(
      {
        flow: 'lab.update_stage',
        action: 'UpdateLabStageUseCase.execute',
        actorId: this.actor?.id,
        actorRole: this.actor?.role,
        targetId: input.id,
        permission: 'lab.write',
      },
      async () => {
        if (this.actor) {
          assertPermission(this.actor, 'lab.write', 'atualizar etapa do laboratório')
        }
        const validated = validateUpdateLabStageInput(input)
        return unwrapResult(
          await this.repository.moveOrderToStage(validated),
          (error) => createAppError({ message: typeof error === 'string' ? error : 'Falha ao atualizar etapa LAB.' }),
        )
      },
    )
  }
}
