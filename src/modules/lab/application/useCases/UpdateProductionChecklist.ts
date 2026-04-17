import type { ResultUseCase } from '../../../../shared/application/useCase'
import type { Result } from '../../../../shared/errors'
import { createAppError } from '../../../../shared/errors'
import { assertPermission } from '../../../../auth/policies'
import { runGuardedAsync, unwrapResult } from '../../../../shared/application'
import { validateUpdateProductionChecklistInput } from '../../../../shared/validators'
import type { User } from '../../../../types/User'
import type { LabRepository } from '../ports/LabRepository'
import type { LabOrder } from '../../domain/entities/LabOrder'
import { ProductionChecklistService } from '../../domain/services/ProductionChecklistService'

export type UpdateProductionChecklistInput = {
  id: string
  itemId: string
  completed: boolean
}

export class UpdateProductionChecklistUseCase implements ResultUseCase<UpdateProductionChecklistInput, LabOrder, string> {
  private readonly repository: LabRepository
  private readonly actor: User | null

  constructor(repository: LabRepository, actor: User | null = null) {
    this.repository = repository
    this.actor = actor
  }

  execute(input: UpdateProductionChecklistInput): Result<LabOrder, string> | Promise<Result<LabOrder, string>> {
    return runGuardedAsync(
      {
        flow: 'lab.update_checklist',
        action: 'UpdateProductionChecklistUseCase.execute',
        actorId: this.actor?.id,
        actorRole: this.actor?.role,
        targetId: input.id,
        permission: 'lab.write',
      },
      async () => {
        if (this.actor) {
          assertPermission(this.actor, 'lab.write', 'atualizar checklist de produção')
        }
        const validated = validateUpdateProductionChecklistInput(input)
        const current = await this.repository.findById(validated.id)
        if (!current) {
          throw createAppError({ message: 'Item LAB não encontrado.' })
        }
        const nextChecklist = ProductionChecklistService.toggleItem(
          current,
          validated.itemId,
          validated.completed,
          this.actor ? { id: this.actor.id, name: this.actor.name } : undefined,
        )
        return unwrapResult(
          await this.repository.updateOrder(validated.id, { productionChecklist: nextChecklist }),
          (error) => createAppError({ message: typeof error === 'string' ? error : 'Falha ao atualizar checklist.' }),
        ).order
      },
    )
  }
}
