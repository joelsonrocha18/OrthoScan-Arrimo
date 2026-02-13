import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { completePasswordReset, requestPasswordReset } from '../repo/accessRepo'
import { DATA_MODE } from '../data/dataMode'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryToken = useMemo(() => params.get('token') ?? '', [params])
  const [token, setToken] = useState(queryToken)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const requestToken = async () => {
    setError('')
    setMessage('')
    if (!email.trim()) {
      setError('Informe seu email.')
      return
    }
    if (DATA_MODE !== 'supabase') {
      setMessage('No modo local, solicite ao administrador a redefinicao.')
      return
    }
    setLoading(true)
    const result = await requestPasswordReset({ email: email.trim() })
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage('Se o email existir, o link de redefinicao foi enviado.')
  }

  const submitReset = async () => {
    setError('')
    setMessage('')
    if (!token.trim()) {
      setError('Token obrigatorio.')
      return
    }
    if (!password.trim() || password.length < 8) {
      setError('Senha deve ter ao menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas nao conferem.')
      return
    }
    if (DATA_MODE !== 'supabase') {
      setError('Redefinicao por token disponivel apenas em modo Supabase.')
      return
    }
    setLoading(true)
    const result = await completePasswordReset({ token: token.trim(), newPassword: password })
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage('Senha redefinida com sucesso. Voce ja pode entrar.')
    window.setTimeout(() => navigate('/login', { replace: true }), 1200)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="relative w-full max-w-md">
        <Card className="border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white">Redefinir Senha</h2>
          <p className="mt-1 text-sm text-slate-300">Solicite um token por email e conclua a redefinicao.</p>

          <div className="mt-6 space-y-3">
            <label className="mb-1 block text-sm font-medium text-slate-200">Email</label>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Button className="w-full" variant="secondary" onClick={requestToken} disabled={loading}>
              Solicitar token por email
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            <label className="mb-1 block text-sm font-medium text-slate-200">Token</label>
            <Input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Cole o token recebido" />
            <label className="mb-1 block text-sm font-medium text-slate-200">Nova senha</label>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <label className="mb-1 block text-sm font-medium text-slate-200">Confirmar nova senha</label>
            <Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            <Button className="w-full" onClick={submitReset} disabled={loading}>
              {loading ? 'Processando...' : 'Concluir redefinicao'}
            </Button>
          </div>

          {error ? <p className="mt-3 text-xs text-red-500">{error}</p> : null}
          {message ? <p className="mt-3 text-xs text-emerald-400">{message}</p> : null}

          <p className="mt-6 text-center text-sm text-slate-300">
            <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-500">
              Voltar ao login
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
