import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../../../../components/Button'
import Card from '../../../../components/Card'
import FilePickerWithCamera from '../../../../components/files/FilePickerWithCamera'
import { cn } from '../../../../lib/cn'
import { formatPtBrDate } from '../../../../shared/utils/date'
import type { PatientPortalPhotoSlot } from '../../domain/models/PatientPortal'
import type { PatientPortalPhotoEditOptions } from '../lib/patientPortalPhotoEditing'

type PatientPortalTrayScheduleSectionProps = {
  photoSlots: PatientPortalPhotoSlot[]
  selectedTrayNumber: number
  capturedAt: string
  selectedFile: File | null
  uploading: boolean
  onSelectSlot: (trayNumber: number, plannedDate: string) => void
  onCapturedAtChange: (value: string) => void
  onFileSelected: (file: File) => void
  onBackFromReview: () => void
  onSubmit: (options: PatientPortalPhotoEditOptions) => void
}

const slotBadgeClasses: Record<PatientPortalPhotoSlot['status'], string> = {
  recebida: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  pendente: 'border-[#f2b8b5] bg-[#fff1f1] text-[#9b2c2c]',
  aguardando: 'border-slate-300 bg-slate-50 text-slate-700',
}

export function PatientPortalTrayScheduleSection({
  photoSlots,
  selectedTrayNumber,
  capturedAt,
  selectedFile,
  uploading,
  onSelectSlot,
  onCapturedAtChange,
  onFileSelected,
  onBackFromReview,
  onSubmit,
}: PatientPortalTrayScheduleSectionProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStateRef = useRef<{ startX: number; startScrollLeft: number } | null>(null)
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0)
  const [mirrored, setMirrored] = useState(false)

  useEffect(() => {
    setRotation(0)
    setMirrored(false)
  }, [selectedFile, selectedTrayNumber])

  const previewUrl = useMemo(() => {
    if (!selectedFile) return ''
    return URL.createObjectURL(selectedFile)
  }, [selectedFile])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const scrollByAmount = (direction: 'left' | 'right') => {
    const container = scrollRef.current
    if (!container) return
    const amount = Math.max(280, Math.floor(container.clientWidth * 0.75))
    container.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement | null
    if (target?.closest('button, input, textarea, select, label')) return
    const container = scrollRef.current
    if (!container) return
    dragStateRef.current = {
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
    }
    setIsDragging(true)
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const container = scrollRef.current
    const dragState = dragStateRef.current
    if (!container || !dragState) return
    const deltaX = event.clientX - dragState.startX
    container.scrollLeft = dragState.startScrollLeft - deltaX
  }

  const stopDragging = () => {
    dragStateRef.current = null
    setIsDragging(false)
  }

  const rotateLeft = () => {
    setRotation((current) => (((current + 270) % 360) as 0 | 90 | 180 | 270))
  }

  const rotateRight = () => {
    setRotation((current) => (((current + 90) % 360) as 0 | 90 | 180 | 270))
  }

  return (
    <section>
      <Card className="bg-white p-5 text-slate-900 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#1A202C]">Trocas</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => scrollByAmount('left')}>
              Voltar
            </Button>
            <Button variant="secondary" size="sm" onClick={() => scrollByAmount('right')}>
              Avançar
            </Button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className={cn(
            'mt-6 overflow-x-auto pb-2 select-none',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
        >
          <div className="flex min-w-max items-stretch gap-4">
            {photoSlots.map((slot, index) => {
              const isSelected = slot.trayNumber === selectedTrayNumber
              const isConfirmed = slot.status === 'recebida'
              const effectiveDate = isSelected ? capturedAt : (slot.recordedAt ?? slot.plannedDate)
              const showSelectedPreview = isSelected && Boolean(selectedFile) && !isConfirmed
              const thumbnailUrl = showSelectedPreview ? previewUrl : slot.previewUrl

              return (
                <div key={slot.id} className="flex items-center gap-4">
                  {index > 0 ? <div className="h-[2px] w-8 rounded-full bg-slate-200" aria-hidden="true" /> : null}
                  <article
                    className={[
                      'w-[286px] rounded-3xl border bg-white p-4 shadow-sm transition',
                      isSelected ? 'border-brand-400 ring-2 ring-brand-200/70' : 'border-slate-300',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4A5568]">
                          Alinhador #{slot.trayNumber}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#1A202C]">
                          Prevista: {formatPtBrDate(slot.plannedDate)}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${slotBadgeClasses[slot.status]}`}>
                        {slot.status === 'recebida'
                          ? 'Confirmado'
                          : slot.status === 'pendente'
                            ? 'Pendente'
                            : 'Futuro'}
                      </span>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-300 bg-slate-50">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={`Foto do alinhador #${slot.trayNumber}`}
                          className="h-40 w-full object-cover"
                          style={showSelectedPreview ? { transform: `rotate(${rotation}deg) scaleX(${mirrored ? -1 : 1})` } : undefined}
                        />
                      ) : (
                        <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-500">
                          <span className="text-base font-semibold text-slate-700">Foto</span>
                          <span>Anexo ou câmera</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#4A5568]">
                        Data da troca
                      </label>
                      {isConfirmed ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                          {slot.recordedAt ? formatPtBrDate(slot.recordedAt) : formatPtBrDate(slot.plannedDate)}
                        </div>
                      ) : (
                        <input
                          type="date"
                          value={effectiveDate}
                          onFocus={() => onSelectSlot(slot.trayNumber, slot.recordedAt ?? slot.plannedDate)}
                          onChange={(event) => {
                            onSelectSlot(slot.trayNumber, slot.recordedAt ?? slot.plannedDate)
                            onCapturedAtChange(event.target.value)
                          }}
                          className="ui-input-strong h-10 w-full rounded-lg px-3 text-sm"
                        />
                      )}
                    </div>

                    <div className="mt-4 space-y-3">
                      {isConfirmed ? (
                        <>
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                            Foto confirmada.
                          </div>
                          {slot.fileName ? (
                            <div className="truncate rounded-full border border-baby-200 bg-baby-50 px-3 py-1 text-xs font-semibold text-brand-700">
                              {slot.fileName}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <FilePickerWithCamera
                            accept="image/*"
                            capture="user"
                            uploadLabel="Anexo"
                            cameraLabel="Câmera"
                            cameraTitle={`Capturar selfie do alinhador #${slot.trayNumber}`}
                            onFileSelected={(file) => {
                              onSelectSlot(slot.trayNumber, slot.recordedAt ?? slot.plannedDate)
                              onFileSelected(file)
                            }}
                          />
                          <div className="rounded-2xl border border-[#d8ddc6] bg-[#f3f5ea] px-3 py-2 text-xs font-medium text-[#5d6934]">
                            Data editável até a confirmação.
                          </div>
                          {isSelected && selectedFile ? (
                            <>
                              <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" size="sm" onClick={rotateLeft}>
                                  Girar à esquerda
                                </Button>
                                <Button variant="secondary" size="sm" onClick={rotateRight}>
                                  Girar à direita
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => setMirrored((current) => !current)}>
                                  {mirrored ? 'Sem espelho' : 'Espelhar'}
                                </Button>
                              </div>
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={onBackFromReview} disabled={uploading}>
                                  Voltar
                                </Button>
                                <Button size="sm" onClick={() => onSubmit({ rotation, mirrored })} disabled={uploading}>
                                  {uploading ? 'Enviando...' : 'Confirmar'}
                                </Button>
                              </div>
                            </>
                          ) : (
                            <Button
                              variant={isSelected ? 'primary' : 'secondary'}
                              className="w-full"
                              onClick={() => onSelectSlot(slot.trayNumber, slot.recordedAt ?? slot.plannedDate)}
                            >
                              {isSelected ? 'Troca selecionada' : 'Selecionar'}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </section>
  )
}
