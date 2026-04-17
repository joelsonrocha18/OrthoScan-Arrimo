import type { ResultUseCase } from '../../../../shared/application/useCase'
import type { Result } from '../../../../shared/errors'
import { createAppError } from '../../../../shared/errors'
import { assertPermission } from '../../../../auth/policies'
import { runGuardedAsync, unwrapResult } from '../../../../shared/application'
import type { LabRepository, RegisterReworkInput, RegisterReworkOutput } from '../ports/LabRepository'
import type { User } from '../../../../types/User'
import { validateRegisterReworkInput } from '../../../../shared/validators'

export class RegisterReworkUseCase implements ResultUseCase<RegisterReworkInput, RegisterReworkOutput, string> {
  private readonly repository: LabRepository
  private readonly actor: User | null

  constructor(repository: LabRepository, actor: User | null = null) {
    this.repository = repository
    this.actor = actor
  }

  execute(input: RegisterReworkInput): Result<RegisterReworkOutput, string> | Promise<Result<RegisterReworkOutput, string>> {
    return runGuardedAsync(
      {
        flow: 'lab.register_rework',
        action: 'RegisterReworkUseCase.execute',
        actorId: this.actor?.id,
        actorRole: this.actor?.role,
        targetId: input.caseId,
        permission: 'lab.write',
      },
      async () => {
        if (this.actor) {
          assertPermission(this.actor, 'lab.write', 'registrar reconfecção do laboratório')
        }
        const validated = validateRegisterReworkInput(input)
        return unwrapResult(
          await this.repository.registerRework(validated),
          (error) => createAppError({ message: typeof error === 'string' ? error : 'Falha ao registrar reconfecção LAB.' }),
        )
      },
    )
  }
}
