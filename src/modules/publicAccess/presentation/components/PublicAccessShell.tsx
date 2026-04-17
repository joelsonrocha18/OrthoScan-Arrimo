import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import BrandLockup from '../../../../components/BrandLockup'

type PublicAccessShellProps = {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
  accent?: 'brand' | 'baby' | 'olive'
  layout?: 'split' | 'stacked'
  backLink?: {
    to: string
    label: string
  }
}

const accentClasses = {
  brand: 'from-brand-500/16 via-white/6 to-transparent',
  baby: 'from-baby-100/24 via-white/10 to-transparent',
  olive: 'from-[#d0d9ad]/24 via-white/10 to-transparent',
} as const

export function PublicAccessShell({
  eyebrow,
  title,
  description,
  children,
  accent = 'brand',
  layout = 'split',
  backLink,
}: PublicAccessShellProps) {
  return (
    <div className="app-login-shell relative min-h-[100dvh] overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
      <img
        src={`${import.meta.env.BASE_URL}brand/orthoscan-submark-dark.jpg`}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12]"
      />
      {layout === 'stacked' ? (
        <div className="relative mx-auto min-h-[calc(100dvh-3rem)] max-w-7xl space-y-6">
          <div className="text-white">
            {backLink ? (
              <Link to={backLink.to} className="mb-5 inline-flex items-center text-sm font-semibold text-baby-100 transition hover:text-white">
                {backLink.label}
              </Link>
            ) : null}
            <div className={`inline-flex rounded-full border border-white/10 bg-gradient-to-r ${accentClasses[accent]} px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-baby-100/90`}>
              {eyebrow}
            </div>
            <div className="mt-6 max-w-4xl">
              <BrandLockup tone="light" size="lg" />
              <h1 className="mt-6 text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">{title}</h1>
              {description ? <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200/88 sm:text-lg">{description}</p> : null}
            </div>
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      ) : (
        <div className="relative mx-auto grid min-h-[calc(100dvh-3rem)] max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10">
          <div className="min-w-0 text-white">
            {backLink ? (
              <Link to={backLink.to} className="mb-5 inline-flex items-center text-sm font-semibold text-baby-100 transition hover:text-white">
                {backLink.label}
              </Link>
            ) : null}
            <div className={`inline-flex rounded-full border border-white/10 bg-gradient-to-r ${accentClasses[accent]} px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-baby-100/90`}>
              {eyebrow}
            </div>
            <div className="mt-6 max-w-xl">
              <BrandLockup tone="light" size="lg" />
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl">{title}</h1>
              {description ? <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200/88 sm:text-lg">{description}</p> : null}
            </div>
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      )}
    </div>
  )
}
