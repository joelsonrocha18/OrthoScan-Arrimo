import { ArrowUpRight, BellRing, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../../../components/Card'
import type { StrategicNotification } from '../../domain/services/StrategicNotificationsService'

const severityStyles: Record<StrategicNotification['severity'], string> = {
  danger: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
}

export function StrategicNotificationsPanel(props: { title?: string; notifications: StrategicNotification[]; emptyLabel?: string }) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <BellRing className="h-5 w-5 text-slate-700" />
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{props.title ?? 'Notificações'}</h2>
        </div>
      </div>

      {props.notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
          {props.emptyLabel ?? 'Nenhuma notificação no momento.'}
        </div>
      ) : (
        <div className="space-y-3">
          {props.notifications.map((item) => {
            return (
              <div key={item.id} className={`rounded-2xl border px-4 py-3 ${severityStyles[item.severity]}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <span className="text-[11px] uppercase tracking-wide opacity-70">{item.at.slice(0, 10)}</span>
                </div>
                <p className="mt-1 text-sm opacity-90">{item.description}</p>

                {item.href || (item.actions?.length ?? 0) > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.href ? (
                      <Link
                        to={item.href}
                        className="inline-flex items-center gap-1 rounded-lg border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
                      >
                        Abrir
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}

                    {(item.actions ?? []).map((action) =>
                      action.external ? (
                        <a
                          key={action.href}
                          href={action.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {action.label}
                        </a>
                      ) : (
                        <Link
                          key={action.href}
                          to={action.href}
                          className="inline-flex items-center gap-1 rounded-lg border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
                        >
                          {action.label}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
