import Button from '../../../../components/Button'
import Card from '../../../../components/Card'

type CaseStateCardProps = {
  title: string
  message: string
  actionLabel: string
  onAction: () => void
}

export function CaseStateCard({ title, message, actionLabel, onAction }: CaseStateCardProps) {
  return (
    <Card>
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <Button className="mt-4" onClick={onAction}>
        {actionLabel}
      </Button>
    </Card>
  )
}
