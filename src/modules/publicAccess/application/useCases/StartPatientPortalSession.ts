import type { ResultUseCase } from '../../../../shared/application'
import { runGuardedAsync } from '../../../../shared/application/guard'
import type { Result } from '../../../../shared/errors'
import type { PatientPortalSession } from '../../domain/models/PatientPortal'
import type { PatientAccessRepository, PatientPortalAccessInput } from '../ports/PatientAccessRepository'

export class StartPatientPortalSessionUseCase implements ResultUseCase<PatientPortalAccessInput, PatientPortalSession, string> {
  private readonly repository: PatientAccessRepository

  constructor(repository: PatientAccessRepository) {
    this.repository = repository
  }

  async execute(input: PatientPortalAccessInput): Promise<Result<PatientPortalSession, string>> {
    return runGuardedAsync(
      {
        flow: 'patient_access.start_portal_session',
        action: 'StartPatientPortalSessionUseCase.execute',
        context: { birthDate: input.birthDate, accessCode: input.accessCode },
      },
      async () => {
        const result = await this.repository.startPortalSession(input)
        if (!result.ok) throw new Error(result.error)
        return result.data
      },
    )
  }
}
