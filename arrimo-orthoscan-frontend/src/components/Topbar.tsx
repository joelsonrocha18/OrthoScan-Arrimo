import Breadcrumb from './Breadcrumb'

type TopbarProps = {
  breadcrumb: string[]
}

export default function Topbar({ breadcrumb }: TopbarProps) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
      <Breadcrumb items={breadcrumb} />
    </header>
  )
}
