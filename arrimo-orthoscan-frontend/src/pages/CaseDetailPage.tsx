import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../app/ToastProvider'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import ImageCaptureInput from '../components/files/ImageCaptureInput'
import Input from '../components/Input'
import { addAttachment, clearCaseScanFileError, markCaseScanFileError, registerCaseInstallation, setTrayState, updateCase } from '../data/caseRepo'
import { addLabItem, generateLabOrder } from '../data/labRepo'
import { getCaseSupplySummary, getReplenishmentAlerts } from '../domain/replenishment'
import AppShell from '../layouts/AppShell'
import { EXTRA_SLOTS, INTRA_SLOTS } from '../mocks/photoSlots'
import type { Case, CasePhase, CaseTray, TrayState } from '../types/Case'
import { useDb } from '../lib/useDb'
import { getCurrentUser } from '../lib/auth'
import { can } from '../auth/permissions'
import { listCasesForUser } from '../auth/scope'

const phaseLabelMap: Record<CasePhase, string> = {
  planejamento: 'Planejamento',
  orcamento: 'Orcamento',
  contrato_pendente: 'Contrato pendente',
  contrato_aprovado: 'Contrato aprovado',
  em_producao: 'Em producao',
  finalizado: 'Finalizado',
}

const phaseToneMap: Record<CasePhase, 'neutral' | 'info' | 'success'> = {
  planejamento: 'neutral',
  orcamento: 'neutral',
  contrato_pendente: 'neutral',
  contrato_aprovado: 'info',
  em_producao: 'info',
  finalizado: 'success',
}

const trayStateClasses: Record<TrayState, string> = {
  pendente: 'bg-slate-100 text-slate-700',
  em_producao: 'bg-blue-100 text-blue-700',
  pronta: 'bg-brand-500 text-white',
  entregue: 'bg-emerald-100 text-emerald-700',
  rework: 'bg-red-100 text-red-700',
}

const archLabelMap: Record<'superior' | 'inferior' | 'ambos', string> = {
  superior: 'Superior',
  inferior: 'Inferior',
  ambos: 'Ambos',
}

const scanArchLabelMap: Record<'superior' | 'inferior' | 'mordida', string> = {
  superior: 'Superior',
  inferior: 'Inferior',
  mordida: 'Mordida',
}

const slotLabelMap = Object.fromEntries([...INTRA_SLOTS, ...EXTRA_SLOTS].map((slot) => [slot.id, slot.label]))

function formatDate(dateIso: string) {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString('pt-BR')
}

function caseProgress(total: number, delivered: number) {
  const safeDelivered = Math.max(0, Math.min(delivered, total))
  const safeTotal = Math.max(0, total)
  return { delivered: safeDelivered, total: safeTotal, percent: safeTotal > 0 ? Math.round((safeDelivered / safeTotal) * 100) : 0 }
}

function addDays(baseIsoDate: string, days: number) {
  const base = new Date(`${baseIsoDate}T00:00:00`)
  base.setDate(base.getDate() + days)
  return base.toISOString().slice(0, 10)
}

function scheduleStateForTray(
  trayNumber: number,
  maxForArch: number,
  deliveredCount: number,
  trays: CaseTray[],
): TrayState | 'nao_aplica' {
  if (trayNumber > maxForArch) return 'nao_aplica'
  if (trayNumber <= deliveredCount) return 'entregue'
  const tray = trays.find((item) => item.trayNumber === trayNumber)
  if (!tray) return 'pendente'
  // "entregue" no tray representa entrega ao dentista/LAB. Para paciente, so conta pelo deliveredCount.
  if (tray.state === 'entregue') return 'pronta'
  return tray.state
}

function scheduleStateLabel(state: TrayState | 'nao_aplica') {
  if (state === 'nao_aplica') return '-'
  if (state === 'em_producao') return 'Em producao'
  if (state === 'pronta') return 'Pronta'
  if (state === 'entregue') return 'Entregue'
  if (state === 'rework') return 'Rework'
  return 'Pendente'
}

function scheduleStateClass(state: TrayState | 'nao_aplica') {
  if (state === 'nao_aplica') return 'text-slate-400'
  if (state === 'em_producao') return 'text-blue-700'
  if (state === 'pronta') return 'text-emerald-700'
  if (state === 'entregue') return 'text-emerald-700'
  if (state === 'rework') return 'text-red-700'
  return 'text-slate-700'
}

function timelineStateForTray(
  tray: CaseTray,
  deliveredUpper: number,
  deliveredLower: number,
): TrayState {
  const deliveredPair = Math.max(0, Math.min(deliveredUpper, deliveredLower))
  if (tray.trayNumber <= deliveredPair) return 'entregue'
  if (tray.state === 'entregue') return 'pronta'
  return tray.state
}

function buildChangeSchedule(
  installedAt: string | undefined,
  changeEveryDays: number,
  totalUpper: number,
  totalLower: number,
  deliveredUpper: number,
  deliveredLower: number,
  trays: CaseTray[],
): Array<{ trayNumber: number; changeDate: string; superiorState: TrayState | 'nao_aplica'; inferiorState: TrayState | 'nao_aplica' }> {
  if (!installedAt) return []
  const max = Math.max(totalUpper, totalLower)
  return Array.from({ length: max }, (_, index) => {
    const trayNumber = index + 1
    return {
      trayNumber,
      changeDate: addDays(installedAt, index * changeEveryDays),
      superiorState: scheduleStateForTray(trayNumber, totalUpper, deliveredUpper, trays),
      inferiorState: scheduleStateForTray(trayNumber, totalLower, deliveredLower, trays),
    }
  })
}

function countScheduleStates(schedule: ReturnType<typeof buildChangeSchedule>) {
  return schedule.reduce(
    (acc, row) => {
      const states = [row.superiorState, row.inferiorState]
      acc.aguardando_iniciar += states.filter((state) => state === 'pendente').length
      acc.em_producao += states.filter((state) => state === 'em_producao').length
      acc.controle_qualidade += states.filter((state) => state === 'rework').length
      acc.prontas += states.filter((state) => state === 'pronta').length
      acc.entregues += states.filter((state) => state === 'entregue').length
      return acc
    },
    { aguardando_iniciar: 0, em_producao: 0, controle_qualidade: 0, prontas: 0, entregues: 0 },
  )
}

function fileAvailability(item: NonNullable<Case['scanFiles']>[number]) {
  if (item.isLocal && item.url) return { label: 'Abrir', url: item.url }
  if (item.isLocal && !item.url) return { label: 'arquivo local (reenvie para abrir)' }
  if (item.url) return { label: 'Abrir', url: item.url }
  return { label: 'arquivo local (reenvie para abrir)' }
}

function slotLabel(slotId?: string) {
  if (!slotId) return 'Sem slot'
  return slotLabelMap[slotId] ?? slotId
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { db } = useDb()
  const { addToast } = useToast()
  const currentUser = getCurrentUser(db)
  const canWrite = can(currentUser, 'cases.write')
  const [selectedTray, setSelectedTray] = useState<CaseTray | null>(null)
  const [trayState, setSelectedTrayState] = useState<TrayState>('pendente')
  const [trayNote, setTrayNote] = useState('')
  const [budgetValue, setBudgetValue] = useState('')
  const [budgetNotes, setBudgetNotes] = useState('')
  const [contractNotes, setContractNotes] = useState('')
  const [installationDate, setInstallationDate] = useState(new Date().toISOString().slice(0, 10))
  const [installationNote, setInstallationNote] = useState('')
  const [installationDeliveredUpper, setInstallationDeliveredUpper] = useState('0')
  const [installationDeliveredLower, setInstallationDeliveredLower] = useState('0')
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false)
  const [attachmentType, setAttachmentType] = useState<'imagem' | 'documento' | 'outro'>('imagem')
  const [attachmentNote, setAttachmentNote] = useState('')
  const [attachmentDate, setAttachmentDate] = useState(new Date().toISOString().slice(0, 10))
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const initializedCaseIdRef = useRef<string | null>(null)

  const currentCase = useMemo(
    () => (params.id ? db.cases.find((item) => item.id === params.id) ?? null : null),
    [db.cases, params.id],
  )
  const scopedCases = useMemo(() => listCasesForUser(db, currentUser), [db, currentUser])

  const totalUpper = currentCase?.totalTraysUpper ?? currentCase?.totalTrays ?? 0
  const totalLower = currentCase?.totalTraysLower ?? currentCase?.totalTrays ?? 0
  const deliveredUpper = currentCase?.installation?.deliveredUpper ?? 0
  const deliveredLower = currentCase?.installation?.deliveredLower ?? 0
  const progressUpper = useMemo(() => caseProgress(totalUpper, deliveredUpper), [deliveredUpper, totalUpper])
  const progressLower = useMemo(() => caseProgress(totalLower, deliveredLower), [deliveredLower, totalLower])
  const changeSchedule = useMemo(
    () =>
      currentCase
        ? buildChangeSchedule(
            currentCase.installation?.installedAt,
            currentCase.changeEveryDays,
            totalUpper,
            totalLower,
            progressUpper.delivered,
            progressLower.delivered,
            currentCase.trays,
          )
        : [],
    [currentCase, progressLower.delivered, progressUpper.delivered, totalLower, totalUpper],
  )
  const scheduleSummary = useMemo(() => countScheduleStates(changeSchedule), [changeSchedule])
  const inProductionCount = useMemo(() => scheduleSummary.em_producao + scheduleSummary.controle_qualidade, [scheduleSummary])
  const readyCount = useMemo(() => scheduleSummary.prontas, [scheduleSummary])
  const deliveredPairCount = useMemo(() => Math.max(0, Math.min(progressUpper.delivered, progressLower.delivered)), [progressLower.delivered, progressUpper.delivered])
  const linkedLabItems = useMemo(
    () => (currentCase ? db.labItems.filter((item) => item.caseId === currentCase.id) : []),
    [currentCase, db.labItems],
  )
  const hasProductionOrder = useMemo(
    () => linkedLabItems.some((item) => (item.requestKind ?? 'producao') === 'producao'),
    [linkedLabItems],
  )
  const hasDentistDelivery = useMemo(() => (currentCase?.deliveryLots?.length ?? 0) > 0, [currentCase])
  const labSummary = useMemo(
    () => ({
      aguardando_iniciar: scheduleSummary.aguardando_iniciar,
      em_producao: scheduleSummary.em_producao,
      controle_qualidade: scheduleSummary.controle_qualidade,
      prontas: scheduleSummary.prontas,
      entregues: scheduleSummary.entregues,
      osItens: linkedLabItems.length,
    }),
    [linkedLabItems.length, scheduleSummary],
  )
  const groupedScanFiles = useMemo(() => {
    const scanFiles = currentCase?.scanFiles ?? []
    const scan3d = {
      superior: scanFiles.filter((item) => item.kind === 'scan3d' && item.arch === 'superior'),
      inferior: scanFiles.filter((item) => item.kind === 'scan3d' && item.arch === 'inferior'),
      mordida: scanFiles.filter((item) => item.kind === 'scan3d' && item.arch === 'mordida'),
    }
    const fotosIntra = scanFiles
      .filter((item) => item.kind === 'foto_intra')
      .sort((a, b) => slotLabel(a.slotId).localeCompare(slotLabel(b.slotId)))
    const fotosExtra = scanFiles
      .filter((item) => item.kind === 'foto_extra')
      .sort((a, b) => slotLabel(a.slotId).localeCompare(slotLabel(b.slotId)))
    const radiografias = {
      panoramica: scanFiles.filter((item) => item.rxType === 'panoramica'),
      teleradiografia: scanFiles.filter((item) => item.rxType === 'teleradiografia'),
      tomografia: scanFiles.filter((item) => item.rxType === 'tomografia' || item.kind === 'dicom'),
    }
    const planejamento = scanFiles.filter((item) => item.kind === 'projeto')
    return { scan3d, fotosIntra, fotosExtra, radiografias, planejamento }
  }, [currentCase])
  const supplySummary = useMemo(() => (currentCase ? getCaseSupplySummary(currentCase) : null), [currentCase])
  const replenishmentAlerts = useMemo(() => (currentCase ? getReplenishmentAlerts(currentCase) : []), [currentCase])
  const patientDisplayName = useMemo(() => {
    if (!currentCase) return ''
    if (!currentCase.patientId) return currentCase.patientName
    return db.patients.find((item) => item.id === currentCase.patientId)?.name ?? currentCase.patientName
  }, [currentCase, db.patients])
  const dentistsById = useMemo(() => new Map(db.dentists.map((item) => [item.id, item])), [db.dentists])
  const clinicsById = useMemo(() => new Map(db.clinics.map((item) => [item.id, item])), [db.clinics])
  const clinicName = currentCase?.clinicId ? clinicsById.get(currentCase.clinicId)?.tradeName : undefined
  const dentist = currentCase?.dentistId ? dentistsById.get(currentCase.dentistId) : undefined
  const requester = currentCase?.requestedByDentistId ? dentistsById.get(currentCase.requestedByDentistId) : undefined
  const dentistPrefix = dentist?.gender === 'feminino' ? 'Dra.' : dentist ? 'Dr.' : ''
  const requesterPrefix = requester?.gender === 'feminino' ? 'Dra.' : requester ? 'Dr.' : ''

  useEffect(() => {
    if (!currentCase) {
      initializedCaseIdRef.current = null
      return
    }
    if (initializedCaseIdRef.current === currentCase.id) return
    initializedCaseIdRef.current = currentCase.id
    setBudgetValue(currentCase.budget?.value ? String(currentCase.budget.value) : '')
    setBudgetNotes(currentCase.budget?.notes ?? '')
    setContractNotes(currentCase.contract?.notes ?? '')
    setInstallationDate(currentCase.installation?.installedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
    setInstallationNote(currentCase.installation?.note ?? '')
    setInstallationDeliveredUpper('0')
    setInstallationDeliveredLower('0')
  }, [currentCase])

  if (!currentCase) {
    return (
      <AppShell breadcrumb={['Início', 'Tratamentos']}>
        <Card>
          <h1 className="text-xl font-semibold text-slate-900">Caso nao encontrado</h1>
          <p className="mt-2 text-sm text-slate-500">O caso solicitado nao existe ou foi removido.</p>
          <Button className="mt-4" onClick={() => navigate('/app/cases')}>
            Voltar
          </Button>
        </Card>
      </AppShell>
    )
  }

  if (!scopedCases.some((item) => item.id === currentCase.id)) {
    return (
      <AppShell breadcrumb={['Inicio', 'Tratamentos']}>
        <Card>
          <h1 className="text-xl font-semibold text-slate-900">Sem acesso</h1>
          <p className="mt-2 text-sm text-slate-500">Seu perfil nao permite visualizar este caso.</p>
          <Button className="mt-4" onClick={() => navigate('/app/cases')}>
            Voltar
          </Button>
        </Card>
      </AppShell>
    )
  }

  const openTrayModal = (tray: CaseTray) => {
    if (!canWrite) return
    setSelectedTray(tray)
    setSelectedTrayState(tray.state)
    setTrayNote(tray.notes ?? '')
  }

  const saveTrayChanges = () => {
    if (!canWrite) return
    if (!selectedTray) {
      return
    }

    const trayInCase = currentCase.trays.find((item) => item.trayNumber === selectedTray.trayNumber)
    if (!trayInCase) {
      return
    }

    if (trayState !== trayInCase.state) {
      const stateResult = setTrayState(currentCase.id, selectedTray.trayNumber, trayState)
      if (!stateResult.ok) {
        addToast({ type: 'error', title: 'Erro ao atualizar placa', message: stateResult.error })
        return
      }

      if (trayState === 'rework' && trayInCase.state !== 'rework') {
        const hasOpenRework = linkedLabItems.some(
          (item) => item.trayNumber === selectedTray.trayNumber && item.requestKind === 'reconfeccao' && item.status !== 'prontas',
        )
        const hasOpenReworkProduction = linkedLabItems.some(
          (item) =>
            item.trayNumber === selectedTray.trayNumber &&
            (item.requestKind ?? 'producao') === 'producao' &&
            (item.notes ?? '').toLowerCase().includes('rework') &&
            item.status !== 'prontas',
        )
        const today = new Date().toISOString().slice(0, 10)

        if (!hasOpenRework) {
          const created = addLabItem({
            caseId: currentCase.id,
            requestKind: 'reconfeccao',
            arch: currentCase.arch ?? 'ambos',
            plannedUpperQty: 0,
            plannedLowerQty: 0,
            patientName: currentCase.patientName,
            trayNumber: selectedTray.trayNumber,
            plannedDate: today,
            dueDate: trayInCase.dueDate ?? today,
            status: 'aguardando_iniciar',
            priority: 'Urgente',
            notes: `Reconfeccao solicitada via timeline da placa #${selectedTray.trayNumber}.`,
          })
          if (!created.ok) {
            addToast({ type: 'error', title: 'Reconfeccao', message: created.error })
            return
          }
          if (!created.sync.ok) {
            addToast({ type: 'error', title: 'Reconfeccao', message: created.sync.message })
            return
          }
        }

        if (!hasOpenReworkProduction) {
          const production = addLabItem({
            caseId: currentCase.id,
            requestKind: 'producao',
            arch: currentCase.arch ?? 'ambos',
            plannedUpperQty: 0,
            plannedLowerQty: 0,
            patientName: currentCase.patientName,
            trayNumber: selectedTray.trayNumber,
            plannedDate: today,
            dueDate: trayInCase.dueDate ?? today,
            status: 'aguardando_iniciar',
            priority: 'Urgente',
            notes: `OS de producao para rework da placa #${selectedTray.trayNumber}.`,
          })
          if (!production.ok) {
            addToast({ type: 'error', title: 'Rework', message: production.error })
            return
          }
          if (!production.sync.ok) {
            addToast({ type: 'error', title: 'Rework', message: production.sync.message })
            return
          }
        }

        if (!hasOpenRework || !hasOpenReworkProduction) {
          addToast({ type: 'success', title: 'OS de rework geradas', message: 'Reconfeccao e confeccao adicionadas na esteira.' })
        }
      }
    }

    const nextTrays = currentCase.trays.map((item) =>
      item.trayNumber === selectedTray.trayNumber ? { ...item, notes: trayNote.trim() || undefined } : item,
    )
    updateCase(currentCase.id, { trays: nextTrays })
    addToast({ type: 'success', title: 'Placa atualizada' })
    setSelectedTray(null)
  }

  const handleAttachmentSave = () => {
    if (!canWrite) return
    if (!attachmentFile) {
      addToast({ type: 'error', title: 'Anexos', message: 'Selecione um arquivo.' })
      return
    }

    const objectUrl = URL.createObjectURL(attachmentFile)
    const result = addAttachment(currentCase.id, {
      name: attachmentFile.name,
      type: attachmentType === 'imagem' ? 'foto' : attachmentType === 'documento' ? 'scan' : 'outro',
      url: objectUrl,
      mime: attachmentFile.type,
      size: attachmentFile.size,
      isLocal: true,
      status: 'ok',
      attachedAt: attachmentDate,
      note: attachmentNote.trim() || undefined,
    })

    if (!result.ok) {
      addToast({ type: 'error', title: 'Anexos', message: result.error })
      return
    }

    setAttachmentFile(null)
    setAttachmentNote('')
    setAttachmentModalOpen(false)
    addToast({ type: 'success', title: 'Anexo adicionado' })
  }

  const concludePlanning = () => {
    if (!canWrite) return
    updateCase(currentCase.id, { phase: 'orcamento', status: 'planejamento' })
    addToast({ type: 'success', title: 'Planejamento concluido' })
  }

  const closeBudget = () => {
    if (!canWrite) return
    const normalized = budgetValue.trim().replace(/\./g, '').replace(',', '.')
    const parsed = Number(normalized)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      addToast({ type: 'error', title: 'Orcamento', message: 'Informe um valor valido para o orcamento.' })
      return
    }
    updateCase(currentCase.id, {
      phase: 'contrato_pendente',
      status: 'planejamento',
      budget: { value: parsed, notes: budgetNotes.trim() || undefined, createdAt: new Date().toISOString() },
      contract: { ...(currentCase.contract ?? { status: 'pendente' }), status: 'pendente', notes: contractNotes.trim() || undefined },
    })
    addToast({ type: 'success', title: 'Orcamento fechado' })
  }

  const approveContract = () => {
    if (!canWrite) return
    const approvedAt = new Date().toISOString()
    updateCase(currentCase.id, {
      phase: 'contrato_aprovado',
      status: 'planejamento',
      contract: { status: 'aprovado', approvedAt, notes: contractNotes.trim() || undefined },
    })
    addToast({ type: 'success', title: 'Contrato aprovado', message: `Aprovado em ${new Date(approvedAt).toLocaleString('pt-BR')}` })
  }

  const createLabOrder = () => {
    if (!canWrite) return
    const result = generateLabOrder(currentCase.id)
    if (!result.ok) {
      addToast({ type: 'error', title: 'Gerar OS', message: result.error })
      return
    }
    addToast({
      type: 'success',
      title: 'OS do laboratorio',
      message: result.alreadyExists ? 'OS ja existia para este caso.' : 'OS gerada com sucesso.',
    })
  }

  const markCaseFileError = (fileId: string) => {
    if (!canWrite) return
    const reason = window.prompt('Motivo do erro no anexo:')
    if (!reason || !reason.trim()) return
    const result = markCaseScanFileError(currentCase.id, fileId, reason)
    if (!result.ok) {
      addToast({ type: 'error', title: 'Anexos', message: result.error })
      return
    }
    addToast({ type: 'info', title: 'Anexo marcado como erro' })
  }

  const clearCaseFileError = (fileId: string) => {
    if (!canWrite) return
    const result = clearCaseScanFileError(currentCase.id, fileId)
    if (!result.ok) {
      addToast({ type: 'error', title: 'Anexos', message: result.error })
      return
    }
    addToast({ type: 'success', title: 'Erro removido do anexo' })
  }

  const saveInstallation = () => {
    if (!canWrite) return
    const upperCount = Number(installationDeliveredUpper)
    const lowerCount = Number(installationDeliveredLower)
    if (!Number.isFinite(upperCount) || !Number.isFinite(lowerCount) || upperCount < 0 || lowerCount < 0) {
      addToast({ type: 'error', title: 'Instalacao', message: 'Informe quantidades validas por arcada.' })
      return
    }
    const result = registerCaseInstallation(currentCase.id, {
      installedAt: installationDate,
      note: installationNote.trim() || undefined,
      deliveredUpper: Math.trunc(upperCount),
      deliveredLower: Math.trunc(lowerCount),
    })
    if (!result.ok) {
      addToast({ type: 'error', title: 'Instalacao', message: result.error })
      return
    }
    addToast({ type: 'success', title: 'Instalacao registrada' })
  }

  const renderScanFile = (item: NonNullable<Case['scanFiles']>[number], labelOverride?: string) => {
    const availability = fileAvailability(item)
    const status = item.status ?? 'ok'
    const attachedDate = item.attachedAt ?? item.createdAt
    return (
      <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm text-slate-900">{item.name}</p>
          <p className="text-xs text-slate-500">
            {labelOverride ?? (item.arch ? scanArchLabelMap[item.arch] : 'Arquivo')} -{' '}
            {new Date(attachedDate).toLocaleDateString('pt-BR')}
          </p>
          <p className="text-xs text-slate-500">Obs: {item.note || '-'}</p>
          {status === 'erro' ? (
            <p className="text-xs text-red-700">
              Motivo: {item.flaggedReason || '-'} | Em: {item.flaggedAt ? new Date(item.flaggedAt).toLocaleString('pt-BR') : '-'}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${status === 'erro' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {status === 'erro' ? 'ERRO' : 'OK'}
          </span>
        {availability.url ? (
          <a href={availability.url} target="_blank" rel="noreferrer" className="text-xs text-brand-700">
            {availability.label}
          </a>
        ) : (
          <span className="text-xs text-slate-500">{availability.label}</span>
        )}
        </div>
        </div>
        {canWrite ? (
          <div className="mt-2">
            {status === 'erro' ? (
              <button type="button" className="text-xs font-semibold text-brand-700" onClick={() => clearCaseFileError(item.id)}>
                Desmarcar erro
              </button>
            ) : (
              <button type="button" className="text-xs font-semibold text-red-700" onClick={() => markCaseFileError(item.id)}>
                Marcar como erro
              </button>
            )}
          </div>
        ) : null}
      </div>
    )
  }

  const renderScanFileGroup = (title: string, files: NonNullable<Case['scanFiles']>) => (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</p>
      <div className="mt-2 space-y-2">
        {files.length === 0 ? <p className="text-sm text-slate-500">Nenhum arquivo.</p> : files.map((item) => renderScanFile(item))}
      </div>
    </div>
  )

  return (
    <AppShell breadcrumb={['Início', 'Tratamentos', patientDisplayName]}>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Caso: {patientDisplayName}</h1>
          {currentCase.treatmentCode ? (
            <p className="mt-1 text-sm font-semibold text-slate-700">
              Identificacao: {currentCase.treatmentCode} ({currentCase.treatmentOrigin === 'interno' ? 'Interno ARRIMO' : 'Externo'})
            </p>
          ) : null}
          <p className="mt-2 text-sm text-slate-500">
            Scan em {formatDate(currentCase.scanDate)} - {currentCase.totalTrays} placas - troca a cada {currentCase.changeEveryDays} dias
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Badge tone={phaseToneMap[currentCase.phase]}>{phaseLabelMap[currentCase.phase]}</Badge>
            <span className="text-xs text-slate-500">
              Ultima atualizacao: {new Date(currentCase.updatedAt).toLocaleString('pt-BR')}
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-600">
            Planejamento: Superior {currentCase.totalTraysUpper ?? '-'} | Inferior {currentCase.totalTraysLower ?? '-'} |
            Troca {currentCase.changeEveryDays} dias | Attachments: {currentCase.attachmentBondingTray ? 'Sim' : 'Nao'}
          </p>
        </div>

        <Link
          to="/app/cases"
          className="inline-flex h-10 items-center rounded-lg bg-slate-200 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-300"
        >
          Voltar
        </Link>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Progresso - Superior</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {progressUpper.delivered}/{progressUpper.total}
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-brand-500" style={{ width: `${progressUpper.percent}%` }} />
          </div>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Progresso - Inferior</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {progressLower.delivered}/{progressLower.total}
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-brand-500" style={{ width: `${progressLower.percent}%` }} />
          </div>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Resumo</p>
          <p className="mt-2 text-sm text-slate-700">Em producao/CQ: {inProductionCount}</p>
          <p className="mt-1 text-sm text-slate-700">Prontas: {readyCount}</p>
          <p className="mt-1 text-sm text-slate-700">Entregues: {labSummary.entregues}</p>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Fluxo do Tratamento</h2>
          <p className="mt-1 text-sm text-slate-500">Fase atual: {phaseLabelMap[currentCase.phase]}</p>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-800">Etapa 1 - Planejamento</p>
              <Button className="mt-2" size="sm" onClick={concludePlanning} disabled={currentCase.phase !== 'planejamento' || !canWrite}>
                Concluir planejamento
              </Button>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-800">Etapa 2 - Orcamento</p>
              <div className="mt-2 grid gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Valor do orcamento"
                  value={budgetValue}
                  onChange={(event) => setBudgetValue(event.target.value)}
                />
                <textarea
                  rows={2}
                  placeholder="Observacoes do orcamento"
                  value={budgetNotes}
                  onChange={(event) => setBudgetNotes(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <Button size="sm" onClick={closeBudget} disabled={currentCase.phase !== 'orcamento' || !canWrite}>
                  Fechar orcamento
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-800">Etapa 3 - Contrato</p>
              <p className="mt-1 text-xs text-slate-500">
                Status: {currentCase.contract?.status ?? 'pendente'}
                {currentCase.contract?.approvedAt ? ` | Aprovado em ${new Date(currentCase.contract.approvedAt).toLocaleString('pt-BR')}` : ''}
              </p>
              <textarea
                rows={2}
                placeholder="Observacoes do contrato"
                value={contractNotes}
                onChange={(event) => setContractNotes(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <Button className="mt-2" size="sm" onClick={approveContract} disabled={currentCase.phase !== 'contrato_pendente' || !canWrite}>
                Aprovar contrato
              </Button>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-800">Etapa 4 - Ordem de Servico (LAB)</p>
              <Button
                className="mt-2"
                size="sm"
                onClick={createLabOrder}
                disabled={!(currentCase.phase === 'contrato_aprovado' || currentCase.phase === 'em_producao') || !canWrite}
                title={currentCase.phase === 'contrato_aprovado' || currentCase.phase === 'em_producao' ? '' : 'Contrato precisa estar aprovado para gerar OS'}
              >
                Gerar OS para o LAB
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Tratamento e reposicao paciente</h2>
          <div className="mt-3 grid gap-3">
            {currentCase.installation ? (
              <p className="text-sm text-slate-700">
                Registro atual: {new Date(`${currentCase.installation.installedAt.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR')} | Sup{' '}
                {currentCase.installation.deliveredUpper ?? 0} | Inf {currentCase.installation.deliveredLower ?? 0}
              </p>
            ) : null}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Data de inicio do tratamento</label>
              <Input
                type="date"
                value={installationDate}
                onChange={(event) => setInstallationDate(event.target.value)}
                disabled={Boolean(currentCase.installation?.installedAt)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Observacao</label>
              <textarea
                rows={3}
                value={installationNote}
                onChange={(event) => setInstallationNote(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Entrega paciente - Superior</label>
                <Input
                  type="number"
                  min={0}
                  max={totalUpper}
                  value={installationDeliveredUpper}
                  onChange={(event) => setInstallationDeliveredUpper(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Entrega paciente - Inferior</label>
                <Input
                  type="number"
                  min={0}
                  max={totalLower}
                  value={installationDeliveredLower}
                  onChange={(event) => setInstallationDeliveredLower(event.target.value)}
                />
              </div>
            </div>
            <div>
              <Button
                size="sm"
                onClick={saveInstallation}
                disabled={!canWrite || !hasProductionOrder || !hasDentistDelivery}
                title={
                  !hasProductionOrder
                    ? 'Gere a OS do LAB antes.'
                    : !hasDentistDelivery
                      ? 'Registre a entrega ao dentista antes.'
                      : ''
                }
              >
                {currentCase.installation ? 'Registrar reposicao paciente' : 'Registrar inicio tratamento'}
              </Button>
              {!hasProductionOrder ? <p className="mt-2 text-xs text-amber-700">Ordem de servico do LAB ainda nao gerada.</p> : null}
              {!hasDentistDelivery ? <p className="mt-1 text-xs text-amber-700">Registre antes a entrega ao dentista.</p> : null}
            </div>
          </div>
        </Card>

      </section>

      <section className="mt-6">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Reposicao prevista</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>
              Entregue ao paciente: Superior {progressUpper.delivered}/{progressUpper.total} | Inferior {progressLower.delivered}/{progressLower.total}
            </p>
            <p>Total geral planejado: {Math.max(progressUpper.total, progressLower.total)}</p>
            <p>Proxima placa necessaria: {supplySummary?.nextTray ? `#${supplySummary.nextTray}` : 'Nenhuma (caso completo)'}</p>
            <p>
              Proxima reposicao prevista para:{' '}
              {supplySummary?.nextDueDate ? new Date(`${supplySummary.nextDueDate}T00:00:00`).toLocaleDateString('pt-BR') : '-'}
            </p>
            {!currentCase.installation?.installedAt ? (
              <p className="text-sm text-slate-500">Registre a instalacao para calcular reposicoes.</p>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {replenishmentAlerts.length === 0 ? (
              <span className="text-xs text-slate-500">Sem alertas ativos.</span>
            ) : (
              replenishmentAlerts.map((alert) => (
                <span
                  key={alert.id}
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    alert.severity === 'urgent'
                      ? 'bg-red-100 text-red-700'
                      : alert.severity === 'high'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {alert.type === 'warning_15d' ? '15d' : alert.type === 'warning_10d' ? '10d' : 'atrasado'}
                </span>
              ))
            )}
          </div>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Informações clínicas</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-medium">Arcada:</span> {currentCase.arch ? archLabelMap[currentCase.arch] : '-'}
            </p>
            <p>
              <span className="font-medium">Queixa do paciente:</span> {currentCase.complaint || '-'}
            </p>
            <p>
              <span className="font-medium">Orientação do dentista:</span> {currentCase.dentistGuidance || '-'}
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profissional / Clínica</p>
              <p className="mt-1">
                <span className="font-medium">Clínica:</span> {clinicName || '-'}
              </p>
              <p>
                <span className="font-medium">Dentista responsável:</span>{' '}
                {dentist ? `${dentistPrefix} ${dentist.name}` : '-'}
              </p>
              <p>
                <span className="font-medium">Solicitante:</span>{' '}
                {requester ? `${requesterPrefix} ${requester.name}` : '-'}
              </p>
            </div>
            <p>
              <span className="font-medium">Troca a cada (dias):</span> {currentCase.changeEveryDays}
            </p>
            <p>
              <span className="font-medium">Placas:</span> Superior: {currentCase.totalTraysUpper ?? '-'} | Inferior:{' '}
              {currentCase.totalTraysLower ?? '-'}
            </p>
            <p>
              <span className="font-medium">Placa de attachments:</span> {currentCase.attachmentBondingTray ? 'Sim' : 'Nao'}
            </p>
            <p>
              <span className="font-medium">Fonte:</span> {currentCase.sourceScanId ? `Scan ${currentCase.sourceScanId}` : 'Nao vinculado'}
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Arquivos do scan</h2>
          <div className="mt-3 space-y-4">
            {renderScanFileGroup('Scan 3D - Superior', groupedScanFiles.scan3d.superior)}
            {renderScanFileGroup('Scan 3D - Inferior', groupedScanFiles.scan3d.inferior)}
            {renderScanFileGroup('Scan 3D - Mordida', groupedScanFiles.scan3d.mordida)}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Fotos intraorais</p>
              <div className="mt-2 space-y-2">
                {groupedScanFiles.fotosIntra.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum arquivo.</p>
                ) : (
                  groupedScanFiles.fotosIntra.map((item) => renderScanFile(item, slotLabel(item.slotId)))
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Fotos extraorais</p>
              <div className="mt-2 space-y-2">
                {groupedScanFiles.fotosExtra.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum arquivo.</p>
                ) : (
                  groupedScanFiles.fotosExtra.map((item) => renderScanFile(item, slotLabel(item.slotId)))
                )}
              </div>
            </div>
            {renderScanFileGroup('Radiografias - Panoramica', groupedScanFiles.radiografias.panoramica)}
            {renderScanFileGroup('Radiografias - Teleradiografia', groupedScanFiles.radiografias.teleradiografia)}
            {renderScanFileGroup('Radiografias - Tomografia', groupedScanFiles.radiografias.tomografia)}
            {renderScanFileGroup('Planejamento', groupedScanFiles.planejamento)}
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Produção (LAB)</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">Aguardando: {labSummary.aguardando_iniciar}</div>
            <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">Em producao: {labSummary.em_producao}</div>
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">CQ: {labSummary.controle_qualidade}</div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Prontas: {labSummary.prontas}</div>
            <div className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800">Entregues: {labSummary.entregues}</div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Itens da OS no LAB: {labSummary.osItens}</p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Placa</th>
                  <th className="px-3 py-2 font-semibold">Troca prevista</th>
                  <th className="px-3 py-2 font-semibold">Superior</th>
                  <th className="px-3 py-2 font-semibold">Inferior</th>
                  <th className="px-3 py-2 font-semibold">Entrega paciente</th>
                </tr>
              </thead>
              <tbody>
                {changeSchedule.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-slate-500">
                      Registre a instalacao para gerar agenda de trocas.
                    </td>
                  </tr>
                ) : (
                  changeSchedule.map((row) => (
                    <tr key={row.trayNumber} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold text-slate-800">#{row.trayNumber}</td>
                      <td className="px-3 py-2 text-slate-700">{new Date(`${row.changeDate}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                      <td className={`px-3 py-2 font-medium ${scheduleStateClass(row.superiorState)}`}>{scheduleStateLabel(row.superiorState)}</td>
                      <td className={`px-3 py-2 font-medium ${scheduleStateClass(row.inferiorState)}`}>{scheduleStateLabel(row.inferiorState)}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.trayNumber <= deliveredPairCount
                          ? new Date(`${row.changeDate}T00:00:00`).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Timeline de placas</h2>
          <p className="mt-1 text-sm text-slate-500">Clique em uma placa para ver detalhes e alterar estado.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded px-2 py-1 bg-slate-100 text-slate-700">Pendente</span>
            <span className="rounded px-2 py-1 bg-blue-100 text-blue-700">Em producao</span>
            <span className="rounded px-2 py-1 bg-brand-500 text-white">Pronta</span>
            <span className="rounded px-2 py-1 bg-emerald-100 text-emerald-700">Entregue</span>
            <span className="rounded px-2 py-1 bg-red-100 text-red-700">Rework</span>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
            {currentCase.trays.map((tray) => (
              <button
                key={tray.trayNumber}
                type="button"
                onClick={canWrite ? () => openTrayModal(tray) : undefined}
                disabled={!canWrite}
                className={`h-10 rounded-lg text-xs font-semibold transition ${trayStateClasses[timelineStateForTray(tray, progressUpper.delivered, progressLower.delivered)]}`}
              >
                {tray.trayNumber}
              </button>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Anexos</h2>
              <p className="mt-1 text-sm text-slate-500">Arquivos do scan e materiais de apoio.</p>
            </div>
            <Button onClick={() => setAttachmentModalOpen(true)} disabled={!canWrite}>Adicionar anexo</Button>
          </div>

          <div className="mt-4 space-y-3">
            {currentCase.attachments.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.type} - {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-slate-500">
                    Data anexo: {item.attachedAt ? new Date(`${item.attachedAt}T00:00:00`).toLocaleDateString('pt-BR') : '-'} | Obs: {item.note || '-'}
                  </p>
                </div>
                {item.url.startsWith('blob:') ? (
                  <span className="text-xs text-slate-500">(arquivo local)</span>
                ) : item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-700 hover:text-brand-500">
                    Abrir
                  </a>
                ) : (
                  <span className="text-xs text-slate-500">(arquivo local)</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </section>

      {attachmentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <Card className="w-full max-w-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Adicionar anexo</h3>
              <Button variant="ghost" size="sm" onClick={() => setAttachmentModalOpen(false)}>
                Fechar
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
                <select
                  value={attachmentType}
                  onChange={(event) => setAttachmentType(event.target.value as 'imagem' | 'documento' | 'outro')}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="imagem">Imagem</option>
                  <option value="documento">Documento (pdf)</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Data</label>
                <Input type="date" value={attachmentDate} onChange={(event) => setAttachmentDate(event.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Observacao</label>
                <textarea
                  rows={3}
                  value={attachmentNote}
                  onChange={(event) => setAttachmentNote(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Arquivo</label>
                {attachmentType === 'imagem' ? (
                  <ImageCaptureInput accept="image/*" onFileSelected={setAttachmentFile} />
                ) : (
                  <input
                    type="file"
                    accept={attachmentType === 'documento' ? 'application/pdf,image/*' : undefined}
                    onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
                  />
                )}
                {attachmentFile ? <p className="mt-1 text-xs text-slate-500">Arquivo: {attachmentFile.name}</p> : null}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAttachmentModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAttachmentSave} disabled={!canWrite}>Salvar anexo</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {selectedTray ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <Card className="w-full max-w-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Placa #{selectedTray.trayNumber}</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTray(null)}>
                Fechar
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
                <select
                  value={trayState}
                  onChange={(event) => setSelectedTrayState(event.target.value as TrayState)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_producao">Em producao</option>
                  <option value="pronta">Pronta</option>
                  <option value="entregue">Entregue</option>
                  <option value="rework">Rework</option>
                </select>
              </div>

              {linkedLabItems.some((item) => item.trayNumber === selectedTray.trayNumber) ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Esta placa esta vinculada ao laboratorio.
                </p>
              ) : null}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nota</label>
                <textarea
                  rows={4}
                  value={trayNote}
                  onChange={(event) => setTrayNote(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelectedTray(null)}>
                Cancelar
              </Button>
              <Button onClick={saveTrayChanges} disabled={!canWrite}>Salvar</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </AppShell>
  )
}
