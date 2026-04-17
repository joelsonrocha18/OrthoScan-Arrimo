import type { FormEvent } from 'react'
import Card from '../../../../components/Card'
import Input from '../../../../components/Input'
import Button from '../../../../components/Button'

type PatientIdentityCardProps = {
  cpf: string
  birthDate: string
  submitting: boolean
  onCpfChange: (value: string) => void
  onBirthDateChange: (value: string) => void
  onSubmit: () => void
}

export function PatientIdentityCard(props: PatientIdentityCardProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void props.onSubmit()
  }

  return (
    <Card className="app-login-card border p-5 text-white sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#eef6d8]">Acesso rapido</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Entrar com CPF e data de nascimento</h2>
      <p className="mt-2 text-sm leading-6 text-slate-200/82">
        Valide sua identidade com os dados do cadastro para continuar com mais segurança.
      </p>

      <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="patient-cpf" className="mb-1 block text-sm font-medium text-slate-200">
            CPF
          </label>
          <Input
            id="patient-cpf"
            value={props.cpf}
            autoComplete="off"
            inputMode="numeric"
            placeholder="000.000.000-00"
            onChange={(event) => props.onCpfChange(event.target.value)}
            className="border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:border-[#d0d9ad] focus:ring-[#d0d9ad]/30"
          />
        </div>

        <div>
          <label htmlFor="patient-birth-date" className="mb-1 block text-sm font-medium text-slate-200">
            Data de nascimento
          </label>
          <Input
            id="patient-birth-date"
            type="date"
            value={props.birthDate}
            onChange={(event) => props.onBirthDateChange(event.target.value)}
            className="border-white/15 bg-white/10 text-white focus:border-[#d0d9ad] focus:ring-[#d0d9ad]/30"
          />
        </div>

        <Button type="submit" className="w-full bg-[#7f8f4b] hover:bg-[#6f7d43] focus-visible:ring-[#d0d9ad]">
          {props.submitting ? 'Validando...' : 'Validar meus dados'}
        </Button>
      </form>
    </Card>
  )
}
