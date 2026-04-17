import type { ResultUseCase } from '../../../../shared/application'
import { runGuardedAsync } from '../../../../shared/application/guard'
import type { Result } from '../../../../shared/errors'
import type { PatientPortalPhotoUploadInput, PatientPortalPhotoUploadReceipt } from '../../domain/models/PatientPortal'
import type { PatientAccessRepository } from '../ports/PatientAccessRepository'

export class UploadPatientPortalPhotoUseCase
  implements ResultUseCase<PatientPortalPhotoUploadInput, PatientPortalPhotoUploadReceipt, string>
{
  private readonly repository: PatientAccessRepository

  constructor(repository: PatientAccessRepository) {
    this.repository = repository
  }

  async execute(input: PatientPortalPhotoUploadInput): Promise<Result<PatientPortalPhotoUploadReceipt, string>> {
    return runGuardedAsync(
      {
        flow: 'patient_access.upload_portal_photo',
        action: 'UploadPatientPortalPhotoUseCase.execute',
        context: { accessCode: input.accessCode, trayNumber: input.trayNumber, capturedAt: input.capturedAt },
      },
      async () => {
        const result = await this.repository.uploadPortalPhoto(input)
        if (!result.ok) throw new Error(result.error)
        return result.data
      },
    )
  }
}
