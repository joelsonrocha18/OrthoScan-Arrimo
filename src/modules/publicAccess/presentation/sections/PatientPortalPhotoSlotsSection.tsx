import Card from '../../../../components/Card'
import { formatPtBrDate } from '../../../../shared/utils/date'
import type { PatientPortalPhotoSlot } from '../../domain/models/PatientPortal'

type PatientPortalPhotoSlotsSectionProps = {
  photoSlots: PatientPortalPhotoSlot[]
}

const slotClasses: Record<PatientPortalPhotoSlot['status'], string> = {
  recebida: 'border-emerald-200 bg-emerald-50',
  pendente: 'border-[#f2b8b5] bg-[#fff1f1]',
  aguardando: 'border-slate-300 bg-slate-50',
}

export function PatientPortalPhotoSlotsSection({ photoSlots }: PatientPortalPhotoSlotsSectionProps) {
  return (
    <section>
      <Card className="bg-white p-5 text-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold text-[#1A202C]">Confirmações por alinhador</h2>

        <div className="mt-5 grid gap-3 grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3">
          {photoSlots.map((slot) => (
            <div key={slot.id} className={`min-w-0 overflow-hidden rounded-2xl border p-4 shadow-sm ${slotClasses[slot.status]}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4A5568]">Alinhador #{slot.trayNumber}</p>
              <p className="mt-2 text-base font-bold text-[#1A202C]">{formatPtBrDate(slot.plannedDate)}</p>
              <p className="mt-2 text-sm text-slate-700">
                <span className="font-semibold text-[#4A5568]">Slot:</span>{' '}
                <span className="font-bold text-[#1A202C]">
                  {slot.status === 'recebida'
                    ? 'Confirmado'
                    : slot.status === 'pendente'
                      ? 'Aguardando confirmação'
                      : 'Janela futura'}
                </span>
              </p>
              <p className="mt-2 text-sm text-slate-600">{slot.title}</p>
              {slot.recordedAt ? (
                <p className="mt-2 text-xs font-semibold text-emerald-800">Registrada em {formatPtBrDate(slot.recordedAt)}</p>
              ) : null}
              {slot.note ? <p className="mt-2 break-words text-xs text-slate-600">{slot.note}</p> : null}
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
