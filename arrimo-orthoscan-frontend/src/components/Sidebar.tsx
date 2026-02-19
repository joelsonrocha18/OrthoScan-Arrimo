import { Building2, FlaskConical, LayoutDashboard, LogOut, ScanLine, Settings, Shapes, UserRound, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getAuthProvider } from '../auth/authProvider'
import { can } from '../auth/permissions'
import { clearSession, getCurrentUser } from '../lib/auth'
import { useDb } from '../lib/useDb'
import Button from './Button'

type SidebarProps = {
  onLogout: () => void
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const { db } = useDb()
  const currentUser = getCurrentUser(db)
  const handleLogout = async () => {
    try {
      await getAuthProvider().signOut()
    } catch {
      clearSession()
    }
    onLogout()
  }

  const menuItems = [
    { to: '/app/dashboard', label: 'Principal', icon: LayoutDashboard, permission: 'dashboard.read' as const },
    { to: '/app/scans', label: 'Exames', icon: ScanLine, permission: 'scans.read' as const },
    { to: '/app/cases', label: 'Tratamentos', icon: Shapes, permission: 'cases.read' as const },
    { to: '/app/dentists', label: 'Dentistas', icon: UserRound, permission: 'dentists.read' as const },
    { to: '/app/clinics', label: 'Clínicas', icon: Building2, permission: 'clinics.read' as const },
    { to: '/app/patients', label: 'Pacientes', icon: Users, permission: 'patients.read' as const },
    { to: '/app/lab', label: 'Laboratório', icon: FlaskConical, permission: 'lab.read' as const },
    { to: '/app/settings', label: 'Configurações', icon: Settings, permission: 'settings.read' as const },
  ]

  return (
    <aside className="w-full border-b border-slate-700 bg-slate-900 text-slate-100 md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-700 px-6 py-6">
          <img
            src={`${import.meta.env.BASE_URL}brand/orthoscan.png`}
            alt="OrthoScan"
            className="mx-auto h-28 w-auto object-contain sm:h-28 md:h-28"
          />
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {menuItems
            .filter((item) => can(currentUser, item.permission))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  ].join(' ')
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="border-t border-slate-700 p-4">
          <Button variant="ghost" className="w-full justify-start text-slate-200 hover:bg-slate-800" onClick={() => void handleLogout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </aside>
  )
}
