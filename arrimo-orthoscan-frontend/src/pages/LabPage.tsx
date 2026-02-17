import { useCallback, useMemo, useState } from 'react'
import { useToast } from '../app/ToastProvider'
import RegisterDeliveryLotModal from '../components/cases/RegisterDeliveryLotModal'
import LabBoard from '../components/lab/LabBoard'
import LabFilters from '../components/lab/LabFilters'
import LabItemModal from '../components/lab/LabItemModal'
import LabKpiRow from '../components/lab/LabKpiRow'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { registerCaseDeliveryLot } from '../data/caseRepo'
import { addLabItem, createAdvanceLabOrder, deleteLabItem, listLabItems, updateLabItem } from '../data/labRepo'
import { getNextDeliveryDueDate, getReplenishmentAlerts } from '../domain/replenishment'
import AppShell from '../layouts/AppShell'
import type { LabItem, LabStatus } from '../types/Lab'
import { useDb } from '../lib/useDb'
import { getCurrentUser } from '../lib/auth'
import { can } from '../auth/permissions'
import { listCasesForUser, listLabItemsForUser } from '../auth/scope'

type ModalState =
  | { open: false; mode: 'create' | 'edit'; item: null }
  | { open: true; mode: 'create'; item: null }
  | { open: true; mode: 'edit'; item: LabItem }

function isOverdue(item: LabItem) {
  if (item.status === 'prontas') {
    return false
  }
  const due = new Date(`${item.dueDate}T00:00:00`)
  const today = new Date()
  return due < new Date(today.toISOString().slice(0, 10))
}

function formatDate(dateIso: string) {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString('pt-BR')
}

function toNonNegativeInt(value?: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value ?? 0))
}

function getCaseTotalsByArch(caseItem?: { totalTrays: number; totalTraysUpper?: number; totalTraysLower?: number }) {
  if (!caseItem) return { upper: 0, lower: 0 }
  return {
    upper: toNonNegativeInt(caseItem.totalTraysUpper ?? caseItem.totalTrays),
    lower: toNonNegativeInt(caseItem.totalTraysLower ?? caseItem.totalTrays),
  }
}

function getDeliveredByArch(caseItem?: {
  installation?: { deliveredUpper?: number; deliveredLower?: number }
  deliveryLots?: Array<{ arch: 'superior' | 'inferior' | 'ambos'; quantity: number }>
}) {
  if (!caseItem) return { upper: 0, lower: 0 }
  const fromDentistLots = (caseItem.deliveryLots ?? []).reduce(
    (acc, lot) => {
      const qty = toNonNegativeInt(lot.quantity)
      if (lot.arch === 'superior') acc.upper += qty
      if (lot.arch === 'inferior') acc.lower += qty
      if (lot.arch === 'ambos') {
        acc.upper += qty
        acc.lower += qty
      }
      return acc
    },
    { upper: 0, lower: 0 },
  )
  if (fromDentistLots.upper > 0 || fromDentistLots.lower > 0) {
    return fromDentistLots
  }
  return {
    upper: toNonNegativeInt(caseItem.installation?.deliveredUpper),
    lower: toNonNegativeInt(caseItem.installation?.deliveredLower),
  }
}

function minusDays(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T00:00:00`)
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function isReworkItem(item: LabItem) {
  return item.requestKind === 'reconfeccao'
}

function hasRevisionSuffix(code?: string) {
  if (!code) return false
  return /\/\d+$/.test(code)
}

function hasRemainingByArch(caseItem?: {
  totalTrays: number
  totalTraysUpper?: number
  totalTraysLower?: number
  installation?: { deliveredUpper?: number; deliveredLower?: number }
  deliveryLots?: Array<{ arch: 'superior' | 'inferior' | 'ambos'; quantity: number }>
}) {
  if (!caseItem) return false
  const totals = getCaseTotalsByArch(caseItem)
  const delivered = getDeliveredByArch(caseItem)
  return Math.max(0, totals.upper - delivered.upper) > 0 || Math.max(0, totals.lower - delivered.lower) > 0
}

export default function LabPage() {
  const { db } = useDb()
  const { addToast } = useToast()
  const currentUser = getCurrentUser(db)
  const canWrite = can(currentUser, 'lab.write')
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState<'todos' | 'urgente' | 'medio' | 'baixo'>('todos')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [alertsOnly, setAlertsOnly] = useState(false)
  const [status, setStatus] = useState<'todos' | LabStatus>('todos')
  const [boardTab, setBoardTab] = useState<'esteira' | 'reconfeccao' | 'banco_restante'>('esteira')
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create', item: null })
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const [deliveryCaseId, setDeliveryCaseId] = useState('')
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false)
  const [advanceTarget, setAdvanceTarget] = useState<LabItem | null>(null)
  const [advanceUpperQty, setAdvanceUpperQty] = useState('1')
  const [advanceLowerQty, setAdvanceLowerQty] = useState('1')

  const items = useMemo(() => {
    listLabItems()
    return [...listLabItemsForUser(db, currentUser)].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [db, currentUser])
  const caseById = useMemo(() => new Map(db.cases.map((item) => [item.id, item])), [db.cases])
  const visibleCases = useMemo(() => listCasesForUser(db, currentUser), [db, currentUser])
  const readyDeliveryItems = useMemo(
    () =>
      items.filter(
        (item) => {
          if (!item.caseId) return false
          if ((item.requestKind ?? 'producao') !== 'producao') return false
          if (item.status !== 'prontas') return false
          if (isReworkItem(item)) return false
          const caseItem = caseById.get(item.caseId)
          const tray = caseItem?.trays.find((current) => current.trayNumber === item.trayNumber)
          return tray?.state === 'pronta'
        },
      ),
    [caseById, items],
  )
  const casesReadyForDelivery = useMemo(
    () => new Set(readyDeliveryItems.map((item) => item.caseId as string)),
    [readyDeliveryItems],
  )
  const deliveryCaseOptions = useMemo(
    () =>
      readyDeliveryItems
        .filter((item) => item.caseId && visibleCases.some((current) => current.id === item.caseId))
        .map((item) => ({
          id: item.id,
          label: `${item.patientName} (${item.requestCode ?? 'OS sem codigo'})`,
        })),
    [readyDeliveryItems, visibleCases],
  )
  const casesWithAlerts = useMemo(
    () =>
      new Set(
        db.cases
          .filter((caseItem) => getReplenishmentAlerts(caseItem).length > 0)
          .map((caseItem) => caseItem.id),
      ),
    [db.cases],
  )
  const alertSummaries = useMemo(
    () =>
      db.cases
        .flatMap((caseItem) => getReplenishmentAlerts(caseItem).map((alert) => ({ caseId: caseItem.id, patientName: caseItem.patientName, dueDate: alert.dueDate, title: alert.title })))
        .slice(0, 3),
    [db.cases],
  )

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchSearch =
        query.length === 0 ||
        item.patientName.toLowerCase().includes(query) ||
        `#${item.trayNumber}`.includes(query) ||
        String(item.trayNumber).includes(query)
      const matchPriority = priority === 'todos' || item.priority.toLowerCase() === priority
      const matchStatus = status === 'todos' || item.status === status
      const matchOverdue = !overdueOnly || isOverdue(item)
      const matchAlerts = !alertsOnly || (item.caseId ? casesWithAlerts.has(item.caseId) : false)
      return matchSearch && matchPriority && matchStatus && matchOverdue && matchAlerts
    })
  }, [alertsOnly, casesWithAlerts, items, overdueOnly, priority, search, status])
  const isDeliveredToProfessional = useCallback((item: LabItem) => {
    if (!item.caseId) return false
    // Itens ainda em fluxo operacional (aguardando/producao/CQ) devem permanecer visiveis na esteira.
    if (item.status !== 'prontas') return false
    const caseItem = caseById.get(item.caseId)
    const hasAnyDeliveryLot = (caseItem?.deliveryLots?.length ?? 0) > 0
    // Oculta apenas a OS base (sem revisao) apos primeira entrega.
    if ((item.requestKind ?? 'producao') === 'producao' && hasAnyDeliveryLot && !hasRevisionSuffix(item.requestCode)) {
      return true
    }
    const tray = caseItem?.trays.find((current) => current.trayNumber === item.trayNumber)
    return tray?.state === 'entregue'
  }, [caseById])
  const pipelineItems = useMemo(
    () => filteredItems.filter((item) => !isDeliveredToProfessional(item) && !isReworkItem(item)),
    [filteredItems, isDeliveredToProfessional],
  )
  const reworkItems = useMemo(
    () => filteredItems.filter((item) => isReworkItem(item)),
    [filteredItems],
  )
  const remainingBankItems = useMemo(
    () => {
      const raw = filteredItems.filter(
        (item) => {
          const caseItem = item.caseId ? caseById.get(item.caseId) : undefined
          if (caseItem?.status === 'finalizado') return false
          if (caseItem && !hasRemainingByArch(caseItem)) return false
          return (
            isDeliveredToProfessional(item) ||
            (item.requestKind === 'reposicao_programada' && item.status === 'aguardando_iniciar') ||
            item.requestKind === 'reconfeccao' ||
            isReworkItem(item)
          )
        },
      )
      const caseScoped = new Map<string, LabItem>()
      const explicitRework: LabItem[] = []
      const standalone: LabItem[] = []
      const score = (item: LabItem) => {
        if (item.requestKind === 'reposicao_programada' && item.status === 'aguardando_iniciar') return 4
        if ((item.requestKind ?? 'producao') === 'producao') return 3
        if (item.requestKind === 'reconfeccao') return 2
        return 1
      }

      raw.forEach((item) => {
        if (item.requestKind === 'reconfeccao') {
          explicitRework.push(item)
          return
        }
        if (!item.caseId) {
          standalone.push(item)
          return
        }
        const current = caseScoped.get(item.caseId)
        if (!current) {
          caseScoped.set(item.caseId, item)
          return
        }
        const better = score(item) > score(current) || (score(item) === score(current) && (item.updatedAt ?? '') > (current.updatedAt ?? ''))
        if (better) {
          caseScoped.set(item.caseId, item)
        }
      })

      return [...explicitRework, ...caseScoped.values(), ...standalone]
    },
    [filteredItems, caseById, isDeliveredToProfessional],
  )
  const kpis = useMemo(
    () => ({
      aguardando_iniciar: pipelineItems.filter((item) => item.status === 'aguardando_iniciar').length,
      em_producao: pipelineItems.filter((item) => item.status === 'em_producao').length,
      controle_qualidade: pipelineItems.filter((item) => item.status === 'controle_qualidade').length,
      prontas: pipelineItems.filter((item) => item.status === 'prontas').length,
      atrasados: pipelineItems.filter((item) => item.status !== 'prontas' && isOverdue(item)).length,
    }),
    [pipelineItems],
  )

  const guideTone = (item: LabItem) => {
    const caseItem = item.caseId ? caseById.get(item.caseId) : undefined
    const tray = caseItem?.trays.find((current) => current.trayNumber === item.trayNumber)
    if (tray?.state === 'entregue') return 'green' as const
    if (isOverdue(item)) return 'red' as const
    return 'yellow' as const
  }

  const caseLabel = (item: LabItem) => {
    const caseItem = item.caseId ? caseById.get(item.caseId) : undefined
    const treatment = caseItem?.treatmentCode
    if (item.requestCode) return item.requestCode
    return item.requestCode ?? treatment
  }

  const handleCreate = (payload: {
    caseId?: string
    arch: 'superior' | 'inferior' | 'ambos'
    plannedUpperQty?: number
    plannedLowerQty?: number
    patientName: string
    trayNumber: number
    dueDate: string
    priority: 'Baixo' | 'Medio' | 'Urgente'
    notes?: string
    status: LabStatus
  }) => {
    if (!canWrite) return { ok: false, message: 'Sem permissao para criar solicitacoes.' }
    const today = new Date().toISOString().slice(0, 10)
    const result = addLabItem({
      caseId: payload.caseId,
      arch: payload.arch,
      plannedUpperQty: payload.plannedUpperQty,
      plannedLowerQty: payload.plannedLowerQty,
      patientName: payload.patientName,
      trayNumber: payload.trayNumber,
      plannedDate: today,
      dueDate: payload.dueDate,
      priority: payload.priority,
      notes: payload.notes,
      status: payload.status,
    })
    if (!result.ok) {
      return { ok: false, message: result.error }
    }
    if (!result.sync.ok) {
      return { ok: false, message: result.sync.message }
    }
    setModal({ open: false, mode: 'create', item: null })
    return { ok: true }
  }

  const handleSave = (id: string, patch: Partial<LabItem>) => {
    if (!canWrite) return { ok: false, message: 'Sem permissao para editar solicitacoes.' }
    const result = updateLabItem(id, patch)
    if (result.error) {
      return { ok: false, message: result.error }
    }
    if (!result.sync.ok) {
      return { ok: false, message: result.sync.message }
    }
    setModal({ open: false, mode: 'create', item: null })
    return { ok: true }
  }

  const handleDelete = (id: string) => {
    if (!canWrite) return
    deleteLabItem(id)
    setModal({ open: false, mode: 'create', item: null })
    addToast({ type: 'info', title: 'Solicitacao removida' })
  }

  const nextRangeByArch = (
    caseItem: NonNullable<ReturnType<typeof caseById.get>>,
    arch: 'superior' | 'inferior',
    qty: number,
  ) => {
    const lots = caseItem.deliveryLots ?? []
    const maxDelivered = lots.reduce((acc, lot) => {
      if (lot.arch === arch || lot.arch === 'ambos') {
        return Math.max(acc, lot.toTray)
      }
      return acc
    }, 0)
    const fromTray = maxDelivered + 1
    const toTray = fromTray + qty - 1
    return { fromTray, toTray }
  }

  return (
    <AppShell breadcrumb={['Início', 'Laboratório']}>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Laboratório</h1>
          <p className="mt-2 text-sm text-slate-500">Fila de produção e entregas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <Button variant="secondary" onClick={() => setDeliveryOpen(true)}>
              Registrar entrega ao profissional
            </Button>
          ) : null}
          {canWrite ? (
            <Button onClick={() => setModal({ open: true, mode: 'create', item: null })}>Nova Solicitação</Button>
          ) : null}
        </div>
      </section>

      <section className="mt-6">
        <LabFilters
          search={search}
          priority={priority}
          overdueOnly={overdueOnly}
          alertsOnly={alertsOnly}
          status={status}
          onSearchChange={setSearch}
          onPriorityChange={setPriority}
          onOverdueOnlyChange={setOverdueOnly}
          onAlertsOnlyChange={setAlertsOnly}
          onStatusChange={setStatus}
        />
      </section>

      <section className="mt-6">
        <LabKpiRow kpis={kpis} />
      </section>

      {alertsOnly && alertSummaries.length > 0 ? (
        <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {alertSummaries.map((item) => (
            <p key={`${item.caseId}_${item.dueDate}`}>{item.patientName}: {item.title} (previsto para {new Date(`${item.dueDate}T00:00:00`).toLocaleDateString('pt-BR')})</p>
          ))}
        </section>
      ) : null}

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button variant={boardTab === 'esteira' ? 'primary' : 'secondary'} onClick={() => setBoardTab('esteira')}>
            Esteira
          </Button>
          <Button variant={boardTab === 'reconfeccao' ? 'primary' : 'secondary'} onClick={() => setBoardTab('reconfeccao')}>
            Placas com defeito (reconfeccao)
          </Button>
          <Button variant={boardTab === 'banco_restante' ? 'primary' : 'secondary'} onClick={() => setBoardTab('banco_restante')}>
            Banco de reposicoes
          </Button>
        </div>
        {boardTab === 'esteira' ? (
          <LabBoard
            items={pipelineItems}
            guideTone={guideTone}
            caseLabel={caseLabel}
            onItemsChange={() => undefined}
            onDetails={(item) => setModal({ open: true, mode: 'edit', item })}
            canEdit={canWrite}
          />
        ) : boardTab === 'reconfeccao' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {reworkItems.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma placa com defeito encontrada com os filtros atuais.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">OS</th>
                      <th className="px-3 py-2 font-semibold">Paciente</th>
                      <th className="px-3 py-2 font-semibold">Placa</th>
                      <th className="px-3 py-2 font-semibold">Arcada</th>
                      <th className="px-3 py-2 font-semibold">Prazo</th>
                      <th className="px-3 py-2 font-semibold">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reworkItems.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{item.requestCode ?? (item.caseId ? caseById.get(item.caseId)?.treatmentCode : undefined) ?? '-'}</td>
                        <td className="px-3 py-2">{item.patientName}</td>
                        <td className="px-3 py-2">#{item.trayNumber}</td>
                        <td className="px-3 py-2">{item.arch}</td>
                        <td className="px-3 py-2">{formatDate(item.dueDate)}</td>
                        <td className="px-3 py-2">{item.notes || 'Reavaliar item em controle de qualidade.'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {remainingBankItems.length === 0 ? (
              <p className="text-sm text-slate-500">Sem placas no banco de restante para os filtros atuais.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">OS</th>
                      <th className="px-3 py-2 font-semibold">Paciente</th>
                      <th className="px-3 py-2 font-semibold">Tratamento (Inf/Sup)</th>
                      <th className="px-3 py-2 font-semibold">Entregue (Inf/Sup)</th>
                      <th className="px-3 py-2 font-semibold">Restante (Inf/Sup)</th>
                      <th className="px-3 py-2 font-semibold">Data instalacao</th>
                      <th className="px-3 py-2 font-semibold">Previsao reposicao LAB</th>
                      <th className="px-3 py-2 font-semibold">Status tratamento</th>
                      <th className="px-3 py-2 font-semibold">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remainingBankItems.map((item) => {
                      const caseItem = item.caseId ? caseById.get(item.caseId) : undefined
                      const totals = getCaseTotalsByArch(caseItem)
                      const delivered = getDeliveredByArch(caseItem)
                      const remaining = {
                        upper: Math.max(0, totals.upper - delivered.upper),
                        lower: Math.max(0, totals.lower - delivered.lower),
                      }
                      const installationDate = caseItem?.installation?.installedAt
                      const nextAlignerStartDate = caseItem ? getNextDeliveryDueDate(caseItem) : null
                      const replenishmentLabDate = nextAlignerStartDate ? minusDays(nextAlignerStartDate, 10) : null
                      const readyForDelivery = !!(caseItem && casesReadyForDelivery.has(caseItem.id))
                      const treatmentStatus =
                        caseItem?.status === 'finalizado'
                          ? 'Finalizado'
                          : readyForDelivery
                            ? 'Pronto para entrega'
                          : installationDate
                            ? 'Em tratamento'
                            : 'Aguardando instalacao'

                      return (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{item.requestCode ?? '-'}</td>
                          <td className="px-3 py-2">{item.patientName}</td>
                          <td className="px-3 py-2">{`${totals.lower}/${totals.upper}`}</td>
                          <td className="px-3 py-2">{`${delivered.lower}/${delivered.upper}`}</td>
                          <td className="px-3 py-2">{`${remaining.lower}/${remaining.upper}`}</td>
                          <td className="px-3 py-2">{installationDate ? formatDate(installationDate) : '-'}</td>
                          <td className="px-3 py-2">{replenishmentLabDate ? formatDate(replenishmentLabDate) : '-'}</td>
                          <td className="px-3 py-2">{treatmentStatus}</td>
                          <td className="px-3 py-2">
                            {canWrite && item.caseId ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setAdvanceTarget(item)
                                  setAdvanceUpperQty(String(Math.max(1, item.plannedUpperQty ?? 0)))
                                  setAdvanceLowerQty(String(Math.max(1, item.plannedLowerQty ?? 0)))
                                  setAdvanceModalOpen(true)
                                }}
                              >
                                Gerar OS antecipada
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      <LabItemModal
        mode={modal.mode}
        item={modal.item}
        open={modal.open}
        cases={db.cases}
        readOnly={!canWrite}
        onClose={() => setModal({ open: false, mode: 'create', item: null })}
        onCreate={handleCreate}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <RegisterDeliveryLotModal
        open={deliveryOpen}
        caseOptions={deliveryCaseOptions}
        selectedCaseId={deliveryCaseId}
        onCaseChange={setDeliveryCaseId}
        onClose={() => setDeliveryOpen(false)}
        onConfirm={(payload) => {
          if (!canWrite) return
          if (!deliveryCaseId) {
            addToast({ type: 'error', title: 'Entrega de lote', message: 'Selecione um caso.' })
            return
          }
          const selectedReadyItem = readyDeliveryItems.find((item) => item.id === deliveryCaseId)
          if (!selectedReadyItem?.caseId) {
            addToast({ type: 'error', title: 'Entrega de lote', message: 'Selecione uma OS pronta valida.' })
            return
          }
          const selectedCaseId = selectedReadyItem.caseId
          const caseItem = caseById.get(selectedCaseId)
          if (!caseItem) {
            addToast({ type: 'error', title: 'Entrega de lote', message: 'Caso nao encontrado.' })
            return
          }
          const upperQty = Math.max(0, Math.trunc(payload.upperQty))
          const lowerQty = Math.max(0, Math.trunc(payload.lowerQty))
          if (upperQty + lowerQty <= 0) {
            addToast({ type: 'error', title: 'Entrega de lote', message: 'Informe quantidade superior e/ou inferior.' })
            return
          }

          const ops: Array<{ arch: 'superior' | 'inferior'; fromTray: number; toTray: number }> = []
          if (upperQty > 0) {
            const range = nextRangeByArch(caseItem, 'superior', upperQty)
            if (range.toTray > caseItem.totalTrays) {
              addToast({ type: 'error', title: 'Entrega de lote', message: `Quantidade superior excede o total do caso (${caseItem.totalTrays}).` })
              return
            }
            ops.push({ arch: 'superior', ...range })
          }
          if (lowerQty > 0) {
            const range = nextRangeByArch(caseItem, 'inferior', lowerQty)
            if (range.toTray > caseItem.totalTrays) {
              addToast({ type: 'error', title: 'Entrega de lote', message: `Quantidade inferior excede o total do caso (${caseItem.totalTrays}).` })
              return
            }
            ops.push({ arch: 'inferior', ...range })
          }

          for (const op of ops) {
            const result = registerCaseDeliveryLot(selectedCaseId, {
              arch: op.arch,
              fromTray: op.fromTray,
              toTray: op.toTray,
              deliveredToDoctorAt: payload.deliveredToDoctorAt,
              note: payload.note,
            })
            if (!result.ok) {
              addToast({ type: 'error', title: 'Entrega de lote', message: result.error })
              return
            }
          }

          if (!ops.length) {
            addToast({ type: 'error', title: 'Entrega de lote', message: 'Nenhum lote valido para registrar.' })
            return
          }
          setDeliveryOpen(false)
          setDeliveryCaseId('')
          addToast({ type: 'success', title: 'Entrega registrada pelo laboratório' })
        }}
      />

      {advanceModalOpen && advanceTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <Card className="w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900">Gerar OS antecipada</h3>
            <p className="mt-1 text-sm text-slate-500">
              {advanceTarget.patientName} - {advanceTarget.requestCode ?? `Placa #${advanceTarget.trayNumber}`}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Qtd Sup</label>
                <Input type="number" min={0} value={advanceUpperQty} onChange={(e) => setAdvanceUpperQty(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Qtd Inf</label>
                <Input type="number" min={0} value={advanceLowerQty} onChange={(e) => setAdvanceLowerQty(e.target.value)} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAdvanceModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  const result = createAdvanceLabOrder(advanceTarget.id, {
                    plannedUpperQty: Number(advanceUpperQty),
                    plannedLowerQty: Number(advanceLowerQty),
                  })
                  if (!result.ok) {
                    addToast({ type: 'error', title: 'OS antecipada', message: result.error })
                    return
                  }
                  if (!result.sync.ok) {
                    addToast({ type: 'error', title: 'OS antecipada', message: result.sync.message })
                    return
                  }
                  setAdvanceModalOpen(false)
                  setAdvanceTarget(null)
                  addToast({ type: 'success', title: 'OS antecipada gerada' })
                }}
              >
                Gerar
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </AppShell>
  )
}
