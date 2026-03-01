import Button from '../Button'
import Card from '../Card'

type AiEditableModalProps = {
  open: boolean
  title: string
  value: string
  loading?: boolean
  onChange: (value: string) => void
  onClose: () => void
  onSave: () => void
  saveLabel: string
}

export default function AiEditableModal(props: AiEditableModalProps) {
  if (!props.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <Card className="w-full max-w-3xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">{props.title}</h3>
          <Button variant="ghost" size="sm" onClick={props.onClose}>
            Fechar
          </Button>
        </div>
        <textarea
          rows={12}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          disabled={props.loading}
          className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={props.onClose}>
            Cancelar
          </Button>
          <Button onClick={props.onSave} disabled={props.loading || !props.value.trim()}>
            {props.saveLabel}
          </Button>
        </div>
      </Card>
    </div>
  )
}
