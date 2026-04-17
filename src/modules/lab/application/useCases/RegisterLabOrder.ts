import type { ResultUseCase } from '../../../../shared/application/useCase'
import type { Result } from '../../../../shared/errors'
import { createAppError } from '../../../../shared/errors'
import { assertPermission } from '../../../../auth/policies'
import { runGuardedAsync, unwrapResult } from '../../../../shared/application'
import type { LabRepository, RegisterLabOrderInput } from '../ports/LabRepository'
import type { LabOrder } from '../../domain/entities/LabOrder'
import type { User } from '../../../../types/User'
import { validateRegisterLabOrderInput } from '../../../../shared/validators'

export type RegisterLabOrderOutput = {
  order: LabOrder
  syncMessage?: string
}

export class RegisterLabOrderUseCase implements ResultUseCase<RegisterLabOrderInput, RegisterLabOrderOutput, string> {
  private readonly repository: LabRepository
  private readonly actor: User | null

  constructor(repository: LabRepository, actor: User | null = null) {
    this.repository = repository
    this.actor = actor
  }

  execute(input: RegisterLabOrderInput): Result<RegisterLabOrderOutput, string> | Promise<Result<RegisterLabOrderOutput, string>> {
    return runGuardedAsync(
      {
        flow: 'lab.register_order',
        action: 'RegisterLabOrderUseCase.execute',
        actorId: this.actor?.id,
        actorRole: this.actor?.role,
        targetId: input.caseId,
        permission: 'lab.write',
      },
      async () => {
        if (this.actor) {
          assertPermission(this.actor, 'lab.write', 'registrar OS de laboratório')
        }
        const validated = validateRegisterLabOrderInput(input)
        return unwrapResult(
          await this.repository.createOrder(validated),
          (error) => createAppError({ message: typeof error === 'string' ? error : 'Falha ao registrar OS.' }),
        )
      },
    )
  }
}
