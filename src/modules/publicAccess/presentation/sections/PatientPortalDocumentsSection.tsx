import Card from '../../../../components/Card'
import { formatPtBrDate } from '../../../../shared/utils/date'
import type { PatientPortalDocument } from '../../domain/models/PatientPortal'

type PatientPortalDocumentsSectionProps = {
  documents: PatientPortalDocument[]
}

export function PatientPortalDocumentsSection({ documents }: PatientPortalDocumentsSectionProps) {
  const visibleDocuments = documents.filter((document) => document.category === 'foto' && document.source === 'patient_portal')

  return (
    <section>
      <Card className="bg-white p-5 text-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold text-[#1A202C]">Fotos confirmadas</h2>

        <div className="mt-5 space-y-3">
          {visibleDocuments.length === 0 ? (
            <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Nenhuma foto confirmada registrada.
            </div>
          ) : (
            visibleDocuments.map((document) => (
              <div key={document.id} className="min-w-0 overflow-hidden rounded-2xl border border-slate-300 bg-white px-4 py-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4A5568]">{document.category}</p>
                    <p className="mt-1 text-base font-bold text-[#1A202C]">{document.title}</p>
                    <p className="mt-2 text-sm text-slate-600">Registrado em {formatPtBrDate(document.createdAt)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {document.trayNumber ? (
                        <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                          Alinhador #{document.trayNumber}
                        </span>
                      ) : null}
                      {document.capturedAt ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                          Foto em {formatPtBrDate(document.capturedAt)}
                        </span>
                      ) : null}
                      {document.source === 'patient_portal' ? (
                        <span className="rounded-full border border-olive-200 bg-olive-50 px-3 py-1 text-xs font-semibold text-olive-700">
                          Enviado pelo paciente
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {document.fileName ? (
                    <span className="max-w-full break-all rounded-full border border-baby-200 bg-baby-50 px-3 py-1 text-xs font-semibold text-brand-700">
                      {document.fileName}
                    </span>
                  ) : null}
                </div>
                {document.note ? <p className="mt-3 break-words text-sm text-slate-600">{document.note}</p> : null}
              </div>
            ))
          )}
        </div>
      </Card>
    </section>
  )
}
