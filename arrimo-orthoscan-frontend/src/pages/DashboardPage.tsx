import {
  BadgeAlert,
  CircleHelp,
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
import { listCasesForUser, listLabItemsForUser, listPatientsForUser, listScansForUser } from '../auth/scope'
import Card from '../components/Card'
import AppShell from '../layouts/AppShell'
import { getCaseSupplySummary, getReplenishmentAlerts } from '../domain/replenishment'
import { getCurrentUser } from '../lib/auth'
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

function KpiCard(props: { title: string; value: string; meta: string; info?: string; tone?: Tone; icon: ReactNode }) {
  const tone = props.tone ?? 'neutral'
  const styles = toneStyles[tone]
  return (
    <Card className={`border bg-slate-950/40 p-5 shadow-none backdrop-blur ${styles.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-200">{props.title}</p>
            {props.info ? (
              <span className="group relative inline-flex">
                <CircleHelp className="h-3.5 w-3.5 cursor-help text-slate-400 transition-colors group-hover:text-slate-200" />
                <span className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {props.info}
                </span>
              </span>
            ) : null}
          </div>
          <p className={`mt-2 text-3xl font-semibold tracking-tight ${styles.value}`}>{props.value}</p>
          <p className={`mt-1 text-sm font-medium ${styles.meta}`}>{props.meta}</p>
        </div>
        <div className={`shrink-0 rounded-xl p-2 ${styles.icon}`}>{props.icon}</div>
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const { db } = useDb()
  const currentUser = getCurrentUser(db)
  const dashboardHost = typeof window !== 'undefined' ? window.location.hostname : 'unknown-host'
  const envLabel = (import.meta.env.VITE_ENV_LABEL as string | undefined)?.trim() || dashboardHost
  const visiblePatients = listPatientsForUser(db, currentUser)
  const visibleScans = listScansForUser(db, currentUser)
  const visibleCases = listCasesForUser(db, currentUser)
  const visibleLabItems = listLabItemsForUser(db, currentUser)

  const scansRecentItems = visibleScans
    .slice()
    .sort((a, b) => (b.scanDate || '').localeCompare(a.scanDate || ''))
  const scansRecent = scansRecentItems.length
  const planningPendingItems = scansRecentItems.filter((scan) => scan.status === 'pendente')
  const planningPending = planningPendingItems.length
  const plansDone = Math.max(0, scansRecent - planningPending)

  const budgetsOpenItems = visibleCases.filter((caseItem) => caseItem.phase === 'orcamento')
  const contractsToCloseItems = visibleCases.filter((caseItem) => caseItem.phase === 'contrato_pendente')

  const caseById = new Map(visibleCases.map((caseItem) => [caseItem.id, caseItem]))
  const isReworkItem = (notes?: string, requestKind?: string) => {
    const note = (notes ?? '').toLowerCase()
    return requestKind === 'reconfeccao' || note.includes('rework') || note.includes('defeito') || note.includes('reconfecc')
  }
  const isExplicitRework = (requestKind?: string) => requestKind === 'reconfeccao'
  const hasRevisionSuffix = (code?: string) => /\/\d+$/.test(code ?? '')
  const isDeliveredToProfessional = (item: (typeof visibleLabItems)[number]) => {
    if (!item.caseId) return false
    if (item.status !== 'prontas') return false
    const caseItem = caseById.get(item.caseId)
    const hasAnyDeliveryLot = (caseItem?.deliveryLots?.length ?? 0) > 0
    if ((item.requestKind ?? 'producao') === 'producao' && hasAnyDeliveryLot && !hasRevisionSuffix(item.requestCode)) {
      return true
    }
    const tray = caseItem?.trays.find((current) => current.trayNumber === item.trayNumber)
    return tray?.state === 'entregue'
  }
  const pipelineItems = visibleLabItems.filter((item) => !isDeliveredToProfessional(item) && !isExplicitRework(item.requestKind))
  const queuePipelineItems = pipelineItems.filter((item) => item.status === 'aguardando_iniciar')
  const inProductionItems = pipelineItems.filter((item) => item.status === 'em_producao' || item.status === 'controle_qualidade')
  const readyToDeliverItems = pipelineItems.filter((item) => {
    if (!item.caseId) return false
    if (item.status !== 'prontas') return false
    const caseItem = caseById.get(item.caseId)
    const tray = caseItem?.trays.find((current) => current.trayNumber === item.trayNumber)
    if (isReworkItem(item.notes, item.requestKind)) {
      return tray?.state === 'rework' || tray?.state === 'pronta' || tray?.state === 'entregue'
    }
    return tray?.state === 'pronta' || tray?.state === 'rework'
  })
  const reworkItems = visibleLabItems.filter((item) => item.requestKind === 'reconfeccao' && item.status !== 'prontas')

  const completedCases = visibleCases.filter((caseItem) => caseItem.phase === 'finalizado' || caseItem.status === 'finalizado')

  const planningPendingTone: Tone = planningPending > 0 ? (planningPending >= 10 ? 'danger' : 'warning') : 'success'
  const reworksTone: Tone = reworkItems.length > 0 ? 'danger' : 'neutral'

  const hasCases = visibleCases.length > 0
  const closedContractCases = visibleCases.filter((caseItem) => {
    const contractClosed = caseItem.contract?.status === 'aprovado'
    const phaseClosed = caseItem.phase === 'contrato_aprovado' || caseItem.phase === 'em_producao' || caseItem.phase === 'finalizado'
    return contractClosed || phaseClosed
  })
  const supplySummaries = closedContractCases.map((caseItem) => ({ caseItem, supply: getCaseSupplySummary(caseItem) }))
  const remainingTotal = supplySummaries.reduce((acc, item) => acc + item.supply.remaining, 0)
  const remainingCases = supplySummaries.filter((item) => item.supply.remaining > 0).length
  const remainingByArch = closedContractCases.reduce(
    (acc, caseItem) => {
      const totalSup = caseItem.totalTraysUpper ?? caseItem.totalTrays
      const totalInf = caseItem.totalTraysLower ?? caseItem.totalTrays
      const deliveredSup = caseItem.installation?.deliveredUpper ?? 0
      const deliveredInf = caseItem.installation?.deliveredLower ?? 0
      acc.sup += Math.max(0, totalSup - deliveredSup)
      acc.inf += Math.max(0, totalInf - deliveredInf)
      return acc
    },
    { sup: 0, inf: 0 },
  )
  const replenishmentAlerts = closedContractCases.flatMap((caseItem) => getReplenishmentAlerts(caseItem))
  const overdueReplenishments = replenishmentAlerts.filter((item) => item.severity === 'urgent').length
  const dueSoonReplenishments = replenishmentAlerts.filter((item) => item.severity === 'high' || item.severity === 'medium').length
  const remainingTone: Tone = remainingTotal > 0 ? (overdueReplenishments > 0 ? 'danger' : dueSoonReplenishments > 0 ? 'warning' : 'info') : 'neutral'

  const pendingActions = [
    ...planningPendingItems.slice(0, 4).map((item) => ({
      key: `planning_${item.id}`,
      title: `Planejamento pendente: ${item.patientName}`,
      meta: 'Triagem / setup digital',
      osCode: item.serviceOrderCode ?? '-',
      tone: 'warning' as const,
      href: '/app/scans',
    })),
    ...budgetsOpenItems.slice(0, 3).map((item) => ({
      key: `budget_${item.id}`,
      title: `Orçamento em aberto: ${item.patientName}`,
      meta: 'Gerar/enviar proposta',
      osCode: item.treatmentCode ?? '-',
      tone: 'info' as const,
      href: '/app/alinhadores',
    })),
    ...contractsToCloseItems.slice(0, 3).map((item) => ({
      key: `contract_${item.id}`,
      title: `Contrato a fechar: ${item.patientName}`,
      meta: 'Aguardando assinatura',
      osCode: item.treatmentCode ?? '-',
      tone: 'neutral' as const,
      href: '/app/alinhadores',
    })),
    ...reworkItems.slice(0, 3).map((item) => ({
      key: `rework_${item.id}`,
      title: `Reposição (reconfecção): ${item.patientName}`,
      meta: 'Prioridade alta',
      osCode: item.requestCode ?? (item.caseId ? caseById.get(item.caseId)?.treatmentCode : undefined) ?? '-',
      tone: 'danger' as const,
      href: '/app/lab',
    })),
  ].slice(0, 8)

  const riskLabel =
    overdueReplenishments > 0
      ? `${overdueReplenishments} atrasados`
      : dueSoonReplenishments > 0
        ? `${dueSoonReplenishments} próximos`
        : 'Sem alertas'

  const nextActionsDescription =
    pendingActions.length > 0
      ? `${pendingActions.length} ações pendentes`
      : 'Nenhuma ação pendente'

  return (
    <AppShell breadcrumb={['Inicio', 'Dashboard']}>
      <div className="rounded-3xl border border-slate-200 bg-slate-950 px-5 py-6 shadow-sm sm:px-6">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">OrthoScan | Painel Operacional</h1>
          <div className="mt-3 rounded-xl border border-amber-500/60 bg-amber-950/30 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Ambiente de Validacao</p>
            <p className="mt-1 text-sm font-semibold text-amber-100">Dashboard ID: {envLabel}</p>
            <p className="mt-1 text-xs text-amber-200/80">Host atual: {dashboardHost}</p>
          </div>
        </section>

        <section className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Escaneamentos recentes"
              value={String(scansRecent)}
              meta="Total recebido"
              info="Origem: total de exames/escaneamentos visiveis para seu perfil."
              tone="info"
              icon={<ScanLine className="h-4 w-4" />}
            />
            <KpiCard
              title="Planejamentos pendentes"
              value={String(planningPending)}
              meta={`${plansDone} concluídos`}
              info="Origem: exames com status pendente na fila de scans."
              tone={planningPendingTone}
              icon={<ClipboardList className="h-4 w-4" />}
            />
            <KpiCard
              title="Orçamentos em aberto"
              value={String(budgetsOpenItems.length)}
              meta="Planejamentos sem proposta"
              info="Origem: casos na fase de orçamento."
              tone={budgetsOpenItems.length > 0 ? 'warning' : 'neutral'}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiCard
              title="Contratos a fechar"
              value={String(contractsToCloseItems.length)}
              meta="Propostas enviadas"
              info="Origem: casos na fase contrato pendente."
              tone={contractsToCloseItems.length > 0 ? 'warning' : 'neutral'}
              icon={<FileSignature className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Fila de confecção"
              value={String(queuePipelineItems.length)}
              meta="Aguardando início"
              info="Origem: itens da esteira com status aguardando_iniciar (exclui reconfeccao explicita e itens ja entregues)."
              tone={queuePipelineItems.length > 0 ? 'warning' : 'neutral'}
              icon={<Factory className="h-4 w-4" />}
            />
            <KpiCard
              title="Em produção"
              value={String(inProductionItems.length)}
              meta="Impressão / termoformagem / CQ"
              info="Origem: itens da esteira com status em_producao e controle_qualidade."
              tone="info"
              icon={<Printer className="h-4 w-4" />}
            />
            <KpiCard
              title="Prontos p/ entrega"
              value={String(readyToDeliverItems.length)}
              meta="Aguardando retirada"
              info="Origem: itens em prontas aptos para entrega ao profissional, incluindo rework."
              tone={readyToDeliverItems.length > 0 ? 'success' : 'neutral'}
              icon={<Truck className="h-4 w-4" />}
            />
            <KpiCard
              title="Reposições (saldo de placas)"
              value={String(hasCases ? remainingCases : reworkItems.length)}
              meta={
                hasCases
                  ? `${remainingCases} pacientes | Sup ${remainingByArch.sup} | Inf ${remainingByArch.inf}`
                  : `${reworkItems.length} reconfecções em aberto`
              }
              info="Origem: saldo de placas por paciente (planejado menos entregue ao paciente), separado por arcada."
              tone={hasCases ? remainingTone : reworksTone}
              icon={<BadgeAlert className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Pacientes em tratamento"
              value={String(visiblePatients.length)}
              meta="Ativos"
              info="Origem: pacientes visiveis para o perfil atual."
              tone="neutral"
              icon={<UsersRound className="h-4 w-4" />}
            />
            <KpiCard
              title="Casos concluídos"
              value={String(completedCases.length)}
              meta="Finalizados"
              info="Origem: casos com fase/status finalizado."
              tone="neutral"
              icon={<PackageCheck className="h-4 w-4" />}
            />
            <Card className="border border-slate-800/70 bg-slate-950/40 p-5 shadow-none backdrop-blur sm:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Próximas ações</p>
                  <p className="mt-1 text-sm text-slate-400">{nextActionsDescription}</p>
                </div>
                <div className="rounded-xl bg-slate-800 p-2 text-slate-200 ring-1 ring-slate-700">
                  <Stethoscope className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Planejamento</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{planningPending} pendentes</p>
                  <p className="mt-1 text-xs text-slate-400">{plansDone} concluídos</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risco</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">Reposições</p>
                  <p className="mt-1 text-xs text-slate-400">{riskLabel}</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="mt-8">
          <Card className="border border-slate-800/70 bg-slate-950/40 p-6 shadow-none backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">Ações pendentes</h2>
                <p className="mt-1 text-sm text-slate-400">Lista operacional de prioridades.</p>
              </div>
              <Link
                to="/app/alinhadores"
                className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
              >
                Ver casos
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pendingActions.length === 0 ? (
                <p className="text-sm text-slate-400">Sem pendências no momento.</p>
              ) : (
                pendingActions.map((item) => (
                  <Link
                    key={item.key}
                    to={item.href}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 hover:bg-slate-900/40"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-400">OS: {item.osCode}</p>
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
                      {item.tone === 'danger' ? 'Crítico' : item.tone === 'warning' ? 'Pendente' : item.tone === 'info' ? 'A fazer' : 'Aguardando'}
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

