import Card from '../../../../components/Card'

export function DentistPortalHeaderSection(props: { trackedCases: number; pendingApprovals: number; documents: number }) {
  return (
    <Card className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Portal dentista</p>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
      <h1 className="text-3xl font-semibold">Acompanhamento clínico dos casos</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Acompanhe o andamento, aprove versoes de planejamento e acesse documentos sem sair do contexto do caso.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-xs text-slate-300">Casos</p>
            <p className="text-2xl font-semibold">{props.trackedCases}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-xs text-slate-300">Aprovacoes</p>
            <p className="text-2xl font-semibold">{props.pendingApprovals}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-xs text-slate-300">Documentos</p>
            <p className="text-2xl font-semibold">{props.documents}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
