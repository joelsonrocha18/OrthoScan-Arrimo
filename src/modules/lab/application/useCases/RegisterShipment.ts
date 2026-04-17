import type { ResultUseCase } from '../../../../shared/application/useCase'
import type { Result } from '../../../../shared/errors'
import { createAppError } from '../../../../shared/errors'
import { assertPermission } from '../../../../auth/policies'
import { runGuardedAsync, unwrapResult } from '../../../../shared/application'
import type { LabRepository, RegisterShipmentInput, RegisterShipmentOutput } from '../ports/LabRepository'
import type { User } from '../../../../types/User'
import { validateRegisterShipmentInput } from '../../../../shared/validators'

export class RegisterShipmentUseCase implements ResultUseCase<RegisterShipmentInput, RegisterShipmentOutput, string> {
  private readonly repository: LabRepository
  private readonly actor: User | null

  constructor(repository: LabRepository, actor: User | null = null) {
    this.repository = repository
    this.actor = actor
  }

  execute(input: RegisterShipmentInput): Result<RegisterShipmentOutput, string> | Promise<Result<RegisterShipmentOutput, string>> {
    return runGuardedAsync(
      {
        flow: 'lab.register_shipment',
        action: 'RegisterShipmentUseCase.execute',
        actorId: this.actor?.id,
        actorRole: this.actor?.role,
        targetId: input.labOrderId,
        permission: 'lab.write',
      },
      async () => {
        if (this.actor) {
          assertPermission(this.actor, 'lab.write', 'registrar entrega do laboratório')
        }
        const validated = validateRegisterShipmentInput(input)
        return unwrapResult(
          await this.repository.registerShipment(validated),
          (error) => createAppError({ message: typeof error === 'string' ? error : 'Falha ao registrar entrega LAB.' }),
        )
      },
    )
  }
}
