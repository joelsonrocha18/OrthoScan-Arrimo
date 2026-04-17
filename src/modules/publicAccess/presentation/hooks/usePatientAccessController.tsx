import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../../../../app/ToastProvider'
import { StartPatientPortalSessionUseCase } from '../../application/useCases/StartPatientPortalSession'
import { createPatientAccessRepository } from '../../infra/createPatientAccessRepository'
import { formatCpf, normalizePortalAccessCode } from '../../domain/services/PatientAccessService'
import {
  extractPatientPortalRouteSessionFromSearchParams,
  extractPatientPortalRouteSessionFromUrl,
  persistPatientPortalRouteSession,
  resolvePatientPortalNavigationTarget,
} from '../lib/patientPortalRouting'

type PatientAccessForm = {
  cpf: string
  birthDate: string
  accessCode: string
}

function emptyForm(): PatientAccessForm {
  return { cpf: '', birthDate: '', accessCode: '' }
}

export function usePatientAccessController() {
  const repository = useMemo(() => createPatientAccessRepository(), [])
  const startPortalSession = useMemo(() => new StartPatientPortalSessionUseCase(repository), [repository])
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState<PatientAccessForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const routeSession = extractPatientPortalRouteSessionFromSearchParams(searchParams)
    if (!routeSession) return
    persistPatientPortalRouteSession(routeSession)
    navigate('/acesso/pacientes/portal', { replace: true })
  }, [navigate, searchParams])

  const updateCpf = (value: string) => {
    setForm((current) => ({ ...current, cpf: formatCpf(value) }))
  }

  const updateBirthDate = (value: string) => {
    setForm((current) => ({ ...current, birthDate: value }))
  }

  const updateAccessCode = (value: string) => {
    setForm((current) => ({ ...current, accessCode: normalizePortalAccessCode(value) }))
  }

  const submitAccess = async () => {
    setSubmitting(true)
    const result = await startPortalSession.execute(form)
    setSubmitting(false)

    if (!result.ok) {
      addToast({ type: 'error', title: 'Acesso do paciente', message: result.error })
      return
    }

    addToast({
      type: 'success',
      title: 'Acesso validado',
      message: 'Abrindo portal.',
    })
    const routeSession = extractPatientPortalRouteSessionFromUrl(result.data.portalUrl)
    if (routeSession) {
      persistPatientPortalRouteSession(routeSession)
    }
    const target = resolvePatientPortalNavigationTarget(result.data.portalUrl)
    if (/^https?:\/\//i.test(target)) {
      window.location.assign(target)
      return
    }
    navigate(target, { replace: true })
  }

  return {
    form,
    submitting,
    updateCpf,
    updateBirthDate,
    updateAccessCode,
    submitAccess,
  }
}
