import { Link, Navigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { can } from '../auth/permissions'
import type { Permission } from '../auth/permissions'
import type { Role, User } from '../types/User'
import Card from '../components/Card'
import { useDb } from '../lib/useDb'
import { getAuthProvider } from '../auth/authProvider'
import type { SessionUser } from '../auth/session'

type ProtectedRouteProps = {
  permission?: Permission
  roles?: Role[]
}

export default function ProtectedRoute({ permission, roles }: ProtectedRouteProps) {
  const { db } = useDb()
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    getAuthProvider()
      .getCurrentUser()
      .then((user) => {
        if (!active) return
        setSessionUser(user)
      })
      .catch(() => {
        if (!active) return
        setSessionUser(null)
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [db])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <Card className="w-full max-w-lg text-center">
          <p className="text-sm font-semibold text-slate-700">Verificando sessao...</p>
        </Card>
      </div>
    )
  }

  if (!sessionUser) {
    return <Navigate to="/login" replace />
  }

  const userForPerms: User = {
    id: sessionUser.id,
    name: '',
    email: sessionUser.email ?? '',
    role: sessionUser.role as Role,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }
  const roleDenied = roles ? !roles.includes(userForPerms.role) : false

  if ((permission && !can(userForPerms, permission)) || roleDenied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <Card className="w-full max-w-lg text-center">
          <h1 className="text-xl font-semibold text-slate-900">Sem acesso</h1>
          <p className="mt-2 text-sm text-slate-600">Seu perfil nao tem permissao para acessar esta area.</p>
          <Link to="/app/dashboard" className="mt-4 inline-flex text-sm font-semibold text-brand-700">
            Voltar
          </Link>
        </Card>
      </div>
    )
  }

  return <Outlet />
}
