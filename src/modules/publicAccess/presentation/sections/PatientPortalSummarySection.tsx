import Card from '../../../../components/Card'
import type { PatientPortalSummary } from '../../domain/models/PatientPortal'

type PatientPortalSummarySectionProps = {
  summary: PatientPortalSummary
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4A5568]">{label}</p>
      <p className="mt-2 text-lg font-bold text-[#1A202C]">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-600">{hint}</p> : null}
    </div>
  )
}

export function PatientPortalSummarySection({ summary }: PatientPortalSummarySectionProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="bg-white p-5 text-slate-900 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Troca a cada" value={summary.changeEveryDays > 0 ? `${summary.changeEveryDays} dias` : '-'} />
          <SummaryCard label="Próxima troca" value={summary.nextChangeDate ?? 'Sem previsão'} />
          <SummaryCard label="Última troca" value={summary.lastChangeDate ?? 'Sem registro'} />
          <SummaryCard label="Total de alinhadores" value={summary.totalTrays > 0 ? String(summary.totalTrays) : '-'} />
        </div>
      </Card>

      <Card className="bg-white p-5 text-slate-900 sm:p-6">
        <h2 className="text-lg font-semibold text-[#1A202C]">Informações do paciente</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4A5568]">Nome</p>
            <p className="mt-1 text-base font-bold text-[#1A202C]">{summary.patientName}</p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4A5568]">CPF</p>
            <p className="mt-1 text-base font-bold text-[#1A202C]">{summary.cpfMasked}</p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4A5568]">Nascimento</p>
            <p className="mt-1 text-base font-bold text-[#1A202C]">{summary.birthDate}</p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4A5568]">Caso ativo</p>
            <p className="mt-1 text-base font-bold text-[#1A202C]">{summary.activeCaseCode ?? '-'}</p>
          </div>
        </div>
      </Card>
    </section>
  )
}
