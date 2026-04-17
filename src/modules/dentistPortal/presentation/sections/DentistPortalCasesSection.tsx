import { Link } from 'react-router-dom'
import Card from '../../../../components/Card'

const statusTone: Record<string, string> = {
  overdue: 'bg-red-50 text-red-700',
  warning: 'bg-amber-50 text-amber-700',
  on_track: 'bg-emerald-50 text-emerald-700',
}

export function DentistPortalCasesSection(props: {
  cases: Array<{
    id: string
    patientName: string
    treatmentCode: string
    lifecycleStatus?: string
    slaStatus?: string
    planningVersionLabel?: string
    approvalPending: boolean
  }>
}) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Casos acompanhados</h2>
        <p className="text-sm text-slate-500">Status clínico, risco de SLA e última versão publicada.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {props.cases.map((item) => (
          <Link key={item.id} to={`/app/cases/${item.id}`} className="rounded-2xl border border-slate-200 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.patientName}</p>
                <p className="text-xs text-slate-500">Caso {item.treatmentCode}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[item.slaStatus ?? 'on_track'] ?? 'bg-slate-100 text-slate-700'}`}>
                {item.slaStatus ?? 'on_track'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.lifecycleStatus ?? 'case_created'}</span>
              {item.planningVersionLabel ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.planningVersionLabel}</span> : null}
              {item.approvalPending ? <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-700">Aguardando aprovacao</span> : null}
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
