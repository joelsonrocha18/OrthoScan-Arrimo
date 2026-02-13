import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import Button from '../Button'
import Card from '../Card'

type WebcamCaptureModalProps = {
  open: boolean
  onClose: () => void
  onCaptured: (file: File) => void
  facingMode?: 'environment' | 'user'
  title?: string
}

const FALLBACK_MESSAGE = 'Sem acesso à câmera. Verifique permissões do navegador.'

export default function WebcamCaptureModal({
  open,
  onClose,
  onCaptured,
  facingMode = 'environment',
  title = 'Capturar foto',
}: WebcamCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fallbackInputId = useId()

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  useEffect(() => {
    if (!open) {
      stopStream()
      setError(null)
      return
    }

    let cancelled = false

    const startCamera = async () => {
      setError(null)

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia unsupported')
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
      } catch {
        setError(FALLBACK_MESSAGE)
      }
    }

    startCamera()

    return () => {
      cancelled = true
      stopStream()
    }
  }, [open, facingMode])

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0, width, height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' })
        stopStream()
        onCaptured(file)
      },
      'image/jpeg',
      0.92,
    )
  }

  const handleClose = () => {
    stopStream()
    onClose()
  }

  const handleFallbackChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    onCaptured(file)
    event.target.value = ''
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <Card className="w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Fechar
          </Button>
        </div>

        <div className="mt-4">
          {error ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p>{error}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => document.getElementById(fallbackInputId)?.click()}
                >
                  Usar upload
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg bg-slate-900">
                <video ref={videoRef} autoPlay playsInline muted className="h-auto w-full" />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCapture}>Tirar foto</Button>
              </div>
            </div>
          )}
        </div>

        <input
          id={fallbackInputId}
          type="file"
          accept="image/*"
          capture={facingMode}
          className="hidden"
          onChange={handleFallbackChange}
        />

        <canvas ref={canvasRef} className="hidden" />
      </Card>
    </div>
  )
}
