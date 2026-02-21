import type { ReactNode } from 'react'

export type ToastItem = {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  message?: string
}

type ToastProps = {
  items: ToastItem[]
  onClose: (id: string) => void
}

function toneClass(type: ToastItem['type']) {
  if (type === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  if (type === 'error') {
    return 'border-red-200 bg-red-50 text-red-800'
  }
  return 'border-slate-200 bg-white text-slate-800'
}

function ToastCard({
  item,
  onClose,
}: {
  item: ToastItem
  onClose: (id: string) => void
}): ReactNode {
  return (
    <div className={`w-full max-w-sm rounded-xl border p-4 shadow-lg ${toneClass(item.type)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{item.title}</p>
          {item.message ? <p className="mt-1 text-xs opacity-90">{item.message}</p> : null}
        </div>
        <button className="text-xs font-semibold opacity-70 hover:opacity-100" onClick={() => onClose(item.id)}>
          Fechar
        </button>
      </div>
    </div>
  )
}

export default function Toast({ items, onClose }: ToastProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] flex-col gap-2 sm:w-auto">
      {items.map((item) => (
        <div className="pointer-events-auto" key={item.id}>
          <ToastCard item={item} onClose={onClose} />
        </div>
      ))}
    </div>
  )
}
