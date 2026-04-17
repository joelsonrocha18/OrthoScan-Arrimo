import { formatPtBrDate } from '../../../../shared/utils/date'

type LabAlertsSectionProps = {
  alertsOnly: boolean
  alertSummaries: Array<{
    caseId: string
    dueDate: string
    patientName: string
    title: string
  }>
}

export function LabAlertsSection({ alertsOnly, alertSummaries }: LabAlertsSectionProps) {
  if (!alertsOnly || alertSummaries.length === 0) return null

  return (
    <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      {alertSummaries.map((item) => (
        <p key={`${item.caseId}_${item.dueDate}`}>
          {item.patientName}: {item.title} (previsto para {formatPtBrDate(item.dueDate)})
        </p>
      ))}
    </section>
  )
}
