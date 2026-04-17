import Button from '../../../../components/Button'
import Card from '../../../../components/Card'
import type { CaseAttachment } from '../../../../types/Case'
import { CaseAttachmentCard } from '../components/CaseAttachmentCard'

type CaseAttachmentsSectionProps = {
  attachments: CaseAttachment[]
  canWriteLocalOnly: boolean
  onOpenAttachmentModal: () => void
}

export function CaseAttachmentsSection({
  attachments,
  canWriteLocalOnly,
  onOpenAttachmentModal,
}: CaseAttachmentsSectionProps) {
  return (
    <section className="mt-6">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Anexos</h2>
          <Button onClick={onOpenAttachmentModal} disabled={!canWriteLocalOnly}>
            Adicionar anexo
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {attachments.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum anexo registrado.</p>
          ) : (
            attachments.map((item) => <CaseAttachmentCard key={item.id} item={item} />)
          )}
        </div>
      </Card>
    </section>
  )
}
