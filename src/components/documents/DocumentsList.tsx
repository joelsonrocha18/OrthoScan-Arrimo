import { useMemo, useState } from 'react'
import { Download, ExternalLink, FileImage, FileText, FileType, PencilLine, Trash2, TriangleAlert, Undo2 } from 'lucide-react'
import type { PatientDocument } from '../../types/PatientDocument'
import Badge from '../Badge'

function fileExt(name: string | undefined) {
  const value = (name ?? '').toLowerCase()
  const idx = value.lastIndexOf('.')
  return idx >= 0 ? value.slice(idx) : ''
}

function isImageDoc(doc: PatientDocument) {
  const mt = (doc.mimeType ?? '').toLowerCase()
  const ext = fileExt(doc.fileName)
  return mt.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.heic', '.webp'].includes(ext)
}

function isPdfDoc(doc: PatientDocument) {
  const mt = (doc.mimeType ?? '').toLowerCase()
  const ext = fileExt(doc.fileName)
  return mt.includes('pdf') || ext === '.pdf'
}

function isStlDoc(doc: PatientDocument) {
  const mt = (doc.mimeType ?? '').toLowerCase()
  const ext = fileExt(doc.fileName)
  return mt.includes('model') || ['.stl', '.obj', '.ply'].includes(ext)
}

function fileIcon(doc: PatientDocument) {
  if (isImageDoc(doc)) return FileImage
  if (isPdfDoc(doc) || isStlDoc(doc)) return FileType
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
  imagePreviewUrls?: Record<string, string>
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
  const [activeTab, setActiveTab] = useState<PatientDocument['category'] | 'todos'>('todos')
  const categories: Array<{ key: PatientDocument['category'] | 'todos'; label: string }> = [
    { key: 'todos', label: 'Todos' },
    { key: 'foto', label: 'Fotos' },
    { key: 'exame', label: 'Exames' },
    { key: 'contrato', label: 'Contratos' },
    { key: 'consentimento', label: 'Consentimentos' },
    { key: 'identificacao', label: 'Identificacao' },
    { key: 'outro', label: 'Outros' },
  ]

  const visibleItems = useMemo(
    () => (activeTab === 'todos' ? props.items : props.items.filter((item) => item.category === activeTab)),
    [activeTab, props.items],
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {categories.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              activeTab === tab.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((doc) => {
          const Icon = fileIcon(doc)
          const statusTone = doc.status === 'erro' ? 'danger' : 'success'
          const statusLabel = doc.status === 'erro' ? 'ERRO' : 'OK'
          const hasFile = Boolean(doc.url || doc.filePath)
          const thumbUrl = props.imagePreviewUrls?.[doc.id] ?? doc.url
          const hasImageThumb = isImageDoc(doc) && Boolean(thumbUrl)
          const hasPdfThumb = isPdfDoc(doc) && Boolean(thumbUrl)
          const kindLabel = isStlDoc(doc) ? '3D' : isPdfDoc(doc) ? 'PDF' : isImageDoc(doc) ? 'IMG' : 'DOC'

          return (
            <div key={doc.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-700">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-600">{kindLabel}</span>
                </div>
                <Badge tone={statusTone}>{statusLabel}</Badge>
              </div>

              <div className="mt-3 min-w-0">
                {hasImageThumb ? (
                  <button
                    type="button"
                    className="block w-full overflow-hidden rounded-lg border border-slate-200"
                    onClick={() => (props.onOpen ? props.onOpen(doc) : undefined)}
                    title="Visualizar imagem"
                  >
                    <img src={thumbUrl} alt={doc.title} className="h-36 w-full object-cover" />
                  </button>
                ) : hasPdfThumb ? (
                  <div className="relative h-36 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <iframe
                      src={`${thumbUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                      title={`Preview PDF ${doc.title}`}
                      className="h-full w-full"
                    />
                    <button
                      type="button"
                      className="absolute inset-0"
                      onClick={() => (props.onOpen ? props.onOpen(doc) : undefined)}
                      title="Abrir PDF"
                    />
                  </div>
                ) : null}

                <p className="mt-3 truncate text-sm font-semibold text-slate-900">{doc.title}</p>
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
          )
        })}
      </div>
    </div>
  )
}
