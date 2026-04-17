import { useEffect, useMemo, useState } from 'react'
import Button from '../../../../components/Button'
import Card from '../../../../components/Card'
import Input from '../../../../components/Input'
import FilePickerWithCamera from '../../../../components/files/FilePickerWithCamera'
import type { PatientPortalPhotoSlot } from '../../domain/models/PatientPortal'
import type { PatientPortalPhotoEditOptions } from '../lib/patientPortalPhotoEditing'

type PatientPortalPhotoUploadSectionProps = {
  photoSlots: PatientPortalPhotoSlot[]
  trayNumber: number
  capturedAt: string
  note: string
  selectedFile: File | null
  uploading: boolean
  onTrayNumberChange: (value: number) => void
  onCapturedAtChange: (value: string) => void
  onNoteChange: (value: string) => void
  onFileSelected: (file: File) => void
  onBackFromReview: () => void
  onSubmit: (options: PatientPortalPhotoEditOptions) => void
}

export function PatientPortalPhotoUploadSection(props: PatientPortalPhotoUploadSectionProps) {
  const pendingSlots = useMemo(
    () => props.photoSlots.filter((item) => item.status !== 'recebida'),
    [props.photoSlots],
  )
  const currentSlot = useMemo(
    () => props.photoSlots.find((item) => item.trayNumber === props.trayNumber) ?? pendingSlots[0],
    [pendingSlots, props.photoSlots, props.trayNumber],
  )
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0)
  const [mirrored, setMirrored] = useState(false)

  useEffect(() => {
    setRotation(0)
    setMirrored(false)
  }, [props.selectedFile])

  const previewUrl = useMemo(() => {
    if (!props.selectedFile) return ''
    return URL.createObjectURL(props.selectedFile)
  }, [props.selectedFile])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const rotateLeft = () => {
    setRotation((current) => (((current + 270) % 360) as 0 | 90 | 180 | 270))
  }

  const rotateRight = () => {
    setRotation((current) => (((current + 90) % 360) as 0 | 90 | 180 | 270))
  }

  const submitWithConfirmation = () => {
    props.onSubmit({ rotation, mirrored })
  }

  return (
    <section>
      <Card className="bg-white p-5 text-slate-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#1A202C]">Confirmar selfie da troca</h2>
            <p className="mt-1 text-sm text-slate-600">
              Escolha o alinhador, informe a data real da troca e revise a selfie antes de confirmar o envio.
            </p>
          </div>
          <div className="rounded-full border border-[#f2d8b5] bg-[#fff8ef] px-3 py-1 text-xs font-semibold text-[#9b5d2c]">
            Apos confirmar, a foto fica bloqueada para alteracao
          </div>
        </div>

        {pendingSlots.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
            Todas as selfies previstas para este tratamento ja foram confirmadas.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#4A5568]">Número do alinhador</label>
                <select
                  value={props.trayNumber}
                  onChange={(event) => props.onTrayNumberChange(Number(event.target.value))}
                  className="ui-input-strong h-10 w-full rounded-lg px-3 text-sm"
                >
                  {pendingSlots.map((slot) => (
                    <option key={slot.id} value={slot.trayNumber}>
                      #{slot.trayNumber} - prevista em {slot.plannedDate.split('-').reverse().join('/')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-300 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4A5568]">Data prevista</p>
                <p className="mt-2 text-base font-bold text-[#1A202C]">
                  {currentSlot ? currentSlot.plannedDate.split('-').reverse().join('/') : 'Sem previsão'}
                </p>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-[#4A5568]">Data real da troca</label>
                <Input
                  type="date"
                  value={props.capturedAt}
                  onChange={(event) => props.onCapturedAtChange(event.target.value)}
                />
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-[#4A5568]">Observação</label>
                <textarea
                  rows={4}
                  value={props.note}
                  onChange={(event) => props.onNoteChange(event.target.value)}
                  placeholder="Ex.: troca feita hoje, encaixe confortável e sem dor."
                  className="ui-input-strong w-full rounded-lg px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="mt-4 rounded-2xl border border-[#d8ddc6] bg-[#f3f5ea] px-4 py-3 text-sm text-[#5d6934]">
                Use a câmera frontal para tirar uma selfie do sorriso.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
              {!props.selectedFile ? (
                <>
                  <p className="text-sm font-semibold text-[#1A202C]">Capturar selfie ou escolher foto</p>
                  <p className="mt-1 text-sm text-slate-600">
                    A foto será revisada antes do envio final.
                  </p>

                  <div className="mt-4">
                    <FilePickerWithCamera
                      accept="image/*"
                      capture="user"
                      uploadLabel="Escolher foto"
                      cameraLabel="Abrir selfie"
                      cameraTitle="Capturar selfie do tratamento"
                      onFileSelected={props.onFileSelected}
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    Selecione ou capture uma imagem para revisar e confirmar.
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1A202C]">Revisar selfie antes de confirmar</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Confira a imagem, faça ajustes simples e depois confirme o envio.
                      </p>
                    </div>
                    <span className="rounded-full border border-baby-200 bg-baby-50 px-3 py-1 text-xs font-semibold text-brand-700">
                      {props.selectedFile.name}
                    </span>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-3xl border border-slate-300 bg-slate-950/90 p-4">
                    <div className="flex min-h-[320px] items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Prévia da selfie do tratamento"
                        className="max-h-[420px] w-auto rounded-2xl object-contain shadow-2xl"
                        style={{ transform: `rotate(${rotation}deg) scaleX(${mirrored ? -1 : 1})` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={rotateLeft}>
                      Girar para a esquerda
                    </Button>
                    <Button variant="secondary" onClick={rotateRight}>
                      Girar para a direita
                    </Button>
                    <Button variant="secondary" onClick={() => setMirrored((current) => !current)}>
                      {mirrored ? 'Remover espelho' : 'Espelhar foto'}
                    </Button>
                  </div>

                  <div className="mt-5 flex flex-wrap justify-end gap-3">
                    <Button variant="ghost" onClick={props.onBackFromReview} disabled={props.uploading}>
                      Voltar
                    </Button>
                    <Button onClick={submitWithConfirmation} disabled={props.uploading}>
                      {props.uploading ? 'Confirmando envio...' : 'Confirmar e enviar'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Card>
    </section>
  )
}
