import Card from './Card'
import ActionItemRow from './ActionItemRow'

type ActionPanelItem = {
  title: string
  priorityText: string
  priorityTone: 'danger' | 'info' | 'neutral'
  kind: 'rework' | 'tray' | 'delivery'
  kindLabel: string
}

type ActionsPanelProps = {
  items: ActionPanelItem[]
}

export default function ActionsPanel({ items }: ActionsPanelProps) {
  return (
    <Card className="p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Ações Pendentes</h2>
        <p className="mt-1 text-sm text-slate-500">Itens que precisam de atenção</p>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <ActionItemRow
            key={item.title}
            title={item.title}
            priorityText={item.priorityText}
            priorityTone={item.priorityTone}
            kind={item.kind}
            kindLabel={item.kindLabel}
          />
        ))}
      </div>
    </Card>
  )
}
