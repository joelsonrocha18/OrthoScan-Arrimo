import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'success' | 'info' | 'danger'
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  info: 'bg-brand-50 text-brand-700',
  danger: 'bg-red-100 text-red-700',
}

export default function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', toneClasses[tone], className)} {...props} />
  )
}
