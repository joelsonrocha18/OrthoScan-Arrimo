import { PRODUCT_TYPE_LABEL } from '../../types/Product'

type PatientProductHistoryProps = {
  productTypes: string[]
}

export default function PatientProductHistory({ productTypes }: PatientProductHistoryProps) {
  if (productTypes.length === 0) {
    return <span className="text-sm text-slate-500">Sem histórico</span>
  }

  const unique = Array.from(new Set(productTypes))
  return (
    <div className="flex flex-wrap gap-1">
      {unique.map((item) => (
        <span key={item} className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {PRODUCT_TYPE_LABEL[item as keyof typeof PRODUCT_TYPE_LABEL] ?? item}
        </span>
      ))}
    </div>
  )
}
