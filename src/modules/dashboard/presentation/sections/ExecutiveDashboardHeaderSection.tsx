import BrandLockup from '../../../../components/BrandLockup'
import Card from '../../../../components/Card'

export function ExecutiveDashboardHeaderSection(props: { activeCases: number; overdueSla: number; reworkRate: number }) {
  return (
    <Card className="relative overflow-hidden border-baby-300 bg-[linear-gradient(135deg,#001c29_0%,#01354d_34%,#01527d_72%,#1d8897_100%)] text-white shadow-[0_26px_50px_-34px_rgba(1,82,125,0.88)]">
      <img
        src={`${import.meta.env.BASE_URL}brand/orthoscan-mark-color.png`}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 object-contain opacity-[0.14] blur-[0.5px]"
      />
      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <BrandLockup tone="light" size="sm" className="mb-4" showSubtitle={false} />
          <p className="text-xs uppercase tracking-[0.22em] text-baby-100/90">Painel executivo</p>
          <h1 className="mt-2 text-3xl font-semibold">Visão consolidada da operação clínica e laboratorial</h1>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/18 bg-white/14 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs font-medium text-baby-50">Casos ativos</p>
            <p className="text-2xl font-semibold">{props.activeCases}</p>
          </div>
          <div className="rounded-2xl border border-white/18 bg-white/14 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs font-medium text-[#FFD8D0]">SLA atrasado</p>
            <p className="text-2xl font-semibold">{props.overdueSla}</p>
          </div>
          <div className="rounded-2xl border border-white/18 bg-white/14 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs font-medium text-baby-100">Reconfecção</p>
            <p className="text-2xl font-semibold">{props.reworkRate}%</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
