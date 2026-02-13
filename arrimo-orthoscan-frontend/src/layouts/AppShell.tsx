import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

type AppShellProps = {
  breadcrumb: string[]
  children: ReactNode
}

export default function AppShell({ breadcrumb, children }: AppShellProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar onLogout={() => navigate('/login', { replace: true })} />
      <div className="md:pl-64">
        <Topbar breadcrumb={breadcrumb} />
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  )
}
