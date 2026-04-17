import Button from '../../../../components/Button'
import Card from '../../../../components/Card'

type LabProductionConfirmModalProps = {
  open: boolean
  productLabel: string
  archLabel: string
  onCancel: () => void
  onConfirm: () => void
}

export function LabProductionConfirmModal({
  open,
  productLabel,
  archLabel,
  onCancel,
  onConfirm,
}: LabProductionConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <Card className="w-full max-w-lg">
        <h3 className="text-lg font-semibold text-slate-900">Confirmar início da produção</h3>
        <p className="mt-2 text-sm text-slate-600">
          Confirmar produção de {productLabel} para arcada {archLabel}?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>Confirmar</Button>
        </div>
      </Card>
    </div>
  )
}
