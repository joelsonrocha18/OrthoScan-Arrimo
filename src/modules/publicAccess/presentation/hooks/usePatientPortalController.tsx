import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../../../../app/ToastProvider'
import type { PatientPortalSnapshot } from '../../domain/models/PatientPortal'
import { ResolvePatientPortalSessionUseCase } from '../../application/useCases/ResolvePatientPortalSession'
import { UploadPatientPortalPhotoUseCase } from '../../application/useCases/UploadPatientPortalPhoto'
import { createPatientAccessRepository } from '../../infra/createPatientAccessRepository'
import { nowIsoDate } from '../../../../shared/utils/date'
import type { PatientPortalPhotoEditOptions } from '../lib/patientPortalPhotoEditing'
import { applyPatientPortalPhotoEdits } from '../lib/patientPortalPhotoEditing'
import {
  clearPatientPortalRouteSession,
  extractPatientPortalRouteSessionFromSearchParams,
  persistPatientPortalRouteSession,
  readPatientPortalRouteSession,
} from '../lib/patientPortalRouting'

function detectPortalDeviceLabel() {
  if (typeof navigator === 'undefined') return 'Dispositivo não identificado'
  const uaData = (navigator as Navigator & {
    userAgentData?: {
      mobile?: boolean
      platform?: string
      brands?: Array<{ brand?: string }>
    }
  }).userAgentData

  const platform = uaData?.platform || navigator.platform || ''
  const brand = uaData?.brands?.[0]?.brand || ''
  const userAgent = navigator.userAgent || ''

  if (/android/i.test(userAgent)) return `Android${brand ? ` - ${brand}` : ''}`
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iPhone/iPad'
  if (/windows/i.test(platform) || /windows/i.test(userAgent)) return 'Windows'
  if (/mac/i.test(platform) || /macintosh/i.test(userAgent)) return 'Mac'
  if (/linux/i.test(platform) || /linux/i.test(userAgent)) return 'Linux'
  if (platform) return platform
  return 'Dispositivo não identificado'
}

export function usePatientPortalController() {
  const repository = useMemo(() => createPatientAccessRepository(), [])
  const resolvePortalSession = useMemo(() => new ResolvePatientPortalSessionUseCase(repository), [repository])
  const uploadPortalPhoto = useMemo(() => new UploadPatientPortalPhotoUseCase(repository), [repository])
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [snapshot, setSnapshot] = useState<PatientPortalSnapshot | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState<{
    trayNumber: number
    capturedAt: string
    note: string
    file: File | null
  }>({
    trayNumber: 1,
    capturedAt: nowIsoDate(),
    note: '',
    file: null as File | null,
  })

  const sessionFromSearch = extractPatientPortalRouteSessionFromSearchParams(searchParams)
  const sessionFromStorage = readPatientPortalRouteSession()
  const routeSession = sessionFromSearch ?? sessionFromStorage
  const token = routeSession?.token ?? ''
  const accessCode = routeSession?.accessCode
  const resolvedAccessCode = accessCode ?? snapshot?.accessCode ?? ''

  useEffect(() => {
    if (!sessionFromSearch) return
    persistPatientPortalRouteSession(sessionFromSearch)
    navigate('/acesso/pacientes/portal', { replace: true })
  }, [navigate, sessionFromSearch])

  const loadSnapshot = useCallback(async () => {
    if (!token) {
      setLoading(false)
      setError('Sessão do paciente não encontrada. Solicite um novo acesso com a recepção.')
      clearPatientPortalRouteSession()
      return
    }

    setLoading(true)
    setError('')
    const result = await resolvePortalSession.execute({ token, accessCode })
    if (!result.ok) {
      clearPatientPortalRouteSession()
      setError(result.error)
      addToast({ type: 'error', title: 'Portal do paciente', message: result.error })
      setLoading(false)
      return
    }
    setSnapshot(result.data)
    setLoading(false)
    const nextSuggestedTray =
      result.data.photoSlots.find((item) => item.status !== 'recebida')?.trayNumber
      ?? result.data.photoSlots[0]?.trayNumber
      ?? 1
    setUploadForm((current) => ({
      ...current,
      trayNumber:
        current.trayNumber > 0 && result.data.photoSlots.some((item) => item.trayNumber === current.trayNumber && item.status !== 'recebida')
          ? current.trayNumber
          : nextSuggestedTray,
    }))
  }, [accessCode, addToast, resolvePortalSession, token])

  useEffect(() => {
    let active = true
    void loadSnapshot().then(() => {
      if (!active) return
    })

    return () => {
      active = false
    }
  }, [loadSnapshot])

  useEffect(() => {
    if (!snapshot) return
    const suggestedTray = snapshot.photoSlots.find((item) => item.status !== 'recebida')?.trayNumber
      ?? snapshot.photoSlots[0]?.trayNumber
      ?? 1
    setUploadForm((current) => ({
      ...current,
      trayNumber: current.trayNumber || suggestedTray,
    }))
  }, [snapshot])

  const backToAccess = () => {
    clearPatientPortalRouteSession()
    navigate('/acesso/pacientes', { replace: true })
  }

  const setTrayNumber = (value: number) => {
    setUploadForm((current) => ({
      ...current,
      trayNumber: value,
      file: current.trayNumber === value ? current.file : null,
    }))
  }

  const setCapturedAt = (value: string) => {
    setUploadForm((current) => ({ ...current, capturedAt: value }))
  }

  const setNote = (value: string) => {
    setUploadForm((current) => ({ ...current, note: value }))
  }

  const setFile = (file: File) => {
    setUploadForm((current) => ({ ...current, file }))
  }

  const clearSelectedFile = () => {
    setUploadForm((current) => ({ ...current, file: null }))
  }

  const selectPhotoSlot = (trayNumber: number, plannedDate: string) => {
    const slot = snapshot?.photoSlots.find((item) => item.trayNumber === trayNumber)
    if (slot?.status === 'recebida') return
    setUploadForm((current) => ({
      ...current,
      trayNumber,
      capturedAt: slot?.recordedAt ?? plannedDate ?? current.capturedAt,
      file: current.trayNumber === trayNumber ? current.file : null,
    }))
  }

  const submitPhoto = async (editOptions?: PatientPortalPhotoEditOptions) => {
    if (!token || !resolvedAccessCode) {
      addToast({ type: 'error', title: 'Portal do paciente', message: 'Sessão do paciente indisponível para envio.' })
      return
    }

    const selectedSlot = snapshot?.photoSlots.find((item) => item.trayNumber === uploadForm.trayNumber)
    if (selectedSlot?.status === 'recebida') {
      addToast({
        type: 'error',
        title: 'Foto do tratamento',
        message: 'Esta troca já foi confirmada. Não é possível alterar ou excluir a foto.',
      })
      return
    }

    let fileToUpload = uploadForm.file as File
    if (editOptions) {
      try {
        fileToUpload = await applyPatientPortalPhotoEdits(uploadForm.file as File, editOptions)
      } catch (photoError) {
        addToast({
          type: 'error',
          title: 'Foto do tratamento',
          message: photoError instanceof Error ? photoError.message : 'Não foi possível preparar a selfie para envio.',
        })
        return
      }
    }

    setUploading(true)
    const result = await uploadPortalPhoto.execute({
      token,
      accessCode: resolvedAccessCode,
      trayNumber: uploadForm.trayNumber,
      capturedAt: uploadForm.capturedAt,
      sentAt: new Date().toISOString(),
      deviceLabel: detectPortalDeviceLabel(),
      note: uploadForm.note,
      file: fileToUpload,
    })
    setUploading(false)

    if (!result.ok) {
      addToast({ type: 'error', title: 'Foto do tratamento', message: result.error })
      return
    }

    addToast({
      type: 'success',
      title: 'Foto registrada',
      message: `Foto do alinhador #${result.data.trayNumber} enviada com sucesso.`,
    })
    setUploadForm((current) => ({ ...current, note: '', file: null }))
    await loadSnapshot()
  }

  return {
    loading,
    snapshot,
    error,
    backToAccess,
    uploadForm,
    uploading,
    setTrayNumber,
    setCapturedAt,
    setNote,
    setFile,
    clearSelectedFile,
    selectPhotoSlot,
    submitPhoto,
  }
}
