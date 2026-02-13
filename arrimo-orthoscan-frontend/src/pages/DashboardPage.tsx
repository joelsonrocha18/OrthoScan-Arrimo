import { Activity, Clock3, PackageCheck, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import ActionsPanel from '../components/ActionsPanel'
import Card from '../components/Card'
import StatCard from '../components/StatCard'
import { getDashboardStats } from '../data/kpis'
import { getReplenishmentAlerts } from '../domain/replenishment'
import AppShell from '../layouts/AppShell'
import { useDb } from '../lib/useDb'

export default function DashboardPage() {
  const { db } = useDb()
  const stats = getDashboardStats(db)

  const pendingActions = db.labItems
    .filter((item) => item.status !== 'prontas')
    .slice(0, 3)
    .map((item) => ({
      title: `${item.patientName} - Placa #${item.trayNumber}`,
      priorityText: item.priority,
      priorityTone: item.priority === 'Urgente' ? ('danger' as const) : item.priority === 'Medio' ? ('info' as const) : ('neutral' as const),
      kind: item.status === 'controle_qualidade' ? ('rework' as const) : item.status === 'em_producao' ? ('tray' as const) : ('delivery' as const),
      kindLabel: item.status === 'controle_qualidade' ? 'CQ' : item.status === 'em_producao' ? 'Producao' : 'Aguardando',
    }))
  const replenishmentAlerts = db.cases
    .flatMap((caseItem) =>
      getReplenishmentAlerts(caseItem).map((alert) => ({
        ...alert,
        caseId: caseItem.id,
        patientName: caseItem.patientName,
      })),
    )
    .sort((a, b) => {
      const rank = { urgent: 0, high: 1, medium: 2 }
      return rank[a.severity] - rank[b.severity]
    })
    .slice(0, 5)

  return (
    <AppShell breadcrumb={['Início', 'Dashboard']}>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Olá, Usuário!</h1>
        <p className="mt-1 text-sm text-slate-500">Aqui está o resumo da sua clínica hoje.</p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Pacientes Ativos" value={String(stats.activePatients)} meta="DB" metaTone="neutral" icon={<UsersRound className="h-4 w-4" />} />
        <StatCard
          title="Tratamentos em Andamento"
          value={String(stats.ongoingCases)}
          meta="Casos ativos"
          metaTone="success"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          title="Entregas Hoje"
          value={String(stats.deliveriesToday)}
          meta="Placas entregues hoje"
          metaTone="neutral"
          icon={<PackageCheck className="h-4 w-4" />}
        />
        <StatCard
          title="Alinhadores Pendentes"
          value={String(stats.pendingAligners)}
          meta={`${stats.overdue} atrasados`}
          metaTone={stats.overdue > 0 ? 'danger' : 'neutral'}
          icon={<Clock3 className="h-4 w-4" />}
        />
        <StatCard
          title="Contratos Pendentes"
          value={String(stats.contractsPending)}
          meta="Aguardando aprovacao"
          metaTone={stats.contractsPending > 0 ? 'danger' : 'neutral'}
          icon={<Clock3 className="h-4 w-4" />}
        />
      </section>

      <section className="mt-6">
        <ActionsPanel items={pendingActions} />
      </section>

      <section className="mt-6">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Alertas de reposicao</h2>
          <div className="mt-3 space-y-2">
            {replenishmentAlerts.length === 0 ? (
              <p className="text-sm text-slate-500">Sem alertas de reposicao no momento.</p>
            ) : (
              replenishmentAlerts.map((alert) => (
                <Link key={alert.id} to={`/app/cases/${alert.caseId}`} className="block rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">
                    {alert.patientName} - {alert.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {alert.message} | Previsto: {new Date(`${alert.dueDate}T00:00:00`).toLocaleDateString('pt-BR')}
                  </p>
                </Link>
              ))
            )}
          </div>
        </Card>
      </section>
    </AppShell>
  )
}
