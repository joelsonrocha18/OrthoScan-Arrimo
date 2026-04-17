import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'
import Badge from '../Badge'
import Button from '../Button'
import Card from '../Card'
import type { LabItem } from '../../types/Lab'
import { isAlignerProductType, PRODUCT_TYPE_LABEL } from '../../types/Product'

type LabCardProps = {
  item: LabItem
  isOverdue: boolean
  guideTone: 'green' | 'yellow' | 'red'
  caseLabel?: string
  productLabel?: string
  onPrevious: (id: string) => void
  onNext: (id: string) => void
  onDetails: (item: LabItem) => void
  onPrintLabel?: (item: LabItem) => void
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

const infoLabelClassName = 'font-medium text-[#4A5568]'
const infoValueClassName = 'font-bold text-[#1A202C]'

const priorityAccentClassMap: Record<LabItem['priority'], string> = {
  Baixo: 'border border-slate-300 bg-slate-100 text-slate-700 px-3 py-1 text-xs font-semibold',
  Medio: 'border border-sky-300 bg-sky-100 text-sky-800 px-3 py-1 text-xs font-semibold',
  Urgente: 'border border-[rgba(221,107,32,0.28)] bg-[rgba(221,107,32,0.16)] px-3 py-1 text-xs font-semibold text-[#9C4221]',
}

function formatDate(dateIso: string) {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString('pt-BR')
}

function productionByArchLabel(item: LabItem) {
  const upper = item.plannedUpperQty ?? 0
  const lower = item.plannedLowerQty ?? 0
  if (item.arch === 'superior') return `Produção por arcada: Sup ${upper}`
  if (item.arch === 'inferior') return `Produção por arcada: Inf ${lower}`
  return `Produção por arcada: Sup ${upper} | Inf ${lower}`
}

function priorityLabel(priority: LabItem['priority']) {
  return priority === 'Medio' ? 'Médio' : priority
}

export default function LabCard({
  item,
  isOverdue,
  guideTone: _guideTone,
  caseLabel,
  productLabel,
  onPrevious,
  onNext,
  onDetails,
  onPrintLabel,
  hasPrevious,
  hasNext,
}: LabCardProps) {
  const formatDisplayCode = (code?: string) => {
    if (!code) return undefined
    return code.trim()
  }
  const displayCode = formatDisplayCode(caseLabel ?? item.requestCode)
  const isRework = item.requestKind === 'reconfeccao' || (item.notes ?? '').toLowerCase().includes('rework')
  const isAligner = isAlignerProductType(item.productId ?? item.productType ?? 'alinhador_12m')
  const cardTone = isRework ? 'border-red-300' : 'border-slate-200'

  return (
    <Card className={`bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ${cardTone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {displayCode ? (
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#4A5568]">
              Guia: <span className="font-bold text-[#1A202C]">{displayCode}</span>
            </p>
          ) : null}
          <p className="mt-1 text-[17px] font-bold leading-5 text-[#1A202C]">{item.patientName}</p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-sm">
            <span className={infoLabelClassName}>Produto:</span>
            <span className={infoValueClassName}>{productLabel ?? PRODUCT_TYPE_LABEL[item.productType ?? 'alinhador_12m']}</span>
          </p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-sm">
            <span className={infoLabelClassName}>Arcada:</span>
            <span className={infoValueClassName}>{archLabelMap[item.arch]}</span>
          </p>
          {isAligner && !item.requestCode && !isRework ? (
            <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-sm">
              <span className={infoLabelClassName}>Placa:</span>
              <span className={infoValueClassName}>#{item.trayNumber}</span>
            </p>
          ) : null}
          {isRework ? (
            <div className="mt-1 space-y-0.5">
              <p className="text-sm font-semibold text-[#9B2C2C]">Reconfecção solicitada</p>
              {isAligner ? (
                <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-sm">
                  <span className={infoLabelClassName}>Placa(s):</span>
                  <span className={infoValueClassName}>#{item.trayNumber}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          {isRework ? (
            <Badge tone="danger" className="border border-[rgba(197,48,48,0.28)] bg-[rgba(229,62,62,0.14)] px-3 py-1 text-xs font-semibold text-[#742A2A]">
              Reconfecção
            </Badge>
          ) : null}
          <Badge tone={priorityToneMap[item.priority]} className={priorityAccentClassMap[item.priority]}>
            {priorityLabel(item.priority)}
          </Badge>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-sm">
        <p className="flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5" />
          <span className={infoLabelClassName}>Prazo:</span>
          <span className={isOverdue ? 'font-bold text-[#9B2C2C]' : infoValueClassName}>{formatDate(item.dueDate)}</span>
        </p>
        {isAligner ? (
          <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-sm">
            <span className={infoLabelClassName}>Produção:</span>
            <span className={infoValueClassName}>{productionByArchLabel(item)}</span>
          </p>
        ) : null}
        {isAligner && item.status === 'aguardando_iniciar' && (item.plannedUpperQty ?? 0) + (item.plannedLowerQty ?? 0) <= 0 ? (
          <Badge tone="danger" className="border border-[rgba(180,83,9,0.24)] bg-[rgba(245,158,11,0.14)] px-3 py-1 text-xs font-semibold text-[#92400E]">
            Definir arcadas
          </Badge>
        ) : null}
        {isOverdue ? (
          <Badge tone="danger" className="border border-[rgba(197,48,48,0.28)] bg-[rgba(229,62,62,0.16)] px-3 py-1 text-xs font-semibold text-[#742A2A]">
            Atrasado
          </Badge>
        ) : null}
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
        <div className="flex items-center gap-2">
          {item.status === 'prontas' && onPrintLabel ? (
            <Button size="sm" variant="secondary" onClick={() => onPrintLabel(item)}>
              Imprimir adesivo
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => onDetails(item)}>
            Detalhes
          </Button>
        </div>
      </div>
    </Card>
  )
}
