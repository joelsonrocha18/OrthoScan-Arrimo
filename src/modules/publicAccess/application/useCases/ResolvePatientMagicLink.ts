import type { ResultUseCase } from '../../../../shared/application'
import { runGuardedAsync } from '../../../../shared/application/guard'
import type { Result } from '../../../../shared/errors'
import type { PatientAccessPreview, PatientAccessRepository } from '../ports/PatientAccessRepository'

export class ResolvePatientMagicLinkUseCase implements ResultUseCase<string, PatientAccessPreview, string> {
  private readonly repository: PatientAccessRepository

  constructor(repository: PatientAccessRepository) {
    this.repository = repository
  }

  async execute(token: string): Promise<Result<PatientAccessPreview, string>> {
    return runGuardedAsync(
      {
        flow: 'patient_access.resolve_magic_link',
        action: 'ResolvePatientMagicLinkUseCase.execute',
      },
      async () => {
        const result = await this.repository.resolveMagicLink(token)
        if (!result.ok) throw new Error(result.error)
        return result.data
      },
    )
  }
}
