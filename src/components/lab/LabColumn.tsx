import type { LabItem, LabStatus } from '../../types/Lab'
import LabCard from './LabCard'

type LabColumnProps = {
  title: string
  status: LabStatus
  items: LabItem[]
  isOverdue: (item: LabItem) => boolean
  guideTone: (item: LabItem) => 'green' | 'yellow' | 'red'
  caseLabel: (item: LabItem) => string | undefined
  productLabel: (item: LabItem) => string
  onPrevious: (id: string) => void
  onNext: (id: string) => void
  onDetails: (item: LabItem) => void
  onPrintLabel?: (item: LabItem) => void
  hasPreviousStatus: (status: LabStatus) => boolean
  hasNextStatus: (status: LabStatus) => boolean
}

const toneMap: Record<LabStatus, string> = {
  aguardando_iniciar: 'border-slate-200 border-t-4 border-t-slate-400 bg-white/70',
  em_producao: 'border-slate-200 border-t-4 border-t-sky-500 bg-white/70',
  controle_qualidade: 'border-slate-200 border-t-4 border-t-amber-500 bg-white/70',
  prontas: 'border-slate-200 border-t-4 border-t-emerald-500 bg-white/70',
}

export default function LabColumn({
  title,
  status,
  items,
  isOverdue,
  guideTone,
  caseLabel,
  productLabel,
  onPrevious,
  onNext,
  onDetails,
  onPrintLabel,
  hasPreviousStatus,
  hasNextStatus,
}: LabColumnProps) {
  return (
    <div className={`min-w-[280px] rounded-2xl border p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm ${toneMap[status]}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#1A202C]">{title}</h3>
        <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#4A5568] shadow-sm">{items.length}</span>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <LabCard
            key={item.id}
            item={item}
            isOverdue={isOverdue(item)}
            guideTone={guideTone(item)}
            caseLabel={caseLabel(item)}
            productLabel={productLabel(item)}
            onPrevious={onPrevious}
            onNext={onNext}
            onDetails={onDetails}
            onPrintLabel={onPrintLabel}
            hasPrevious={hasPreviousStatus(status)}
            hasNext={hasNextStatus(status)}
          />
        ))}
      </div>
    </div>
  )
}
