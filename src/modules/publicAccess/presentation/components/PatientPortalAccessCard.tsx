import Button from '../../../../components/Button'
import Card from '../../../../components/Card'
import Input from '../../../../components/Input'

type PatientPortalAccessCardProps = {
  cpf: string
  birthDate: string
  accessCode: string
  submitting: boolean
  onCpfChange: (value: string) => void
  onBirthDateChange: (value: string) => void
  onAccessCodeChange: (value: string) => void
  onSubmit: () => void
}

export function PatientPortalAccessCard({
  cpf,
  birthDate,
  accessCode,
  submitting,
  onCpfChange,
  onBirthDateChange,
  onAccessCodeChange,
  onSubmit,
}: PatientPortalAccessCardProps) {
  return (
    <Card className="app-login-card border p-5 text-white sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#eef6d8]">Acesso do paciente</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">CPF, nascimento e código do tratamento</h2>

      <div className="mt-5 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-200">CPF</label>
          <Input
            value={cpf}
            onChange={(event) => onCpfChange(event.target.value)}
            placeholder="000.000.000-00"
            className="border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:border-baby-200 focus:ring-baby-200/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-200">Data de nascimento</label>
          <Input
            type="date"
            value={birthDate}
            onChange={(event) => onBirthDateChange(event.target.value)}
            className="border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:border-baby-200 focus:ring-baby-200/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-200">Código do tratamento</label>
          <Input
            value={accessCode}
            onChange={(event) => onAccessCodeChange(event.target.value)}
            placeholder="ORTH-00028"
            className="border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:border-baby-200 focus:ring-baby-200/30"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          onClick={onSubmit}
          disabled={submitting}
          className="min-w-[220px] bg-[#879547] text-white hover:bg-[#76843b] focus-visible:ring-[#aebd70]"
        >
          {submitting ? 'Validando...' : 'Abrir meu portal'}
        </Button>
      </div>
    </Card>
  )
}
