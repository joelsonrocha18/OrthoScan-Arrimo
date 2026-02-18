import Card from '../Card'

type LabKpiRowProps = {
  kpis: {
    aguardando_iniciar: number
    em_producao: number
    controle_qualidade: number
    prontas: number
    atrasados: number
  }
}

export default function LabKpiRow({ kpis }: LabKpiRowProps) {
  const items = [
    { label: 'Aguardando iniciar', value: kpis.aguardando_iniciar, danger: false },
    { label: 'Em produção', value: kpis.em_producao, danger: false },
    { label: 'Controle de qualidade', value: kpis.controle_qualidade, danger: false },
    { label: 'Prontas', value: kpis.prontas, danger: false },
    { label: 'Atrasados', value: kpis.atrasados, danger: true },
  ]

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label} className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
          <p className={item.danger ? 'mt-2 text-2xl font-semibold text-red-600' : 'mt-2 text-2xl font-semibold text-slate-900'}>
            {item.value}
          </p>
        </Card>
      ))}
    </section>
  )
}
