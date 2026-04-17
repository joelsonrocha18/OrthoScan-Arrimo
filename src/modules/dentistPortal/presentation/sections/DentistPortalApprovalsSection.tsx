import { Link } from 'react-router-dom'
import Button from '../../../../components/Button'
import Card from '../../../../components/Card'

export function DentistPortalApprovalsSection(props: {
  approvals: Array<{
    caseId: string
    patientName: string
    treatmentCode: string
    versionId: string
    versionLabel: string
    note?: string
    createdAt: string
  }>
  onApprove: (caseId: string, versionId: string) => void
}) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Etapas pendentes de aprovacao</h2>
        <p className="text-sm text-slate-500">Versões publicadas pelo time interno para revisão clínica.</p>
      </div>
      {props.approvals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
          Nenhuma aprovacao pendente.
        </div>
      ) : (
        <div className="space-y-3">
          {props.approvals.map((item) => (
            <div key={item.versionId} className="rounded-2xl border border-slate-200 px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.patientName}</p>
                  <p className="text-xs text-slate-500">Caso {item.treatmentCode} | {item.versionLabel} | {item.createdAt.slice(0, 10)}</p>
                  {item.note ? <p className="mt-2 text-sm text-slate-700">{item.note}</p> : null}
                </div>
                <div className="flex gap-2">
                  <Link to={`/app/cases/${item.caseId}`} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                    Abrir caso
                  </Link>
                  <Button onClick={() => props.onApprove(item.caseId, item.versionId)}>Aprovar</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
