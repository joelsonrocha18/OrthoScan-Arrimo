import Button from '../../../../components/Button'
import Card from '../../../../components/Card'
import Input from '../../../../components/Input'
import { formatPtBrDate } from '../../../../shared/utils/date'

type CaseReplacementSectionProps = {
  totalContratado: number
  entreguePaciente: number
  saldoRestante: number
  currentInstallation?: {
    installedAt: string
    deliveredUpper?: number
    deliveredLower?: number
  }
  hasUpperArch: boolean
  hasLowerArch: boolean
  readyUpper: number
  readyLower: number
  installationDate: string
  installationNote: string
  installationDeliveredUpper: string
  installationDeliveredLower: string
  totalUpper: number
  totalLower: number
  canWrite: boolean
  hasProductionOrder: boolean
  hasDentistDelivery: boolean
  onInstallationDateChange: (value: string) => void
  onInstallationNoteChange: (value: string) => void
  onInstallationDeliveredUpperChange: (value: string) => void
  onInstallationDeliveredLowerChange: (value: string) => void
  onSaveInstallation: () => void
}

export function CaseReplacementSection({
  totalContratado,
  entreguePaciente,
  saldoRestante,
  currentInstallation,
  hasUpperArch,
  hasLowerArch,
  readyUpper,
  readyLower,
  installationDate,
  installationNote,
  installationDeliveredUpper,
  installationDeliveredLower,
  totalUpper,
  totalLower,
  canWrite,
  hasProductionOrder,
  hasDentistDelivery,
  onInstallationDateChange,
  onInstallationNoteChange,
  onInstallationDeliveredUpperChange,
  onInstallationDeliveredLowerChange,
  onSaveInstallation,
}: CaseReplacementSectionProps) {
  return (
    <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Pedido e reposição ao paciente</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            Total contratado: <span className="font-semibold">{totalContratado}</span>
          </div>
          <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">
            Entregue ao paciente: <span className="font-semibold">{entreguePaciente}</span>
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Saldo no banco: <span className="font-semibold">{saldoRestante}</span>
          </div>
        </div>

        <div className="mt-3 grid gap-3">
          {currentInstallation ? (
            <p className="text-sm text-slate-700">
              Registro atual: {formatPtBrDate(currentInstallation.installedAt)} |{' '}
              {hasUpperArch && hasLowerArch
                ? `Sup ${currentInstallation.deliveredUpper ?? 0} | Inf ${currentInstallation.deliveredLower ?? 0}`
                : hasUpperArch
                  ? `Sup ${currentInstallation.deliveredUpper ?? 0}`
                  : `Inf ${currentInstallation.deliveredLower ?? 0}`}
            </p>
          ) : null}

          {readyUpper > 0 || readyLower > 0 ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Prontas para entrega ao paciente (saldo do profissional):{' '}
              {hasUpperArch && hasLowerArch
                ? `Sup ${readyUpper} | Inf ${readyLower}`
                : hasUpperArch
                  ? `Sup ${readyUpper}`
                  : `Inf ${readyLower}`}
            </p>
          ) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Sem saldo pronto para entrega ao paciente no momento.
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {currentInstallation ? 'Data da entrega ao paciente' : 'Data da instalação inicial'}
            </label>
            <Input type="date" value={installationDate} onChange={(event) => onInstallationDateChange(event.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Observação</label>
            <textarea
              rows={3}
              value={installationNote}
              onChange={(event) => onInstallationNoteChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className={`grid grid-cols-1 gap-3 ${hasUpperArch && hasLowerArch ? 'sm:grid-cols-2' : ''}`}>
            {hasUpperArch ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Entrega paciente - Superior</label>
                <Input
                  type="number"
                  min={0}
                  max={totalUpper}
                  value={installationDeliveredUpper}
                  onChange={(event) => onInstallationDeliveredUpperChange(event.target.value)}
                />
              </div>
            ) : null}
            {hasLowerArch ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Entrega paciente - Inferior</label>
                <Input
                  type="number"
                  min={0}
                  max={totalLower}
                  value={installationDeliveredLower}
                  onChange={(event) => onInstallationDeliveredLowerChange(event.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div>
            <Button
              size="sm"
              onClick={onSaveInstallation}
              disabled={!canWrite || !hasProductionOrder || !hasDentistDelivery}
              title={
                !hasProductionOrder
                  ? 'Gere a OS do LAB antes.'
                  : !hasDentistDelivery
                    ? 'Registre a entrega ao dentista antes.'
                    : ''
              }
            >
              {currentInstallation ? 'Registrar reposição ao paciente' : 'Registrar instalação inicial'}
            </Button>
            {!hasProductionOrder ? <p className="mt-2 text-xs text-amber-700">A ordem de serviço do LAB ainda não foi gerada.</p> : null}
            {!hasDentistDelivery ? <p className="mt-1 text-xs text-amber-700">Registre antes a entrega ao dentista.</p> : null}
          </div>
        </div>
      </Card>
    </section>
  )
}
