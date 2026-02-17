import { Download, ExternalLink, FileImage, FileText, FileType, PencilLine, Trash2, TriangleAlert, Undo2 } from 'lucide-react'
import type { PatientDocument } from '../../types/PatientDocument'
import Badge from '../Badge'

function fileIcon(mimeType: string | undefined) {
  const mt = (mimeType ?? '').toLowerCase()
  if (mt.startsWith('image/')) return FileImage
  if (mt.includes('pdf')) return FileType
  return FileText
}

function formatPtBrDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return iso
  }
}

type DocumentsListProps = {
  items: PatientDocument[]
  canEdit?: boolean
  canDelete?: boolean
  canFlagError?: boolean
  onOpen?: (doc: PatientDocument) => void
  onDownload?: (doc: PatientDocument) => void
  onEdit?: (doc: PatientDocument) => void
  onDelete?: (doc: PatientDocument) => void
  onMarkError?: (doc: PatientDocument) => void
  onRestore?: (doc: PatientDocument) => void
}

export default function DocumentsList(props: DocumentsListProps) {
  return (
    <div className="space-y-2">
      {props.items.map((doc) => {
        const Icon = fileIcon(doc.mimeType)
        const statusTone = doc.status === 'erro' ? 'danger' : 'success'
        const statusLabel = doc.status === 'erro' ? 'ERRO' : 'OK'
        const hasFile = Boolean(doc.url || doc.filePath)

        return (
          <div key={doc.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-700">
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{doc.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {doc.category} • {formatPtBrDate(doc.createdAt)} • {doc.fileName}
                    </p>
                    {doc.note ? <p className="mt-1 text-xs text-slate-500">Obs: {doc.note}</p> : null}
                    {doc.status === 'erro' ? (
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-700">
                        <TriangleAlert className="h-3.5 w-3.5" />
                        Erro: {doc.errorNote || '-'}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={statusTone}>{statusLabel}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => (props.onOpen ? props.onOpen(doc) : undefined)}
                    disabled={!hasFile || !props.onOpen}
                    title={hasFile ? 'Abrir' : 'Arquivo local (reenvie para abrir)'}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => (props.onDownload ? props.onDownload(doc) : undefined)}
                    disabled={!hasFile || !props.onDownload}
                    title={hasFile ? 'Baixar' : 'Arquivo local (reenvie para abrir)'}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Baixar
                  </button>

                  {props.canEdit && props.onEdit ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      onClick={() => props.onEdit?.(doc)}
                      title="Editar"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      Editar
                    </button>
                  ) : null}

                  {props.canFlagError && doc.status !== 'erro' && props.onMarkError ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      onClick={() => props.onMarkError?.(doc)}
                      title="Marcar como erro"
                    >
                      <TriangleAlert className="h-3.5 w-3.5" />
                      Erro
                    </button>
                  ) : null}

                  {props.canFlagError && doc.status === 'erro' && props.onRestore ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      onClick={() => props.onRestore?.(doc)}
                      title="Remover erro"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Remover erro
                    </button>
                  ) : null}

                  {props.canDelete && props.onDelete ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      onClick={() => props.onDelete?.(doc)}
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
