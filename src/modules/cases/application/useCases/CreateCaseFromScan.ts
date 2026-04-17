import type { ResultUseCase } from '../../../../shared/application/useCase'
import type { Result } from '../../../../shared/errors'
import { createAppError } from '../../../../shared/errors'
import { assertPermission } from '../../../../auth/policies'
import { runGuardedAsync, unwrapResult } from '../../../../shared/application'
import type { CaseRepository, CreateCaseFromScanInput } from '../ports/CaseRepository'
import type { Case } from '../../domain/entities/Case'
import type { User } from '../../../../types/User'
import { validateCreateCaseFromScanInput } from '../../../../shared/validators'

export type CreateCaseFromScanOutput = {
  caseItem: Case
  caseId: string
}

export class CreateCaseFromScanUseCase implements ResultUseCase<CreateCaseFromScanInput, CreateCaseFromScanOutput, string> {
  private readonly repository: CaseRepository
  private readonly actor: User | null

  constructor(repository: CaseRepository, actor: User | null = null) {
    this.repository = repository
    this.actor = actor
  }

  execute(input: CreateCaseFromScanInput): Result<CreateCaseFromScanOutput, string> | Promise<Result<CreateCaseFromScanOutput, string>> {
    return runGuardedAsync(
      {
        flow: 'cases.create_from_scan',
        action: 'CreateCaseFromScanUseCase.execute',
        actorId: this.actor?.id,
        actorRole: this.actor?.role,
        targetId: input.scanId,
        permission: 'cases.write',
      },
      async () => {
        if (this.actor) {
          assertPermission(this.actor, 'cases.write', 'criar caso a partir do exame')
        }
        const validated = validateCreateCaseFromScanInput(input)
        return unwrapResult(
          await this.repository.createFromScan(validated),
          (error) => createAppError({ message: typeof error === 'string' ? error : 'Falha ao criar caso.' }),
        )
      },
    )
  }
}
