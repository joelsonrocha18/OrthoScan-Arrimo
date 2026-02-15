import {
  BadgeAlert,
  ClipboardList,
  DollarSign,
  Factory,
  FileSignature,
  PackageCheck,
  Printer,
  ScanLine,
  Stethoscope,
  Truck,
  UsersRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import AppShell from '../layouts/AppShell'
import { getCaseSupplySummary, getReplenishmentAlerts } from '../domain/replenishment'
import { useDb } from '../lib/useDb'

type Tone = 'neutral' | 'info' | 'warning' | 'danger' | 'success'

const toneStyles: Record<
  Tone,
  {
    icon: string
    border: string
    value: string
    meta: string
  }
> = {
  neutral: {
    icon: 'bg-slate-800 text-slate-200 ring-1 ring-slate-700',
    border: 'border-slate-800/70',
    value: 'text-slate-50',
    meta: 'text-slate-400',
  },
  info: {
    icon: 'bg-sky-950/60 text-sky-200 ring-1 ring-sky-800/50',
    border: 'border-sky-800/50',
    value: 'text-slate-50',
    meta: 'text-slate-400',
  },
  warning: {
    icon: 'bg-amber-950/60 text-amber-200 ring-1 ring-amber-800/50',
    border: 'border-amber-700/50',
    value: 'text-amber-100',
    meta: 'text-slate-400',
  },
  danger: {
    icon: 'bg-red-950/60 text-red-200 ring-1 ring-red-800/50',
    border: 'border-red-700/50',
    value: 'text-red-100',
    meta: 'text-slate-400',
  },
  success: {
    icon: 'bg-emerald-950/60 text-emerald-200 ring-1 ring-emerald-800/50',
    border: 'border-emerald-700/50',
    value: 'text-emerald-100',
    meta: 'text-slate-400',
  },
}

function KpiCard(props: { title: string; value: string; meta: string; tone?: Tone; icon: ReactNode }) {
  const tone = props.tone ?? 'neutral'
  const styles = toneStyles[tone]
  return (
    <Card className={`border bg-slate-950/40 p-5 shadow-none backdrop-blur ${styles.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200">{props.title}</p>
          <p className={`mt-2 text-3xl font-semibold tracking-tight ${styles.value}`}>{props.value}</p>
          <p className={`mt-1 text-sm font-medium ${styles.meta}`}>{props.meta}</p>
        </div>
        <div className={`shrink-0 rounded-xl p-2 ${styles.icon}`}>{props.icon}</div>
      </div>
    </Card>
  )
}

function SectionHeader(props: { title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{props.title}</h2>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-50">{props.subtitle}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  // Dashboard layout is refactored; KPIs are mocked but some can be derived from DB when available.
  const { db } = useDb()

  const mock = {
    funnel: {
      scansRecent: 41,
      plansDone: 29,
      budgetsOpen: 8,
      contractsToClose: 4,
      pendingPlanning: ['Ana Paiva', 'Bruno Lima', 'Carla Souza', 'Diego Rocha', 'Elisa Martins', 'Fabio Nunes'],
      budgetsPending: ['Gustavo Reis', 'Helena Castro', 'Igor Santos'],
      contractsPending: ['Julia Mendes', 'Kaio Batista'],
    },
    production: {
      queue: 12,
      inProduction: 7,
      readyToDeliver: 5,
      reworks: 2,
      queuePatients: ['Ana Paiva', 'Bruno Lima', 'Carla Souza'],
      inProductionPatients: ['Diego Rocha', 'Elisa Martins'],
      readyPatients: ['Fabio Nunes', 'Gustavo Reis'],
      reworkPatients: ['Helena Castro', 'Igor Santos'],
    },
    portfolio: {
      inTreatment: 87,
      completed: 19,
    },
  }

  const planningPending = Math.max(0, mock.funnel.scansRecent - mock.funnel.plansDone)
  const planningPendingTone: Tone = planningPending > 0 ? (planningPending >= 10 ? 'danger' : 'warning') : 'success'
  const reworksTone: Tone = mock.production.reworks > 0 ? 'danger' : 'neutral'

  // "Reposicoes" (as you described) is the remaining aligners within closed-contract treatments:
  // planned total - delivered to patient (based on delivery lots/installation).
  const hasCases = db.cases.length > 0
  const closedContractCases = db.cases.filter((caseItem) => {
    const contractClosed = caseItem.contract?.status === 'aprovado'
    const phaseClosed = caseItem.phase === 'contrato_aprovado' || caseItem.phase === 'em_producao' || caseItem.phase === 'finalizado'
    return contractClosed || phaseClosed
  })
  const supplySummaries = closedContractCases.map((caseItem) => ({ caseItem, supply: getCaseSupplySummary(caseItem) }))
  const remainingTotal = supplySummaries.reduce((acc, item) => acc + item.supply.remaining, 0)
  const remainingCases = supplySummaries.filter((item) => item.supply.remaining > 0).length
  const replenishmentAlerts = closedContractCases.flatMap((caseItem) => getReplenishmentAlerts(caseItem))
  const overdueReplenishments = replenishmentAlerts.filter((item) => item.severity === 'urgent').length
  const dueSoonReplenishments = replenishmentAlerts.filter((item) => item.severity === 'high' || item.severity === 'medium').length
  const remainingTone: Tone = remainingTotal > 0 ? (overdueReplenishments > 0 ? 'danger' : dueSoonReplenishments > 0 ? 'warning' : 'info') : 'neutral'

  const pendingActions = [
    ...mock.funnel.pendingPlanning.slice(0, 4).map((name) => ({
      title: `Planejamento pendente: ${name}`,
      meta: 'Triagem / Setup digital',
      tone: 'warning' as const,
      href: '/app/scans',
    })),
    ...mock.funnel.budgetsPending.slice(0, 3).map((name) => ({
      title: `Orcamento em aberto: ${name}`,
      meta: 'Gerar/enviar proposta',
      tone: 'info' as const,
      href: '/app/cases',
    })),
    ...mock.funnel.contractsPending.slice(0, 3).map((name) => ({
      title: `Contrato a fechar: ${name}`,
      meta: 'Aguardando assinatura',
      tone: 'neutral' as const,
      href: '/app/cases',
    })),
    ...mock.production.reworkPatients.slice(0, 3).map((name) => ({
      title: `Reposicao (refacao): ${name}`,
      meta: 'Prioridade alta',
      tone: 'danger' as const,
      href: '/app/lab',
    })),
  ].slice(0, 8)

  return (
    <AppShell breadcrumb={['Inicio', 'Dashboard']}>
      <div className="rounded-3xl border border-slate-200 bg-slate-950 px-5 py-6 shadow-sm sm:px-6">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">OrthoScan | Painel Operacional</h1>
          <p className="mt-1 text-sm text-slate-400">Visao por gargalos e status de producao.</p>
        </section>

        <section className="mt-6">
          <SectionHeader title="Secao 1" subtitle="Funil Comercial e Planejamento (pendencias)" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Escaneamentos recentes"
              value={String(mock.funnel.scansRecent)}
              meta="Total recebido"
              tone="info"
              icon={<ScanLine className="h-4 w-4" />}
            />
            <KpiCard
              title="Planejamentos pendentes"
              value={String(planningPending)}
              meta={`${mock.funnel.plansDone} concluidos`}
              tone={planningPendingTone}
              icon={<ClipboardList className="h-4 w-4" />}
            />
            <KpiCard
              title="Orcamentos em aberto"
              value={String(mock.funnel.budgetsOpen)}
              meta="Planejamentos sem proposta"
              tone={mock.funnel.budgetsOpen > 0 ? 'warning' : 'neutral'}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiCard
              title="Contratos a fechar"
              value={String(mock.funnel.contractsToClose)}
              meta="Propostas enviadas"
              tone={mock.funnel.contractsToClose > 0 ? 'warning' : 'neutral'}
              icon={<FileSignature className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader title="Secao 2" subtitle="Status de Producao (chao de fabrica)" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Fila de confeccao"
              value={String(mock.production.queue)}
              meta="Aguardando inicio"
              tone={mock.production.queue > 0 ? 'warning' : 'neutral'}
              icon={<Factory className="h-4 w-4" />}
            />
            <KpiCard
              title="Em producao"
              value={String(mock.production.inProduction)}
              meta="Impressao / termoformagem"
              tone="info"
              icon={<Printer className="h-4 w-4" />}
            />
            <KpiCard
              title="Prontos p/ entrega"
              value={String(mock.production.readyToDeliver)}
              meta="Aguardando retirada"
              tone={mock.production.readyToDeliver > 0 ? 'success' : 'neutral'}
              icon={<Truck className="h-4 w-4" />}
            />
            <KpiCard
              title="Reposicoes (saldo de placas)"
              value={String(hasCases ? remainingTotal : mock.production.reworks)}
              meta={
                hasCases
                  ? `${remainingCases} tratamentos com saldo${overdueReplenishments > 0 ? ` | ${overdueReplenishments} atrasados` : ''}`
                  : 'Saldo pendente (mock)'
              }
              tone={hasCases ? remainingTone : reworksTone}
              icon={<BadgeAlert className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader title="Secao 3" subtitle="Carteira Geral" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Pacientes em tratamento"
              value={String(mock.portfolio.inTreatment)}
              meta="Ativos"
              tone="neutral"
              icon={<UsersRound className="h-4 w-4" />}
            />
            <KpiCard
              title="Casos concluidos"
              value={String(mock.portfolio.completed)}
              meta="Finalizados"
              tone="neutral"
              icon={<PackageCheck className="h-4 w-4" />}
            />
            <Card className="border border-slate-800/70 bg-slate-950/40 p-5 shadow-none backdrop-blur sm:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Proximas acoes</p>
                  <p className="mt-1 text-sm text-slate-400">Sugestao: tornar dinamico com base nos gargalos.</p>
                </div>
                <div className="rounded-xl bg-slate-800 p-2 text-slate-200 ring-1 ring-slate-700">
                  <Stethoscope className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gargalo atual</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">Planejamento pendente</p>
                  <p className="mt-1 text-xs text-slate-400">{planningPending} casos aguardando</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risco</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">Reposicoes</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {hasCases ? `${remainingTotal} placas em saldo` : `${mock.production.reworks} (mock)`}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="mt-8">
          <Card className="border border-slate-800/70 bg-slate-950/40 p-6 shadow-none backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">Acoes pendentes</h2>
                <p className="mt-1 text-sm text-slate-400">Lista baseada nos gargalos acima (mock).</p>
              </div>
              <Link
                to="/app/cases"
                className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
              >
                Ver casos
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pendingActions.length === 0 ? (
                <p className="text-sm text-slate-400">Sem pendencias no momento.</p>
              ) : (
                pendingActions.map((item) => (
                  <Link
                    key={item.title}
                    to={item.href}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 hover:bg-slate-900/40"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{item.meta}</p>
                    </div>
                    <span
                      className={
                        item.tone === 'danger'
                          ? 'rounded-full border border-red-800/60 bg-red-950/40 px-2 py-1 text-xs font-semibold text-red-200'
                          : item.tone === 'warning'
                            ? 'rounded-full border border-amber-800/60 bg-amber-950/40 px-2 py-1 text-xs font-semibold text-amber-200'
                            : item.tone === 'info'
                              ? 'rounded-full border border-sky-800/60 bg-sky-950/40 px-2 py-1 text-xs font-semibold text-sky-200'
                              : 'rounded-full border border-slate-700 bg-slate-900/40 px-2 py-1 text-xs font-semibold text-slate-200'
                      }
                    >
                      {item.tone === 'danger'
                        ? 'Critico'
                        : item.tone === 'warning'
                          ? 'Pendente'
                          : item.tone === 'info'
                            ? 'A fazer'
                            : 'Aguardando'}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  )
}
