import Button from '../../../../components/Button'
import Card from '../../../../components/Card'
import type { Case } from '../../../../types/Case'

export function CasePlanningVersionsSection(props: {
  versions: NonNullable<Case['planningVersions']>
  draftNote: string
  canPublish: boolean
  canApprove: boolean
  onDraftNoteChange: (value: string) => void
  onPublish: () => void
  onApprove: (versionId: string) => void
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Versionamento de planejamento</h2>
        {props.canPublish ? <Button onClick={props.onPublish}>Publicar nova versão</Button> : null}
      </div>

      {props.canPublish ? (
        <textarea
          value={props.draftNote}
          onChange={(event) => props.onDraftNoteChange(event.target.value)}
          placeholder="Observações da nova versão"
          rows={3}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        />
      ) : null}

      <div className="space-y-3">
        {props.versions.map((version) => (
          <div key={version.id} className="rounded-2xl border border-slate-200 px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{version.label}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                    {version.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {version.createdAt.slice(0, 10)} | Troca {version.snapshot.changeEveryDays} dias | Total {version.snapshot.totalTrays}
                </p>
                {version.note ? <p className="mt-2 text-sm text-slate-700">{version.note}</p> : null}
              </div>
              {props.canApprove && version.status === 'submitted' ? <Button onClick={() => props.onApprove(version.id)}>Aprovar</Button> : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
