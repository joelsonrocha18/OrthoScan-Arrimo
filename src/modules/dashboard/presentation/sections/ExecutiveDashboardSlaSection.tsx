import { Link } from 'react-router-dom'
import Card from '../../../../components/Card'

export function ExecutiveDashboardSlaSection(props: {
  onTrack: number
  warning: number
  overdue: number
  delayedCases: Array<{
    caseId: string
    patientName: string
    treatmentCode: string
    alerts: string[]
  }>
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">SLA dos casos</h2>
        <div className="flex gap-3 text-sm">
          <span className="rounded-full bg-olive-50 px-3 py-1 text-olive-700">On track: {props.onTrack}</span>
          <span className="rounded-full bg-baby-100 px-3 py-1 text-brand-700">Warning: {props.warning}</span>
          <span className="rounded-full bg-salmon-100 px-3 py-1 text-salmon-700">Overdue: {props.overdue}</span>
        </div>
      </div>

      <div className="space-y-3">
        {props.delayedCases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600">
            Nenhum caso com SLA atrasado.
          </div>
        ) : (
          props.delayedCases.map((item) => (
            <Link key={item.caseId} to={`/app/cases/${item.caseId}`} className="block rounded-2xl border border-salmon-200 bg-salmon-50 px-4 py-3 transition hover:bg-salmon-100/80">
              <p className="text-sm font-semibold text-salmon-700">{item.patientName}</p>
              <p className="text-xs text-salmon-700/90">Caso {item.treatmentCode}</p>
              <p className="mt-1 text-sm text-slate-700">{item.alerts[0] ?? 'Atenção imediata necessária.'}</p>
            </Link>
          ))
        )}
      </div>
    </Card>
  )
}
