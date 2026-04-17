import Button from '../../../../components/Button'
import Card from '../../../../components/Card'
import Input from '../../../../components/Input'
import type { LabOrder } from '../../domain/entities/LabOrder'

type LabAdvanceModalProps = {
  open: boolean
  target: LabOrder | null
  upperQty: string
  lowerQty: string
  onUpperQtyChange: (value: string) => void
  onLowerQtyChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

export function LabAdvanceModal({
  open,
  target,
  upperQty,
  lowerQty,
  onUpperQtyChange,
  onLowerQtyChange,
  onClose,
  onConfirm,
}: LabAdvanceModalProps) {
  if (!open || !target) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <Card className="w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-900">Solicitar reposição</h3>
        <p className="mt-1 text-sm text-slate-500">
          {target.patientName} - {target.requestCode ?? `Placa #${target.trayNumber}`}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Qtd Sup</label>
            <Input type="number" min={0} value={upperQty} onChange={(event) => onUpperQtyChange(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Qtd Inf</label>
            <Input type="number" min={0} value={lowerQty} onChange={(event) => onLowerQtyChange(event.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>Gerar guia</Button>
        </div>
      </Card>
    </div>
  )
}
