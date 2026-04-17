import { Link } from 'react-router-dom'
import Card from '../../../../components/Card'

export function DentistPortalDocumentsSection(props: {
  documents: Array<{
    id: string
    caseId: string
    patientName: string
    title: string
    category: string
    createdAt: string
  }>
}) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Documentos recentes</h2>
        <p className="text-sm text-slate-500">Ultimos anexos vinculados aos pacientes acompanhados.</p>
      </div>
      {props.documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
          Nenhum documento vinculado aos casos do portal.
        </div>
      ) : (
        <div className="space-y-3">
          {props.documents.map((item) => (
            <Link key={item.id} to={`/app/cases/${item.caseId}`} className="block rounded-2xl border border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-500">{item.patientName} | {item.category} | {item.createdAt.slice(0, 10)}</p>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
