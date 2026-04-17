import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import Card from './Card'

type StatTone = 'neutral' | 'success' | 'danger'

type StatCardProps = {
  title: string
  value: string
  meta: string
  metaTone?: StatTone
  icon?: ReactNode
}

const metaToneClasses: Record<StatTone, string> = {
  neutral: 'text-slate-500',
  success: 'text-emerald-600',
  danger: 'text-red-600',
}

export default function StatCard({ title, value, meta, metaTone = 'neutral', icon }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-brand-700/78">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className={cn('mt-1 text-sm font-medium', metaToneClasses[metaTone])}>{meta}</p>
        </div>
        {icon ? <div className="rounded-xl border border-baby-200 bg-baby-50 p-2 text-brand-600 shadow-[0_12px_24px_-20px_rgba(1,82,125,0.4)]">{icon}</div> : null}
      </div>
    </Card>
  )
}
