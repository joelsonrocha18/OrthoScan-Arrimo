import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../../../components/Card'
import { cn } from '../../../../lib/cn'

type AudienceAccessCardProps = {
  title: string
  description?: string
  badge?: string
  tone?: 'brand' | 'olive'
  icon: LucideIcon
  bullets?: string[]
  to: string
  ctaLabel: string
}

const toneClasses = {
  brand: {
    badge: 'border border-baby-200 bg-baby-100 text-brand-700',
    icon: 'bg-brand-500/14 text-baby-100 ring-1 ring-white/10',
    button: 'bg-brand-500 text-white hover:bg-brand-600',
  },
  olive: {
    badge: 'border border-[#d0d9ad]/70 bg-[#eef2dc] text-[#5a6831]',
    icon: 'bg-[#7f8f4b]/18 text-[#eff6d8] ring-1 ring-white/10',
    button: 'bg-[#7f8f4b] text-white hover:bg-[#6f7d43]',
  },
} as const

export function AudienceAccessCard({
  title,
  description,
  badge,
  tone = 'brand',
  icon: Icon,
  bullets = [],
  to,
  ctaLabel,
}: AudienceAccessCardProps) {
  const toneClass = toneClasses[tone]

  return (
    <Card className="app-login-card border p-5 text-white sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-[0_20px_36px_-28px_rgba(2,6,23,0.8)]', toneClass.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        {badge ? <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]', toneClass.badge)}>{badge}</span> : null}
      </div>

      <div className="mt-5">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {description ? <p className="mt-3 text-sm leading-6 text-slate-200/82">{description}</p> : null}
      </div>

      {bullets.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <ul className="space-y-2">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-sm text-slate-100/88">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-baby-100/90" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link
        to={to}
        className={cn('mt-5 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition', toneClass.button)}
      >
        {ctaLabel}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Card>
  )
}
