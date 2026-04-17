import type { FormEvent } from 'react'
import Card from '../../../../components/Card'
import Input from '../../../../components/Input'
import Button from '../../../../components/Button'

type PatientMagicLinkCardProps = {
  cpf: string
  birthDate: string
  requesting: boolean
  magicLinkUrl?: string
  onCpfChange: (value: string) => void
  onBirthDateChange: (value: string) => void
  onSubmit: () => void
}

export function PatientMagicLinkCard(props: PatientMagicLinkCardProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void props.onSubmit()
  }

  return (
    <Card className="app-login-card border p-5 text-white sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-baby-100/84">Link magico</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Receber acesso temporário por link</h2>
      <p className="mt-2 text-sm leading-6 text-slate-200/82">
        Use seus dados de cadastro para solicitar um link seguro de acesso sem precisar decorar senha.
      </p>

      <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="patient-magic-cpf" className="mb-1 block text-sm font-medium text-slate-200">
            CPF
          </label>
          <Input
            id="patient-magic-cpf"
            value={props.cpf}
            autoComplete="off"
            inputMode="numeric"
            placeholder="000.000.000-00"
            onChange={(event) => props.onCpfChange(event.target.value)}
            className="border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:border-baby-200 focus:ring-baby-200/30"
          />
        </div>

        <div>
          <label htmlFor="patient-magic-birth-date" className="mb-1 block text-sm font-medium text-slate-200">
            Data de nascimento
          </label>
          <Input
            id="patient-magic-birth-date"
            type="date"
            value={props.birthDate}
            onChange={(event) => props.onBirthDateChange(event.target.value)}
            className="border-white/15 bg-white/10 text-white focus:border-baby-200 focus:ring-baby-200/30"
          />
        </div>

        <Button type="submit" className="w-full">
          {props.requesting ? 'Preparando link...' : 'Solicitar link magico'}
        </Button>
      </form>

      {props.magicLinkUrl ? (
        <div className="mt-4 rounded-2xl border border-baby-200/30 bg-white/[0.05] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-baby-100/84">Modo local</p>
          <p className="mt-2 text-sm text-slate-200/82">
            Como esta validacao esta em ambiente local, o link seguro foi gerado abaixo para teste.
          </p>
          <a href={props.magicLinkUrl} className="mt-3 block break-all text-sm font-semibold text-baby-100 hover:text-white">
            {props.magicLinkUrl}
          </a>
        </div>
      ) : null}
    </Card>
  )
}
