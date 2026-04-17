export function CaseTrayStateLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
      <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">Pendente</span>
      <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">Em produção</span>
      <span className="rounded bg-brand-500 px-2 py-1 text-white">Pronta</span>
      <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">Entregue</span>
      <span className="rounded bg-red-100 px-2 py-1 text-red-700">Reconfecção</span>
    </div>
  )
}
