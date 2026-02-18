import { profileLabel } from '../auth/permissions'
import { getCurrentUser } from '../lib/auth'
import { useDb } from '../lib/useDb'
import Breadcrumb from './Breadcrumb'

type TopbarProps = {
  breadcrumb: string[]
}

export default function Topbar({ breadcrumb }: TopbarProps) {
  const { db } = useDb()
  const currentUser = getCurrentUser(db)

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb items={breadcrumb} />
        {currentUser ? (
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-emerald-700">Online</span>
            <span className="text-slate-500">|</span>
            <span className="font-medium text-slate-700">{currentUser.name || currentUser.email}</span>
            <span className="text-slate-400">({profileLabel(currentUser.role)})</span>
          </div>
        ) : null}
      </div>
    </header>
  )
}
