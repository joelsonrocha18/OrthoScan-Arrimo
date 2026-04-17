import { cn } from '../lib/cn'

type BrandLockupProps = {
  className?: string
  tone?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  align?: 'start' | 'center'
  showSubtitle?: boolean
}

const sizeClasses = {
  sm: {
    wrapper: 'gap-3',
    icon: 'h-11 w-11',
    title: 'text-[18px] tracking-[0.26em]',
    subtitle: 'text-[9px] tracking-[0.34em]',
  },
  md: {
    wrapper: 'gap-4',
    icon: 'h-14 w-14',
    title: 'text-[22px] tracking-[0.3em]',
    subtitle: 'text-[10px] tracking-[0.38em]',
  },
  lg: {
    wrapper: 'gap-4',
    icon: 'h-16 w-16',
    title: 'text-[26px] tracking-[0.34em]',
    subtitle: 'text-[11px] tracking-[0.42em]',
  },
} as const

export default function BrandLockup({
  className,
  tone = 'dark',
  size = 'md',
  align = 'start',
  showSubtitle = true,
}: BrandLockupProps) {
  const palette =
    tone === 'light'
      ? {
          title: 'text-white',
          subtitle: 'text-baby-100/90',
        }
      : {
          title: 'text-brand-700',
          subtitle: 'text-[#4B92A3]',
        }

  const sizeClass = sizeClasses[size]

  return (
    <div className={cn('flex items-center', align === 'center' ? 'justify-center text-center' : 'justify-start text-left', sizeClass.wrapper, className)}>
      <img
        src={`${import.meta.env.BASE_URL}brand/orthoscan-mark-color.png`}
        alt="Marca OrthoScan"
        className={cn('shrink-0 object-contain drop-shadow-[0_10px_24px_rgba(1,82,125,0.18)]', sizeClass.icon)}
      />
      <div className="min-w-0">
        <div className={cn('font-semibold uppercase leading-none', sizeClass.title, palette.title)}>ORTHOSCAN</div>
        {showSubtitle ? (
          <div className={cn('mt-1 font-medium uppercase leading-none', sizeClass.subtitle, palette.subtitle)}>ODONTOLOGIA DIGITAL</div>
        ) : null}
      </div>
    </div>
  )
}
