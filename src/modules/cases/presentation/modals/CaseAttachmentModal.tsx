import Button from '../../../../components/Button'
import Card from '../../../../components/Card'
import Input from '../../../../components/Input'
import ImageCaptureInput from '../../../../components/files/ImageCaptureInput'

type AttachmentType = 'imagem' | 'documento' | 'outro'

type CaseAttachmentModalProps = {
  open: boolean
  canWriteLocalOnly: boolean
  attachmentType: AttachmentType
  attachmentNote: string
  attachmentDate: string
  attachmentFile: File | null
  onAttachmentTypeChange: (value: AttachmentType) => void
  onAttachmentNoteChange: (value: string) => void
  onAttachmentDateChange: (value: string) => void
  onAttachmentFileChange: (file: File | null) => void
  onClose: () => void
  onSave: () => void
}

export function CaseAttachmentModal({
  open,
  canWriteLocalOnly,
  attachmentType,
  attachmentNote,
  attachmentDate,
  attachmentFile,
  onAttachmentTypeChange,
  onAttachmentNoteChange,
  onAttachmentDateChange,
  onAttachmentFileChange,
  onClose,
  onSave,
}: CaseAttachmentModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <Card className="w-full max-w-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Adicionar anexo</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
            <select
              value={attachmentType}
              onChange={(event) => onAttachmentTypeChange(event.target.value as AttachmentType)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
            >
              <option value="imagem">Imagem</option>
              <option value="documento">Documento (pdf)</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Data</label>
            <Input type="date" value={attachmentDate} onChange={(event) => onAttachmentDateChange(event.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Observação</label>
            <textarea
              rows={3}
              value={attachmentNote}
              onChange={(event) => onAttachmentNoteChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Arquivo</label>
            {attachmentType === 'imagem' ? (
              <ImageCaptureInput accept="image/*" onFileSelected={onAttachmentFileChange} />
            ) : (
              <input
                type="file"
                accept={attachmentType === 'documento' ? 'application/pdf,image/*' : undefined}
                onChange={(event) => onAttachmentFileChange(event.target.files?.[0] ?? null)}
              />
            )}
            {attachmentFile ? <p className="mt-1 text-xs text-slate-500">Arquivo: {attachmentFile.name}</p> : null}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={!canWriteLocalOnly}>
            Salvar anexo
          </Button>
        </div>
      </Card>
    </div>
  )
}
