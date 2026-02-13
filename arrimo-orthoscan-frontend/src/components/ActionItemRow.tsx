import { AlertCircle, Box, Truck } from 'lucide-react'
import Badge from './Badge'
import { cn } from '../lib/cn'

type PriorityTone = 'danger' | 'info' | 'neutral'
type ActionKind = 'rework' | 'tray' | 'delivery'

type ActionItemRowProps = {
  title: string
  priorityText: string
  priorityTone: PriorityTone
  kind: ActionKind
  kindLabel: string
}

const kindIconMap = {
  rework: AlertCircle,
  tray: Box,
  delivery: Truck,
} as const

const kindIconColorMap: Record<ActionKind, string> = {
  rework: 'text-red-600 bg-red-50',
  tray: 'text-brand-700 bg-brand-50',
  delivery: 'text-slate-600 bg-slate-100',
}

export default function ActionItemRow({
  title,
  priorityText,
  priorityTone,
  kind,
  kindLabel,
}: ActionItemRowProps) {
  const Icon = kindIconMap[kind]

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg p-2', kindIconColorMap[kind])}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{kindLabel}</p>
        </div>
      </div>
      <Badge tone={priorityTone}>{priorityText}</Badge>
    </div>
  )
}
