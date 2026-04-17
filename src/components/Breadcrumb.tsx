import { ChevronRight } from 'lucide-react'

type BreadcrumbProps = {
  items: string[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-600">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div className="flex items-center gap-2" key={`${item}-${index}`}>
            <span className={isLast ? 'font-semibold text-brand-700' : 'font-medium text-slate-600'}>{item}</span>
            {!isLast ? <ChevronRight className="h-4 w-4 text-baby-500" /> : null}
          </div>
        )
      })}
    </nav>
  )
}
