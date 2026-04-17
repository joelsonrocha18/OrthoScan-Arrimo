import Button from '../../../../components/Button'
import Card from '../../../../components/Card'

type CaseDangerZoneSectionProps = {
  visible: boolean
  onDeleteCase: () => void
}

export function CaseDangerZoneSection({ visible, onDeleteCase }: CaseDangerZoneSectionProps) {
  if (!visible) return null

  return (
    <section className="mt-6">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">Exclusão administrativa</p>
          <Button variant="secondary" className="text-red-600 hover:text-red-700" onClick={onDeleteCase}>
            Excluir pedido
          </Button>
        </div>
      </Card>
    </section>
  )
}
