import { Link2Off, MailCheck } from 'lucide-react'
import Card from '../../../../components/Card'
import Button from '../../../../components/Button'
import type { PatientAccessPreview } from '../../application/ports/PatientAccessRepository'

type PatientAccessPreviewCardProps = {
  preview: PatientAccessPreview
  loading?: boolean
  onClear: () => void
}

export function PatientAccessPreviewCard({ preview, loading, onClear }: PatientAccessPreviewCardProps) {
  return (
    <Card className="app-login-card border p-5 text-white sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#eef6d8]">
            {loading ? 'Link validado' : 'Paciente identificado'}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{preview.patientName}</h2>
          <p className="mt-2 text-sm text-slate-200/82">CPF {preview.cpfMasked} • Nascimento {preview.birthDate}</p>
        </div>
        <button type="button" onClick={onClear} className="text-xs font-semibold text-slate-300 hover:text-white">
          Limpar
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-baby-100/82">Clínica</p>
          <p className="mt-2 text-base font-semibold text-white">{preview.clinicName ?? '-'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-baby-100/82">Dentista responsável</p>
          <p className="mt-2 text-base font-semibold text-white">{preview.dentistName ?? '-'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-baby-100/82">Caso ativo</p>
          <p className="mt-2 text-base font-semibold text-white">{preview.activeCaseCode ?? '-'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-baby-100/82">Status</p>
          <p className="mt-2 text-base font-semibold text-white">{preview.treatmentStatus ?? '-'}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-baby-100/82">Próxima troca</p>
        <p className="mt-2 text-base font-semibold text-white">{preview.nextChangeDate ?? 'Sem previsão'}</p>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
        <div className="flex items-start gap-3">
          {preview.magicLinkEnabled ? (
            <MailCheck className="mt-0.5 h-5 w-5 text-[#eef6d8]" />
          ) : (
            <Link2Off className="mt-0.5 h-5 w-5 text-salmon-300" />
          )}
          <div>
            <p className="text-sm font-semibold text-white">
              {preview.magicLinkEnabled ? 'Link mágico disponível' : 'Link mágico indisponível'}
            </p>
            <p className="mt-1 text-sm text-slate-200/82">
              {preview.magicLinkEnabled
                ? `Envio para ${preview.destinationHint}.`
                : 'Cadastre um e-mail válido para este paciente.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onClear} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
          Consultar outro paciente
        </Button>
      </div>
    </Card>
  )
}
