import Card from '../../../../components/Card'
import type { Case } from '../../../../types/Case'

export function CaseFinancialSection(props: {
  financial?: Case['financial']
  reworkSummary?: Case['reworkSummary']
}) {
  const financial = props.financial
  return (
    <Card className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Financeiro do caso</h2>

      {!financial ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
          Resumo financeiro indisponível.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Receita</p>
            <p className="text-xl font-semibold text-slate-900">{financial.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Custo base</p>
            <p className="text-xl font-semibold text-slate-900">{financial.baseCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Impacto da reconfecção</p>
            <p className="text-xl font-semibold text-slate-900">{financial.reworkCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Margem</p>
            <p className="text-xl font-semibold text-slate-900">{financial.margin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p className="text-xs text-slate-500">{financial.marginPercent}%</p>
          </div>
        </div>
      )}

      {props.reworkSummary?.reworkCount ? (
        <p className="text-sm text-slate-600">
          Reconfecções acumuladas: {props.reworkSummary.reworkCount} | Último impacto: {props.reworkSummary.estimatedFinancialImpact.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      ) : null}
    </Card>
  )
}
