import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'success' | 'info' | 'danger'
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'border border-slate-300 bg-slate-100 text-slate-800',
  success: 'border border-olive-300 bg-olive-100 text-olive-700',
  info: 'border border-baby-300 bg-baby-100 text-brand-700',
  danger: 'border border-[rgba(197,48,48,0.28)] bg-[rgba(229,62,62,0.16)] text-[#742A2A]',
}

export default function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', toneClasses[tone], className)} {...props} />
  )
}
