import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type CardProps = HTMLAttributes<HTMLDivElement>

export default function Card({ className, ...props }: CardProps) {
  const classNameValue = typeof className === 'string' ? className : ''
  const hasCustomSurface = /\bapp-login-card\b|\bbg-|\bfrom-|\bvia-|\bto-|\[linear-gradient|\[radial-gradient/.test(classNameValue)

  return (
    <div
      className={cn('app-card rounded-2xl border p-5 shadow-sm sm:p-6', !hasCustomSurface && 'app-card-surface bg-white/95', className)}
      {...props}
    />
  )
}
