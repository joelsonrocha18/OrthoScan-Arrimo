import Card from '../../../../components/Card'
import { formatPtBrDate } from '../../../../shared/utils/date'
import type { PatientPortalTimelineItem } from '../../domain/models/PatientPortal'

type PatientPortalTimelineSectionProps = {
  items: PatientPortalTimelineItem[]
}

const statusClasses: Record<PatientPortalTimelineItem['status'], string> = {
  done: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  today: 'border-brand-300 bg-baby-50 text-brand-700',
  upcoming: 'border-slate-300 bg-slate-50 text-slate-700',
  pending: 'border-[#f2b8b5] bg-[#fff1f1] text-[#9b2c2c]',
}

export function PatientPortalTimelineSection({ items }: PatientPortalTimelineSectionProps) {
  return (
    <section>
      <Card className="bg-white p-5 text-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold text-[#1A202C]">Linha do tempo do tratamento</h2>
        <p className="mt-1 text-sm text-slate-600">Cada etapa mostra a data da troca e se a selfie de acompanhamento ja foi confirmada.</p>

        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4A5568]">{formatPtBrDate(item.date)}</p>
                  <h3 className="mt-2 text-lg font-bold text-[#1A202C]">{item.title}</h3>
                  {item.trayNumber ? (
                    <p className="mt-2 text-sm text-slate-700">
                      <span className="font-semibold text-[#4A5568]">Alinhador:</span>{' '}
                      <span className="font-bold text-[#1A202C]">#{item.trayNumber}</span>
                    </p>
                  ) : null}
                  {item.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p> : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[item.status]}`}>
                    {item.status === 'done'
                      ? 'Concluido'
                      : item.status === 'today'
                        ? 'Hoje'
                        : item.status === 'upcoming'
                          ? 'Proximo'
                          : 'Pendente'}
                  </span>
                  {item.photoStatus ? (
                    <span className="rounded-full border border-[#d8ddc6] bg-[#f3f5ea] px-3 py-1 text-xs font-semibold text-[#5d6934]">
                      Foto {item.photoStatus}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
