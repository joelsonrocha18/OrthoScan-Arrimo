import type { ResultUseCase } from '../../../../shared/application'
import { runGuardedAsync } from '../../../../shared/application/guard'
import type { Result } from '../../../../shared/errors'
import type { PatientPortalSnapshot } from '../../domain/models/PatientPortal'
import type { PatientAccessRepository } from '../ports/PatientAccessRepository'

export class ResolvePatientPortalSessionUseCase implements ResultUseCase<{ token: string; accessCode?: string }, PatientPortalSnapshot, string> {
  private readonly repository: PatientAccessRepository

  constructor(repository: PatientAccessRepository) {
    this.repository = repository
  }

  async execute(input: { token: string; accessCode?: string }): Promise<Result<PatientPortalSnapshot, string>> {
    return runGuardedAsync(
      {
        flow: 'patient_access.resolve_portal_session',
        action: 'ResolvePatientPortalSessionUseCase.execute',
        context: { accessCode: input.accessCode },
      },
      async () => {
        const result = await this.repository.resolvePortalSession(input)
        if (!result.ok) throw new Error(result.error)
        return result.data
      },
    )
  }
}
