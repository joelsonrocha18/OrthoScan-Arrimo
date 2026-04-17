import Card from '../../../../components/Card'
import type { PatientPortalCalendarMonth } from '../../domain/models/PatientPortal'

type PatientPortalCalendarSectionProps = {
  months: PatientPortalCalendarMonth[]
}

const WEEK_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

export function PatientPortalCalendarSection({ months }: PatientPortalCalendarSectionProps) {
  return (
    <section>
      <Card className="bg-white p-5 text-slate-900 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#1A202C]">Calendário das trocas</h2>
          </div>
          <div className="rounded-full border border-brand-200 bg-baby-50 px-3 py-1 text-xs font-semibold text-brand-700">
            Azul = dia de troca
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {months.map((month) => (
            <div key={month.key} className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#4A5568]">{month.label}</h3>
              <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {WEEK_LABELS.map((label) => (
                  <div key={label}>{label}</div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {month.cells.map((cell, index) =>
                  cell ? (
                    <div
                      key={cell.isoDate}
                      className={[
                        'min-h-[72px] rounded-2xl border px-2 py-2 text-left shadow-sm transition',
                        cell.isChangeDay
                          ? 'border-brand-300 bg-baby-50 shadow-[0_10px_24px_-18px_rgba(1,82,125,0.45)]'
                          : 'border-slate-300 bg-white',
                        cell.isToday ? 'ring-2 ring-[#879547]/30' : '',
                      ].join(' ')}
                    >
                      <p className="text-sm font-bold text-[#1A202C]">{cell.dayNumber}</p>
                      {cell.trayNumbers.length > 0 ? (
                        <p className="mt-2 text-[11px] font-semibold text-brand-700">
                          Alinhador {cell.trayNumbers.join(', ')}
                        </p>
                      ) : (
                        <p className="mt-2 text-[11px] text-slate-400">Sem troca</p>
                      )}
                    </div>
                  ) : (
                    <div key={`empty-${month.key}-${index}`} className="min-h-[72px] rounded-2xl border border-transparent" />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
