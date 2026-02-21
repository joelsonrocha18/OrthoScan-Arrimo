import { ChevronRight } from 'lucide-react'

type BreadcrumbProps = {
  items: string[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div className="flex items-center gap-2" key={`${item}-${index}`}>
            <span className={isLast ? 'font-medium text-slate-700' : ''}>{item}</span>
            {!isLast ? <ChevronRight className="h-4 w-4 text-slate-400" /> : null}
          </div>
        )
      })}
    </nav>
  )
}
