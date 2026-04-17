import { formatPtBrDate, formatPtBrDateTime } from '../../../../shared/utils/date'
import type { Case } from '../../../../types/Case'
import { fileAvailability, scanArchLabelMap } from '../lib/caseDetailPresentation'

type CaseScanFileCardProps = {
  item: NonNullable<Case['scanFiles']>[number]
  labelOverride?: string
  canWriteLocalOnly: boolean
  onOpen: (item: NonNullable<Case['scanFiles']>[number]) => void
  onMarkError: (fileId: string) => void
  onClearError: (fileId: string) => void
}

export function CaseScanFileCard({
  item,
  labelOverride,
  canWriteLocalOnly,
  onOpen,
  onMarkError,
  onClearError,
}: CaseScanFileCardProps) {
  const availability = fileAvailability(item)
  const status = item.status ?? 'ok'
  const attachedDate = item.attachedAt ?? item.createdAt

  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm text-slate-900">{item.name}</p>
          <p className="text-xs text-slate-500">
            {labelOverride ?? (item.arch ? scanArchLabelMap[item.arch] : 'Arquivo')} - {formatPtBrDate(attachedDate)}
          </p>
          <p className="text-xs text-slate-500">Obs: {item.note || '-'}</p>
          {status === 'erro' ? (
            <p className="text-xs text-red-700">
              Motivo: {item.flaggedReason || '-'} | Em: {formatPtBrDateTime(item.flaggedAt)}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${status === 'erro' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {status === 'erro' ? 'ERRO' : 'OK'}
          </span>
          {availability.label === 'Abrir' ? (
            <button type="button" className="text-xs text-brand-700" onClick={() => onOpen(item)}>
              {availability.label}
            </button>
          ) : (
            <span className="text-xs text-slate-500">{availability.label}</span>
          )}
        </div>
      </div>
      {canWriteLocalOnly ? (
        <div className="mt-2">
          {status === 'erro' ? (
            <button type="button" className="text-xs font-semibold text-brand-700" onClick={() => onClearError(item.id)}>
              Desmarcar erro
            </button>
          ) : (
            <button type="button" className="text-xs font-semibold text-red-700" onClick={() => onMarkError(item.id)}>
              Marcar como erro
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
