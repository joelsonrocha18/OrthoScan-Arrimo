import type { Case } from '../../../../types/Case'
import type { LabOrder } from '../../domain/entities/LabOrder'
import { formatDate, formatFriendlyRequestCode } from '../lib/labPresentation'

type LabReworkTableSectionProps = {
  items: LabOrder[]
  caseById: Map<string, Case>
}

export function LabReworkTableSection({ items, caseById }: LabReworkTableSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma placa com defeito encontrada com os filtros atuais.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-semibold">OS</th>
                <th className="px-3 py-2 font-semibold">Paciente</th>
                <th className="px-3 py-2 font-semibold">Placa</th>
                <th className="px-3 py-2 font-semibold">Arcada</th>
                <th className="px-3 py-2 font-semibold">Prazo</th>
                <th className="px-3 py-2 font-semibold">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    {formatFriendlyRequestCode((item.caseId ? caseById.get(item.caseId)?.treatmentCode : undefined) ?? item.requestCode)}
                  </td>
                  <td className="px-3 py-2">{item.patientName}</td>
                  <td className="px-3 py-2">#{item.trayNumber}</td>
                  <td className="px-3 py-2">{item.arch}</td>
                  <td className="px-3 py-2">{formatDate(item.dueDate)}</td>
                  <td className="px-3 py-2">{item.notes || 'Reavaliar item em controle de qualidade.'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
