import type { ResultUseCase } from '../../../../shared/application/useCase'
import type { Result } from '../../../../shared/errors'
import { createAppError } from '../../../../shared/errors'
import { assertPermission } from '../../../../auth/policies'
import { runGuardedAsync, unwrapResult } from '../../../../shared/application'
import type { Case } from '../../domain/entities/Case'
import type { AddCaseNoteInput, CaseRepository } from '../ports/CaseRepository'
import type { User } from '../../../../types/User'
import { validateAddCaseNoteInput } from '../../../../shared/validators'

export class AddCaseNoteUseCase implements ResultUseCase<AddCaseNoteInput, Case, string> {
  private readonly repository: CaseRepository
  private readonly actor: User | null

  constructor(repository: CaseRepository, actor: User | null = null) {
    this.repository = repository
    this.actor = actor
  }

  execute(input: AddCaseNoteInput): Result<Case, string> | Promise<Result<Case, string>> {
    return runGuardedAsync(
      {
        flow: 'cases.add_note',
        action: 'AddCaseNoteUseCase.execute',
        actorId: this.actor?.id,
        actorRole: this.actor?.role,
        targetId: input.caseId,
        permission: 'cases.write',
      },
      async () => {
        if (this.actor) {
          assertPermission(this.actor, 'cases.write', 'registrar observação do caso')
        }
        const validated = validateAddCaseNoteInput(input)
        return unwrapResult(
          await this.repository.addNote(validated),
          (error) => createAppError({ message: typeof error === 'string' ? error : 'Falha ao registrar observação do caso.' }),
        )
      },
    )
  }
}
