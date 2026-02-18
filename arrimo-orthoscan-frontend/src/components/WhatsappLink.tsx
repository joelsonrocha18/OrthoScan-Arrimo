import { MessageCircle } from 'lucide-react'
import { buildWhatsappUrl, isValidWhatsapp } from '../lib/whatsapp'

type WhatsappLinkProps = {
  value?: string
  showNumber?: boolean
  className?: string
}

export default function WhatsappLink({ value, showNumber = true, className = '' }: WhatsappLinkProps) {
  const phone = value?.trim() ?? ''
  if (!phone || !isValidWhatsapp(phone)) return null
  const href = buildWhatsappUrl(phone)
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-600 ${className}`.trim()}
      title="Abrir WhatsApp"
      aria-label="Abrir WhatsApp"
    >
      <MessageCircle className="h-4 w-4" />
      {showNumber ? <span>{phone}</span> : null}
    </a>
  )
}
