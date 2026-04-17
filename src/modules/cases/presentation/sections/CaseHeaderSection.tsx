import { Link } from 'react-router-dom'
import Badge from '../../../../components/Badge'
import Button from '../../../../components/Button'

type ProgressCard = {
  label: string
  delivered: number
  total: number
  percent: number
  caption: string
}

type CaseHeaderSectionProps = {
  patientDisplayName: string
  identification?: string
  productLine: string
  planningLine: string
  statusLabel: string
  statusTone: 'neutral' | 'info' | 'success' | 'danger'
  updatedAtLabel: string
  progressCards: ProgressCard[]
  summaryLines: string[]
  canSharePatientPortalAccess: boolean
  onSharePatientPortalAccess: () => void
  canConcludeTreatmentManually: boolean
  onConcludeTreatment: () => void
}

export function CaseHeaderSection({
  patientDisplayName,
  identification,
  productLine,
  planningLine,
  statusLabel,
  statusTone,
  updatedAtLabel,
  progressCards,
  summaryLines,
  canSharePatientPortalAccess,
  onSharePatientPortalAccess,
  canConcludeTreatmentManually,
  onConcludeTreatment,
}: CaseHeaderSectionProps) {
  return (
    <>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[34px] font-bold tracking-tight text-[#1A202C]">Paciente: {patientDisplayName}</h1>
          {identification ? <p className="ui-copy-muted mt-1 text-sm font-semibold">{identification}</p> : null}
          <p className="mt-1 text-sm">
            <span className="ui-label">Produto:</span> <span className="ui-value">{productLine}</span>
          </p>
          <p className="mt-2 text-sm">
            <span className="ui-label">Planejamento:</span> <span className="ui-value">{planningLine}</span>
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Badge tone={statusTone}>{statusLabel}</Badge>
            <span className="text-xs">
              <span className="ui-label">Última atualização:</span> <span className="ui-value">{updatedAtLabel}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!canSharePatientPortalAccess}
            onClick={canSharePatientPortalAccess ? onSharePatientPortalAccess : undefined}
          >
            Encaminhar acesso
          </Button>
          {canConcludeTreatmentManually ? (
            <Button type="button" onClick={onConcludeTreatment}>
              Concluir tratamento
            </Button>
          ) : null}
          <Link
            to="/app/cases"
            className="inline-flex h-10 items-center rounded-lg bg-slate-200 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-300"
          >
            Voltar
          </Link>
        </div>
      </section>

      <section className={`mt-6 grid grid-cols-1 gap-4 ${progressCards.length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {progressCards.map((card) => (
          <div key={card.label} className="ui-surface-panel rounded-2xl p-5">
            <p className="ui-copy-muted text-sm">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#1A202C]">
              {card.delivered}/{card.total}
            </p>
            <div className="mt-3 h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-brand-500" style={{ width: `${card.percent}%` }} />
            </div>
            <p className="ui-copy-muted mt-2 text-xs">{card.caption}</p>
          </div>
        ))}

        <div className="ui-surface-panel rounded-2xl p-5">
          <p className="ui-copy-muted text-sm">Resumo</p>
          {summaryLines.map((line) => (
            <p key={line} className="mt-2 text-sm font-semibold text-[#1A202C]">
              {line}
            </p>
          ))}
        </div>
      </section>
    </>
  )
}
