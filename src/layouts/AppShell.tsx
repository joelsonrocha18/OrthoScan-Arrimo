import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

const INTERNAL_CHAT_ENABLED = ((import.meta.env.VITE_INTERNAL_CHAT_ENABLED as string | undefined)?.trim().toLowerCase() ?? '') === 'true'

type AppShellProps = {
  breadcrumb: string[]
  children: ReactNode
}

export default function AppShell({ breadcrumb, children }: AppShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [InternalChatWidget, setInternalChatWidget] = useState<ComponentType | null>(null)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!INTERNAL_CHAT_ENABLED) return
    let active = true
    void import('../components/InternalChatWidget').then((module) => {
      if (!active) return
      setInternalChatWidget(() => module.default)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen">
      {sidebarOpen ? <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-40 bg-slate-900/50 md:hidden" onClick={() => setSidebarOpen(false)} /> : null}
      <Sidebar isOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} onLogout={() => navigate('/login', { replace: true })} />
      <div className="md:pl-64">
        <Topbar breadcrumb={breadcrumb} onMenuToggle={() => setSidebarOpen((current) => !current)} />
        <main className="px-4 py-4 sm:px-5">{children}</main>
        {InternalChatWidget ? <InternalChatWidget /> : null}
      </div>
    </div>
  )
}
