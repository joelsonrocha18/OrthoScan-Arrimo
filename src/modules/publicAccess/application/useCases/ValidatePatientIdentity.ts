import type { ResultUseCase } from '../../../../shared/application'
import { runGuardedAsync } from '../../../../shared/application/guard'
import type { Result } from '../../../../shared/errors'
import type { PatientAccessIdentityInput, PatientAccessPreview, PatientAccessRepository } from '../ports/PatientAccessRepository'

export class ValidatePatientIdentityUseCase implements ResultUseCase<PatientAccessIdentityInput, PatientAccessPreview, string> {
  private readonly repository: PatientAccessRepository

  constructor(repository: PatientAccessRepository) {
    this.repository = repository
  }

  async execute(input: PatientAccessIdentityInput): Promise<Result<PatientAccessPreview, string>> {
    return runGuardedAsync(
      {
        flow: 'patient_access.validate_identity',
        action: 'ValidatePatientIdentityUseCase.execute',
        context: { birthDate: input.birthDate },
      },
      async () => {
        const result = await this.repository.validateIdentity(input)
        if (!result.ok) throw new Error(result.error)
        return result.data
      },
    )
  }
}
