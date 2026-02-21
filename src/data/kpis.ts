import type { AppDb } from './db'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function getDashboardStats(db: AppDb) {
  const today = todayIso()
  const activePatients = db.cases.length
  const ongoingCases = db.cases.filter((item) => item.phase !== 'finalizado').length
  const deliveriesToday = db.cases.reduce((acc, item) => {
    return (
      acc +
      item.trays.filter((tray) => {
        if (!tray.deliveredAt) {
          return false
        }
        return tray.deliveredAt.slice(0, 10) === today
      }).length
    )
  }, 0)
  const labPendingCases = new Set(
    db.labItems
      .map((item) => item.caseId)
      .filter((caseId): caseId is string => Boolean(caseId))
      .filter((caseId) => db.cases.some((item) => item.id === caseId && item.phase !== 'finalizado')),
  )
  const pendingAligners = labPendingCases.size
  const overdue = db.labItems.filter((item) => item.status !== 'prontas' && item.dueDate < today).length
  const contractsPending = db.cases.filter((item) => item.phase === 'contrato_pendente').length

  return {
    activePatients,
    ongoingCases,
    deliveriesToday,
    pendingAligners,
    overdue,
    contractsPending,
  }
}

export function getLabKpis(db: AppDb) {
  return {
    aguardando_iniciar: db.labItems.filter((item) => item.status === 'aguardando_iniciar').length,
    em_producao: db.labItems.filter((item) => item.status === 'em_producao').length,
    controle_qualidade: db.labItems.filter((item) => item.status === 'controle_qualidade').length,
    prontas: db.labItems.filter((item) => item.status === 'prontas').length,
    atrasados: db.labItems.filter((item) => item.status !== 'prontas' && item.dueDate < todayIso()).length,
  }
}
