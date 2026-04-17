import Card from '../../../../components/Card'
import type { LabOrder } from '../../domain/entities/LabOrder'

export function LabChecklistSection(props: {
  orders: LabOrder[]
  onToggle: (orderId: string, itemId: string, completed: boolean) => void
}) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Checklist de produção</h2>
        <p className="text-sm text-slate-500">Valide a execucao antes de avancar a etapa da OS.</p>
      </div>

      {props.orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
          Nenhuma OS com checklist pendente.
        </div>
      ) : (
        <div className="space-y-4">
          {props.orders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-slate-200 px-4 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{order.patientName}</p>
                  <p className="text-xs text-slate-500">{order.requestCode ?? order.id} | Placa #{order.trayNumber}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{order.status}</span>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {(order.productionChecklist?.items ?? []).map((item) => (
                  <label key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input type="checkbox" checked={item.completed} onChange={(event) => props.onToggle(order.id, item.id, event.target.checked)} />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
