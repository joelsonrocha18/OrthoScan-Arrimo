import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'
import Badge from '../Badge'
import Button from '../Button'
import Card from '../Card'
import type { LabItem } from '../../types/Lab'

type LabCardProps = {
  item: LabItem
  isOverdue: boolean
  guideTone: 'green' | 'yellow' | 'red'
  caseLabel?: string
  onPrevious: (id: string) => void
  onNext: (id: string) => void
  onDetails: (item: LabItem) => void
  hasPrevious: boolean
  hasNext: boolean
}

const priorityToneMap: Record<LabItem['priority'], 'neutral' | 'info' | 'danger'> = {
  Baixo: 'neutral',
  Medio: 'info',
  Urgente: 'danger',
}

const archLabelMap: Record<LabItem['arch'], string> = {
  superior: 'Superior',
  inferior: 'Inferior',
  ambos: 'Ambas',
}

function formatDate(dateIso: string) {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString('pt-BR')
}

export default function LabCard({
  item,
  isOverdue,
  guideTone: _guideTone,
  caseLabel: _caseLabel,
  onPrevious,
  onNext,
  onDetails,
  hasPrevious,
  hasNext,
}: LabCardProps) {
  const isRework = item.requestKind === 'reconfeccao' || (item.notes ?? '').toLowerCase().includes('rework')
  const cardTone = isRework ? 'border border-red-300 bg-red-50/40' : ''

  return (
    <Card className={`p-4 ${cardTone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {item.requestCode ? <p className="text-xs font-medium text-slate-600">Guia: {item.requestCode}</p> : null}
          <p className="text-sm font-semibold text-slate-900">Paciente: {item.patientName}</p>
          {!item.requestCode && !isRework ? (
            <p className="mt-1 text-xs text-slate-500">Placa #{item.trayNumber}</p>
          ) : null}
          {isRework ? (
            <div className="mt-1 space-y-0.5">
              <p className="text-xs font-semibold text-red-700">Rework solicitado</p>
              <p className="text-xs text-slate-700">Placa(s): #{item.trayNumber}</p>
              <p className="text-xs text-slate-700">Arcada: {archLabelMap[item.arch]}</p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          {isRework ? <Badge tone="danger">Rework</Badge> : null}
          <Badge tone={priorityToneMap[item.priority]}>{item.priority}</Badge>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <p className={isOverdue ? 'flex items-center gap-2 text-red-600' : 'flex items-center gap-2 text-slate-600'}>
          <CalendarClock className="h-3.5 w-3.5" />
          Prazo: {formatDate(item.dueDate)}
        </p>
        <p className="text-slate-600">
          Producao por arcada: Sup {item.plannedUpperQty ?? 0} | Inf {item.plannedLowerQty ?? 0}
        </p>
        {item.status === 'aguardando_iniciar' && (item.plannedUpperQty ?? 0) + (item.plannedLowerQty ?? 0) <= 0 ? (
          <Badge tone="danger" className="px-2 py-0.5 text-[10px]">Definir arcadas</Badge>
        ) : null}
        {isOverdue ? <Badge tone="danger" className="px-2 py-0.5 text-[10px]">Atrasado</Badge> : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => onPrevious(item.id)} disabled={!hasPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onNext(item.id)} disabled={!hasNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onDetails(item)}>
          Detalhes
        </Button>
      </div>
    </Card>
  )
}
