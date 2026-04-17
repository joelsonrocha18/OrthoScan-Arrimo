import Button from '../../../../components/Button'
import { getNextDeliveryDueDate } from '../../../../domain/replenishment'
import type { Case } from '../../../../types/Case'
import type { LabOrder } from '../../domain/entities/LabOrder'
import {
  formatDate,
  formatFriendlyRequestCode,
  formatInfSupByArch,
  getCaseTotalsByArch,
  getDeliveredByArch,
  hasRemainingByArch,
  normalizeByTreatmentArch,
} from '../lib/labPresentation'

type LabRemainingBankTableSectionProps = {
  items: LabOrder[]
  caseById: Map<string, Case>
  resolveLabProductLabel: (item: LabOrder, caseItem?: Case) => string
  guideAutomationLeadDays: number
  canWrite: boolean
  onRequestAdvance: (item: LabOrder) => void
}

function minusDays(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T00:00:00`)
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

export function LabRemainingBankTableSection({
  items,
  caseById,
  resolveLabProductLabel,
  guideAutomationLeadDays,
  canWrite,
  onRequestAdvance,
}: LabRemainingBankTableSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Sem placas no banco de restante para os filtros atuais.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-semibold">OS</th>
                <th className="px-3 py-2 font-semibold">Paciente</th>
                <th className="px-3 py-2 font-semibold">Produto</th>
                <th className="px-3 py-2 font-semibold">Pedido (Inf/Sup)</th>
                <th className="px-3 py-2 font-semibold">Entregue ao paciente (Inf/Sup)</th>
                <th className="px-3 py-2 font-semibold">Saldo restante (Inf/Sup)</th>
                <th className="px-3 py-2 font-semibold">Data instalação</th>
                <th className="px-3 py-2 font-semibold">Previsão reposição LAB</th>
                <th className="px-3 py-2 font-semibold">Status do pedido</th>
                <th className="px-3 py-2 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const caseItem = item.caseId ? caseById.get(item.caseId) : undefined
                const treatmentArch = caseItem?.arch ?? item.arch ?? 'ambos'
                const totals = normalizeByTreatmentArch(getCaseTotalsByArch(caseItem), treatmentArch)
                const delivered = normalizeByTreatmentArch(getDeliveredByArch(caseItem), treatmentArch)
                const remaining = {
                  upper: Math.max(0, totals.upper - delivered.upper),
                  lower: Math.max(0, totals.lower - delivered.lower),
                }
                const installationDate = caseItem?.installation?.installedAt
                const nextAlignerStartDate = caseItem && hasRemainingByArch(caseItem) ? getNextDeliveryDueDate(caseItem) : null
                const replenishmentLabDate = nextAlignerStartDate ? minusDays(nextAlignerStartDate, guideAutomationLeadDays) : null
                const treatmentStatus =
                  caseItem?.status === 'finalizado'
                    ? 'Finalizado'
                    : installationDate
                      ? 'Em produção'
                      : 'Aguardando instalação'

                return (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{formatFriendlyRequestCode(caseItem?.treatmentCode ?? item.requestCode)}</td>
                    <td className="px-3 py-2">{item.patientName}</td>
                    <td className="px-3 py-2">{resolveLabProductLabel(item, caseItem)}</td>
                    <td className="px-3 py-2">{formatInfSupByArch(totals, treatmentArch)}</td>
                    <td className="px-3 py-2">{formatInfSupByArch(delivered, treatmentArch)}</td>
                    <td className="px-3 py-2">{formatInfSupByArch(remaining, treatmentArch)}</td>
                    <td className="px-3 py-2">{installationDate ? formatDate(installationDate) : '-'}</td>
                    <td className="px-3 py-2">{replenishmentLabDate ? formatDate(replenishmentLabDate) : '-'}</td>
                    <td className="px-3 py-2">{treatmentStatus}</td>
                    <td className="px-3 py-2">
                      {canWrite && item.caseId ? (
                        <Button size="sm" variant="secondary" onClick={() => onRequestAdvance(item)}>
                          Solicitar reposição
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
