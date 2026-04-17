import type { ResultUseCase } from '../../../../shared/application'
import { runGuardedAsync } from '../../../../shared/application/guard'
import type { Result } from '../../../../shared/errors'
import type { PatientAccessIdentityInput, PatientAccessRepository, PatientMagicLinkReceipt } from '../ports/PatientAccessRepository'

export class RequestPatientMagicLinkUseCase implements ResultUseCase<PatientAccessIdentityInput, PatientMagicLinkReceipt, string> {
  private readonly repository: PatientAccessRepository

  constructor(repository: PatientAccessRepository) {
    this.repository = repository
  }

  async execute(input: PatientAccessIdentityInput): Promise<Result<PatientMagicLinkReceipt, string>> {
    return runGuardedAsync(
      {
        flow: 'patient_access.request_magic_link',
        action: 'RequestPatientMagicLinkUseCase.execute',
        context: { birthDate: input.birthDate },
      },
      async () => {
        const result = await this.repository.requestMagicLink(input)
        if (!result.ok) throw new Error(result.error)
        return result.data
      },
    )
  }
}
