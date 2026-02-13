import { useId, useState } from 'react'
import type { ChangeEvent } from 'react'
import WebcamCaptureModal from './WebcamCaptureModal'

type FilePickerWithCameraProps = {
  label?: string
  accept?: string
  capture?: 'environment' | 'user'
  disabled?: boolean
  onFileSelected: (file: File) => void
}

export default function FilePickerWithCamera({
  label,
  accept = 'image/*',
  capture = 'environment',
  disabled = false,
  onFileSelected,
}: FilePickerWithCameraProps) {
  const uploadId = useId()
  const cameraId = useId()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const canMedia = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  const shouldUseModal = canMedia || isIOS

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    onFileSelected(file)
    event.target.value = ''
  }

  const handleCameraChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    onFileSelected(file)
    event.target.value = ''
  }

  const handleOpenCamera = () => {
    if (disabled) return
    if (shouldUseModal) {
      setIsModalOpen(true)
      return
    }
    document.getElementById(cameraId)?.click()
  }

  const handleCaptured = (file: File) => {
    onFileSelected(file)
    setIsModalOpen(false)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      {label ? <p className="text-xs font-medium text-slate-600">{label}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={uploadId}
          className={`inline-flex h-8 cursor-pointer items-center rounded-lg px-3 text-xs font-semibold transition ${
            disabled ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Enviar arquivo
        </label>
        <input
          id={uploadId}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={handleUploadChange}
        />

        <button
          type="button"
          onClick={handleOpenCamera}
          disabled={disabled}
          className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold transition ${
            disabled ? 'bg-slate-100 text-slate-400' : 'bg-brand-500 text-white hover:bg-brand-700'
          }`}
        >
          Abrir camera
        </button>
        <input
          id={cameraId}
          type="file"
          accept={accept}
          capture={capture}
          className="hidden"
          disabled={disabled}
          onChange={handleCameraChange}
        />
      </div>

      <WebcamCaptureModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onCaptured={handleCaptured}
        facingMode={capture}
        title="Capturar foto"
      />
    </div>
  )
}
