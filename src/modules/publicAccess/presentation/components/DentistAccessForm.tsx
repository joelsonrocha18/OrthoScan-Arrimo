import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../../../../components/Card'
import Input from '../../../../components/Input'
import Button from '../../../../components/Button'
import { getAuthProvider } from '../../../../auth/authProvider'
import type { SessionUser } from '../../../../auth/session'
import { resolvePostLoginRoute } from '../lib/accessRouting'

type LoginErrors = {
  email?: string
  password?: string
}

export function DentistAccessForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<LoginErrors>({})
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let active = true
    void getAuthProvider()
      .getCurrentUser()
      .then((session) => {
        if (!active || !session) return
        navigate(resolvePostLoginRoute('dentists', session), { replace: true })
      })
      .finally(() => {
        if (!active) return
        setCheckingSession(false)
      })

    return () => {
      active = false
    }
  }, [navigate])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: LoginErrors = {}

    if (!email.trim()) {
      nextErrors.email = 'E-mail obrigatório'
    }

    if (!password.trim()) {
      nextErrors.password = 'Senha obrigatória'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)
    try {
      await getAuthProvider().signIn(email.trim(), password.trim())
      const session = (await getAuthProvider().getCurrentUser()) as SessionUser | null
      navigate(resolvePostLoginRoute('dentists', session), { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao autenticar.'
      setErrors({ email: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="app-login-card border p-4 text-white sm:p-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-5 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.7)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-baby-100/84">Portal dentista</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Acesso para dentistas parceiros</h2>
      </div>

      <form className="mt-5 space-y-3" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="dentist-email" className="mb-1 block text-sm font-medium text-slate-200">
            Email profissional
          </label>
          <Input
            id="dentist-email"
            type="email"
            autoComplete="username"
            placeholder="seu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:border-baby-200 focus:ring-baby-200/30"
          />
          {errors.email ? <p className="mt-1 text-xs text-red-300">{errors.email}</p> : null}
        </div>

        <div>
          <label htmlFor="dentist-password" className="mb-1 block text-sm font-medium text-slate-200">
            Senha
          </label>
          <div className="relative">
            <Input
              id="dentist-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border-white/15 bg-white/10 pr-16 text-white placeholder:text-slate-400 focus:border-baby-200 focus:ring-baby-200/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-baby-100 hover:text-white"
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {errors.password ? <p className="mt-1 text-xs text-red-300">{errors.password}</p> : null}
        </div>

        <Button type="submit" className="w-full">
          {loading || checkingSession ? 'Entrando...' : 'Entrar no portal'}
        </Button>

        <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
          <Link to="/reset-password" className="font-semibold text-baby-100 hover:text-white">
            Esqueci minha senha
          </Link>
        </div>
      </form>
    </Card>
  )
}
