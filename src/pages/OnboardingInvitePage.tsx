import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { DATA_MODE } from '../data/dataMode'
import { completeOnboardingInvite, validateOnboardingInvite } from '../repo/onboardingRepo'

type InviteState =
  | { status: 'loading' }
  | { status: 'invalid'; message: string }
  | { status: 'ready'; preview: { fullName: string; roleLabel: string; clinicName: string } }

export default function OnboardingInvitePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = useMemo(() => params.get('token')?.trim() ?? '', [params])
  const [inviteState, setInviteState] = useState<InviteState>({ status: 'loading' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    if (DATA_MODE !== 'supabase') {
      setInviteState({ status: 'invalid', message: 'Fluxo de convite disponivel apenas em modo Supabase.' })
      return
    }
    if (!token) {
      setInviteState({ status: 'invalid', message: 'Link invalido (token ausente).' })
      return
    }
    setInviteState({ status: 'loading' })
    validateOnboardingInvite(token).then((result) => {
      if (!active) return
      if (!result.ok) {
        if (result.used) {
          setInviteState({ status: 'invalid', message: 'Este convite ja foi utilizado.' })
          return
        }
        if (result.expired) {
          setInviteState({ status: 'invalid', message: 'Este convite expirou. Solicite um novo link.' })
          return
        }
        setInviteState({ status: 'invalid', message: result.error })
        return
      }
      setInviteState({ status: 'ready', preview: result.preview })
    })
    return () => {
      active = false
    }
  }, [token])

  const submit = async () => {
    setError('')
    setMessage('')
    if (inviteState.status !== 'ready') return
    if (!email.trim()) {
      setError('Informe seu email.')
      return
    }
    if (!password.trim() || password.trim().length < 10) {
      setError('Senha deve ter ao menos 10 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas nao conferem.')
      return
    }
    setLoading(true)
    const result = await completeOnboardingInvite({
      token,
      email: email.trim(),
      password: password.trim(),
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage('Cadastro concluido com sucesso. Voce ja pode entrar.')
    window.setTimeout(() => navigate('/login', { replace: true }), 1400)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="relative w-full max-w-md">
        <Card className="border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white">Concluir cadastro</h2>
          {inviteState.status === 'ready' ? (
            <p className="mt-1 text-sm text-slate-300">
              Convite para <strong>{inviteState.preview.fullName}</strong> ({inviteState.preview.roleLabel}) em{' '}
              {inviteState.preview.clinicName}.
            </p>
          ) : null}

          {inviteState.status === 'loading' ? (
            <p className="mt-4 text-sm text-slate-300">Validando convite...</p>
          ) : null}

          {inviteState.status === 'invalid' ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-red-400">{inviteState.message}</p>
              <Link to="/login" className="inline-flex text-sm font-semibold text-brand-700 hover:text-brand-500">
                Voltar ao login
              </Link>
            </div>
          ) : null}

          {inviteState.status === 'ready' ? (
            <div className="mt-6 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">Email</label>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">Senha</label>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">Confirmar senha</label>
                <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </div>
              <Button className="w-full" onClick={submit} disabled={loading}>
                {loading ? 'Concluindo...' : 'Concluir cadastro'}
              </Button>
            </div>
          ) : null}

          {error ? <p className="mt-3 text-xs text-red-500">{error}</p> : null}
          {message ? <p className="mt-3 text-xs text-emerald-400">{message}</p> : null}
        </Card>
      </div>
    </div>
  )
}
