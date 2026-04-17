import Card from '../../../../components/Card'
import { formatPtBrDate } from '../../../../shared/utils/date'
import type { ReplenishmentAlert } from '../lib/caseDetailPresentation'

type ProgressSnapshot = {
  delivered: number
  total: number
}

type CaseReplenishmentForecastSectionProps = {
  visible: boolean
  hasUpperArch: boolean
  hasLowerArch: boolean
  progressUpper: ProgressSnapshot
  progressLower: ProgressSnapshot
  totalPlanned: number
  nextTrayRequired: number
  maxPlannedTrays: number
  nextReplacementDueDate?: string
  hasInstallation: boolean
  alerts: ReplenishmentAlert[]
}

export function CaseReplenishmentForecastSection({
  visible,
  hasUpperArch,
  hasLowerArch,
  progressUpper,
  progressLower,
  totalPlanned,
  nextTrayRequired,
  maxPlannedTrays,
  nextReplacementDueDate,
  hasInstallation,
  alerts,
}: CaseReplenishmentForecastSectionProps) {
  if (!visible) return null

  return (
    <section className="mt-6">
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Reposição prevista</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p>
            Entregue ao paciente:{' '}
            {hasUpperArch && hasLowerArch
              ? `Superior ${progressUpper.delivered}/${progressUpper.total} | Inferior ${progressLower.delivered}/${progressLower.total}`
              : hasUpperArch
                ? `Superior ${progressUpper.delivered}/${progressUpper.total}`
                : `Inferior ${progressLower.delivered}/${progressLower.total}`}
          </p>
          <p>Total geral planejado: {totalPlanned}</p>
          <p>Próxima placa necessária: {nextTrayRequired > 0 && nextTrayRequired <= maxPlannedTrays ? `#${nextTrayRequired}` : 'Nenhuma'}</p>
          <p>Próxima reposição: {nextReplacementDueDate ? formatPtBrDate(nextReplacementDueDate) : '-'}</p>
          {!hasInstallation ? <p className="text-sm text-slate-500">Registre a instalação para calcular a reposição.</p> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {alerts.length === 0 ? (
            <span className="text-xs text-slate-500">Sem alertas ativos.</span>
          ) : (
            alerts.map((alert) => (
              <span
                key={alert.id}
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  alert.severity === 'urgent'
                    ? 'bg-red-100 text-red-700'
                    : alert.severity === 'high'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                }`}
              >
                {alert.type === 'warning_15d' ? '15d' : alert.type === 'warning_10d' ? '10d' : 'atrasado'}
              </span>
            ))
          )}
        </div>
      </Card>
    </section>
  )
}
