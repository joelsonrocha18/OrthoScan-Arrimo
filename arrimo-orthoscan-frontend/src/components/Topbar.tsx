import { Menu } from 'lucide-react'
import { profileLabel } from '../auth/permissions'
import { getCurrentUser } from '../lib/auth'
import { useDb } from '../lib/useDb'
import Breadcrumb from './Breadcrumb'
import Button from './Button'

type TopbarProps = {
  breadcrumb: string[]
  onMenuToggle: () => void
}

export default function Topbar({ breadcrumb, onMenuToggle }: TopbarProps) {
  const { db } = useDb()
  const currentUser = getCurrentUser(db)

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="md:hidden" aria-label="Abrir menu" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <Breadcrumb items={breadcrumb} />
        {currentUser ? (
          <div className="flex max-w-full items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-emerald-700">Online</span>
            <span className="hidden text-slate-500 sm:inline">|</span>
            <span className="max-w-[140px] truncate font-medium text-slate-700 sm:max-w-[220px]">{currentUser.name || currentUser.email}</span>
            <span className="hidden text-slate-400 sm:inline">({profileLabel(currentUser.role)})</span>
          </div>
        ) : null}
      </div>
    </header>
  )
}
