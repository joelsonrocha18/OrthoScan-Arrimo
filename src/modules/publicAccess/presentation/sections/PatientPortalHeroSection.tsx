import Card from '../../../../components/Card'
import type { PatientPortalSummary } from '../../domain/models/PatientPortal'

type PatientPortalHeroSectionProps = {
  summary: PatientPortalSummary
  accessCode: string
}

export function PatientPortalHeroSection({ summary, accessCode }: PatientPortalHeroSectionProps) {
  return (
    <Card className="app-login-card border p-5 text-white sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#eef6d8]">Portal do paciente</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">{summary.patientName}</h1>
        </div>
        <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-baby-100/84">Código do tratamento</p>
          <p className="mt-2 text-lg font-semibold text-white">{accessCode || '-'}</p>
        </div>
      </div>
    </Card>
  )
}
