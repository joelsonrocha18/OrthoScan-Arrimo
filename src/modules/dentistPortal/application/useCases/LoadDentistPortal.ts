import type { ResultUseCase } from '../../../../shared/application/useCase'
import type { Result } from '../../../../shared/errors'
import { createAppError } from '../../../../shared/errors'
import { runGuardedAsync, unwrapResult } from '../../../../shared/application'
import type { DentistPortalRepository } from '../ports/DentistPortalRepository'
import type { DentistPortalView } from '../../domain/services/DentistPortalService'
import { DentistPortalService } from '../../domain/services/DentistPortalService'

export class LoadDentistPortalUseCase implements ResultUseCase<void, DentistPortalView, string> {
  private readonly repository: DentistPortalRepository

  constructor(repository: DentistPortalRepository) {
    this.repository = repository
  }

  execute(): Result<DentistPortalView, string> | Promise<Result<DentistPortalView, string>> {
    return runGuardedAsync(
      {
        flow: 'dentist_portal.load',
        action: 'LoadDentistPortalUseCase.execute',
      },
      async () => {
        const snapshot = unwrapResult(
          await this.repository.loadSnapshot(),
          (error) => createAppError({ message: typeof error === 'string' ? error : 'Falha ao carregar portal.' }),
        )
        return DentistPortalService.build(snapshot)
      },
    )
  }
}
