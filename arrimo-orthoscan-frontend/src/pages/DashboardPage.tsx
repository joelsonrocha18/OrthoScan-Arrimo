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

export default function DashboardPage() {
  const { db } = useDb()

  const scansRecentItems = db.scans
    .slice()
    .sort((a, b) => (b.scanDate || '').localeCompare(a.scanDate || ''))
  const scansRecent = scansRecentItems.length
  const planningPendingItems = scansRecentItems.filter((scan) => scan.status === 'pendente')
  const planningPending = planningPendingItems.length
  const plansDone = Math.max(0, scansRecent - planningPending)

  const budgetsOpenItems = db.cases.filter((caseItem) => caseItem.phase === 'orcamento')
  const contractsToCloseItems = db.cases.filter((caseItem) => caseItem.phase === 'contrato_pendente')

  const queueItems = db.labItems.filter((item) => item.status === 'aguardando_iniciar')
  const inProductionItems = db.labItems.filter((item) => item.status === 'em_producao' || item.status === 'controle_qualidade')
  const caseById = new Map(db.cases.map((caseItem) => [caseItem.id, caseItem]))
  const isReworkItem = (notes?: string, requestKind?: string) => {
    const note = (notes ?? '').toLowerCase()
    return requestKind === 'reconfeccao' || note.includes('rework') || note.includes('defeito') || note.includes('reconfecc')
  }
  const readyToDeliverItems = db.labItems.filter((item) => {
    if (!item.caseId) return false
    if ((item.requestKind ?? 'producao') !== 'producao') return false
    if (item.status !== 'prontas') return false
    if (isReworkItem(item.notes, item.requestKind)) return false
    const caseItem = caseById.get(item.caseId)
    const tray = caseItem?.trays.find((current) => current.trayNumber === item.trayNumber)
    return tray?.state === 'pronta'
  })
  const reworkItems = db.labItems.filter((item) => item.requestKind === 'reconfeccao' && item.status !== 'prontas')

  const inTreatmentCases = db.cases.filter((caseItem) => caseItem.phase !== 'finalizado' && caseItem.status !== 'finalizado')
  const completedCases = db.cases.filter((caseItem) => caseItem.phase === 'finalizado' || caseItem.status === 'finalizado')

  const planningPendingTone: Tone = planningPending > 0 ? (planningPending >= 10 ? 'danger' : 'warning') : 'success'
  const reworksTone: Tone = reworkItems.length > 0 ? 'danger' : 'neutral'

  const hasCases = db.cases.length > 0
  const closedContractCases = db.cases.filter((caseItem) => {
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
      title: `Planejamento pendente: ${item.patientName}`,
      meta: 'Triagem / setup digital',
      tone: 'warning' as const,
      href: '/app/scans',
    })),
    ...budgetsOpenItems.slice(0, 3).map((item) => ({
      title: `Orcamento em aberto: ${item.patientName}`,
      meta: 'Gerar/enviar proposta',
      tone: 'info' as const,
      href: '/app/cases',
    })),
    ...contractsToCloseItems.slice(0, 3).map((item) => ({
      title: `Contrato a fechar: ${item.patientName}`,
      meta: 'Aguardando assinatura',
      tone: 'neutral' as const,
      href: '/app/cases',
    })),
    ...reworkItems.slice(0, 3).map((item) => ({
      title: `Reposicao (refaccao): ${item.patientName}`,
      meta: 'Prioridade alta',
      tone: 'danger' as const,
      href: '/app/lab',
    })),
  ].slice(0, 8)

  const riskLabel =
    overdueReplenishments > 0
      ? `${overdueReplenishments} atrasados`
      : dueSoonReplenishments > 0
        ? `${dueSoonReplenishments} proximos`
        : 'Sem alertas'

  const nextActionsDescription =
    pendingActions.length > 0
      ? `${pendingActions.length} acoes pendentes`
      : 'Nenhuma acao pendente'

  return (
    <AppShell breadcrumb={['Inicio', 'Dashboard']}>
      <div className="rounded-3xl border border-slate-200 bg-slate-950 px-5 py-6 shadow-sm sm:px-6">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">OrthoScan | Painel Operacional</h1>
        </section>

        <section className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Escaneamentos recentes" value={String(scansRecent)} meta="Total recebido" tone="info" icon={<ScanLine className="h-4 w-4" />} />
            <KpiCard
              title="Planejamentos pendentes"
              value={String(planningPending)}
              meta={`${plansDone} concluidos`}
              tone={planningPendingTone}
              icon={<ClipboardList className="h-4 w-4" />}
            />
            <KpiCard
              title="Orcamentos em aberto"
              value={String(budgetsOpenItems.length)}
              meta="Planejamentos sem proposta"
              tone={budgetsOpenItems.length > 0 ? 'warning' : 'neutral'}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiCard
              title="Contratos a fechar"
              value={String(contractsToCloseItems.length)}
              meta="Propostas enviadas"
              tone={contractsToCloseItems.length > 0 ? 'warning' : 'neutral'}
              icon={<FileSignature className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Fila de confeccao"
              value={String(queueItems.length)}
              meta="Aguardando inicio"
              tone={queueItems.length > 0 ? 'warning' : 'neutral'}
              icon={<Factory className="h-4 w-4" />}
            />
            <KpiCard
              title="Em producao"
              value={String(inProductionItems.length)}
              meta="Impressao / termoformagem / CQ"
              tone="info"
              icon={<Printer className="h-4 w-4" />}
            />
            <KpiCard
              title="Prontos p/ entrega"
              value={String(readyToDeliverItems.length)}
              meta="Aguardando retirada"
              tone={readyToDeliverItems.length > 0 ? 'success' : 'neutral'}
              icon={<Truck className="h-4 w-4" />}
            />
            <KpiCard
              title="Reposicoes (saldo de placas)"
              value={String(hasCases ? remainingCases : reworkItems.length)}
              meta={
                hasCases
                  ? `${remainingCases} pacientes | Sup ${remainingByArch.sup} | Inf ${remainingByArch.inf}`
                  : `${reworkItems.length} reconfeccoes em aberto`
              }
              tone={hasCases ? remainingTone : reworksTone}
              icon={<BadgeAlert className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Pacientes em tratamento" value={String(inTreatmentCases.length)} meta="Ativos" tone="neutral" icon={<UsersRound className="h-4 w-4" />} />
            <KpiCard title="Casos concluidos" value={String(completedCases.length)} meta="Finalizados" tone="neutral" icon={<PackageCheck className="h-4 w-4" />} />
            <Card className="border border-slate-800/70 bg-slate-950/40 p-5 shadow-none backdrop-blur sm:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Proximas acoes</p>
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
                  <p className="mt-1 text-xs text-slate-400">{plansDone} concluidos</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risco</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">Reposicoes</p>
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
                <h2 className="text-lg font-semibold text-slate-50">Acoes pendentes</h2>
                <p className="mt-1 text-sm text-slate-400">Lista operacional de prioridades.</p>
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
                      {item.tone === 'danger' ? 'Critico' : item.tone === 'warning' ? 'Pendente' : item.tone === 'info' ? 'A fazer' : 'Aguardando'}
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
