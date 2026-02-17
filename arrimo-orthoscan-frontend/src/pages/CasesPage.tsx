import { Link } from 'react-router-dom'
import AppShell from '../layouts/AppShell'
import Badge from '../components/Badge'
import Card from '../components/Card'
import type { Case } from '../types/Case'
import type { CasePhase } from '../types/Case'
import { useDb } from '../lib/useDb'
import { getCurrentUser } from '../lib/auth'
import { listCasesForUser } from '../auth/scope'

const phaseLabelMap: Record<CasePhase, string> = {
  planejamento: 'Planejamento',
  orcamento: 'Orcamento',
  contrato_pendente: 'Contrato pendente',
  contrato_aprovado: 'Contrato aprovado',
  em_producao: 'Em producao',
  finalizado: 'Finalizado',
}

const phaseToneMap: Record<CasePhase, 'neutral' | 'info' | 'success'> = {
  planejamento: 'neutral',
  orcamento: 'neutral',
  contrato_pendente: 'neutral',
  contrato_aprovado: 'info',
  em_producao: 'info',
  finalizado: 'success',
}

function caseStatusBadge(item: Case) {
  if (item.phase === 'finalizado' || item.status === 'finalizado') {
    return { label: 'Finalizado', tone: 'success' as const }
  }
  if ((item.deliveryLots?.length ?? 0) > 0 && !item.installation?.installedAt) {
    return { label: 'Pronto para entrega', tone: 'info' as const }
  }
  if (item.installation?.installedAt) {
    return { label: 'Em tratamento', tone: 'info' as const }
  }
  return { label: phaseLabelMap[item.phase], tone: phaseToneMap[item.phase] }
}

export default function CasesPage() {
  const { db } = useDb()
  const currentUser = getCurrentUser(db)
  const patientsById = new Map(db.patients.map((item) => [item.id, item]))
  const dentistsById = new Map(db.dentists.map((item) => [item.id, item]))
  const cases = listCasesForUser(db, currentUser)

  return (
    <AppShell breadcrumb={['Inicio', 'Tratamentos']}>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Casos</h1>
        <p className="mt-2 text-sm text-slate-500">Casos de alinhadores originados por exame/scan.</p>
      </section>

      <section className="mt-6">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-4 text-sm font-medium text-slate-700">
            {cases.length} casos cadastrados
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Paciente</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Placas</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Troca a cada (dias)</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cases.map((item) => {
                  const patientName = item.patientId ? (patientsById.get(item.patientId)?.name ?? item.patientName) : item.patientName
                  const dentist = item.dentistId ? dentistsById.get(item.dentistId) : undefined
                  const dentistPrefix = dentist?.gender === 'feminino' ? 'Dra.' : dentist ? 'Dr.' : ''
                  const hasArchCounts = typeof item.totalTraysUpper === 'number' || typeof item.totalTraysLower === 'number'
                  const badge = caseStatusBadge(item)
                  return (
                    <tr key={item.id} className="bg-white">
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-900">{patientName}</p>
                        {item.treatmentCode ? <p className="mt-1 text-xs font-semibold text-slate-600">ID: {item.treatmentCode}</p> : null}
                        {dentist ? (
                          <p className="mt-1 text-xs text-slate-500">Dentista: {`${dentistPrefix} ${dentist.name}`}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {hasArchCounts
                          ? `Sup ${item.totalTraysUpper ?? 0} | Inf ${item.totalTraysLower ?? 0}`
                          : `Total ${item.totalTrays}`}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{item.changeEveryDays}</td>
                      <td className="px-5 py-4">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to={`/app/cases/${item.id}`}
                          className="inline-flex items-center rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </AppShell>
  )
}
