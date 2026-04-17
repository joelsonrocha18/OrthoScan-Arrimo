import { formatPtBrDate } from '../../../../shared/utils/date'
import type { CaseAttachment } from '../../../../types/Case'

type CaseAttachmentCardProps = {
  item: CaseAttachment
}

export function CaseAttachmentCard({ item }: CaseAttachmentCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-slate-900">{item.name}</p>
        <p className="text-xs text-slate-500">
          {item.type} - {formatPtBrDate(item.createdAt)}
        </p>
        <p className="text-xs text-slate-500">
          Data anexo: {item.attachedAt ? formatPtBrDate(item.attachedAt) : '-'} | Obs: {item.note || '-'}
        </p>
      </div>
      {item.url.startsWith('blob:') ? (
        <span className="text-xs text-slate-500">(arquivo local)</span>
      ) : item.url ? (
        <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-700 hover:text-brand-500">
          Abrir
        </a>
      ) : (
        <span className="text-xs text-slate-500">(arquivo local)</span>
      )}
    </div>
  )
}
